import { sql } from "./db.js";
import { getAuth, isValidEmail, comparePassword, hashPassword, clearSessionCookie, readJsonBody, pathAfter, revokeAllSessions, logActivity } from "./auth.js";

export default async function handler(req, res) {
  const action = pathAfter(req, "/api/account/")[0] || "";

  try {
    const auth = await getAuth(req);
    if (!auth) return res.status(401).json({ error: "لازم تسجل دخول" });

    if (action === "update" && req.method === "POST") return await update(req, res, auth);
    if (action === "change-password" && req.method === "POST") return await changePassword(req, res, auth);
    if (action === "two-fa" && req.method === "POST") return await twoFA(req, res, auth);
    if (action === "delete" && req.method === "POST") return await deleteAccount(req, res, auth);
    if (action === "referrals" && req.method === "GET") return await referrals(req, res, auth);
    if (action === "points" && req.method === "GET") return await points(req, res, auth);
    if (action === "avatar" && req.method === "POST") return await setAvatar(req, res, auth);
    return res.status(404).json({ error: "Not found" });
  } catch (e) {
    console.error(`account/${action} error:`, e);
    return res.status(500).json({ error: "صار خطأ بالسيرفر" });
  }
}

async function update(req, res, auth) {
  const body = await readJsonBody(req);
  const s = sql();

  if (body.name !== undefined || body.email !== undefined || body.phone !== undefined) {
    const name = body.name !== undefined ? String(body.name).trim() : auth.user.name;
    const emailRaw = body.email !== undefined ? String(body.email).trim().toLowerCase() : (auth.user.email || "");
    const email = emailRaw || null;
    const phone = body.phone !== undefined ? String(body.phone).trim() : (auth.user.phone || "");
    if (!name) return res.status(400).json({ error: "الاسم مطلوب" });
    if (!email && !phone) return res.status(400).json({ error: "لازم إيميل أو رقم هاتف عالأقل" });
    if (email && !isValidEmail(email)) return res.status(400).json({ error: "صيغة الإيميل غير صحيحة" });
    if (email && email !== auth.user.email) {
      const dupe = await s`select id from users where email = ${email} and id != ${auth.user.id}`;
      if (dupe.length > 0) return res.status(409).json({ error: "الإيميل مستخدم بحساب تاني" });
    }
    if (phone && phone !== auth.user.phone) {
      const dupe = await s`select id from users where phone = ${phone} and id != ${auth.user.id}`;
      if (dupe.length > 0) return res.status(409).json({ error: "رقم الهاتف مستخدم بحساب تاني" });
    }
    await s`update users set name = ${name}, email = ${email}, phone = ${phone} where id = ${auth.user.id}`;
  }
  if (body.avatar !== undefined) {
    await s`update users set avatar = ${body.avatar} where id = ${auth.user.id}`;
  }
  if (body.addresses !== undefined) {
    await s`update users set addresses = ${JSON.stringify(body.addresses)}::jsonb where id = ${auth.user.id}`;
  }
  if (body.wishlist !== undefined) {
    // wishlist: ordered list of product ids owned by the games catalog only.
    // Validate strictly (array of strings/ints, dedupe, cap 50) so malformed
    // payloads can't overwrite the column with garbage.
    const raw = Array.isArray(body.wishlist) ? body.wishlist : [];
    const dedupe = Array.from(new Set(
      raw.map(id => typeof id === "number" ? id : id != null && id !== "" ? String(id) : null).filter(x => x !== null)
    )).slice(-50);
    await s`update users set wishlist = ${JSON.stringify(dedupe)}::jsonb where id = ${auth.user.id}`;
  }
  if (body.cart !== undefined) {
    await s`update users set cart = ${JSON.stringify(body.cart)}::jsonb where id = ${auth.user.id}`;
  }
  if (body.recentlyViewed !== undefined && Array.isArray(body.recentlyViewed)) {
    // keep only the last 30 viewed product ids — nothing else ever goes in
    const trimmed = body.recentlyViewed.slice(-30).map(id => String(id)).filter(Boolean);
    await s`update users set recently_viewed = ${JSON.stringify(Array.from(new Set(trimmed)).slice(-30))}::jsonb where id = ${auth.user.id}`;
  }

  const rows = await s`select id, name, email, phone, avatar, addresses, wishlist, cart, two_fa_enabled, role, discount_percent, discount_reason from users where id = ${auth.user.id}`;
  const u = rows[0];
  return res.status(200).json({
    user: {
      id: u.id, name: u.name, email: u.email, phone: u.phone, avatar: u.avatar, addresses: u.addresses,
      wishlist: u.wishlist, cart: u.cart, twoFAEnabled: u.two_fa_enabled, role: u.role,
      discountPercent: Number(u.discount_percent) || 0, discountReason: u.discount_reason || "",
    },
  });
}

