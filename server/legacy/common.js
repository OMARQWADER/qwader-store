import crypto from "node:crypto";
import { sql } from "./db.js";

/* ============================================================
   Shared helpers used by every combined route file.
   ============================================================ */

/* ---------- safe error wrapper ---------- */
export function withErrorHandler(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      console.error(`[api] ${req.url} error:`, e);
      return res.status(500).json({ error: "حدث خطأ، حاول مرة أخرى" });
    }
  };
}

/* ---------- rate limiting (server-side, DB-backed, per fingerprint) ---------- */
function clientFingerprint(req) {
  // anonymous visitors: ip + UA hash. Logged-in users: their user id.
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded ? String(forwarded).split(",")[0].trim() : (req.socket?.remoteAddress || "unknown");
  const ua = String(req.headers["user-agent"] || "").slice(0, 120);
  return crypto.createHash("sha1").update(`${ip}|${ua}`).digest("hex").slice(0, 16);
}

/* Limits per action key: { windowSec, maxCount }. */
const LIMITS = {
  login:          { windowSec: 300, maxCount: 7 },
  signup:         { windowSec: 300, maxCount: 5 },
  otp_send:       { windowSec: 60, maxCount: 3 },
  forgot:         { windowSec: 300, maxCount: 5 },
  chat_send:      { windowSec: 60, maxCount: 20 },
  contact_send:   { windowSec: 60, maxCount: 5 },
  order_create:   { windowSec: 60, maxCount: 10 },
  review:         { windowSec: 60, maxCount: 5 },
  upload:         { windowSec: 60, maxCount: 10 },
  notif_poll:     { windowSec: 60, maxCount: 60 },
};

export async function checkRateLimit(key, kind = "order_create") {
  const limit = LIMITS[kind] || LIMITS.order_create;
  const fullKey = `${kind}:${key}`;
  const s = sql();
  const rows = await s`select count, window_start from rate_limits where key = ${fullKey}`;
  const now = new Date();
  if (rows.length === 0) {
    await s`insert into rate_limits (key, count, window_start) values (${fullKey}, 1, ${now})`;
    return { ok: true };
  }
  const row = rows[0];
  if (now - new Date(row.window_start) > limit.windowSec * 1000) {
    await s`update rate_limits set count = 1, window_start = ${now} where key = ${fullKey}`;
    return { ok: true };
  }
  if (row.count >= limit.maxCount) {
    const remain = Math.ceil((limit.windowSec * 1000 - (now - new Date(row.window_start))) / 1000);
    return { ok: false, retryAfterSec: remain };
  }
  await s`update rate_limits set count = count + 1 where key = ${fullKey}`;
  return { ok: true };
}

/* convenience: rate-limit by auth user id or fingerprint */
export async function rateLimitBy(auth, req, kind) {
  const key = auth ? `u:${auth.user.id}` : clientFingerprint(req);
  const check = await checkRateLimit(key, kind);
  if (!check.ok) return { limited: true, retryAfterSec: check.retryAfterSec };
  return { limited: false };
}

/* ---------- server-side price engine ----------
   Never trusts client-supplied totals. Recomputes from the catalog. */

const CARD_PREFIXES = ["card", "pc"];
const SUB_PREFIX = "sub";
const GAME_PREFIX = "game";

export function parseProductId(pid) {
  if (!pid) return null;
  const parts = String(pid).split(":");
  const kind = parts[0];
  if (kind === GAME_PREFIX) return { kind, id: parts[1] || null };
  if (kind === SUB_PREFIX) return { kind, region: parts[1], name: parts[2], idx: Number(parts[3]) };
  if (CARD_PREFIXES.includes(kind)) return { kind, id: parts[1], rowIdx: Number(parts[2]) };
  if (kind === "repeat") return { kind, id: parts[1], name: parts.slice(2).join(":") };
  return { kind, raw: pid };
}

