import { sql, numifyOrder } from "./db.js";
import { getAuth, isStaff, isOwner, hasPerm, logActivity, readJsonBody, pathAfter, queryParam } from "./auth.js";
import { sendPriceDropEmail } from "./mailer.js";
// Builds emit server/storage.ts → dist/server/storage.js (and tsx resolves
// the .ts source in dev). Node ESM at runtime requires the .js extension,
// and esbuild with --packages=external preserves this specifier verbatim.
import { storagePut } from "../storage.js";
import { notifyUser } from "./common.js";

const CONTENT_KEYS = ["games", "prices", "faq", "banners", "testimonials", "about", "coupons", "paymentInfo", "quickReplies", "priceComparison", "refundPolicy", "socialLinks", "maintenanceMode", "shipping"];
const CONTENT_LABELS = {
  games: "قائمة الألعاب", prices: "الأسعار", faq: "الأسئلة الشائعة", banners: "البانرات",
  testimonials: "الآراء", about: "من نحن", coupons: "الكوبونات", paymentInfo: "معلومات الدفع",
  quickReplies: "الردود الجاهزة", priceComparison: "مقارنة الأسعار", refundPolicy: "سياسة الاستبدال والاسترجاع", socialLinks: "روابط التواصل الاجتماعي", maintenanceMode: "وضع الصيانة",
  shipping: "التوصيل",
};
// paymentInfo and maintenanceMode are the only truly owner-only keys now —
// everything else maps to a specific per-staff permission (see
// CONTENT_KEY_PERM below).
const OWNER_ONLY_CONTENT_KEYS = ["paymentInfo", "maintenanceMode", "shipping"];
const CONTENT_KEY_PERM = {
  games: "content_games", prices: "content_prices", priceComparison: "content_prices",
  banners: "content_banners", faq: "content_faq",
  about: "content_about", testimonials: "content_about", refundPolicy: "content_about", socialLinks: "content_about",
  coupons: "content_coupons", quickReplies: "quickreplies_edit",
};
const ORDER_STATUSES = ["pending_payment", "proof_submitted", "payment_confirmed", "preparing", "delivered", "cancelled"];
// the full set of togglable per-staff permission flags — used to validate
// what the owner can set on a staff member (anything outside this list is
// dropped rather than silently stored)
export const PERMISSION_KEYS = [
  "orders_view", "orders_status", "orders_cancel", "orders_delete",
  "chats_view", "chats_start", "quickreplies_edit",
  "reports_view", "reports_export",
  "content_games", "content_prices", "content_banners", "content_faq", "content_about", "content_coupons",
];

/* Vercel's Hobby plan caps a deployment at 12 Serverless Functions — the
   whole set of admin routes (11 separate files, originally) is combined into this one
   catch-all handler so the app stays well under the limit. The URLs the
   frontend calls are unchanged (/api/admin/orders, /api/admin/chats/:id,
   /api/admin/staff, ...). */
