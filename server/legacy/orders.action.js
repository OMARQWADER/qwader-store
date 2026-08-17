import { sql } from "./db.js";
import { ensureSchema } from "./schema.js";
import { getAuth, isStaff, readJsonBody, logActivity, pathAfter, queryParam } from "./auth.js";
import { numifyOrder } from "./db.js";
import { sendEmail, emailSendingConfigured } from "./mailer.js";
import {
  recalcCart, notifyUser, rateLimitBy, validateImageUpload, dataUrlToBuffer,
  storeFile, withErrorHandler, applyDelivery,
} from "./common.js";

/* Complete order lifecycle:
   - customer: POST /api/orders/mine (server recalculates price),
               GET  /api/orders/mine (with cursor pagination),
               GET  /api/orders/track/:id (public UUID)
   - staff:    POST /api/orders/:id/actions   (payment confirm/reject, sourcing,
               deliver, refund approve/reject/process)
   - customer: POST /api/orders/:id/refund    (request refund)
*/

const STAFF_ACTIONS = ["payment_confirm", "payment_reject", "sourcing_start", "sourcing_ordered", "add_code", "deliver_code",
  "sourcing_delivered", "sourcing_failed", "deliver", "cancel", "refund_approve",
  "refund_reject", "refund_process", "refund_complete"];