/* Find the real selling price for one cart item from site_content rows. */
export async function priceForItem(s, item) {
  const p = parseProductId(item.pid);
  if (!p) return null;
  if (p.kind === GAME_PREFIX) {
    const rows = await s`select value from site_content where key = 'games'`;
    const games = (rows.length > 0 && Array.isArray(rows[0].value)) ? rows[0].value : [];
    const g = games.find(gx => gx.id === p.id);
    if (!g || !g.price || Number.isNaN(Number(g.price))) return null;
    return { price: Number(g.price), name: g.name, platform: g.platform || "", region: "", currency: "JOD", variant: "", category: "games", available: !g.outOfStock && g.status !== "unavailable" && g.availability !== "unavailable" };
  }
  if (p.kind === SUB_PREFIX) {
    const rows = await s`select value from site_content where key = 'subscriptions'`;
    const subs = (rows.length > 0 && Array.isArray(rows[0].value)) ? rows[0].value : [];
    const sub = subs.find(sx => sx.region === p.region && String(sx.name).toLowerCase() === String(p.name || "").toLowerCase());
    if (!sub || !Array.isArray(sub.rows) || sub.rows[p.idx] === undefined) return null;
    const r = sub.rows[p.idx];
    return { price: Number(r.price), name: `${sub.label || sub.region} - ${sub.name} - ${sub.labels ? sub.labels[p.idx] : r.amt}`, platform: sub.name || "", region: sub.region || sub.label || "", currency: "JOD", variant: sub.labels ? sub.labels[p.idx] : r.amt, category: "subscriptions", available: !sub.outOfStock };
  }
  if (p.kind === "card") {
    const rows = await s`select value from site_content where key = 'cards'`;
    const cards = (rows.length > 0 && Array.isArray(rows[0].value)) ? rows[0].value : [];
    const c = cards.find(cx => cx.id === p.id);
    if (!c || !Array.isArray(c.rows) || c.rows[p.rowIdx] === undefined) return null;
    const r = c.rows[p.rowIdx];
    return { price: Number(r.price), name: `${c.label} ${r.amt}`, platform: c.label || "", region: c.flag || "", currency: "JOD", variant: r.amt, category: "cards", available: !c.outOfStock };
  }
  if (p.kind === "repeat") {
    // repeat of a previous order item — price was 0 in the old format;
    // look it up by name in the current catalog instead of trusting 0
    const rows = await s`select value from site_content where key = 'games'`;
    const games = (rows.length > 0 && Array.isArray(rows[0].value)) ? rows[0].value : [];
    const g = games.find(gx => gx.name === p.name);
    if (g && g.price) return { price: Number(g.price), name: g.name, platform: g.platform || "", region: "", currency: "JOD", variant: "", category: "games", available: !g.outOfStock };
    return null; // name not found in current catalog — refuse rather than price 0
  }
  return null;
}

/* ---------- delivery fee resolution (server-side, untrusted inputs) ----------
   Validates the chosen delivery company + city against the owner-managed
   `shipping` JSON in site_content and returns the exact fee. Never trusts
   the fee sent by the client. Returns null when the feature is disabled,
   or { fee, companyName, cityName } otherwise. */
export async function resolveDeliveryFee(s, companyId, cityName) {
  const rows = await s`select value from site_content where key = 'shipping'`;
  const cfg = (rows.length > 0 && rows[0].value && typeof rows[0].value === "object") ? rows[0].value : null;
  const enabled = cfg && Array.isArray(cfg.companies) && cfg.enabled !== false;
  if (!enabled) return null; // feature disabled or unconfigured — no fee, skip selection
  const cid = String(companyId || "").trim();
  const city = String(cityName || "").trim();
  if (!cid || !city) return null;
  const comp = cfg.companies.find(c => c && c.id === cid && c.enabled !== false);
  if (!comp || !Array.isArray(comp.regions)) return null;
  const region = comp.regions.find(r => r && String(r.city).trim() === city && r.enabled !== false);
  if (!region || typeof region.price !== "number" || region.price < 0) return null;
  return {
    fee: Math.round(Number(region.price) * 100) / 100,
    companyName: comp.name || "",
    cityName: city,
  };
}

/* Recalculate a whole cart server-side. Returns null if ANY item is
   unresolvable (refuses to create an order with unknown prices). */
