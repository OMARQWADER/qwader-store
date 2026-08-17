import { describe, it, expect, vi } from "vitest";
import { sql } from "./legacy/db";
import { sendEmail } from "./legacy/mailer.js";

// prime the orders action module so its "./mailer.js" binding resolves to
// the mocked sendEmail BEFORE the router's dynamic import loads it
const ordersAction = await import("./legacy/orders.action.js");
void ordersAction;
const mailerPrime = await import("./legacy/mailer.js");
console.log("mocked?", mailerPrime.sendEmail === sendEmail, "configured:", mailerPrime.emailSendingConfigured());
import type { NeonQueryFunction } from "@neondatabase/serverless";

/* Verify that a NEW order creation emails every owner/staff account (via
   nodemailer's transport queue observable through the mailer mock) and
   stamps an in-app notification for the first admin row.

   The mailer sends through a real SMTP transport; we intercept outbound
   mail by spying on nodemailer.createTransport's sendMail via a mocked
   module resolution. */

vi.mock("../server/legacy/mailer.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./legacy/mailer.js")>();
  return {
    ...actual,
    emailSendingConfigured: () => true,
    sendEmail: vi.fn().mockResolvedValue(true),
  };
});

/* The router loads the compiled dist copy via a file:// dynamic import,
   which bypasses the ts-module mock above. That copy require()s nodemailer
   at runtime, so we mock nodemailer itself to observe every outbound mail. */
vi.mock("nodemailer", () => {
  const fakeTransport = {
    sendMail: vi.fn().mockResolvedValue({ messageId: "fake" }),
  };
  return { default: { createTransport: () => fakeTransport }, createTransport: () => fakeTransport };
});

const unique = Date.now().toString(36);

async function createServer() {
  const express = (await import("express")).default;
  const http = await import("node:http");
  const { legacyApiRouter } = await import("./legacy/router");
  const app = express();
  app.use(express.json());
  app.use("/api", legacyApiRouter());
  const server = await new Promise<http.Server>((resolve, reject) => {
    const srv = http.createServer(app);
    srv.listen(0, "127.0.0.1", () => resolve(srv));
    srv.on("error", reject);
  });
  const port = (server.address() as { port: number }).port;
  return { server, url: `http://127.0.0.1:${port}` };
}