export default async function handler(req, res) {
  const parts = pathAfter(req, "/api/admin/");
  const [section, id] = parts;

  try {
    const auth = await getAuth(req);
    if (!isStaff(auth)) return res.status(403).json({ error: "غير مصرّح" });

    if (section === "customers" && req.method === "GET") {
      if (!isOwner(auth)) return res.status(403).json({ error: "غير مصرّح" });
      return await customers(req, res);
    }

    if (section === "chats" && !id && req.method === "GET") {
      if (!hasPerm(auth, "chats_view")) return res.status(403).json({ error: "ما عندك صلاحية المحادثات" });
      return await chatsList(req, res);
    }
    if (section === "chats" && id && req.method === "GET") {
      if (!hasPerm(auth, "chats_view")) return res.status(403).json({ error: "ما عندك صلاحية المحادثات" });
      return await chatDetail(req, res, id, auth);
    }
    if (section === "chats" && id && req.method === "POST") {
      if (!hasPerm(auth, "chats_view")) return res.status(403).json({ error: "ما عندك صلاحية المحادثات" });
      return await chatReply(req, res, id);
    }
    if (section === "chats" && id && req.method === "PATCH") {
      if (!hasPerm(auth, "chats_view")) return res.status(403).json({ error: "ما عندك صلاحية المحادثات" });
      return await chatArchive(req, res, id);
    }
    if (section === "chats-start" && req.method === "POST") {
      if (!hasPerm(auth, "chats_start")) return res.status(403).json({ error: "ما عندك صلاحية بدء محادثة" });
      return await chatStart(req, res);
    }

    if (section === "orders" && !id && req.method === "GET") {
      if (!hasPerm(auth, "orders_view") && !hasPerm(auth, "reports_view")) return res.status(403).json({ error: "ما عندك صلاحية الطلبات" });
      return await ordersList(req, res);
    }
    if (section === "orders" && id && req.method === "PATCH") {
      const body = await readJsonBody(req);
      if (body.status !== undefined) {
        const needed = body.status === "cancelled" ? "orders_cancel" : "orders_status";
        if (!hasPerm(auth, needed)) return res.status(403).json({ error: "ما عندك صلاحية تغيير حالة الطلب" });
      }
      if (body.adminNote !== undefined && !hasPerm(auth, "orders_view")) return res.status(403).json({ error: "ما عندك صلاحية الطلبات" });
      return await orderUpdate(req, res, id, auth, body);
    }
    if (section === "orders" && id && req.method === "DELETE") {
      if (!hasPerm(auth, "orders_delete")) return res.status(403).json({ error: "ما عندك صلاحية حذف الطلبات" });
      return await orderDelete(req, res, id, auth);
    }

    if (section === "content" && req.method === "POST") return await contentUpdate(req, res, auth);

    if (section === "settings") return await settingsAction(req, res, auth);

    if (section === "messages" && !id && req.method === "GET") {
      if (!hasPerm(auth, "chats_view")) return res.status(403).json({ error: "ما عندك صلاحية الرسائل" });
      return await messagesList(req, res);
    }
    if (section === "messages" && id && req.method === "PATCH") {
      if (!hasPerm(auth, "chats_view")) return res.status(403).json({ error: "ما عندك صلاحية الرسائل" });
      return await messageMarkRead(req, res, id);
    }
    if (section === "messages" && id && req.method === "DELETE") {
      if (!hasPerm(auth, "chats_view")) return res.status(403).json({ error: "ما عندك صلاحية الرسائل" });
      return await messageDelete(req, res, id);
    }

    // "أعلمني لما يتوفر" requests — tied to the same permission as editing
    // the game catalog, since it's a catalog/stock concern
    if (section === "notify" && !id && req.method === "GET") {
      if (!hasPerm(auth, "content_games")) return res.status(403).json({ error: "غير مصرّح" });
      return await notifyList(req, res);
    }
    if (section === "notify" && id && req.method === "PATCH") {
      if (!hasPerm(auth, "content_games")) return res.status(403).json({ error: "غير مصرّح" });
      return await notifyMark(req, res, id);
    }

    if (section === "staff") {
      if (!isOwner(auth)) return res.status(403).json({ error: "بس المالك يقدر يدير الموظفين" });
      if (!id && req.method === "GET") return await staffList(req, res);
      if (!id && req.method === "POST") return await staffPromote(req, res, auth);
      if (id && req.method === "PATCH") return await staffSetPermissions(req, res, id, auth);
      if (req.method === "DELETE") return await staffDemote(req, res, auth);
    }

    if (section === "activity" && req.method === "GET") {
      if (!isOwner(auth)) return res.status(403).json({ error: "غير مصرّح" });
      return await activityList(req, res);
    }

    if (section === "backups" && !id && req.method === "GET") {
      if (!isOwner(auth)) return res.status(403).json({ error: "غير مصرّح" });
      return await backupsList(req, res);
    }
    if (section === "backups" && id && req.method === "GET") {
      if (!isOwner(auth)) return res.status(403).json({ error: "غير مصرّح" });
      return await backupGet(req, res, id);
    }

    // ---------- suppliers & sourcing (owner + orders_status perm) ----------
    if (section === "suppliers") {
      const canSourcing = hasPerm(auth, "orders_status") || isOwner(auth);
      if (!canSourcing) return res.status(403).json({ error: "ما عندك صلاحية التزويد" });
      if (!id && req.method === "GET") return await suppliersList(req, res);
      if (!id && req.method === "POST") return await supplierCreate(req, res, auth);
      if (id && req.method === "PATCH") return await supplierUpdate(req, res, id, auth);
      if (id && req.method === "DELETE") return await supplierDelete(req, res, id, auth);
    }

    // ---------- sourcing requests queue (orders awaiting product purchase) ----------
    if (section === "sourcing" && !id && req.method === "GET") {
      if (!hasPerm(auth, "orders_status") && !isOwner(auth)) return res.status(403).json({ error: "ما عندك صلاحية" });
      return await sourcingList(req, res);
    }
    // mark a sourcing request fulfilled (we ordered the product from a supplier)
    if (section === "sourcing" && id && req.method === "POST") {
      if (!hasPerm(auth, "orders_status") && !isOwner(auth)) return res.status(403).json({ error: "ما عندك صلاحية" });
      return await sourcingFulfill(req, res, id, auth);
    }

    // ---------- refunds queue ----------
    if (section === "refunds" && !id && req.method === "GET") {
      if (!hasPerm(auth, "orders_view") && !isOwner(auth)) return res.status(403).json({ error: "ما عندك صلاحية" });
      return await refundsList(req, res);
    }

    // ---------- prices history (audit of price changes) ----------
    if (section === "price-history" && req.method === "GET") {
      if (!isOwner(auth) && !hasPerm(auth, "reports_view")) return res.status(403).json({ error: "غير مصرّح" });
      return await priceHistory(req, res);
    }

    // ---------- coupon usage report ----------
    if (section === "coupon-report" && req.method === "GET") {
      if (!isOwner(auth) && !hasPerm(auth, "reports_view")) return res.status(403).json({ error: "غير مصرّح" });
      return await couponReport(req, res);
    }

    // ---------- reviews moderation ----------
    if (section === "reviews" && !id && req.method === "GET") {
      if (!hasPerm(auth, "content_games") && !isOwner(auth)) return res.status(403).json({ error: "غير مصرّح" });
      return await reviewsList(req, res);
    }
    if (section === "reviews" && id && req.method === "PATCH") {
      if (!hasPerm(auth, "content_games") && !isOwner(auth)) return res.status(403).json({ error: "غير مصرّح" });
      return await reviewModerate(req, res, id, auth);
    }

    // ---------- notifications broadcast (owner or explicit perm) ----------
    if (section === "broadcast" && req.method === "POST") {
      if (!isOwner(auth) && !hasPerm(auth, "content_games")) return res.status(403).json({ error: "غير مصرّح" });
      return await broadcast(req, res, auth);
    }

    return res.status(404).json({ error: "Not found" });
  } catch (e) {
    console.error(`admin/${parts.join("/")} error:`, e);
    return res.status(500).json({ error: "صار خطأ بالسيرفر" });
  }
}