export async function recalcCart(s, items, userId, couponCode) {
  const snapshot = [];
  let subtotal = 0;
  let categoryIds = [];
  for (const it of items) {
    const real = await priceForItem(s, it);
    if (!real) return null;
    const qty = Math.min(50, Math.max(1, Number(it.qty) || 1));
    if (real.available === false) return null; // cannot order unavailable items
    subtotal = Math.round((subtotal + real.price * qty) * 100) / 100;
    categoryIds.push(real.category);
    snapshot.push({
      pid: it.pid,
      name: real.name,
      price: real.price,
      qty,
      platform: real.platform,
      region: real.region,
      currency: real.currency,
      variant: real.variant,
      category: real.category,
    });
  }

  let discountAmount = 0;
  let appliedCoupon = null;

  // 1) coupon (server-validated: existence, expiry, min order, caps, limits, scope)
  if (couponCode) {
    const code = String(couponCode).trim();
    const crows = await s`select * from coupons where lower(code) = ${code.toLowerCase()} and enabled = true`;
    const coupon = crows[0];
    if (!coupon) return { kind: "coupon", error: "الكوبون غير موجود" };
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return { kind: "coupon", error: "الكوبون منتهي الصلاحية" };
    if (subtotal < Number(coupon.min_order || 0)) return { kind: "coupon", error: `الحد الأدنى للطلب ${Number(coupon.min_order)} د.أ` };
    // scope: product/category restriction
    if (coupon.applies_to !== "all") {
      const target = Array.isArray(coupon.applies_target) ? coupon.applies_target.map(String) : [];
      const allMatch = snapshot.every(sn =>
        coupon.applies_to === "product" ? target.includes(sn.pid) : target.includes(sn.category)
      );
      if (!allMatch) return { kind: "coupon", error: "هذا الكوبون لا ينطبق على منتجات السلة" };
    }
    // usage limits
    if (coupon.usage_limit) {
      const urows = await s`select count(*)::int as c from coupon_usage where coupon_id = ${coupon.id}`;
      if (urows[0].c >= coupon.usage_limit) return { kind: "coupon", error: "انتهت استخدامات هذا الكوبون" };
    }
    if (userId && coupon.per_user_limit) {
      const urows = await s`select count(*)::int as c from coupon_usage where coupon_id = ${coupon.id} and user_id = ${userId}`;
      if (urows[0].c >= coupon.per_user_limit) return { kind: "coupon", error: "استخدمت هذا الكوبون بالحد المسموح" };
    }
    if (coupon.type === "percent") {
      discountAmount = Math.round(subtotal * (Number(coupon.value) / 100) * 100) / 100;
      if (coupon.max_discount) discountAmount = Math.min(discountAmount, Number(coupon.max_discount));
      appliedCoupon = { code, type: "percent", value: Number(coupon.value) };
    } else {
      discountAmount = Math.min(Number(coupon.value), subtotal);
      appliedCoupon = { code, type: "fixed", value: Number(coupon.value) };
    }
  }

  // 2) automatic per-account discount (welcome/referral) — from the account, never the client
  let autoDiscountPercent = 0;
  if (userId) {
    const urows = await s`select discount_percent from users where id = ${userId}`;
    autoDiscountPercent = Number((urows[0] && urows[0].discount_percent) || 0) || 0;
  }
  let autoDiscount = 0;
  let afterCoupon = subtotal - discountAmount;
  if (autoDiscountPercent > 0) {
    autoDiscount = Math.round(afterCoupon * (autoDiscountPercent / 100) * 100) / 100;
  }
  const total = Math.round((afterCoupon - autoDiscount) * 100) / 100;

  return {
    kind: "ok",
    subtotal: Math.round(subtotal * 100) / 100,
    couponDiscount: Math.round(discountAmount * 100) / 100,
    autoDiscount: Math.round(autoDiscount * 100) / 100,
    total,
    snapshot,
    appliedCoupon,
    autoDiscountPercent,
    consumeAutoDiscount: autoDiscountPercent > 0,
  };
}

/* Apply delivery to a server-recomputed cart. `info` is the client-sent
   { companyId, cityName } pair; the fee is always re-validated server-side.
   Mutates nothing — returns a result object or null on invalid selection. */
