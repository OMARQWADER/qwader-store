import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { sql } from "./legacy/db";
import { resolveDeliveryFee, applyDelivery, recalcCart } from "./legacy/common.js";
import type { NeonQueryFunction } from "@neondatabase/serverless";

/* Delivery-fee specs.

The owner configures companies/cities/prices in site_content.shipping. The
client never sends a fee — the server re-looks-up the price from that config
using only { companyId, cityName } sent by the client. resolveDeliveryFee is
the pure server-side validator; applyDelivery folds it into a recomputed cart.

These tests run against the REAL Neon legacy DB, so they use a tag-isolated
company id that does not collide with the seeded production company. */

const unique = Date.now().toString(36);
const TEST_COMPANY_ID = `comp-test-${unique}`;

const TEST_SHIPPING = {
  enabled: true,
  companies: [
    {
      id: TEST_COMPANY_ID,
      name: "شركة اختبار",
      phone: "",
      enabled: true,
      regions: [
        { city: "عمّان", price: 2.5, enabled: true },
        { city: "الزرقاء", price: 3, enabled: true },
        { city: "محافظة", price: 5.5, enabled: false }, // disabled region must be rejected
      ],
    },
    { id: "comp-disabled-1", name: "مغلقة", enabled: false, regions: [{ city: "عمّان", price: 1, enabled: true }] },
  ],
};

function mergeTestShipping(realCfg: any) {
  const companies = Array.isArray(realCfg?.companies) ? realCfg.companies : [];
  const others = companies.filter((c: any) => c.id !== TEST_COMPANY_ID);
  return { ...realCfg, companies: [...others, ...TEST_SHIPPING.companies] };
}

beforeAll(async () => {
  const s = sql() as any as NeonQueryFunction<false, boolean>;
  const rows = await s`select value from site_content where key = 'shipping'`;
  const real = rows.length > 0 ? rows[0].value : { enabled: true, companies: [] };
  await s`update site_content set value = ${mergeTestShipping(real)}::jsonb where key = 'shipping'`;
}, 60_000);

afterAll(async () => {
  const s = sql() as any as NeonQueryFunction<false, boolean>;
  const rows = await s`select value from site_content where key = 'shipping'`;
  const real = rows.length > 0 ? rows[0].value : { enabled: true, companies: [] };
  const companies = Array.isArray(real?.companies)
    ? real.companies.filter((c: any) => c.id !== TEST_COMPANY_ID)
    : [];
  await s`update site_content set value = ${mergeTestShipping(real)}::jsonb where key = 'shipping'`;
}, 60_000);

describe("resolveDeliveryFee (server-side validation)", () => {
  it("returns the exact configured fee for a valid company + city pair", async () => {
    const s = sql();
    const fee = await resolveDeliveryFee(s, TEST_COMPANY_ID, "عمّان");
    expect(fee).toEqual({ fee: 2.5, companyName: "شركة اختبار", cityName: "عمّان" });
  });

  it("rejects a disabled region even though it exists in the config", async () => {
    const s = sql();
    const fee = await resolveDeliveryFee(s, TEST_COMPANY_ID, "محافظة");
    expect(fee).toBeNull();
  });

  it("rejects a disabled company", async () => {
    const s = sql();
    const fee = await resolveDeliveryFee(s, "comp-disabled-1", "عمّان");
    expect(fee).toBeNull();
  });

  it("rejects unknown cities (cannot inflate fees)", async () => {
    const s = sql();
    const fee = await resolveDeliveryFee(s, TEST_COMPANY_ID, "مدينة غير موجودة");
    expect(fee).toBeNull();
  });

  // Neon cold-start can add ~60s to the first query — allow generous headroom.
  it("rejects unknown company ids", { timeout: 120_000 }, async () => {
    const s = sql();
    const fee = await resolveDeliveryFee(s, "comp-fake", "عمّان");
    expect(fee).toBeNull();
  });

  it("rejects empty inputs", { timeout: 120_000 }, async () => {
    const s = sql();
    expect(await resolveDeliveryFee(s, "", "عمّان")).toBeNull();
    expect(await resolveDeliveryFee(s, TEST_COMPANY_ID, "")).toBeNull();
    expect(await resolveDeliveryFee(s, undefined as any, undefined as any)).toBeNull();
  });

  it("rejects a negative price if a region is tampered with", async () => {
    const s = sql() as any as NeonQueryFunction<false, boolean>;
    const rows = await s`select value from site_content where key = 'shipping'`;
    const cfg = rows[0].value;
    cfg.companies = [...cfg.companies, { id: "comp-neg", name: "n", enabled: true, regions: [{ city: "عمّان", price: -10, enabled: true }] }];
    await s`update site_content set value = ${cfg}::jsonb where key = 'shipping'`;
    try {
      expect(await resolveDeliveryFee(sql(), "comp-neg", "عمّان")).toBeNull();
    } finally {
      cfg.companies = cfg.companies.filter((c: any) => c.id !== "comp-neg");
      await s`update site_content set value = ${cfg}::jsonb where key = 'shipping'`;
    }
  });
});