/* ---------- store settings: contact details + SMTP (owner only) ---------- */
async function settingsAction(req, res, auth) {
  if (!isOwner(auth)) return res.status(403).json({ error: "بس المالك يقدر يعدل الإعدادات" });
  if (req.method === "GET") return await settingsGet(req, res);
  if (req.method === "POST") return await settingsSave(req, res, auth);
  return res.status(405).json({ error: "Method not allowed" });
}
async function settingsGet(req, res) {
  const s = sql();
  const rows = await s`select key, value from site_content where key in ('socialLinks', 'settings', 'siteBranding', 'aboutPage')`;
  const content = {};
  for (const row of rows) content[row.key] = row.value;
  // contact info from socialLinks (never expose the app password — only
  // whether SMTP is configured and the (masked) sender user)
  const configured = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  return res.status(200).json({
    socialLinks: content.socialLinks || {},
    settings: content.settings || {},
    email: { configured, user: process.env.GMAIL_USER || "" },
    branding: content.siteBranding || {},
    aboutPage: content.aboutPage || null,
  });
}
async function settingsSave(req, res, auth) {
  const body = await readJsonBody(req);
  const s = sql();
  // ---- contact details ---- (socialLinks persisted in site_content)
  const sl = body.socialLinks;
  if (sl !== undefined && sl !== null) {
    if (typeof sl !== "object") return res.status(400).json({ error: "بيانات التواصل غير صالحة" });
    const safe = {
      whatsapp: safeContact(String(sl.whatsapp || "").trim()),
      telegram: safeContact(String(sl.telegram || "").trim()),
      instagram: safeContact(String(sl.instagram || "").trim()),
      facebook: safeContact(String(sl.facebook || "").trim()),
      storeEmail: safeEmail(String(sl.storeEmail || "").trim()),
      storePhone: safeContact(String(sl.storePhone || "").trim()),
      storeAddress: String(sl.storeAddress || "").trim().slice(0, 300),
      tiktok: safeContact(String(sl.tiktok || "").trim()),
      youtube: safeContact(String(sl.youtube || "").trim()),
      x: safeContact(String(sl.x || "").trim()),
    };
    await s`insert into site_content (key, value) values ('socialLinks', ${JSON.stringify(safe)}::jsonb)
      on conflict (key) do update set value = excluded.value`;
  }
  // ---- SMTP ---- (stored encrypted-ish in site_content.settings, applied to runtime env)
  const smtp = body.smtp;
  if (smtp !== undefined && smtp !== null) {
    if (typeof smtp !== "object") return res.status(400).json({ error: "بيانات الإيميل غير صالحة" });
    const user = safeEmail(String(smtp.user || "").trim());
    const pass = smtp.appPassword !== undefined ? String(smtp.appPassword) : null;
    if (user && !/^\S+@\S+\.\S+$/.test(user)) return res.status(400).json({ error: "بريد المرسل غير صالح" });
    if (pass !== null && pass.length > 0 && pass.length < 12) return res.status(400).json({ error: "كلمة مرور التطبيق لازم تكون 12 محرف أو أكثر (App Password يلي بتولّدها Google)" });
    const current = await s`select value from site_content where key = 'settings'`;
    const cur = (current[0] && current[0].value) || {};
    const merged = { ...cur, smtpUser: user || "", smtpPass: pass !== null && pass !== "" ? pass : (user ? cur.smtpPass || "" : "") };
    await s`insert into site_content (key, value) values ('settings', ${JSON.stringify(merged)}::jsonb)
      on conflict (key) do update set value = excluded.value`;
    // apply to runtime: mailer rebuilds the transporter when these change
    try { await applySmtpToRuntime(user, merged.smtpPass || ""); } catch (e) { console.warn("smtp apply failed:", e.message); }
  }
  // ---- store logo ---- (uploaded as base64 data URL, stored on S3)
  const logo = body.logo;
  if (logo !== undefined && logo !== null) {
    if (typeof logo !== "string") return res.status(400).json({ error: "بيانات الشعار غير صالحة" });
    if (!logo.trim()) {
      // empty string = remove the logo
      const delResult = await applyLogoDelete(s);
      if (delResult.status) return res.status(delResult.status).json({ error: delResult.error });
    } else {
      const logoResult = await applyLogoUpload(s, logo);
      if (logoResult.status) return res.status(logoResult.status).json({ error: logoResult.error });
    }
  }
  // ---- about page (story + weekly working hours) ----
  const ap = body.aboutPage;
  if (ap !== undefined && ap !== null) {
    if (typeof ap !== "object") return res.status(400).json({ error: "بيانات صفحة من نحن غير صالحة" });
    const safe = {
      headline: String(ap.headline || "").trim().slice(0, 120),
      story: String(ap.story || "").trim().slice(0, 2500),
      hours: (Array.isArray(ap.hours) ? ap.hours : []).map((h) => ({
        day: String(h.day || "").trim().slice(0, 20),
        en: String(h.en || "").trim().slice(0, 10),
        open: String(h.open || "").trim().slice(0, 10),
        close: String(h.close || "").trim().slice(0, 10),
        enabled: h.enabled === false ? false : true,
      })).slice(0, 7),
    };
    const days = safe.hours.map((h) => h.en).filter(Boolean);
    if (new Set(days).size !== days.length) return res.status(400).json({ error: "في أيام مكررة بجدول العمل" });
    for (const h of safe.hours) {
      if (!h.en) return res.status(400).json({ error: "كل يوم لازم يكون عنده معرف بالإنجليزية (sun..sat)" });
      if (!/^(0[0-9]|1[0-9]|2[0-4]):[0-5][0-9]$/.test(h.open) || !/^(0[0-9]|1[0-9]|2[0-4]):[0-5][0-9]$/.test(h.close)) {
        return res.status(400).json({ error: `وقت عمل غير صالح لـ ${h.day}: لازم بصيغة HH:mm` });
      }
    }
    await s`insert into site_content (key, value) values ('aboutPage', ${JSON.stringify(safe)}::jsonb)
      on conflict (key) do update set value = excluded.value`;
  }
  await logActivity(auth.user.id, "settings_saved", "تعديل إعدادات المتجر", {});
  return res.status(200).json({ ok: true });
}
function safeContact(v) {
  return v.slice(0, 80).replace(/[\n\r]+/g, " ");
}
/* ---------- store logo upload (base64 data URL → S3 → site_content.siteBranding) ---------- */
async function applyLogoUpload(s, logo) {
  // accept "data:image/...;base64,..." only
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(logo.trim());
  if (!match) return { status: 400, error: "الشعار لازم يكون صورة بصيغة data URL (PNG/JPG/WebP)" };
  const mime = match[1].toLowerCase();
  const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
  if (!allowed.includes(mime)) return { status: 400, error: "صيغة الصورة غير مدعومة — استخدم PNG أو JPG أو WebP" };
  let buf;
  try {
    buf = Buffer.from(match[2], "base64");
  } catch {
    return { status: 400, error: "بيانات الشعار تالفة" };
  }
  if (buf.length === 0 || buf.length > 2 * 1024 * 1024) return { status: 400, error: "حجم الشعار لازم يكون بين 1 بايت و 2 ميغابايت" };
  const ext = mime === "image/svg+xml" ? "svg" : mime === "image/jpeg" || mime === "image/jpg" ? "png" : "png";
  let url = "";
  try {
    const r = await storagePut(`qwader/logo.${ext}`, new Uint8Array(buf), mime);
    url = r.url || "";
  } catch (e) {
    console.error("logo upload failed:", e.message);
    return { status: 500, error: "فشل رفع الشعار — جرب مرة ثانية" };
  }
  const current = await s`select value from site_content where key = 'siteBranding'`;
  const cur = (current[0] && current[0].value) || {};
  await s`insert into site_content (key, value) values ('siteBranding', ${JSON.stringify({ ...cur, logoUrl: url })}::jsonb)
    on conflict (key) do update set value = excluded.value`;
  return { status: 0, url };
}
async function applyLogoDelete(s) {
  const current = await s`select value from site_content where key = 'siteBranding'`;
  const cur = (current[0] && current[0].value) || {};
  await s`insert into site_content (key, value) values ('siteBranding', ${JSON.stringify({ ...cur, logoUrl: "" })}::jsonb)
    on conflict (key) do update set value = excluded.value`;
  return { status: 0 };
}

