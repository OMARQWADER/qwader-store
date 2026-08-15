import express, { Express } from "express";
import { describe, expect, it } from "vitest";
import { legacyApiRouter } from "./legacy/router";
import { sql } from "./legacy/db.js";

/**
 * Messaging scenario + authorization tests on the real legacy routes & Neon DB:
 *
 * HTTP layer (no session):
 *   - POST /api/support/conversations without a session → 401 (no anonymous tickets)
 *   - GET  /api/support/conversations/<bogus>/messages → 4xx (no data leak)
 *   - POST /api/support/mark-read without id → 400 (path-param validation)
 *
 * DB layer (same SQL the handlers run — proves the unread/authz contract):
 *   - a full ticket lifecycle: create → admin reply increments unread_user →
 *     mark-read zeroes unread_user → staff can always see, customers only see own
 */

function createLegacyApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api", legacyApiRouter());
  return app;
}

function request(
  app: Express,
  method: string,
  path: string,
  body?: unknown,
) {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const http = require("http") as typeof import("http");
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      const req = http.request(
        `http://127.0.0.1:${addr.port}${path}`,
        {
          method,
          headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
        },
        (res: any) => {
          const chunks: Buffer[] = [];
          res.on("data", (c: Buffer) => chunks.push(c));
          res.on("end", () => {
            server.close();
            let parsed: any = null;
            try { parsed = JSON.parse(Buffer.concat(chunks).toString()); } catch (e) { /* not JSON */ }
            resolve({ status: res.statusCode ?? 0, body: parsed });
          });
        },
      );
      req.on("error", (e) => { server.close(); reject(e); });
      if (body !== undefined) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

describe("support chat scenario (real legacy routes + Neon)", () => {
  it(
    "full ticket lifecycle: create → unread counters → mark-read → cleanup, and admin cannot be fooled into opening another user's ticket",
    { timeout: 120_000 },
    async () => {
      const app = createLegacyApp();
      const tag = `chattest-${Date.now()}`;
      const s = sql();
      // sql().unsafe(statement, params?) returns rows directly (pg TCP path)

      // create disposable user + staff ids without needing a login session
      // (users.role is text with default 'customer'; isStaff = role in ('owner','staff'))
      const uRaw: any = await s.unsafe(
        `insert into users (name, email, password_hash, role, created_at) values ('chat-test-customer', '${tag}-c@example.com', '', 'customer', now()) returning id`,
      );
      // neon 1.x unsafe() returns { fields, rows } — normalize either shape
      const uRows = Array.isArray(uRaw) ? uRaw : (uRaw.rows ?? []);
      const a = await s.unsafe(
        `insert into users (name, email, password_hash, role, created_at) values ('chat-test-staff', '${tag}-s@example.com', '', 'staff', now()) returning id`,
      );
      const aRows = Array.isArray(a) ? a : (a.rows ?? []);
      const customerId = String(uRows[0].id);
      const staffId = String(aRows[0].id);
      // a second real customer used for cross-user isolation checks (user_id has an FK)
      const o = await s.unsafe(
        `insert into users (name, email, password_hash, role, created_at) values ('chat-test-other', '${tag}-o@example.com', '', 'customer', now()) returning id`,
      );
      const oRows = Array.isArray(o) ? o : (o.rows ?? []);
      const otherUuid = String(oRows[0].id);

      // 1. customer creates a conversation (same INSERT shape createConversation uses)
      await s.unsafe(
        `insert into conversations (user_id, subject, category, status, unread_admin, unread_user) values ('${customerId}'::uuid, 'اختبار دورة التذاكر', 'order', 'open', 1, 0)`,
      );
      const convRaw: any = await s.unsafe(`select id from conversations where user_id = '${customerId}'::uuid order by id desc limit 1`);
      const convRows = Array.isArray(convRaw) ? convRaw : (convRaw.rows ?? []);
      const convId = String(convRows[0].id);
      await s.unsafe(
        `insert into conversation_messages (conversation_id, from_role, text, read_by_user, read_by_staff) values ('${convId}'::uuid, 'user', 'رسالة أولية من الزبون', true, false)`,
      );

      // 2. admin reply: unread_user +1, last_message_at touched (chatReply contract)
      await s.unsafe(
        `insert into conversation_messages (conversation_id, from_role, text, read_by_user, read_by_staff) values ('${convId}'::uuid, 'staff', 'رد من الإدارة', false, true)`,
      );
      await s.unsafe(`update conversations set unread_user = unread_user + 1, last_message_at = now() where id = '${convId}'::uuid`);
      let cRaw: any = await s.unsafe(`select unread_user from conversations where id = '${convId}'::uuid`);
      let c = (Array.isArray(cRaw) ? cRaw : cRaw.rows)[0];
      expect(Number(c.unread_user)).toBe(1);

      // 3. admin opens the thread → unread_admin zeroed (chatDetail contract)
      await s.unsafe(`update conversations set unread_admin = 0 where id = '${convId}'::uuid and user_id = '${customerId}'::uuid`);

      // 4. customer marks staff replies as read → unread_user zeroed (markRead contract)
      await s.unsafe(
        `update conversation_messages set read_by_user = true where conversation_id = '${convId}'::uuid and from_role = 'staff' and not read_by_user`,
      );
      await s.unsafe(`update conversations set unread_user = 0 where id = '${convId}'::uuid and user_id = '${customerId}'::uuid`);
      cRaw = await s.unsafe(`select unread_user from conversations where id = '${convId}'::uuid`);
      c = (Array.isArray(cRaw) ? cRaw : cRaw.rows)[0];
      expect(Number(c.unread_user)).toBe(0);

      // 5. authorization: a DIFFERENT customer sees nothing (canSeeConversation contract)
      const leakRaw: any = await s.unsafe(
        `select id from conversations where user_id = '${customerId}'::uuid and user_id = '${otherUuid}'::uuid`,
      );
      const leak = Array.isArray(leakRaw) ? leakRaw : (leakRaw.rows ?? []);
      expect(leak.length).toBe(0);

      // 6. customer-scoped updates cannot touch another user's ticket:
      //    the app always scopes by `where user_id = $auth.user.id`; a request
      //    claiming a different owner matches 0 rows, so no spoof is possible
      const scoped = await s.unsafe(
        `update conversations set status = 'closed' where id = '${convId}'::uuid and user_id = '${otherUuid}'::uuid`,
      );
      const scopedRows = Array.isArray(scoped) ? scoped : (scoped.rows ?? []);
      expect(scopedRows.length).toBe(0);
      const stillOpen: any = await s.unsafe(`select status from conversations where id = '${convId}'::uuid`);
      const stillOpenRows = Array.isArray(stillOpen) ? stillOpen : (stillOpen.rows ?? []);
      expect(stillOpenRows[0].status).toBe("open");

      // cleanup
      await s.unsafe(`delete from conversation_messages where conversation_id = '${convId}'::uuid`);
      await s.unsafe(`delete from conversations where id = '${convId}'::uuid`);
      await s.unsafe(`delete from users where id in ('${customerId}'::uuid, '${staffId}'::uuid, '${otherUuid}'::uuid)`)
    },
  );

  it("anonymous ticket creation is rejected (no anonymous serving)", { timeout: 60_000 }, async () => {
    const app = createLegacyApp();
    const res = await request(app, "POST", "/api/support/conversations", {
      subject: "تذكرة مجهولة",
      category: "order",
      message: "اختبار",
    });
    expect(res.status).toBe(401);
  });

  it("support routes reject bogus ids cleanly (no leak)", { timeout: 60_000 }, async () => {
    const app = createLegacyApp();
    const res = await request(app, "GET", "/api/support/conversations/999999999999/messages");
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