export default withErrorHandler(async (req, res) => {
  await ensureSchema();
  const auth = await getAuth(req);
  const parts = pathAfter(req, "/api/orders/");
  const first = parts[0] || "";

  if (first === "mine") {
    if (req.method === "POST") return await createOrder(req, res, auth);
    if (req.method === "GET")  return await listMyOrders(req, res, auth);
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (first === "track" && parts[1]) return await trackOrder(req, res, parts[1]);
  if (first === "refund" && parts[1]) return await requestRefund(req, res, auth, parts[1]);

  // POST /api/orders/:id/actions (staff only) — `parts` is the full segment array
  const tail = parts.join("/");
  const m = /^([0-9a-f-]{36})\/actions$/i.exec(tail);
  if (m && req.method === "POST") return await staffAction(req, res, auth, m[1]);

  return res.status(404).json({ error: "Not found" });
});

/* ---------- customer: create order (server-side pricing) ---------- */
async function createOrder(req, res, auth) {
  if (!auth) return res.status(401).json({ error: "لازم تسجل دخول" });
  const rl = await rateLimitBy(auth, req, "order_create");
  if (rl.limited) return res.status(429).json({ error: `محاولات كثيرة، جرب بعد ${rl.retryAfterSec} ثانية` });

  const body = await readJsonBody(req);
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0 || items.length > 100) return res.status(400).json({ error: "السلة فاضية أو كبيرة" });

  const s = sql();

  if (body.custom) {
    // quick-order contact request — free, no pricing needed
    const text = String(items[0]?.name || "").trim();
    if (!text) return res.status(400).json({ error: "عبي الطلب" });
    const customSnapshot = JSON.stringify([{ name: text, qty: Number(items[0].qty) || 1, price: 0 }]);
    const order = (await s`
      insert into orders (user_id, items, total, custom, name, phone, status, payment_status, sourcing_status,
        item_snapshot, items_snapshot)
      values (${auth.user.id}, ${customSnapshot}, 0, true,
        ${String(body.name || "").trim() || auth.user.name}, ${String(body.phone || "").trim() || auth.user.phone},
        'pending_payment', 'unpaid', 'not_started', ${customSnapshot}, ${customSnapshot})
      returning *
    `)[0];
    const o = numifyOrder(order);
    // staff notification conversation
    await s`
      insert into conversations (ticket_no, user_id, subject, category, status, unread_admin, updated_at)
      values ('QW-' || lpad(nextval('conversations_seq')::text, 5, '0'), ${auth.user.id},
        'طلب سريع: ' || left(${text}, 50), 'order', 'open', 1, now())
    `;
    await logActivity(auth.user.id, "order_created_quick", `طلب سريع: ${text.slice(0, 80)}`, { orderId: o.id });
    await notifyUser(s, auth.user.id, "order", "طلبك وصلنا", "استلمنا طلبك ورح نتواصل معك قريبًا", { type: "order", id: o.id });
    return res.status(201).json({ order: o });
  }

  // ===== real order: recompute EVERYTHING server-side =====
  let recalc = await recalcCart(s, items, auth.user.id, body.couponCode || null);
  if (!recalc) return res.status(400).json({ error: "في عنصر بالسلة ما إلنا سعر حالي — امسحه وجرب مرة ثانية" });
  if (recalc.kind !== "ok") return res.status(400).json({ error: recalc.error || "خطأ بالكوبون" });
  // delivery: company + city sent by the client are validated server-side;
  // the client-sent fee is ignored entirely and re-computed from the owner config
  if (body.delivery) {
    const withDelivery = await applyDelivery(s, recalc, body.delivery);
    if (!withDelivery) return res.status(400).json({ error: "اختيار التوصيل غير صالح — اختر شركة ومدينة من القائمة" });
    recalc = withDelivery;
  }
  if (recalc.total <= 0) return res.status(400).json({ error: "مجموع الطلب يجب أن يكون أكبر من صفر" });

  // proof image (stored in Storage, never base64 in Neon)
  let proofUrl = null;
  if (body.paymentMethod !== "cod" && body.paymentProofImage) {
    const parsed = dataUrlToBuffer(body.paymentProofImage);
    if (!parsed) return res.status(400).json({ error: "صورة إثبات الدفع غير صالحة" });
    const err = validateImageUpload({ name: "proof.jpg", type: parsed.mime }, parsed.buffer.length);
    if (err) return res.status(400).json({ error: err });
    const stored = await storeFile({ buffer: parsed.buffer, mime: parsed.mime, ownerType: "proof", uploadedBy: auth.user.id });
    proofUrl = stored.url;
  }

  const name = String(body.name || "").trim() || auth.user.name;
  const phone = String(body.phone || "").trim() || auth.user.phone;
  if (!name || !phone) return res.status(400).json({ error: "الاسم ورقم الهاتف مطلوبين" });

  const paymentStatus = proofUrl ? "proof_submitted" : "unpaid";
  // live Neon schema has items as text[] — store the JSON snapshot as the single array element
  const itemsCol = JSON.stringify(recalc.snapshot);
  const order = (await s`
    insert into orders (user_id, items, total, custom, name, phone, address, payment_method,
      coupon_code, coupon_discount, auto_discount, payment_proof_image, status, payment_status,
      sourcing_status, item_snapshot, items_snapshot, delivery_company, delivery_city, delivery_fee, delivery_notes)
    values (${auth.user.id}, ${itemsCol}, ${recalc.total}, false, ${name}, ${phone},
      ${String(body.address || "").trim() || ""}, ${body.paymentMethod || null},
      ${recalc.appliedCoupon?.code || null}, ${recalc.couponDiscount}, ${recalc.autoDiscount},
      ${proofUrl}, 'pending_payment', ${paymentStatus}, 'not_started',
      ${itemsCol}, ${itemsCol}, ${recalc.deliveryCompany || null}, ${recalc.deliveryCity || null}, ${recalc.deliveryFee || 0},
      ${recalc.deliveryNotes || null})
    returning *
  `)[0];

  // consume coupon usages
  if (recalc.appliedCoupon) {
    const crows = await s`select id from coupons where lower(code) = ${recalc.appliedCoupon.code.toLowerCase()}`;
    if (crows.length > 0) {
      await s`insert into coupon_usage (coupon_id, user_id, order_id) values (${crows[0].id}, ${auth.user.id}, ${order.id})`;
    }
  }

  // consume welcome auto-discount if applied
  if (recalc.consumeAutoDiscount) {
    await s`update users set discount_percent = 0, discount_reason = '' where id = ${auth.user.id}`;
  }

  // loyalty points (excludes delivery fee)
  const loy = await s`select value from site_content where key = 'loyalty'`;
  const loyConf = (loy[0] && loy[0].value && typeof loy[0].value === "object") ? loy[0].value : { enabled: false };
  if (loyConf.enabled && Number(loyConf.pointsPerDinar) > 0) {
    const pts = Math.floor((recalc.total - (recalc.deliveryFee || 0)) * Number(loyConf.pointsPerDinar));
    if (pts > 0) {
      await s`insert into loyalty_points (user_id, points, reason, order_id)
              values (${auth.user.id}, ${pts}, ${`نقاط طلب #${order.id.slice(0, 8)}`}, ${order.id})`;
      await s`update users set points_balance = points_balance + ${pts} where id = ${auth.user.id}`;
    }
  }

  const o = numifyOrder(order);
  const subject = `طلب جديد ${o.id.slice(0, 8).toUpperCase()} — ${name}`;
  await s`
    insert into conversations (ticket_no, user_id, order_id, subject, category, status, unread_admin, updated_at)
    values ('QW-' || lpad(nextval('conversations_seq')::text, 5, '0'), ${auth.user.id}, ${o.id},
      ${subject}, 'order', 'open', 1, now())
  `;
  await logActivity(auth.user.id, "order_created", `طلب جديد: ${o.id.slice(0, 8)} بقيمة ${recalc.total} د.أ`, { orderId: o.id, total: recalc.total });
  await notifyUser(s, auth.user.id, "order", "تم استلام طلبك", proofUrl ? "طلبك وصلنا مع إثبات الدفع — رح نراجعه ونأكد الدفع قريبًا" : "طلبك وصلنا — بانتظار تأكيد الدفع", { type: "order", id: o.id });

  // owner email notification when sending is configured (never silently fails the order)
  if (emailSendingConfigured()) {
    notifyOwnerNewOrder(s, o, auth.user, recalc, proofUrl).catch((e) => console.warn("[orders] owner notify failed:", (e.message || "").slice(0, 200)));
  }

  // email receipt when sending is configured
  if (emailSendingConfigured() && auth.user.email) {
    const summary = recalc.snapshot.map(x => `• ${x.name} × ${x.qty} — ${x.price} د.أ`).join("<br/>");
    await sendEmail(auth.user.email, `🧾 تأكيد طلبك — QWADERGAME`, `
      <div dir="rtl" style="font-family: system-ui, sans-serif; max-width: 460px; margin: 0 auto; padding: 24px; background: #0a0f20; color: #f4f6fb; border-radius: 16px;">
        <h2 style="color:#ff8a2b; margin:0 0 12px;">تم استلام طلبك</h2>
        <p style="color:#c7cee3; font-size:14px;">رقم الطلب: <b>${o.id.slice(0, 8).toUpperCase()}</b></p>
        <div style="background:#131c38; border-radius:12px; padding:14px; margin:12px 0; font-size:13px; line-height:1.9;">${summary}</div>
        <p style="color:#29e0c8; font-size:15px; font-weight:bold;">الإجمالي: ${recalc.total} د.أ</p>
        ${recalc.deliveryFee > 0 ? `<p style="color:#c7cee3; font-size:13px;">التوصيل: ${recalc.deliveryCompany || ""} — ${recalc.deliveryCity || ""} (${recalc.deliveryFee} د.أ)</p>` : recalc.deliveryCity === "استلام من المتجر" ? `<p style="color:#c7cee3; font-size:13px;">الاستلام: استلام من المتجر (مجاني)</p>` : ""}
        ${recalc.deliveryNotes ? `<p style="color:#c7cee3; font-size:13px;">ملاحظات التوصيل: ${recalc.deliveryNotes}</p>` : ""}
        <p style="color:#8b96b8; font-size:12px;">رح تتابع حالة طلبك من صفحة الطلبات بالموقع.</p>
      </div>
    `);
  }

  // clear cart from account (wishlist untouched)
  await s`update users set cart = '[]'::jsonb where id = ${auth.user.id}`;

  return res.status(201).json({
    order: {
      id: o.id, total: o.total, custom: o.custom, name: o.name, phone: o.phone,
      status: o.status, paymentStatus: o.payment_status, sourcingStatus: o.sourcing_status,
      paymentMethod: o.payment_method, paymentRejectReason: o.payment_reject_reason,
      items: o.items_snapshot || o.items || [],
      createdAt: o.created_at, updatedAt: o.updated_at,
      codes: [],
    },
    discountApplied: recalc.couponDiscount + recalc.autoDiscount,
    couponCode: recalc.appliedCoupon?.code || null,
    couponDiscount: recalc.couponDiscount,
    autoDiscount: recalc.autoDiscount,
    subtotal: recalc.subtotal,
    deliveryFee: recalc.deliveryFee || 0,
    deliveryCompany: recalc.deliveryCompany,
    deliveryCity: recalc.deliveryCity,
    deliveryNotes: recalc.deliveryNotes || "",
  });
}