function safeEmail(v) {
  const s = safeContact(v);
  return /^\S+@\S+\.\S+$/.test(s) ? s : "";
}
async function applySmtpToRuntime(user, pass) {
  const mailer = await import("./mailer.js");
  // env update lets the existing guards/transporter pick the new credentials
  process.env.GMAIL_USER = user;
  process.env.GMAIL_APP_PASSWORD = pass;
  if (typeof mailer.refreshTransporter === "function") await mailer.refreshTransporter();
}

async function customers(req, res) {
  const s = sql();
  const rows = await s`
    select id, name, email, phone, created_at, last_login_at
    from users where role = 'customer' order by created_at desc limit 500
  `;
  return res.status(200).json({ customers: rows });
}

async function chatsList(req, res) {
  // unified support center (conversations) — old chat_threads gone
  const s = sql();
  const threads = await s`
    select c.id, c.status, c.unread_admin, c.unread_user, c.updated_at, c.subject, c.category,
           u.id as user_id, u.name as user_name, u.phone as user_phone,
           (select text from conversation_messages where conversation_id = c.id order by created_at desc limit 1) as last_text
    from conversations c join users u on u.id = c.user_id
    order by c.updated_at desc limit 300
  `;
  return res.status(200).json({ threads });
}

async function chatDetail(req, res, id) {
  const s = sql();
  const convs = await s`
    select c.id, c.status, c.subject, c.category, c.order_id as "orderId", u.name as user_name, u.phone as user_phone
    from conversations c join users u on u.id = c.user_id where c.id = ${id}
  `;
  if (convs.length === 0) return res.status(404).json({ error: "المحادثة غير موجودة" });
  const messages = await s`select id, from_role as "from", text, image_url as image, created_at as ts from conversation_messages where conversation_id = ${id} order by created_at asc`;
  await s`update conversations set unread_admin = 0 where id = ${id}`;
  await s`update conversation_messages set read_by_staff = true where conversation_id = ${id} and read_by_staff = false`;
  return res.status(200).json({ thread: { ...convs[0], messages } });
}

