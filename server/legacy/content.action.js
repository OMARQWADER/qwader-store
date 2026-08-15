import { sql } from "./db.js";
import { ensureSchema } from "./schema.js";
import { getAuth, isStaff, readJsonBody, pathAfter, queryParam, logActivity } from "./auth.js";
import { rateLimitBy, withErrorHandler } from "./common.js";

/* Combined content routes:
   GET  /api/content           → catalog (existing)
   GET  /api/content/reviews?product=  → visible reviews for a product
   POST /api/content/reviews   → submit review (login + verified purchase + unique)
   GET  /api/content/stats     → public stats (dashboard counters)
   POST /api/content/rate-game → legacy compat (requires login now)
*/

const KEYS = ["games", "prices", "faq", "banners", "testimonials", "about", "coupons",
  "paymentInfo", "quickReplies", "priceComparison", "refundPolicy", "socialLinks",
  "maintenanceMode", "loyalty", "offers", "legal", "pages", "shipping", "siteBranding", "aboutPage"];

export default withErrorHandler(async (req, res) => {
  await ensureSchema();
  const parts = pathAfter(req, "/api/content/");
  const first = parts[0] || "";
  if (first === "stats-admin") {
    const auth = await getAuth(req);
    return await adminStats(req, res, auth);
  }
  if (first === "visit") return await trackVisit(req, res);

  if (req.method !== "GET" && first !== "reviews" && first !== "rate-game" && first !== "stats") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (first === "reviews") {
    if (req.method === "POST") return await submitReview(req, res);
    return await listReviews(req, res);
  }
  if (first === "stats")   return await publicStats(req, res);
  if (first === "rate-game") return await rateGame(req, res);
  if (first === "")         return await getContent(req, res);
  return res.status(404).json({ error: "Not found" });
});

async function getContent(req, res) {
  const s = sql();
  const rows = await s`select key, value from site_content where key = any(${KEYS})`;
  const content = {};
  for (const row of rows) content[row.key] = row.value;
  return res.status(200).json({ content });
}

/* ---------- verified-purchase reviews ---------- */
async function submitReview(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const auth = await getAuth(req);
  if (!auth) return res.status(401).json({ error: "لازم تسجل دخول لتقييم المنتجات" });

  const rl = await rateLimitBy(auth, req, "review");
  if (rl.limited) return res.status(429).json({ error: `محاولات كثيرة، جرب بعد ${rl.retryAfterSec} ثانية` });

  const body = await readJsonBody(req);
  const productId = String(body.productId || "").trim();
  const stars = Math.min(5, Math.max(1, Number(body.stars) || 0));
  const comment = String(body.comment || "").trim().slice(0, 1000);

  if (!productId || !stars) return res.status(400).json({ error: "عبي التقييم والمنتج" });
  if (!/^(game|card|sub):.+$/.test(productId)) return res.status(400).json({ error: "منتج غير صالح" });

  const s = sql();
  // verified purchase: must have a delivered order containing this product
  const purchases = await s`
    select 1 from orders where user_id = ${auth.user.id} and status = 'delivered'
      and item_snapshot @> ${JSON.stringify([{ pid: productId }])} limit 1
  `;
  const verified = purchases.length > 0;

  // find product name for display
  let productName = productId;
  const kind = productId.split(":")[0];
  const key = kind === "game" ? "games" : kind === "card" ? "cards" : "subscriptions";
  const rows = await s`select value from site_content where key = ${key}`;
  const arr = (rows[0] && Array.isArray(rows[0].value)) ? rows[0].value : [];
  const id = productId.split(":")[1];
  const item = kind === "sub"
    ? arr.find(x => x.region === productId.split(":")[1])
    : arr.find(x => x.id === id);
  if (item) productName = kind === "sub" ? (item.label || item.region) : item.name;

  try {
    await s`
      insert into reviews (user_id, product_id, product, stars, comment, verified)
      values (${auth.user.id}, ${productId}, ${productName}, ${stars}, ${comment}, ${verified})
      on conflict (user_id, product_id) where visible do update set stars = excluded.stars, comment = excluded.comment
    `;
  } catch (e) {
    return res.status(409).json({ error: "أنت قيّمت هذا المنتج قبلًا" });
  }
  await logActivity(auth.user.id, "review_submitted", `تقييم ${stars} نجوم على ${productName.slice(0, 40)}`, { productId });
  return res.status(201).json({ ok: true });
}

async function listReviews(req, res) {
  const s = sql();
  const product = queryParam(req, "product") || null;
  const limit = Math.min(100, Math.max(5, Number(queryParam(req, "limit")) || 20));
  const where = product ? `where product_id = ${product}` : "";
  const rows = await s.unsafe(`
    select r.id, r.product_id, r.product, r.stars, r.comment, r.verified, r.created_at, u.name
    from reviews r join users u on u.id = r.user_id
    ${where} and r.visible = true
    order by r.created_at desc limit ${limit}
  `, []);
  return res.status(200).json({ reviews: rows });
}

/* ---------- public stats (delivered count, reviews, etc.) ---------- */
async function publicStats(req, res) {
  const s = sql();
  const agg = await s.unsafe(`
    select
      (select count(*) from orders where status = 'delivered')::int as delivered,
      (select count(distinct user_id) from orders where status = 'delivered')::int as served_customers,
      (select count(*) from orders where status in ('delivered', 'ready_to_deliver'))::int as completed,
      (select count(*) from reviews where visible = true)::int as reviews,
      (select coalesce(avg(stars), 0) from reviews where visible = true)::float as avg_rating
  `);
  return res.status(200).json({ stats: agg[0] });
}

/* ---------- public dashboard stats + visit tracking ---------- */
async function adminStats(req, res, auth) {
  if (!auth || !isStaff(auth)) return res.status(403).json({ error: "مو مصرح" });
  const s = sql();
  const agg = await s.unsafe(`
    select
      (select count(*) from orders where status = 'delivered')::int as delivered,
      (select coalesce(sum(total), 0) from orders where status in ('delivered','payment_confirmed','preparing','sourcing_product','product_available','ready_to_deliver','refund_processing'))::float as revenue_confirmed,
      (select coalesce(sum(total), 0) from orders where status not in ('cancelled','refunded'))::float as revenue_total,
      (select count(*) from orders where status = 'cancelled')::int as cancelled,
      (select count(*) from orders where status = 'refunded')::int as refunded,
      (select count(*) from orders where status = 'pending_payment')::int as pending,
      (select count(*) from orders)::int as all_orders,
      (select count(*) from users)::int as customers,
      (select count(*) from conversations where unread_admin > 0)::int as unread_support
  `);
  const byDay = await s.unsafe(`
    select to_char(created_at, 'YYYY-MM-DD') as day, count(*)::int as count, coalesce(sum(total),0)::float as revenue
    from orders where created_at > now() - interval '30 days'
    group by day order by day asc
  `);
  const statuses = await s.unsafe(`
    select status, count(*)::int as count from orders group by status
  `);
  return res.status(200).json({ stats: agg[0], byDay, statuses });
}

/* ---------- site visit tracking (public POST) ---------- */
async function trackVisit(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const s = sql();
  await s`insert into site_visits default values`;
  return res.status(201).json({ ok: true });
}

/* ---------- legacy rate-game: now requires login (no more anonymous) ---------- */
async function rateGame(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const auth = await getAuth(req);
  if (!auth) return res.status(401).json({ error: "لازم تسجل دخول للتقييم" });
  return await submitReview(req, res);
}