/* ---------- staff: email the customer once they actually pick up the order ---------- */
async function sendPickupCompleteEmail(s, o) {
  if (!emailSendingConfigured()) return;
  if (!(o.delivery_city === "استلام من المتجر" || o.delivery_company === "pickup")) return;
  const users = await s`select email from users where id = ${o.user_id}`;
  const email = users[0]?.email;
  if (!email) return;
  const short = o.id.slice(0, 8).toUpperCase();
  const base = `<div dir="rtl" style="font-family: system-ui, sans-serif; max-width: 460px; margin: 0 auto; padding: 24px; background: #0a0f20; color: #f4f6fb; border-radius: 16px;">`;
  const foot = `<p style="color:#8b96b8; font-size:12px; margin-top:14px;">شكراً لتعاملك معنا — نتمنى تكون استمتعت بطلبك!</p></div>`;
  const subject = `🎁 تم استلام طلبك من المتجر — #${short} — QWADERGAME`;
  const html = `${base}<h2 style="color:#2dd4bf; margin:0 0 12px;">تم استلام طلبك</h2>
    <p style="color:#c7cee3; font-size:14px;">رقم الطلب: <b>${short}</b></p>
    <p style="color:#f4f6fb; font-size:14px;">سجلّينا إنك استلمت طلبك من المتجر بنجاح — شكراً لثقتك فينا!</p>
    <p style="color:#f4f6fb; font-size:14px;">اذا في أي مشكلة بالمنتج أو الكود، راسلنا على واتساب المتجر.</p>${foot}`;
  try { await sendEmail(email, subject, html); } catch (e) { console.warn("pickup email failed:", (e.message || "").slice(0, 200)); }
}