async function chatReply(req, res, id) {
  const body = await readJsonBody(req);
  const text = String(body.text || "").trim();
  const image = body.image ? String(body.image) : null;
  if (!text && !image) return res.status(400).json({ error: "الرسالة فاضية" });
  const s = sql();
  const msg = await s`
    insert into conversation_messages (conversation_id, from_role, text, image_url) values (${id}, 'admin', ${text}, ${image})
    returning id, from_role as "from", text, image_url as image, created_at as ts
  `;
  await s`update conversations set unread_user = unread_user + 1, updated_at = now(), last_message_at = now() where id = ${id}`;
  return res.status(201).json({ message: msg[0] });
}

async function chatArchive(req, res, id) {
  const body = await readJsonBody(req);
  const status = body.status === "closed" || body.status === "archived" ? "closed" : "open";
  const s = sql();
  await s`update conversations set status = ${status}, updated_at = now() where id = ${id}`;
  return res.status(200).json({ ok: true });
}

async function chatStart(req, res) {
  const body = await readJsonBody(req);
  const userId = String(body.userId || "");
  const text = String(body.text || "").trim();
  const subject = String(body.subject || "محادثة جديدة").trim().slice(0, 120);
  if (!userId || !text) return res.status(400).json({ error: "لازم تختار زبون وتكتب رسالة" });

  const s = sql();
  const customer = await s`select id from users where id = ${userId}`;
  if (customer.length === 0) return res.status(404).json({ error: "الزبون غير موجود" });

  let convs = await s`select id from conversations where user_id = ${userId}`;
  let convId;
  if (convs.length === 0) {
    const created = await s`insert into conversations (user_id, subject, category, status, unread_user) values (${userId}, ${subject}, 'other', 'open', 1) returning id`;
    convId = created[0].id;
  } else {
    convId = convs[0].id;
    await s`update conversations set unread_user = unread_user + 1, status = 'open', updated_at = now(), last_message_at = now() where id = ${convId}`;
  }
  await s`insert into conversation_messages (conversation_id, from_role, text) values (${convId}, 'admin', ${text})`;
  await s`insert into notifications (user_id, kind, title, body, ref_type, ref_id)
          values (${userId}, 'support', 'رسالة جديدة من الإدارة', ${String(text).slice(0, 150)}, 'conversation', ${convId})`;
  return res.status(201).json({ threadId: convId });
}

async function ordersList(req, res) {
  const s = sql();
  const orders = await s`
     select id, user_id as "userId", user_name as "userName", phone, items, total, custom, status,
           payment_method as "paymentMethod", payment_proof_image as "paymentProofImage",
           cancel_reason as "cancelReason", rating, rating_comment as "ratingComment",
           admin_note as "adminNote", created_at as ts,
           delivery_company as "deliveryCompany", delivery_city as "deliveryCity", delivery_fee as "deliveryFee",
           delivery_notes as "deliveryNotes", pickup_completed_at as "pickupCompletedAt"
     from orders order by created_at desc limit 500
  `;
  return res.status(200).json({ orders: orders.map(numifyOrder) });
}

async function orderUpdate(req, res, id, auth, body) {
  const s = sql();
  if (body.status !== undefined) {
    if (!ORDER_STATUSES.includes(body.status)) return res.status(400).json({ error: "حالة غير معروفة" });
    const status = body.status;
    const cancelReason = status === "cancelled" ? String(body.cancelReason || "").slice(0, 300) : null;
    await s`update orders set status = ${status}, cancel_reason = ${cancelReason} where id = ${id}`;
    const label = status === "payment_confirmed" ? "أكّد وصول الدفع لطلب" : status === "cancelled" ? "ألغى طلب" : "غيّر حالة طلب";
    await logActivity(auth.user.name, `${label} #${String(id).slice(-6)} إلى ${status}`);
  }
  if (body.adminNote !== undefined) {
    await s`update orders set admin_note = ${String(body.adminNote)} where id = ${id}`;
  }
  return res.status(200).json({ ok: true });
}

async function orderDelete(req, res, id, auth) {
  const s = sql();
  await s`delete from orders where id = ${id}`;
  await logActivity(auth.user.name, `حذف طلب #${String(id).slice(-6)}`);
  return res.status(200).json({ ok: true });
}