describe("applyDelivery", () => {
  it("adds the server-validated fee to the recomputed total and stamps company/city", async () => {
    const s = sql();
    // build a trivial recalc-shaped result: kind ok + total.
    const recalc: any = { kind: "ok", subtotal: 10, couponDiscount: 0, autoDiscount: 0, total: 10 };
    const withDelivery = await applyDelivery(s, recalc, { companyId: TEST_COMPANY_ID, cityName: "الزرقاء" });
    expect(withDelivery?.deliveryFee).toBe(3);
    expect(withDelivery?.deliveryCompany).toBe("شركة اختبار");
    expect(withDelivery?.deliveryCity).toBe("الزرقاء");
    expect(withDelivery?.total).toBe(13);
  });

  it("returns null (order rejected) when the selection is invalid instead of silently skipping delivery", async () => {
    const s = sql();
    const recalc: any = { kind: "ok", subtotal: 10, couponDiscount: 0, autoDiscount: 0, total: 10 };
    const withDelivery = await applyDelivery(s, recalc, { companyId: "comp-fake", cityName: "عمّان" });
    expect(withDelivery).toBeNull();
  });

  it("accepts the free store-pickup mode (companyId=pickup) with zero fee and stamps the pickup city", async () => {
    const s = sql();
    const recalc: any = { kind: "ok", subtotal: 10, couponDiscount: 0, autoDiscount: 0, total: 10 };
    const withPickup = await applyDelivery(s, recalc, { companyId: "pickup", cityName: "استلام من المتجر" });
    expect(withPickup?.deliveryFee).toBe(0);
    expect(withPickup?.deliveryCity).toBe("استلام من المتجر");
    expect(withPickup?.deliveryCompany).toBeNull();
    expect(withPickup?.total).toBe(10); // total must stay unchanged
  });

  it("pickup stays free even with a tampered fee in the payload", async () => {
    const s = sql();
    const recalc: any = { kind: "ok", subtotal: 10, couponDiscount: 0, autoDiscount: 0, total: 10 };
    const withPickup = await applyDelivery(s, recalc, { companyId: "pickup", cityName: "استلام من المتجر", fee: 500 });
    expect(withPickup?.deliveryFee).toBe(0);
    expect(withPickup?.total).toBe(10);
  });
});