/* ---------- owner: email every admin account when a new order arrives ---------- */
async function notifyOwnerNewOrder(s, o, customer, recalc, proofUrl) {
  // admin recipients: every owner/staff row that has an email address
  const admins = await s`select id, email from users where role in ('owner', 'staff') and email is not null and email != ''`;
  if (admins.length === 0) return;
  const short = o.id.slice(0, 8).toUpperCase();
  const summary = (recalc.snapshot || []).map(x => `• ${x.name} × ${x.qty} — ${x.price} د.أ`).join("<br/>");
  const subject = `🛒 طلب جديد #${short} — ${customer.name} — ${recalc.total} د.أ`;
  const html = `<div dir="rtl" style="font-family: system-ui, sans-serif; max-width: 460px; margin: 0 auto; padding: 24px; background: #0a0f20; color: #f4f6fb; border-radius: 16px;">
    <h2 style="color:#29e0c8; margin:0 0 12px;">وصل طلب جديد!</h2>
    <p style="color:#c7cee3; font-size:14px;">رقم الطلب: <b>${short}</b></p>
    <p style="color:#f4f6fb; font-size:14px;">الزبون: <b>${customer.name}</b> — ${customer.phone || "بدون رقم"}</p>
    <div style="background:#131c38; border-radius:12px; padding:14px; margin:12px 0; font-size:13px; line-height:1.9;">${summary}</div>
    ${recalc.deliveryFee > 0 ? `<p style="color:#c7cee3; font-size:13px;">التوصيل: ${recalc.deliveryCompany || ""} — ${recalc.deliveryCity || ""} (${recalc.deliveryFee} د.أ)</p>` : recalc.deliveryCity === "استلام من المتجر" ? `<p style="color:#c7cee3; font-size:13px;">الاستلام: استلام من المتجر (مجاني)</p>` : ""}
    ${recalc.deliveryNotes ? `<p style="color:#c7cee3; font-size:13px;">ملاحظات التوصيل: ${recalc.deliveryNotes}</p>` : ""}
    <p style="color:#fbbf24; font-size:15px; font-weight:bold;">الإجمالي: ${recalc.total} د.أ</p>
    ${proofUrl ? `<p style="color:#29e0c8; font-size:13px;">⚡ الزبون أرفق إثبات دفع — راجعه من لوحة الإدارة</p>` : `<p style="color:#c7cee3; font-size:13px;">انتظار إثبات الدفع أو الدفع عند التسليم.</p>`}
    <p style="color:#8b96b8; font-size:12px;">افتح الطلب من لوحة الإدارة ← الطلبات.</p>
  </div>`;
  // email every admin + in-app notification for the first owner row
  for (const admin of admins) {
    try { await sendEmail(admin.email, subject, html); } catch (e) { console.warn("owner order email failed:", (e.message || "").slice(0, 200)); }
  }
  try {
    await notifyUser(s, admins[0].id, "order", `طلب جديد #${short}`, `${customer.name} — ${recalc.total} د.أ${proofUrl ? " (مع إثبات دفع)" : ""}`, { type: "order", id: o.id });
  } catch (e) { console.warn("owner in-app notify failed:", (e.message || "").slice(0, 200)); }
}