async function contentUpdate(req, res, auth) {
  const body = await readJsonBody(req);
  const key = String(body.key || "");
  if (!CONTENT_KEYS.includes(key)) return res.status(400).json({ error: "مفتاح غير معروف" });
  if (OWNER_ONLY_CONTENT_KEYS.includes(key) && !isOwner(auth)) return res.status(403).json({ error: "بس المالك يقدر يعدّل هاي" });
  const neededPerm = CONTENT_KEY_PERM[key];
  if (neededPerm && !hasPerm(auth, neededPerm)) return res.status(403).json({ error: "ما عندك صلاحية تعديل هاي" });
  if (body.value === undefined) return res.status(400).json({ error: "لازم قيمة" });
  const s = sql();

  // wishlist price-drop alert: compare against the previous games list
  // before it's overwritten, and email anyone who has a game that just
  // got cheaper — best-effort, never blocks saving the new prices
  if (key === "games") {
    try {
      const prev = await s`select value from site_content where key = 'games'`;
      await notifyPriceDrops(s, prev.length > 0 ? prev[0].value : [], body.value);
    } catch (e) { console.error("price-drop notify failed:", e.message); }
  }

  await s`
    insert into site_content (key, value) values (${key}, ${JSON.stringify(body.value)}::jsonb)
    on conflict (key) do update set value = excluded.value
  `;

  // audit: record every price change so staff can review who changed what and when
  if ((key === "prices" || key === "games") && Array.isArray(body.value)) {
    try {
      const prev = (await s`select value from site_content where key = ${key === "games" ? "games" : "prices"}`);
      const prevArr = (prev[0] && Array.isArray(prev[0].value)) ? prev[0].value : [];
      const byId = new Map((prevArr || []).map(x => [x.id || x.region, x]));
      for (const item of body.value) {
        const old = byId.get(item.id || item.region);
        if (!old) continue;
        const op = Number(old.price);
        const np = Number(item.price);
        if (!isNaN(op) && !isNaN(np) && op !== np) {
          await s`insert into price_history (who, game_name, old_price, new_price)
                  values (${auth.user.name}, ${String(item.name || item.region || item.id) || ""}, ${op}, ${np})`;
        }
      }
    } catch (e) { console.warn("price_history audit failed:", e.message); }
  }

  await logActivity(auth.user.name, `عدّل ${CONTENT_LABELS[key] || key}`);
  return res.status(200).json({ ok: true });
}

async function notifyPriceDrops(s, oldGames, newGames) {
  const oldById = new Map((oldGames || []).map(g => [g.id, g]));
  const drops = (newGames || []).filter(g => {
    const old = oldById.get(g.id);
    return old && Number(g.price) < Number(old.price);
  });
  for (const g of drops) {
    // in-app notification + email for every user who has this game wishlisted
    const rows = await s`select id, name, email from users where email is not null and wishlist @> ${JSON.stringify([g.id])}::jsonb`;
    for (const u of rows) {
      await sendPriceDropEmail(u.email, u.name, g.name, g.price);
      try {
        await notifyUser(s, u.id, "price", "انخفض سعر لعبة تحبها 🎉", `${g.name} صار سعرها ${Number(g.price)} د.أ فقط — شوفها بالمفضلة واطلبها قبل ما تخلص`, { type: "game", id: String(g.id) });
      } catch (e) { console.warn("price-drop in-app notify failed:", e.message); }
    }
  }
}

// legacy contact form submissions — new ones flow through the unified
// support center (conversations) and are visible via /api/admin/chats
async function messagesList(req, res) {
  const s = sql();
  const messages = await s`select id, name, phone, message, read, created_at as ts from contact_messages order by created_at desc limit 500`;
  return res.status(200).json({ messages });
}

async function messageMarkRead(req, res, id) {
  const body = await readJsonBody(req);
  const s = sql();
  await s`update contact_messages set read = ${!!body.read} where id = ${id}`;
  return res.status(200).json({ ok: true });
}

async function messageDelete(req, res, id) {
  const s = sql();
  await s`delete from contact_messages where id = ${id}`;
  return res.status(200).json({ ok: true });
}

async function notifyList(req, res) {
  const s = sql();
  const requests = await s`select id, game_name as "gameName", user_id as "userId", phone, notified, created_at as ts from notify_requests order by created_at desc limit 500`;
  return res.status(200).json({ requests });
}

async function notifyMark(req, res, id) {
  const body = await readJsonBody(req);
  const s = sql();
  await s`update notify_requests set notified = ${!!body.notified} where id = ${id}`;
  return res.status(200).json({ ok: true });
}

async function staffList(req, res) {
  const s = sql();
  const staff = await s`select id, name, email, role, permissions, created_at from users where role in ('staff','owner') order by created_at asc`;
  return res.status(200).json({ staff });
}

async function staffPromote(req, res, auth) {
  const body = await readJsonBody(req);
  const identifier = String(body.identifier || body.email || "").trim();
  if (!identifier) return res.status(400).json({ error: "الإيميل أو رقم الهاتف مطلوب" });
  const s = sql();
  const rows = await s`select id, role, email, phone from users where email = ${identifier.toLowerCase()} or phone = ${identifier}`;
  if (rows.length === 0) return res.status(404).json({ error: "ما في حساب بهالبيانات — لازم يسجل حساب عادي بالموقع الأول" });
  if (rows[0].role === "owner") return res.status(400).json({ error: "هذا الحساب أصلًا مالك" });
  // starts with zero permissions on purpose — the owner grants them one by one afterwards
  await s`update users set role = 'staff', permissions = '{}'::jsonb where id = ${rows[0].id}`;
  await logActivity(auth.user.name, `رقّى ${rows[0].email || rows[0].phone} لصلاحية موظف`);
  return res.status(200).json({ ok: true });
}