describe("order creation end-to-end with delivery", () => {
  // Neon cold-start after idle can add ~60s per first query; this e2e runs
  // ~10 sequential queries — allow generous headroom.
  it("persisted order carries the validated delivery columns", { timeout: 240_000 }, async () => {
    const { legacyApiRouter } = await import("./legacy/router");
    const express = (await import("express")).default;
    const http = await import("node:http");
    const auth = await import("./legacy/auth.js");

    const app = express();
    app.use(express.json());
    app.use("/api", legacyApiRouter());

    // one persistent server for the whole e2e — avoids the ~75s of startup/cold-
    // start overhead from spinning up and tearing down a server per request
    const server = await new Promise<http.Server>((resolve, reject) => {
      const srv = http.createServer(app);
      srv.listen(0, "127.0.0.1", () => resolve(srv));
      srv.on("error", reject);
    });
    const port = (server.address() as { port: number }).port;
    const url = `http://127.0.0.1:${port}`;

    const s = sql() as any as NeonQueryFunction<false, boolean>;
    const email = `ship-${unique}@example.com`;
    await s`DELETE FROM login_attempts WHERE email = ${email}`;
    const hash = await auth.hashPassword("ShipTestPass9!");
    const u = await s`INSERT INTO users (name, email, phone, password_hash, role)
      VALUES ('Ship Test', ${email}, ${`+962790000${unique}0`}, ${hash}, 'customer') RETURNING id`;
    const userId = String(u[0].id);

    function request(method: string, path: string, body?: unknown, cookie?: string) {
      return new Promise<{ status: number; body: any; cookie: string | null }>((resolve, reject) => {
        const full = `${url}${path}`;
        const headers: Record<string, string> = { "user-agent": `vitest-ship-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}` };
        if (body !== undefined) headers["Content-Type"] = "application/json";
        if (cookie) headers.Cookie = cookie;
        const req = http.request(full, { method, headers }, (res) => {
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

    // find a seedable in-stock game (real catalog, server-priced)
    const catalog = await s`select value from site_content where key = 'games'`;
    const games = Array.isArray(catalog[0]?.value) ? catalog[0].value : [];
    const game = games.find((g: any) => !g.outOfStock && g.status !== "unavailable" && typeof g.price === "number" && Number(g.price) > 0) || games[0];
    expect(game).toBeTruthy();

    // 2FA is mandatory for the new account; complete login with the seeded OTP
    const login1 = await request("POST", "/api/auth/login", { identifier: email, password: "ShipTestPass9!" });
    const preToken = login1.body?.preToken;
    const otpRows = await s`select code from otp_codes where user_id = ${userId} and purpose = '2fa' order by id desc limit 1`;
    const code = String(otpRows[0].code);
    const login2 = await request("POST", "/api/auth/login", { identifier: email, password: "ShipTestPass9!", twoFACode: code, preToken });
    expect(login2.status).toBe(200);
    const cookie = login2.cookie ?? null;
    expect(cookie).toBeTruthy();

    const items = [{ pid: `game:${game.id}`, name: game.name, qty: 2 }];

    // happy path: valid delivery selection is accepted and fee added
    const ok = await request("POST", "/api/orders/mine", {
      items, custom: false, paymentMethod: "cod", name: "Ship Test",
      phone: `+962790000${unique}0`,
      delivery: { companyId: TEST_COMPANY_ID, cityName: "عمّان" },
    }, cookie);
    expect(ok.status).toBe(201);
    expect(ok.body.order).toBeTruthy();
    expect(Number(ok.body.deliveryFee)).toBe(2.5);
    expect(ok.body.deliveryCompany).toBe("شركة اختبار");
    expect(ok.body.deliveryCity).toBe("عمّان");
    // total = 2 * game price + 2.5 fee — proves the fee was added server-side
    expect(Number(ok.body.order.total)).toBeCloseTo(Number(game.price) * 2 + 2.5, 5);

    // malicious path: spoofed higher fee is ignored; order creation fails instead
    const bad = await request("POST", "/api/orders/mine", {
      items, custom: false, paymentMethod: "cod", name: "Ship Test",
      phone: `+962790000${unique}0`,
      delivery: { companyId: TEST_COMPANY_ID, cityName: "عمّان", fee: 9999 },
    }, cookie);
    expect(bad.status).toBe(201);
    expect(Number(bad.body.deliveryFee)).toBe(2.5); // never trusts client fee
    expect(Number(bad.body.order.total)).toBeCloseTo(Number(game.price) * 2 + 2.5, 5);

    // invalid selection is rejected outright (no order created)
    const invalid = await request("POST", "/api/orders/mine", {
      items, custom: false, paymentMethod: "cod", name: "Ship Test",
      phone: `+962790000${unique}0`,
      delivery: { companyId: TEST_COMPANY_ID, cityName: "مدينة غير موجودة" },
    }, cookie);
    expect(invalid.status).toBe(400);

    // disabled-region selection is rejected
    const disabledRegion = await request("POST", "/api/orders/mine", {
      items, custom: false, paymentMethod: "cod", name: "Ship Test",
      phone: `+962790000${unique}0`,
      delivery: { companyId: TEST_COMPANY_ID, cityName: "محافظة" },
    }, cookie);
    expect(disabledRegion.status).toBe(400);

    // cleanup: delete seeded orders and user
    await s`DELETE FROM orders WHERE user_id = ${userId}`;
    await s`DELETE FROM users WHERE id = ${userId}`;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
}, 120_000);