/* ---------- staff: email the customer on key status transitions ---------- */
async function sendStatusEmail(s, before, after, action) {
  if (!emailSendingConfigured()) return;
  const users = await s`select email from users where id = ${after.user_id}`;
  const email = users[0]?.email;
  if (!email) return;
  const short = after.id.slice(0, 8).toUpperCase();
  const base = `<div dir="rtl" style="font-family: system-ui, sans-serif; max-width: 460px; margin: 0 auto; padding: 24px; background: #0a0f20; color: #f4f6fb; border-radius: 16px;">`;
  const foot = `<p style="color:#8b96b8; font-size:12px; margin-top:14px;">تابع حالة طلبك من صفحة الطلبات بالموقع: <a href="${process.env.SITE_URL || "#"}/orders" style="color:#29e0c8;">حالة الطلب</a></p></div>`;
  let subject = null, html = null;
  const pickup = before.delivery_city === "استلام من المتجر" || after.delivery_city === "استلام من المتجر";
  if (action === "payment_confirm") {
    subject = `✅ تم تأكيد دفع طلبك #${short} — QWADERGAME`;
    html = `${base}<h2 style="color:#ff8a2b; margin:0 0 12px;">تم تأكيد الدفع</h2>
      <p style="color:#c7cee3; font-size:14px;">رقم الطلب: <b>${short}</b></p>
      <p style="color:#f4f6fb; font-size:14px;">دفعك تأكد بنجاح وبدأنا بتجهيز طلبك. رح نبلّشك بكل تحديث.</p>${foot}`;
  } else if (action === "sourcing_delivered") {
    subject = `📦 منتجك وصلنا — طلبك #${short} — QWADERGAME`;
    html = `${base}<h2 style="color:#ff8a2b; margin:0 0 12px;">وصل منتجك</h2>
      <p style="color:#c7cee3; font-size:14px;">رقم الطلب: <b>${short}</b></p>
      <p style="color:#f4f6fb; font-size:14px;">المنتج وصلنا وجاي عندنا — رح نسلمك إياه/الكود قريبًا.</p>${foot}`;
  } else if (action === "deliver" || action === "deliver_code") {
    if (pickup) {
      subject = `🎉 طلبك جاهز للاستلام — #${short} — QWADERGAME`;
      html = `${base}<h2 style="color:#29e0c8; margin:0 0 12px;">طلبك جاهز للاستلام</h2>
        <p style="color:#c7cee3; font-size:14px;">رقم الطلب: <b>${short}</b></p>
        <p style="color:#f4f6fb; font-size:14px;">اطلبك تجهّز — تواصل معنا على واتساب المتجر لنسّق الاستلام.</p>${foot}`;
    } else {
      subject = `🚚 طلبك بالطريق — #${short} — QWADERGAME`;
      html = `${base}<h2 style="color:#29e0c8; margin:0 0 12px;">طلبك بالطريق إليك</h2>
        <p style="color:#c7cee3; font-size:14px;">رقم الطلب: <b>${short}</b></p>
        <p style="color:#f4f6fb; font-size:14px;">${before.delivery_company || "شركة التوصيل"} — ${before.delivery_city || ""}</p>
        <p style="color:#f4f6fb; font-size:14px;">رح يتواصل معك المندوب قبل التسليم.</p>${foot}`;
    }
  } else if (action === "cancel") {
    subject = `تم إلغاء طلبك #${short} — QWADERGAME`;
    html = `${base}<h2 style="color:#e06c75; margin:0 0 12px;">تم إلغاء الطلب</h2>
      <p style="color:#c7cee3; font-size:14px;">رقم الطلب: <b>${short}</b></p>
      <p style="color:#f4f6fb; font-size:14px;">طلبك انلغى من قبل الإدارة. لأي استفسار راسلنا على واتساب المتجر.</p>${foot}`;
  }
  if (subject && html) {
    try { await sendEmail(email, subject, html); } catch (e) { console.warn("status email failed:", (e.message || "").slice(0, 200)); }
  }
}

/* ---------- customer: list my orders (cursor pagination) ---------- */
async function listMyOrders(req, res, auth) {
  if (!auth) return res.status(401).json({ error: "لازم تسجل دخول" });
  const s = sql();
  const cursor = queryParam(req, "cursor");
  const limit = Math.min(50, Math.max(5, Number(queryParam(req, "limit")) || 20));
  let rows;
  if (cursor) {
    rows = await s`
      select * from orders where user_id = ${auth.user.id} and id < ${cursor}
      order by id desc limit ${limit + 1}
    `;
  } else {
    rows = await s`select * from orders where user_id = ${auth.user.id} order by id desc limit ${limit}`;
  }
  const next = rows.length > limit ? rows[limit - 1].id : null;
  const page = rows.slice(0, limit);
  // only released codes (status 'delivered') are ever exposed to the customer
  const codesByOrder = new Map();
  if (page.length > 0) {
    const allCodes = await s`select order_id, code, product from codes
      where order_id = any(${page.map(r => r.id)}) and status = 'delivered'`;
    for (const c of allCodes) {
      const arr = codesByOrder.get(c.order_id) || [];
      arr.push({ code: c.code, product: c.product });
      codesByOrder.set(c.order_id, arr);
    }
  }
  const out = page.map(numifyOrder).map(o => ({
    ...o,
    codes: codesByOrder.get(o.id) || [],
    deliveryCompany: o.delivery_company,
    deliveryCity: o.delivery_city,
    deliveryFee: Number(o.delivery_fee || 0),
    deliveryNotes: o.delivery_notes || "",
    pickupCompletedAt: o.pickup_completed_at,
  }));
  return res.status(200).json({ orders: out, nextCursor: next });
}