async function staffSetPermissions(req, res, id, auth) {
  const body = await readJsonBody(req);
  const incoming = body.permissions && typeof body.permissions === "object" ? body.permissions : {};
  // only ever store known, boolean flags — anything else sent by a
  // tampered client request is silently dropped
  const clean = {};
  for (const k of PERMISSION_KEYS) if (incoming[k] === true) clean[k] = true;

  const s = sql();
  const rows = await s`select email, role from users where id = ${id}`;
  if (rows.length === 0) return res.status(404).json({ error: "غير موجود" });
  if (rows[0].role !== "staff") return res.status(400).json({ error: "بس صلاحيات الموظفين قابلة للتعديل من هون" });
  await s`update users set permissions = ${JSON.stringify(clean)}::jsonb where id = ${id}`;
  await logActivity(auth.user.name, `عدّل صلاحيات ${rows[0].email}`);
  return res.status(200).json({ ok: true, permissions: clean });
}

async function staffDemote(req, res, auth) {
  const id = queryParam(req, "id");
  const s = sql();
  const rows = await s`select email, role from users where id = ${id}`;
  if (rows.length === 0) return res.status(404).json({ error: "غير موجود" });
  if (rows[0].role === "owner") return res.status(400).json({ error: "ما فيك تشيل صلاحية المالك من هون" });
  await s`update users set role = 'customer', permissions = '{}'::jsonb where id = ${id}`;
  await logActivity(auth.user.name, `شال صلاحية الموظف عن ${rows[0].email}`);
  return res.status(200).json({ ok: true });
}

async function activityList(req, res) {
  const s = sql();
  const log = await s`select id, who, action, created_at as ts from activity_log order by created_at desc limit 200`;
  return res.status(200).json({ log });
}

async function backupsList(req, res) {
  const s = sql();
  const rows = await s`select id, created_at as ts from backups order by created_at desc limit 20`;
  return res.status(200).json({ backups: rows });
}

async function backupGet(req, res, id) {
  const s = sql();
  const rows = await s`select data, created_at as ts from backups where id = ${id}`;
  if (rows.length === 0) return res.status(404).json({ error: "غير موجود" });
  return res.status(200).json(rows[0]);
}

/* ---------------- suppliers ---------------- */
async function suppliersList(req, res) {
  const s = sql();
  const rows = await s`select * from suppliers order by name asc`;
  return res.status(200).json({ suppliers: rows });
}

async function supplierCreate(req, res, auth) {
  const body = await readJsonBody(req);
  const name = String(body.name || "").trim().slice(0, 100);
  if (!name) return res.status(400).json({ error: "اسم المورد مطلوب" });
  const s = sql();
  const rows = await s`insert into suppliers (name, country, contact_name, contact_phone, contact_email, website, notes)
    values (${name}, ${String(body.country || "").trim().slice(0, 100)}, ${String(body.contactName || "").trim().slice(0, 100)},
      ${String(body.contactPhone || "").trim().slice(0, 50)}, ${String(body.contactEmail || "").trim().slice(0, 150)},
      ${String(body.website || "").trim().slice(0, 300)}, ${String(body.notes || "").trim().slice(0, 1000)})
    returning *`;
  await logActivity(auth.user.name, `أضاف مورد: ${name}`);
  return res.status(201).json({ supplier: rows[0] });
}

async function supplierUpdate(req, res, id, auth) {
  const body = await readJsonBody(req);
  const s = sql();
  const sets = [];
  const fields = {
    name: String(body.name || "").trim().slice(0, 100),
    country: String(body.country || "").trim().slice(0, 100),
    contact_name: String(body.contactName || "").trim().slice(0, 100),
    contact_phone: String(body.contactPhone || "").trim().slice(0, 50),
    contact_email: String(body.contactEmail || "").trim().slice(0, 150),
    website: String(body.website || "").trim().slice(0, 300),
    notes: String(body.notes || "").trim().slice(0, 1000),
    rating: body.rating != null ? Math.min(5, Math.max(0, Number(body.rating) || 0)) : undefined,
    is_preferred: body.isPreferred != null ? !!body.isPreferred : undefined,
  };
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) sets.push(`${k} = ${v}`);
  if (sets.length === 0) return res.status(400).json({ error: "ما في بيانات للتعديل" });
  await s.unsafe(`update suppliers set ${sets.join(", ")} where id = $1`, [id]);
  await logActivity(auth.user.name, `عدّل مورد #${String(id).slice(0, 8)}`);
  return res.status(200).json({ ok: true });
}

async function supplierDelete(req, res, id, auth) {
  const s = sql();
  await s`delete from suppliers where id = ${id}`;
  await logActivity(auth.user.name, `حذف مورد #${String(id).slice(0, 8)}`);
  return res.status(200).json({ ok: true });
}

