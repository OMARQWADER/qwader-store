/* Lightweight secret validation: confirms OWNER_TEST_EMAIL/OWNER_TEST_PASSWORD
   correspond to a real owner account that can log in via /api/auth/login. */
import { describe, it, expect } from "vitest";
import express from "express";
import { legacyApiRouter } from "./legacy/router";
import http from "node:http";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", legacyApiRouter());
  return app;
}

function request(app: ReturnType<typeof createApp>, method: string, path: string, body?: unknown) {
  return new Promise<{ status: number; body: any; cookie: string | null }>((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      const req = http.request(
        `http://127.0.0.1:${addr.port}${path}`,
        { method, headers: body !== undefined ? { "Content-Type": "application/json" } : undefined },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            server.close();
            try {
              resolve({
                status: res.statusCode ?? 0,
                body: JSON.parse(Buffer.concat(chunks).toString()),
                cookie: res.headers["set-cookie"]?.join(";") ?? null,
              });
            } catch (e) {
              resolve({ status: res.statusCode ?? 0, body: null, cookie: null });
            }
          });
        },
      );
      req.on("error", (e) => {
        server.close();
        reject(e);
      });
      if (body !== undefined) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

describe("owner test credentials", () => {
  it("OWNER_TEST_EMAIL/PASSWORD log in as a role=owner account", { timeout: 120_000 }, async () => {
    const email = process.env.OWNER_TEST_EMAIL;
    const password = process.env.OWNER_TEST_PASSWORD;
    expect(email, "OWNER_TEST_EMAIL is required").toBeTruthy();
    expect(password, "OWNER_TEST_PASSWORD is required").toBeTruthy();
    const app = createApp();
    const res = await request(app, "POST", "/api/auth/login", { identifier: email!, password: password! });
    // 401 = wrong password (invalid secret); anything non-401 with a role confirms it
    console.log("login response:", res.status, JSON.stringify({ ...(res.body || {}), preToken: res.body?.preToken ? "<present>" : undefined }));
    expect(res.status).not.toBe(401);
    if (res.body?.twoFARequired) {
      // complete the 2FA step with the user-supplied OTP code
      const finalRes = await request(app, "POST", "/api/auth/login", {
        identifier: email!,
        password: password!,
        twoFACode: process.env.OWNER_TEST_2FA_CODE,
        preToken: res.body.preToken,
      });
      expect(finalRes.status, `2FA step failed: ${JSON.stringify(finalRes.body)}`).toBe(200);
      expect(finalRes.body?.user?.role).toBe("owner");
      return;
    }
    expect(res.body?.user?.role).toBe("owner");
    expect(typeof res.body?.user?.email).toBe("string");
  });
});
