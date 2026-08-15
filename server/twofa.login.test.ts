import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Express } from "express";
import { legacyApiRouter } from "./legacy/router";
import http from "node:http";

/* Full two-factor login cycle specs.

The server already issues a signed preToken + OTP email when a user with
two_fa_enabled=true logs in without the code, and completes the session only
after the correct 6-digit code is submitted. The default on the users table
is now two_fa_enabled=true (DB altered), so every new account is 2FA by
default. These tests exercise the full chain: wrong password refused,
2FA challenge issued (no session cookie, no code leak), wrong code refused,
correct code issues a real session, expired/tampered preTokens rejected. */

function createLegacyApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api", legacyApiRouter());
  return app;
}

// A unique fingerprint per test run so the shared rate-limit window never
// bleeds across files or consecutive runs (fingerprint = ip + UA).
const TEST_USER_AGENT = `vitest-twofa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function request(app: Express, method: string, path: string, body?: unknown) {
  return new Promise<{ status: number; body: any; cookie: string | null }>((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      const url = `http://127.0.0.1:${addr.port}${path}`;
      const req = http.request(url, { method, headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}),  "user-agent": TEST_USER_AGENT + "-" + Math.random().toString(36).slice(2,8) } }, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          server.close();
          let parsed: any = null;
          try { parsed = JSON.parse(Buffer.concat(chunks).toString()); } catch (e) { /* not JSON */ }
          resolve({ status: res.statusCode ?? 0, body: parsed, cookie: res.headers["set-cookie"]?.join(";") ?? null });
        });
      });
      req.on("error", (e) => { server.close(); reject(e); });
      if (body !== undefined) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

const app = createLegacyApp();

// A real user seeded for these tests — created with the default two_fa_enabled=true.
let testUser: { email: string; password: string; id: string | null } = { email: "", password: "", id: null };

beforeAll(async () => {
  const { sql } = await import("./legacy/db");
  const auth = await import("./legacy/auth.js");
  const s = sql();
  const unique = Date.now().toString(36);
  const email = `twofa-${unique}-t@example.com`;
  const name = `TwoFA Test ${unique}`;
  const password = "TwoFATestPass9!";
  const passwordHash = await auth.hashPassword(password);
  // sanity: importing auth.js must not trigger side effects beyond helpers
  const rows = await s`
    INSERT INTO users (name, email, phone, password_hash, role, two_fa_enabled)
    VALUES (${name}, ${email}, ${`+962790000${unique}`}, ${passwordHash}, 'customer', true)
    RETURNING id
  `;
  // guarantee a clean throttling slate (leftovers from previous test runs
  // would otherwise lock the identifier out for 5 minutes)
  await s`DELETE FROM login_attempts WHERE email = ${email}`;
  testUser = { email, password, id: rows[0].id };
}, 60_000);

afterAll(async () => {
  if (testUser.id) {
    const { sql } = await import("./legacy/db");
    const s = sql();
    await s`DELETE FROM users WHERE id = ${testUser.id}`;
    await s`DELETE FROM sessions WHERE user_id = ${testUser.id}`;
    await s`DELETE FROM otp_codes WHERE user_id = ${testUser.id}`;
  }
}, 30_000);

describe("2FA login: challenge issued after correct password", () => {
  it("refuses a wrong password with 401 and issues no challenge", async () => {
    const res = await request(app, "POST", "/api/auth/login", {
      identifier: testUser.email,
      password: "WrongPassword1!",
    });
    expect(res.status).toBe(401);
    expect(res.body.twoFARequired).toBeFalsy();
    expect(res.cookie).toBeNull();
  }, 60_000);

  it("issues a twoFA challenge with a signed preToken and no session cookie", async () => {
    const res = await request(app, "POST", "/api/auth/login", {
      identifier: testUser.email,
      password: testUser.password,
    });
    expect(res.status).toBe(200);
    expect(res.body.twoFARequired).toBe(true);
    expect(typeof res.body.preToken).toBe("string");
    expect(res.body.preToken.split(".")).toHaveLength(3);
    expect(res.cookie).toBeNull();
    // the server never echoes the 6-digit code back to the frontend
    const dumped = JSON.stringify(res.body);
    expect(dumped).not.toMatch(/\b\d{6}\b/);
  }, 60_000);
});

describe("2FA login: completing the session", () => {
  it("rejects a wrong OTP code with 401 and no session", async () => {
    const challenge = await request(app, "POST", "/api/auth/login", {
      identifier: testUser.email,
      password: testUser.password,
    });
    const res = await request(app, "POST", "/api/auth/login", {
      identifier: testUser.email,
      password: testUser.password,
      twoFACode: "000000",
      preToken: challenge.body.preToken,
    });
    expect(res.status).toBe(401);
    expect(res.cookie).toBeNull();
  }, 60_000);

  it("rejects a tampered/invalid preToken with 401", async () => {
    const res = await request(app, "POST", "/api/auth/login", {
      identifier: testUser.email,
      password: testUser.password,
      twoFACode: "123456",
      preToken: "not.a.valid.jwt.token",
    });
    expect(res.status).toBe(401);
    expect(res.cookie).toBeNull();
  }, 60_000);

  it("issues a real session cookie only with the correct OTP code (read from the seeded code)", async () => {
    const { sql } = await import("./legacy/db");
    const s = sql();
    // fresh challenge
    const challenge = await request(app, "POST", "/api/auth/login", {
      identifier: testUser.email,
      password: testUser.password,
    });
    expect(challenge.status).toBe(200);
    // pull the freshly seeded 2fa code straight from the DB (test seam)
    const otpRows = await s`select code from otp_codes where user_id = ${testUser.id} and purpose = '2fa' order by id desc limit 1`;
    expect(otpRows.length).toBe(1);
    const res = await request(app, "POST", "/api/auth/login", {
      identifier: testUser.email,
      password: testUser.password,
      twoFACode: String(otpRows[0].code),
      preToken: challenge.body.preToken,
    });
    expect(res.status).toBe(200);
    expect(res.body.user).toBeTruthy();
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.cookie).toContain("session=");
    // the one-time code is consumed afterwards (earlier challenges in the same run may leave other rows)
    const after = await s`select id from otp_codes where id = ${otpRows[0].id}`;
    expect(after.length).toBe(0);
  }, 60_000);
});

describe("2FA: brute-force protection", () => {
  it("rate-limits repeated wrong OTP attempts (429 after OTP_MAX_ATTEMPTS)", async () => {
    const challenge = await request(app, "POST", "/api/auth/login", {
      identifier: testUser.email,
      password: testUser.password,
    });
    expect(challenge.status).toBe(200);
    let last: { status: number } = { status: 0 };
    for (let i = 0; i < 7; i++) {
      last = await request(app, "POST", "/api/auth/login", {
        identifier: testUser.email,
        password: testUser.password,
        twoFACode: "999999",
        preToken: challenge.body.preToken,
      });
      if (last.status === 429) break;
    }
    expect(last.status).toBe(429);
    // cleanup: remove the exhausted code so later tests get a fresh one
    const { sql } = await import("./legacy/db");
    const s = sql();
    await s`delete from otp_codes where user_id = ${testUser.id} and purpose = '2fa'`;
  }, 120_000);
});