/* ---------------- sourcing queue: items customers asked for ---------------- */
async function sourcingList(req, res) {
  const s = sql();
  const rows = await s`
    select sr.id, sr.game_name as "gameName", sr.region, sr.user_id as "userId", u.name as "userName",
           u.phone, sr.extra as "extra", sr.created_at as ts, sr.notified
    from sourcing_requests sr join users u on u.id = sr.user_id
    where sr.fulfilled = false
    order by sr.created_at desc limit 300
  `;
  // attach per-game demand with tagged-template subqueries (never raw strings)
  const out = await Promise.all(rows.map(async (r) => {
    const d = await s`select count(*)::int as c from sourcing_requests where game_name = ${r.gameName} and fulfilled = false`;
    return { ...r, demand: d[0].c };
  }));
  return res.status(200).json({ requests: out });
}

async function sourcingFulfill(req, res, id, auth) {
  const s = sql();
  const rows = await s`select * from sourcing_requests where id = ${id}`;
  if (rows.length === 0) return res.status(404).json({ error: "طلب التزويد غير موجود" });
  const sr = rows[0];
  await s`update sourcing_requests set fulfilled = true, fulfilled_at = now(), notified = false where id = ${id}`;
  await logActivity(auth.user.id, "sourcing_fulfilled", `طلب تزويد مكتمل: ${sr.game_name}`, { sourcingId: id });
  // notify everyone who asked for this game
  const askers = await s`select name, email from users
                         join sourcing_requests on users.id = sourcing_requests.user_id
                         where game_name = ${sr.game_name} and fulfilled = false and users.email is not null`;
  for (const a of askers) {
    await sendEmail(a.email, "🎮 اللعبة يلي طلبتها وصلت! — QWADERGAME",
      `<div dir="rtl" style="font-family: system-ui, sans-serif; max-width: 420px; margin: 0 auto; padding: 24px; background: #0a0f20; color: #f4f6fb; border-radius: 16px;">
        <h2 style="color: #ff8a2b; margin: 0 0 12px;">🎮 وصلت!</h2>
        <p style="color: #c7cee3; font-size: 14px; line-height: 1.6;">أهلين ${a.name || "صديقي"}! اللعبة <b>${sr.game_name}</b> يلي طلبتها وصلت للكتالوج. راجح المتجر واحجزها قبل ما تخلص!</p>
      </div>`);
  }
  return res.status(200).json({ ok: true });
}

/* ---------------- refunds queue ---------------- */
async function refundsList(req, res) {
  const s = sql();
  const rows = await s.unsafe(`
    select o.id, o.user_id as "userId", u.name as "userName", o.total, o.status, o.payment_method as "paymentMethod",
           o.created_at as ts
    from orders o join users u on u.id = o.user_id
    where o.status in ('refund_requested','refund_processing','refunded')
    order by o.updated_at desc limit 300
  `);
  return res.status(200).json({ refunds: rows });
}

/* ---------------- price change audit ---------------- */
async function priceHistory(req, res) {
  const s = sql();
  const rows = await s`select * from price_history order by id desc limit 300`;
  return res.status(200).json({ history: rows });
}

/* ---------------- coupon usage report ---------------- */
async function couponReport(req, res) {
  const s = sql();
  const rows = await s.unsafe(`
    select cu.id, c.code, u.name, u.email, o.total as order_total, cu.used_at as ts
    from coupon_usage cu
    left join coupons c on c.id = cu.coupon_id
    left join users u on u.id = cu.user_id
    left join orders o on o.id = cu.order_id
    order by cu.used_at desc limit 300
  `);
  const agg = await s.unsafe(`
    select (select count(*) from coupon_usage)::int as usage_count,
           (select count(*) from coupons where expires_at is null or expires_at > now())::int as active_coupons
  `);
  return res.status(200).json({ usage: rows, agg: agg[0] });
}

/* ---------------- reviews moderation ---------------- */
async function reviewsList(req, res) {
  const s = sql();
  const rows = await s.unsafe(`
    select r.*, u.name as customer_name from reviews r join users u on u.id = r.user_id order by r.created_at desc limit 300
  `);
  return res.status(200).json({ reviews: rows });
}

async function reviewModerate(req, res, id, auth) {
  const body = await readJsonBody(req);
  const s = sql();
  if (body.visible !== undefined) {
    await s`update reviews set visible = ${!!body.visible} where id = ${id}`;
    await logActivity(auth.user.name, `أخفى تقييم #${String(id).slice(0, 8)}`);
  }
  return res.status(200).json({ ok: true });
}

/* ---------------- broadcast (admin side, mirrors notifications broadcast) ---------------- */
async function broadcast(req, res, auth) {
  const body = await readJsonBody(req);
  const title = String(body.title || "").trim().slice(0, 120);
  const message = String(body.message || "").trim().slice(0, 2000);
  if (!title || !message) return res.status(400).json({ error: "عبي العنوان والرسالة" });
  const s = sql();
  const users = await s`select id from users where role = 'customer' or role is null`;
  for (const u of users) {
    await s`insert into notifications (user_id, kind, title, body, ref_type, ref_id)
            values (${u.id}, 'promo', ${title}, ${message}, 'system', 'broadcast')`;
  }
  await logActivity(auth.user.name, `إرسال إشعار جماعي: ${title.slice(0, 60)}`);
  return res.status(200).json({ ok: true, sent: users.length });
}