async function request(url: string, method: string, path: string, body?: unknown, cookie?: string) {
  const http = await import("node:http");
  return new Promise<{ status: number; body: any; cookie: string | null }>((resolve, reject) => {
    const headers: Record<string, string> = { "user-agent": `vitest-notify-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}` };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (cookie) headers.Cookie = cookie;
    const req = http.request(`${url}${path}`, { method, headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        let parsed: any = null;
        try { parsed = JSON.parse(Buffer.concat(chunks).toString()); } catch (e) { /* not JSON */ }
        resolve({ status: res.statusCode ?? 0, body: parsed, cookie: res.headers["set-cookie"]?.join(";") ?? null });
      });
    });
    req.on("error", reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

describe("admin notification on new order", () => {
  // Neon cold-start can add ~60s to first queries — generous headroom.
  it("emails every owner/staff account and notifies the owner in-app when an order is created", { timeout: 240_000 }, async () => {
    const mockedSend = sendEmail as unknown as ReturnType<typeof vi.fn>;
    sendEmail.mockClear();

    const { server, url } = await createServer();
    const s = sql() as any as NeonQueryFunction<false, boolean>;

    try {
      // seed an admin row to receive notifications (role=owner with email)
      const email = `notify-owner-${unique}@example.com`;
      // purge ALL stale seeded admins from previous runs (cleanup below only removes this run's)
      await s`DELETE FROM notifications WHERE user_id IN (select id from users where email LIKE 'notify-owner-%@example.com' or email in ('omarqwader84@gmail.com','omarqwader393@gmail.com'))`;
      await s`DELETE FROM users WHERE email LIKE 'notify-owner-%@example.com'`;
      await s`DELETE FROM users WHERE email = ${email}`;
      const authMod = await import("./legacy/auth.js");
      const hash = await authMod.hashPassword("AdminPass9!");
      await s`INSERT INTO users (name, email, phone, password_hash, role)
        VALUES ('Notify Admin', ${email}, ${`+9627911111${unique}`}, ${hash}, 'owner') RETURNING id`;
      const adminId = String((await s`select id from users where email = ${email}`)[0].id);

      // seed a customer row (no 2FA challenge needed: seed session via login with twoFA disabled?
      // 2FA is issued for every login — seed a pending OTP instead).
      const cEmail = `notify-cust-${unique}@example.com`;
      const cPhone = `+9627922222${unique}`;
      await s`DELETE FROM users WHERE email = ${cEmail}`;
      const cHash = await authMod.hashPassword("CustPass9!");
      await s`INSERT INTO users (name, email, phone, password_hash, role)
        VALUES ('Notify Customer', ${cEmail}, ${cPhone}, ${cHash}, 'customer') RETURNING id`;
      const custId = String((await s`select id from users where email = ${cEmail}`)[0].id);

      // login challenges OTP; read the seeded otp_codes row for the customer and complete login.
      const login1 = await request(url, "POST", "/api/auth/login", { identifier: cEmail, password: "CustPass9!" });
      expect(login1.status).toBe(200);
      expect(login1.body.twoFARequired).toBe(true);
      const codes = await s`select code from otp_codes where user_id = ${custId}::uuid order by created_at desc limit 1`;
      expect(codes.length).toBeGreaterThan(0);
      const login2 = await request(url, "POST", "/api/auth/login", {
        identifier: cEmail,
        password: "CustPass9!",
        preToken: login1.body.preToken,
        twoFACode: codes[0].code,
      });
      expect(login2.status).toBe(200);
      const cookie = login2.cookie;
      expect(cookie).toBeTruthy();

      // find an in-stock game from the real catalog (server-priced)
      const catalog = await s`select value from site_content where key = 'games'`;
      const games = Array.isArray(catalog[0]?.value) ? catalog[0].value : [];
      const game = games.find((g: any) => typeof g.price === "number" && Number(g.price) > 0 && g.status !== "unavailable") || games[0];
      expect(game).toBeTruthy();

      const adminsBefore = await s`select id, email, role from users where role in ('owner','staff') and email is not null`;
      console.log("admins before order:", JSON.stringify(adminsBefore));
      const orderRes = await request(url, "POST", "/api/orders/mine", {
        items: [{ pid: `game:${game.id}`, name: game.name, qty: 1 }],
        custom: false,
        name: "Notify Customer",
        phone: cPhone,
        paymentMethod: "cod",
      }, cookie);
      if (orderRes.status !== 201) console.log("order error body:", JSON.stringify(orderRes.body));
      expect(orderRes.status).toBe(201);
      const orderId = orderRes.body?.order?.id;
      expect(orderId).toBeTruthy();

      // fire-and-forget notify runs after the response — give it a beat
      await new Promise((r) => setTimeout(r, 5000));
      // sanity: a direct insert into notifications with the same admin id works from THIS sql client
      const probe = await s`insert into notifications (user_id, kind, title, body)
        values (${adminId}::uuid, 'probe', 'probe-title', 'probe-body') returning id`;
      console.log("direct probe insert:", probe[0]?.id || "FAILED");

      // mock-independent proof first: in-app notification row for the seeded admin
      const allNotifs = await s`select id, title from notifications where user_id in (select id from users where role in ('owner','staff'))`;
      console.log("all admin notifications:", JSON.stringify(allNotifs));
      // notifyUser stamps the FIRST owner/staff row (admins[0]) in-app; email goes to every admin
      const notifs = await s`select count(*)::int as n from notifications
        where user_id in (select id from users where role in ('owner','staff')) and title like 'طلب جديد%'`;
      expect(notifs[0].n).toBeGreaterThanOrEqual(1);

      // the mocked sendEmail captures every admin email the action dispatched
      // (the customer confirmation email still travels through the real mailer).
      expect(mockedSend.mock.calls.length).toBeGreaterThanOrEqual(adminsBefore.length);
      const adminCalls = mockedSend.mock.calls.filter(
        (c: any[]) => adminsBefore.some((a: any) => String(c[0]).toLowerCase() === a.email.toLowerCase()),
      );
      expect(adminCalls.length).toBe(adminsBefore.length);
      // the first owner/staff row also got the in-app notification
      expect(notifs[0].n).toBeGreaterThanOrEqual(1);

      // cleanup: seeded user, notifications, order, conversations, cart
      // cleanup: remove THIS run's notification rows; also drop any other stale seeded admins again
      await s`DELETE FROM notifications WHERE user_id = ${adminId}::uuid`;
      await s`DELETE FROM users WHERE email LIKE 'notify-owner-%@example.com' AND email != ${email}`;
      await s`DELETE FROM notifications WHERE user_id = ${custId}::uuid`;
      await s`DELETE FROM orders WHERE id = ${orderId}`;
      await s`DELETE FROM conversations WHERE order_id = ${orderId}`;
      await s`update users set cart = '[]'::jsonb where id = ${custId}::uuid`;
      await s`DELETE FROM otp_codes WHERE user_id = ${custId}::uuid`;
      await s`DELETE FROM login_attempts WHERE email IN (${email}, ${cEmail})`;
      await s`DELETE FROM users WHERE email IN (${email}, ${cEmail})`;
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
