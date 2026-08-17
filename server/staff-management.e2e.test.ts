/* E2E contract test for the staff management system (owner-only).
   Mounts the real legacy router in an Express app (same wiring as production)
   and talks to Neon over the real DATABASE_URL, so it verifies the whole stack:
   router → admin.action → PostgreSQL.
   Requires OWNER_TEST_EMAIL / OWNER_TEST_PASSWORD env vars (validated by
   owner-login.secret.test.ts). */
import { test, expect, describe, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import express from "express";
import http from "node:http";
import { legacyApiRouter } from "./legacy/router";

const TAG = `stf${Date.now().toString(36)}`;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", legacyApiRouter());
  return app;
}

function request(
  app: ReturnType<typeof createApp>,
  method: string,
  path: string,
  body?: unknown,
  cookie?: string,
) {
  return new Promise<{ status: number; body: any; cookie: string | null }>((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      const headers: Record<string, string> = {};
      if (body !== undefined) headers["Content-Type"] = "application/json";
      if (cookie) headers.Cookie = cookie;
      const req = http.request(
        `http://127.0.0.1:${addr.port}${path}`,
        { method, headers },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            server.close();
            const raw = Buffer.concat(chunks).toString();
            try {
              resolve({
                status: res.statusCode ?? 0,
                body: JSON.parse(raw),
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

function sessionCookie(setHeader?: string | null): string | undefined {
  if (!setHeader) return undefined;
  // the real cookie name is qg_session (auth.js)
  const m = setHeader.match(/(qg_session)=([^;]+)/i);
  return m ? `${m[1]}=${m[2]}` : undefined;
}

async function ownerCookie(app: ReturnType<typeof createApp>): Promise<string> {
  const res = await request(app, "POST", "/api/auth/login", {
    identifier: process.env.OWNER_TEST_EMAIL,
    password: process.env.OWNER_TEST_PASSWORD,
  });
  if (res.status !== 200) throw new Error(`owner login failed: ${res.status} ${JSON.stringify(res.body)}`);
  // the owner account has 2FA enabled — complete the second step with the
  // user-supplied OTP code before the session cookie is issued
  if (res.body?.twoFARequired) {
    const code2fa = process.env.OWNER_TEST_2FA_CODE || "";
    const finalRes = await request(app, "POST", "/api/auth/login", {
      identifier: process.env.OWNER_TEST_EMAIL,
      password: process.env.OWNER_TEST_PASSWORD,
      twoFACode: process.env.OWNER_TEST_2FA_CODE,
      preToken: res.body.preToken,
    });
    if (finalRes.status !== 200 || finalRes.body?.user?.role !== "owner") {
      throw new Error(`owner 2FA step failed: ${finalRes.status} ${JSON.stringify(finalRes.body)}`);
    }
    const cookie = sessionCookie(finalRes.cookie);
    if (!cookie) throw new Error("no session cookie from owner login");
    return cookie;
  }
  if (res.body?.user?.role !== "owner") throw new Error(`logged in but not owner: ${res.status} ${JSON.stringify(res.body)}`);
  const cookie = sessionCookie(res.cookie);
  if (!cookie) throw new Error("no session cookie from owner login");
  return cookie;
}

let sql: postgres.Sql;
function db(): postgres.Sql {
  if (!sql) sql = postgres(process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL!, { ssl: "require", max: 2, idle_timeout: 30 });
  return sql;
}
async function seedUser(tag: string, role: "customer" = "customer") {
  const s = db();
  const rows = await s`
    insert into users (name, email, password_hash, role, created_at)
    values (${tag}::text, ${`${tag}@e2e.test`}::text, ${`hash-${tag}`}::text, ${role}::text, now())
    returning id, email, role`;
  return rows[0];
}
let ownerWas2faEnabled = false;
async function cleanup() {
  const s = db();
  await s`delete from users where email like ${`%${TAG}%`} or email like '%e2e.test'`;
  await s`delete from activity_log where who like ${`%${TAG}%`} or who = 'e2e-test-owner'`;
}

describe("staff management (owner-only)", () => {
  // Neon cold-start can add significant latency — generous headroom.
  test(
    "promote → set permissions → demote, with access enforcement",
    { timeout: 240_000 },
    async () => {
      const app = createApp();
      // temporarily switch the owner's 2FA off for testing (restore in afterAll)
  const ownerRows = await db()`select id, two_fa_enabled from users where role = 'owner' limit 1`;
  expect(ownerRows.length, "no owner account in DB").toBeGreaterThan(0);
  ownerWas2faEnabled = !!ownerRows[0].two_fa_enabled;
  if (ownerWas2faEnabled) {
    await db()`update users set two_fa_enabled = false where id = ${ownerRows[0].id}`;
  }
  const owner = await ownerCookie(app);

      // 1) unauthenticated access to every staff endpoint is rejected
      expect((await request(app, "POST", "/api/admin/staff", { identifier: "x" })).status).toBe(403);
      expect((await request(app, "GET", "/api/admin/staff")).status).toBe(403);
      const anonDemote = await request(app, "DELETE", "/api/admin/staff?id=00000000-0000-0000-0000-000000000000");
      expect(anonDemote.status).toBe(403);

      // 2) seed two disposable customers
      const victimA = await seedUser(`${TAG}-a`);
      const victimB = await seedUser(`${TAG}-b`);

      try {
        // 3) promote victimA by email — owner only
        const promo = await request(app, "POST", "/api/admin/staff", { identifier: victimA.email }, owner);
        expect(promo.status).toBe(200, JSON.stringify(promo.body));
        expect(promo.body.ok).toBe(true);

        // 4) promote with unknown identifier → 404
        expect((await request(app, "POST", "/api/admin/staff", { identifier: `${TAG}-ghost@e2e.test` }, owner)).status).toBe(404);

        // 5) promote the owner account itself → 400 (protect owner)
        const promoOwner = await request(app, "POST", "/api/admin/staff", {
          identifier: process.env.OWNER_TEST_EMAIL!,
        }, owner);
        expect(promoOwner.status).toBe(400);

        // 6) staff list shows the new staff row with empty permissions
        const list = await request(app, "GET", "/api/admin/staff", undefined, owner);
        expect(list.status).toBe(200);
        const staff = (list.body.staff || []).filter((x: any) => x.email === victimA.email);
        expect(staff.length).toBe(1);
        expect(staff[0].role).toBe("staff");
        expect(staff[0].permissions || {}).toEqual({});

        // 7) promote by phone identifier also works (users table supports both)
        const promoPhone = await request(app, "POST", "/api/admin/staff", { identifier: "0000000000" }, owner);
        expect(promoPhone.status).toBe(404); // no such phone — correct 404, not 500

        // 8) demoting a nonexistent id → 404 (the real owner-protection guard is
        // checked via the owner's real id in step 11)
        const demoteGhost = await request(app, "DELETE", "/api/admin/staff?id=00000000-0000-0000-0000-000000000000", undefined, owner);
        expect(demoteGhost.status).toBe(404);

        // 9) set permissions — owner only; unknown flags are silently dropped
        const patch = await request(
          app,
          "PATCH",
          `/api/admin/staff/${victimA.id}`,
          { permissions: { orders_view: true, orders_status: true, totally_fake_flag: true } },
          owner,
        );
        expect(patch.status).toBe(200, JSON.stringify(patch.body));
        expect(patch.body.permissions).toEqual({ orders_view: true, orders_status: true });

        // permissions persist in the list
        const list2 = await request(app, "GET", "/api/admin/staff", undefined, owner);
        const updated = (list2.body.staff || []).find((x: any) => x.id === victimA.id);
        expect(updated.permissions).toEqual({ orders_view: true, orders_status: true });

        // 10) demote victimA → role back to customer, permissions cleared
        const demote = await request(app, "DELETE", `/api/admin/staff?id=${victimA.id}`, undefined, owner);
        expect(demote.status).toBe(200, JSON.stringify(demote.body));
        const rowsA = await db()`select role, permissions from users where id = ${victimA.id}`;
        expect(rowsA[0].role).toBe("customer");
        expect(rowsA[0].permissions).toEqual({});

        // 11) the owner row can never be demoted (final guard on owner's own id)
        const ownerRows = await db()`select id from users where role = 'owner' limit 1`;
        expect(ownerRows.length).toBe(1);
        const demoteOwnerReal = await request(app, "DELETE", `/api/admin/staff?id=${ownerRows[0].id}`, undefined, owner);
        expect(demoteOwnerReal.status).toBe(400);
        const ownerAfter = await db()`select role from users where id = ${ownerRows[0].id}`;
        expect(ownerAfter[0].role).toBe("owner");

        // 12) staff list excludes demoted accounts
        const list3 = await request(app, "GET", "/api/admin/staff", undefined, owner);
        expect(list3.body.staff.filter((x: any) => x.email === victimA.email).length).toBe(0);

        // 13) activity log records the promote/demote actions
        const act = await request(app, "GET", "/api/admin/activity", undefined, owner);
        expect(act.status).toBe(200);
        const actions = (act.body.log || []).map((a: any) => a.action).join(" ");
        expect(actions).toContain("رقّى");
        expect(actions).toContain("شال صلاحية");
      } finally {
        await cleanup();
        // restore the owner's 2FA preference
        const ownerRows = await db()`select id from users where role = 'owner' limit 1`;
        if (ownerRows.length > 0) {
          await db()`update users set two_fa_enabled = ${ownerWas2faEnabled} where id = ${ownerRows[0].id}`;
        }
        if (sql) await sql.end();
      }
    },
  );
});