/* ---------- public tracking ---------- */
async function trackOrder(req, res, id) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ""))) {
    return res.status(404).json({ error: "الطلب غير موجود" });
  }
  const s = sql();
  const rows = await s`
    select id, user_id, name, phone, address, total, custom, items_snapshot, status,
      payment_status, sourcing_status, payment_method, payment_reject_reason,
      code_delivered_at, delivered_at, created_at, updated_at,
      delivery_company, delivery_city, delivery_fee, delivery_notes, pickup_completed_at
    from orders where id = ${id}
  `;
  if (rows.length === 0) return res.status(404).json({ error: "الطلب غير موجود" });
  const o = numifyOrder(rows[0]);
  // customer-facing codes: only codes released via deliver_code (status 'delivered')
  // — reserved/available codes are internal and never exposed to the customer.
  const codes = await s`select code, product from codes where order_id = ${rows[0].id} and status = 'delivered'`;
  // customer-facing: hide sensitive internal notes but show all lifecycle stages
  return res.status(200).json({
    order: {
      id: o.id, total: o.total, custom: o.custom, name: o.name,
      items: o.items_snapshot || o.items || [],
      status: o.status, paymentStatus: o.payment_status,
      sourcingStatus: o.sourcing_status, paymentMethod: o.payment_method,
      paymentRejectReason: o.payment_reject_reason,
      codeDeliveredAt: o.code_delivered_at, deliveredAt: o.delivered_at,
      createdAt: o.created_at, updatedAt: o.updated_at,
      codes: codes.map(c => ({ code: c.code, product: c.product })),
      deliveryCompany: o.delivery_company, deliveryCity: o.delivery_city, deliveryFee: Number(o.delivery_fee || 0),
      deliveryNotes: o.delivery_notes || "",
      pickupCompletedAt: o.pickup_completed_at,
    },
  });
}

/* ---------- customer: request refund ---------- */
async function requestRefund(req, res, auth, orderId) {
  if (!auth) return res.status(401).json({ error: "لازم تسجل دخول" });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const body = await readJsonBody(req);
  const reason = String(body.reason || "").trim().slice(0, 500);
  if (!reason) return res.status(400).json({ error: "عبي سبب الاسترداد" });

  const s = sql();
  const orders = await s`select * from orders where id = ${orderId} and user_id = ${auth.user.id}`;
  if (orders.length === 0) return res.status(404).json({ error: "الطلب غير موجود" });
  const o = orders[0];
  if (o.status === "cancelled") return res.status(400).json({ error: "هذا الطلب ملغي" });
  if (["refund_requested", "refund_processing", "refunded"].includes(o.status)) {
    return res.status(400).json({ error: "في طلب استرداد معلق على هالطلب" });
  }

  await s`update orders set status = 'refund_requested' where id = ${o.id}`;
  await s`
    insert into conversations (ticket_no, user_id, order_id, subject, category, status, unread_admin, updated_at)
    values ('QW-' || lpad(nextval('conversations_seq')::text, 5, '0'), ${auth.user.id}, ${o.id},
      'طلب استرداد: ' || left(${reason}, 60), 'refund', 'open', 1, now())
  `;
  await logActivity(auth.user.id, "refund_requested", `استرداد مطلوب للطلب ${o.id.slice(0, 8)}: ${reason.slice(0, 100)}`, { orderId: o.id });
  await notifyUser(s, auth.user.id, "order", "وصلنا طلب الاسترداد", "الإدارة رح تراجع طلبك وترد عليك قريبًا", { type: "order", id: o.id });
  return res.status(200).json({ ok: true });
}