/* referral code = last 5 chars of the user's id (uppercased) — same rule
   used at signup (api/auth/[...action].js). "count" is how many accounts
   were created with this user's code. */
async function referrals(req, res, auth) {
  const s = sql();
  const rows = await s`select count(*)::int as count from users where referred_by = ${auth.user.id}`;
  const code = String(auth.user.id).slice(-5).toUpperCase();
  return res.status(200).json({ code, count: rows[0].count });
}

async function changePassword(req, res, auth) {
  const body = await readJsonBody(req);
  const currentPw = String(body.currentPassword || "");
  const newPw = String(body.newPassword || "");
  if (!currentPw || !newPw) return res.status(400).json({ error: "عبي الحقلين" });
  if (newPw.length < 8) return res.status(400).json({ error: "كلمة السر الجديدة لازم تكون 8 أحرف عالأقل" });

  const s = sql();
  const rows = await s`select password_hash from users where id = ${auth.user.id}`;
  const ok = await comparePassword(currentPw, rows[0].password_hash);
  if (!ok) return res.status(401).json({ error: "كلمة السر الحالية غلط" });

  const passwordHash = await hashPassword(newPw);
  await s`update users set password_hash = ${passwordHash} where id = ${auth.user.id}`;
  // security: invalidate every active session so a stolen session can't survive a password change
  await revokeAllSessions(auth.user.id);
  await logActivity(auth.user.id, "password_changed", "تغيير كلمة السر");
  clearSessionCookie(res);
  return res.status(200).json({ ok: true, reloginRequired: true });
}

async function twoFA(req, res, auth) {
  const body = await readJsonBody(req);
  const enabled = !!body.enabled;
  const s = sql();
  await s`update users set two_fa_enabled = ${enabled} where id = ${auth.user.id}`;
  return res.status(200).json({ twoFAEnabled: enabled });
}

async function deleteAccount(req, res, auth) {
  const s = sql();
  await s`delete from users where id = ${auth.user.id}`;
  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
}

/* loyalty points history for the customer */
async function points(req, res, auth) {
  const s = sql();
  const rows = await s`select * from loyalty_points where user_id = ${auth.user.id} order by id desc limit 100`;
  const u = await s`select points_balance from users where id = ${auth.user.id}`;
  return res.status(200).json({ balance: Number(u[0]?.points_balance) || 0, history: rows });
}

/* avatar upload: base64 data-url goes to storage, NOT into the users row */
async function setAvatar(req, res, auth) {
  const { dataUrlToBuffer, validateImageUpload, storeFile } = await import("../_lib/common.js");
  const body = await readJsonBody(req);
  const parsed = dataUrlToBuffer(body.image);
  if (!parsed) return res.status(400).json({ error: "الصورة غير صالحة" });
  const err = validateImageUpload({ name: "avatar.jpg", type: parsed.mime }, parsed.buffer.length);
  if (err) return res.status(400).json({ error: err });
  const stored = await storeFile({ buffer: parsed.buffer, mime: parsed.mime, ownerType: "avatar", uploadedBy: auth.user.id });
  const s = sql();
  await s`update users set avatar = ${stored.url} where id = ${auth.user.id}`;
  return res.status(200).json({ avatar: stored.url });
}