export async function applyDelivery(s, recalc, info) {
  if (!recalc || recalc.kind !== "ok") return null;
  // optional delivery notes (address / nearby landmark) — sanitized free text
  const deliveryNotes = info && typeof info.notes === "string" ? info.notes.trim().slice(0, 500) : "";
  // free store pickup — always valid, fee is always 0
  if (info?.companyId === "pickup") {
    return {
      ...recalc,
      deliveryFee: 0,
      deliveryCompany: null,
      deliveryCity: "استلام من المتجر",
      deliveryNotes,
      total: recalc.total,
    };
  }
  const resolved = await resolveDeliveryFee(s, info?.companyId, info?.cityName);
  // unresolved/invalid selection must FAIL the order (never silently skip delivery)
  if (!resolved) return null;
  return {
    ...recalc,
    deliveryFee: resolved.fee,
    deliveryCompany: resolved.companyName,
    deliveryCity: resolved.cityName,
    deliveryNotes,
    total: Math.round((recalc.total + resolved.fee) * 100) / 100,
  };
}

/* ---------- Neon cold-start retry ----------
   The Neon serverless pooler can fail the FIRST query after idle with
   "TypeError: fetch failed". A single retry after a short pause recovers. */
export async function retryDb(fn) {
  try { return await fn(); } catch (e) {
    const msg = String(e?.message || "");
    const transient = msg.includes("fetch failed") || /connect|timeout/i.test(msg);
    if (!transient) throw e;
    await new Promise((r) => setTimeout(r, 3000));
    return await fn(); // second failure propagates normally
  }
}

/* ---------- in-app notifications ---------- */
export async function notifyUser(s, userId, kind, title, body, ref) {
  if (!userId) return;
  try {
    await s`insert into notifications (user_id, kind, title, body, ref_type, ref_id)
            values (${userId}, ${kind}, ${title}, ${body}, ${ref?.type || null}, ${ref?.id || null})`;
  } catch (e) { console.warn("notifyUser failed:", (e.message || "").slice(0, 200)); }
}

/* ---------- storage: upload handling ----------
   Uploads go to Vercel Blob when @vercel/blob + BLOB_READ_WRITE_TOKEN exist;
   otherwise they're compressed and stored in the local uploads table.
   The returned value is always a stable URL the app can store in Neon. */
let blobStore = null;
function blobApi() {
  if (!blobStore && process.env.BLOB_READ_WRITE_TOKEN) {
    try { blobStore = require("@vercel/blob"); } catch (e) { blobStore = null; }
  }
  return blobStore;
}

export function supportsBlob() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export async function storeFile({ buffer, mime, ownerType, uploadedBy }) {
  const id = crypto.randomUUID();
  if (supportsBlob()) {
    try {
      const blob = require("@vercel/blob");
      const ext = mime.includes("jpeg") ? "jpg" : mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "bin";
      const result = await blob.put(`${ownerType}/${id}.${ext}`, buffer, {
        access: "public",
        contentType: mime,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      return { url: result.url, size: buffer.length };
    } catch (e) { console.error("blob upload failed:", e.message); }
  }
  // fallback: keep compressed bytes in the uploads table
  const s = sql();
  await s`insert into uploads (id, owner_type, mime_type, bytes, uploaded_by)
          values (${id}, ${ownerType}, ${mime}, ${buffer}, ${uploadedBy || null})`;
  return { url: `/api/upload/${id}`, size: buffer.length };
}

export async function getUpload(id) {
  const s = sql();
  const rows = await s`select bytes, mime_type from uploads where id = ${id}`;
  if (rows.length === 0) return null;
  return rows[0];
}

/* ---------- file validation (server-side, never trust client) ---------- */
const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB hard cap

export function validateImageUpload(fileMeta, size) {
  if (!fileMeta || !fileMeta.name) return "الملف غير صالح";
  if (size > MAX_UPLOAD_BYTES) return "حجم الملف كبير جدًا (الحد 8 ميغا)";
  const ext = String(fileMeta.name).split(".").pop().toLowerCase();
  if (!["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "صيغة الملف غير مسموحة (PNG/JPG/WEBP فقط)";
  if (!IMAGE_MIMES.has(fileMeta.type)) return "نوع الملف غير صالح";
  return null;
}

/* base64 data-url → buffer (frontend sends compressed data-urls) */
export function dataUrlToBuffer(dataUrl) {
  const match = /^data:([a-z0-9+/.-]+);base64,(.*)$/i.exec(dataUrl || "");
  if (!match) return null;
  return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
}