/* ---------- staff: lifecycle actions ---------- */
async function staffAction(req, res, auth, orderId) {
  if (!auth || !isStaff(auth)) return res.status(403).json({ error: "مو مصرح" });
  const body = await readJsonBody(req);
  const action = String(body.action || "");
  if (!STAFF_ACTIONS.includes(action)) return res.status(400).json({ error: "إجراء غير صالح" });

  const s = sql();
  const orders = await s`select * from orders where id = ${orderId}`;
  if (orders.length === 0) return res.status(404).json({ error: "الطلب غير موجود" });
  const o = orders[0];
  const note = String(body.note || "").trim().slice(0, 500);

  // state-machine guards
  switch (action) {
    case "payment_confirm": {
      if (!["proof_submitted", "under_review", "unpaid"].includes(o.payment_status) && o.status !== "pending_payment") {
        if (o.status === "delivered" && o.payment_status !== "confirmed") break;
      }
      await s`update orders set payment_status = 'confirmed', payment_reviewed_at = now(),
        status = case when status = 'pending_payment' then 'payment_confirmed' else status end,
        payment_reject_reason = null where id = ${o.id}`;
      await logActivity(auth.user.id, "payment_confirmed", `تأكيد دفع الطلب ${o.id.slice(0, 8)}${note ? ` (${note.slice(0, 80)})` : ""}`, { orderId: o.id });
      await notifyUser(s, o.user_id, "payment", "تم تأكيد الدفع", "دفعك تأكد ✅ — رح نبدأ بتجهيز طلبك حالاً", { type: "order", id: o.id });
      break;
    }
    case "payment_reject": {
      if (!note) return res.status(400).json({ error: "لازم تكتب سبب الرفض" });
      await s`update orders set payment_status = 'rejected', payment_reviewed_at = now(),
        status = case when status = 'pending_payment' then 'pending_payment' else status end,
        payment_reject_reason = ${note} where id = ${o.id}`;
      await logActivity(auth.user.id, "payment_rejected", `رفض دفع الطلب ${o.id.slice(0, 8)}: ${note.slice(0, 80)}`, { orderId: o.id });
      await notifyUser(s, o.user_id, "payment", "إثبات الدفع مرفوض", `السبب: ${note.slice(0, 200)}`, { type: "order", id: o.id });
      break;
    }
    case "sourcing_start": {
      await s`update orders set sourcing_status = 'searching_supplier',
        status = case when status = 'payment_confirmed' then 'sourcing_product' else status end where id = ${o.id}`;
      await logActivity(auth.user.id, "sourcing_start", `بدء التزويد للطلب ${o.id.slice(0, 8)}`, { orderId: o.id });
      await notifyUser(s, o.user_id, "order", "بدأنا بطلب منتجك", "رحلنا نبحث عن المورد ونطلب المنتج — صبر شوي", { type: "order", id: o.id });
      break;
    }
    case "sourcing_ordered": {
      await s`update orders set sourcing_status = 'ordered_from_supplier' where id = ${o.id}`;
      await logActivity(auth.user.id, "sourcing_ordered", `تم الطلب من المورد للطلب ${o.id.slice(0, 8)}${note ? ` (${note.slice(0, 80)})` : ""}`, { orderId: o.id });
      await notifyUser(s, o.user_id, "order", "طلبنا منتجك من المورد", "الطلب صار بالطريق — هلق أحسن مرحلة", { type: "order", id: o.id });
      break;
    }
    case "sourcing_delivered": {
      await s`update orders set sourcing_status = 'available',
        status = case when status = 'sourcing_product' then 'product_available' else status end where id = ${o.id}`;
      await logActivity(auth.user.id, "sourcing_delivered", `وصل المنتج للطلب ${o.id.slice(0, 8)}`, { orderId: o.id });
      await notifyUser(s, o.user_id, "order", "وصل منتجك!", "المنتج وصلنا وجايز عندنا — رح نسلمك الكود/المنتج قريبًا", { type: "order", id: o.id });
      break;
    }
    case "sourcing_failed": {
      if (!note) return res.status(400).json({ error: "لازم تكتب سبب فشل التزويد" });
      await s`update orders set sourcing_status = 'failed' where id = ${o.id}`;
      await logActivity(auth.user.id, "sourcing_failed", `فشل تزويد الطلب ${o.id.slice(0, 8)}: ${note.slice(0, 80)}`, { orderId: o.id });
      await notifyUser(s, o.user_id, "order", "مشكلة بتزويد منتجك", `ما رحنا نقدر نوفر المنتج: ${note.slice(0, 200)}`, { type: "order", id: o.id });
      break;
    }
    case "deliver": {
      // store-pickup orders: mark the pickup-completion timestamp too
      const pickupOrder = o.delivery_city === "استلام من المتجر" || o.delivery_company === "pickup";
      await s`update orders set status = 'delivered', sourcing_status = 'available',
        code_delivered_at = now(), delivered_at = now(),
        pickup_completed_at = case when ${pickupOrder} then now() else pickup_completed_at end
        where id = ${o.id}`;
      await logActivity(auth.user.id, "order_delivered", `تسليم الطلب ${o.id.slice(0, 8)}${pickupOrder ? " (استلام من المتجر)" : ""}`, { orderId: o.id });
      await notifyUser(s, o.user_id, "order", "تم تسليم طلبك 🎉", "طلبك اكتمل — ارجع صفحة الطلبات وشوف التفاصيل", { type: "order", id: o.id });
      if (pickupOrder) { await sendPickupCompleteEmail(s, o); }
      break;
    }
    // digital code workflow: staff records a product code, then releases it to
    // the customer. The code is ONLY exposed to the customer on
    // track/mine AFTER a deliver_code action.
    case "add_code": {
      const code = String(body.code || "").trim().slice(0, 2000);
      if (!code) return res.status(400).json({ error: "عبي كود المنتج" });
      // unique per active code (schema-level unique index on status<>'cancelled')
      const dup = await s`select id from codes where code = ${code} and status <> 'cancelled'`;
      if (dup.length > 0) return res.status(409).json({ error: "هذا الكود مسجل مسبقًا" });
      await s`insert into codes (code, product, order_id, status) values (${code}, ${String(body.product || o.items_snapshot?.[0]?.name || o.name || "").slice(0, 200)}, ${o.id}, 'reserved')`;
      await logActivity(auth.user.id, "code_added", `إضافة كود للطلب ${o.id.slice(0, 8)}`, { orderId: o.id });
      break;
    }
    case "deliver_code": {
      // release every reserved/available code tied to this order to the customer
      await s`update codes set status = 'delivered' where order_id = ${o.id} and status in ('reserved', 'available')`;
      await s`update orders set status = 'delivered', sourcing_status = 'available',
        code_delivered_at = now(), delivered_at = now() where id = ${o.id}`;
      await logActivity(auth.user.id, "code_delivered", `تسليم الكود للطلب ${o.id.slice(0, 8)}`, { orderId: o.id });
      await notifyUser(s, o.user_id, "order", "كود طلبك جاهز 🎉", "ادخل صفحة طلباتك وشوف الكود — مبروك!", { type: "order", id: o.id });
      break;
    }
    case "cancel": {
      await s`update orders set status = 'cancelled' where id = ${o.id}
        and status not in ('delivered', 'refunded', 'refund_processing')`;
      await logActivity(auth.user.id, "order_cancelled", `إلغاء الطلب ${o.id.slice(0, 8)}${note ? ` (${note.slice(0, 80)})` : ""}`, { orderId: o.id });
      await notifyUser(s, o.user_id, "order", "تم إلغاء طلبك", note || "طلبك انلغى من قبل الإدارة", { type: "order", id: o.id });
      break;
    }
    // refunds
    case "refund_approve": {
      await s`update orders set status = 'refund_processing' where id = ${o.id}`;
      await logActivity(auth.user.id, "refund_approved", `قبول استرداد الطلب ${o.id.slice(0, 8)}`, { orderId: o.id });
      await notifyUser(s, o.user_id, "payment", "تم قبول الاسترداد", "بدأنا إجراءات استرداد المبلغ", { type: "order", id: o.id });
      break;
    }
    case "refund_process": {
      await logActivity(auth.user.id, "refund_processing", `جاري معالجة استرداد الطلب ${o.id.slice(0, 8)}${note ? ` (${note.slice(0, 80)})` : ""}`, { orderId: o.id });
      break;
    }
    case "refund_complete": {
      await s`update orders set status = 'refunded', payment_status = 'refunded' where id = ${o.id}`;
      await logActivity(auth.user.id, "refund_completed", `اكتمال استرداد الطلب ${o.id.slice(0, 8)}${note ? ` (${note.slice(0, 80)})` : ""}`, { orderId: o.id });
      await notifyUser(s, o.user_id, "payment", "اكتمل الاسترداد", "تم إرجاع المبلغ بنجاح", { type: "order", id: o.id });
      break;
    }
    case "refund_reject": {
      if (!note) return res.status(400).json({ error: "لازم تكتب سبب الرفض" });
      await s`update orders set status = 'payment_confirmed' where id = ${o.id}`;
      await logActivity(auth.user.id, "refund_rejected", `رفض استرداد الطلب ${o.id.slice(0, 8)}: ${note.slice(0, 80)}`, { orderId: o.id });
      await notifyUser(s, o.user_id, "payment", "تم رفض طلب الاسترداد", note, { type: "order", id: o.id });
      break;
    }
  }

  // refresh the order and return
  const refreshed = (await s`select * from orders where id = ${o.id}`)[0];
  // email the customer on important status transitions (idempotent-ish: only when
  // email is configured and the user has an email address)
  await sendStatusEmail(s, o, refreshed, action);
  return res.status(200).json({ order: numifyOrder(refreshed) });
}
