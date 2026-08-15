import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { sql } from "./db.js";
import { sendOtpEmail } from "./mailer.js";
import { ensureSchema } from "./schema.js";
import {
  hashPassword, comparePassword, isValidEmail, createSession, setSessionCookie,
  clearSessionCookie, getAuth, revokeSession, revokeAllSessions, readJsonBody,
  checkLoginLock, recordFailedLogin, clearLoginAttempts, pathAfter, queryParam,
} from "./auth.js";
import { checkRateLimit, rateLimitBy, notifyUser, withErrorHandler } from "./common.js";

/* OTP stored server-side: cryptographically random, expiring, one-time use,
   attempt-limited, and NEVER echoed back to the frontend (no more demoCode). */
const OTP_LENGTH = 6;
const OTP_TTL_SEC = 10 * 60;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_ACTIVE = 3; // newest codes replace the oldest per user

function genOtp() {
  // cryptographically random digits (not Math.random)
  const bytes = crypto.randomBytes(OTP_LENGTH);
  return Array.from(bytes, b => b % 10).join("");
}

/* delete expired/spent codes, keep at most OTP_MAX_ACTIVE per purpose+identifier */
async function insertOtp(s, identifier, purpose, uid = null) {
  await s`delete from otp_codes where created_at < now() - ${`${OTP_TTL_SEC} seconds`}::interval`;
  await s`
    insert into otp_codes (identifier, purpose, user_id, code, attempts)
    values (${identifier}, ${purpose}, ${uid}, ${genOtp()}, 0)
  `;
  // NOTE: order by id desc (not created_at desc) — Postgres created_at has
  // only ~1ms precision, so back-to-back codes can tie and cleanup would
  // delete the just-inserted row non-deterministically. BIGSERIAL ids are
  // strictly monotonic and make retention/selection deterministic.
  await s`
    delete from otp_codes
    where id in (
      select id from otp_codes where identifier = ${identifier} and purpose = ${purpose}
      order by id desc offset ${OTP_MAX_ACTIVE}
    )
  `;
  const rows = await s`select code, id from otp_codes where identifier = ${identifier} and purpose = ${purpose} order by id desc limit 1`;
  return rows[0];
}

/* OTP table create is handled by ensureSchema (api/_lib/schema.js). */
async function getOtpTable(s) {
  const rows = await s`select to_regclass('otp_codes') as t`;
  return rows[0].t !== null;
}

const MAX_LOGIN_ATTEMPTS = 5;
const REFERRAL_REWARD_PERCENT = 7;
const WELCOME_COUPON_PERCENT = 10;
const REFERRAL_REWARD_CAP = 20;

function isValidPhone(phone) {
  return /^[\d+\-\s]{7,20}$/.test(phone) && phone.replace(/\D/g, "").length >= 7;
}

/* Vercel Hobby allows 12 functions — this file combines every auth route. */
export default withErrorHandler(async (req, res) => {
  await ensureSchema();
  const action = pathAfter(req, "/api/auth/")[0] || "";

  if (action === "signup-start" && req.method === "POST") return await signupStart(req, res);
  if (action === "signup-verify" && req.method === "POST") return await signupVerify(req, res);
  if (action === "login" && req.method === "POST") return await login(req, res);
  if (action === "me" && req.method === "GET") return await me(req, res);
  if (action === "logout" && req.method === "POST") return await logout(req, res);
  if (action === "logout-all" && req.method === "POST") return await logoutAll(req, res);
  if (action === "forgot-start" && req.method === "POST") return await forgotStart(req, res);
  if (action === "forgot-verify" && req.method === "POST") return await forgotVerify(req, res);
  if (action === "forgot-reset" && req.method === "POST") return await forgotReset(req, res);
  return res.status(404).json({ error: "Not found" });
});

/* ===================== SIGNUP — server-side OTP via email ===================== */
async function signupStart(req, res) {
  const rl = await rateLimitBy(null, req, "signup");
  if (rl.limited) return res.status(429).json({ error: `محاولات كثيرة، جرب بعد ${rl.retryAfterSec} ثانية` });

  const body = await readJsonBody(req);
  const method = body.method === "phone" ? "phone" : "email";
  const identifier = String(body.identifier || "").trim().toLowerCase();
  const name = String(body.name || "").trim();
  const pw = String(body.password || "");
  const referralCode = String(body.referralCode || "").trim().toUpperCase();
  const rememberMe = !!body.rememberMe;

  if (!name || !identifier || !pw) return res.status(400).json({ error: "عبي كل الحقول" });
  if (method === "email" && !isValidEmail(identifier)) return res.status(400).json({ error: "صيغة الإيميل غير صحيحة" });
  if (method === "phone" && !isValidPhone(identifier)) return res.status(400).json({ error: "صيغة رقم الهاتف غير صحيحة" });
  if (pw.length < 8) return res.status(400).json({ error: "كلمة السر لازم تكون 8 أحرف عالأقل" });
  if (pw.length > 128) return res.status(400).json({ error: "كلمة السر طويلة جدًا" });

  const s = sql();
  const existing = method === "email"
    ? await s`select id from users where email = ${identifier}`
    : await s`select id from users where phone = ${identifier}`;
  if (existing.length > 0) return res.status(409).json({ error: "في حساب مسجل بهالبيانات أصلًا" });

  // anti self-referral: reject if the referral code belongs to the same identifier
  let referredBy = null;
  if (referralCode) {
    const ref = await s`select id, email, phone from users where upper(right(id::text, 5)) = ${referralCode}`;
    if (ref.length > 0) {
      const sameAccount = (ref[0].email && ref[0].email === identifier) ||
                          (ref[0].phone && ref[0].phone === identifier) ||
                          (ref[0].phone === "" && ref[0].email === identifier);
      if (sameAccount) return res.status(400).json({ error: "ما فيك تدعو حالك" });
      referredBy = ref[0].id;
    }
  }

  // Production-safe server-side OTP — the code is NEVER echoed back to the
  // frontend (verification happens server-side in signup-verify, where the
  // code must be entered by the user). The OTP is always delivered by email:
  // for email signups to the signup address itself; for phone signups to the
  // account's existing email address when one is on file. If real delivery
  // is not possible, signup fails openly instead of handing out a code.
  const otp = await insertOtp(s, `signup:${identifier}`, "signup");
  let sent = false;
  if (method === "email") sent = await sendOtpEmail(identifier, otp.code, "signup");
  else {
    // phone signup: deliver the verification code to the account's email so a
    // real code always reaches a real mailbox — no silent/demo paths.
    const row = await s`select email from users where phone = ${identifier} limit 1`;
    if (row.length > 0 && row[0].email) {
      sent = await sendOtpEmail(row[0].email, otp.code, "signup");
    }
  }
  if (!sent) {
    return res.status(400).json({ error: "خدمة التحقق غير متاحة حاليًا — جرّب التسجيل عبر الإيميل أو تواصل معنا" });
  }

  // pack everything EXCEPT the OTP into a short-lived signed token
  const pendingToken = jwt.sign(
    { purpose: "signup", method, identifier, name, referredBy, rememberMe, otpId: otp.id },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );
  return res.status(200).json({ pendingToken, method });
}

async function signupVerify(req, res) {
  const rl = await rateLimitBy(null, req, "otp_send");
  if (rl.limited) return res.status(429).json({ error: `محاولات كثيرة، جرب بعد ${rl.retryAfterSec} ثانية` });

  const body = await readJsonBody(req);
  const pendingToken = String(body.pendingToken || "");
  const code = String(body.code || "").trim();
  if (!pendingToken || !code) return res.status(400).json({ error: "عبي الكود" });

  let payload;
  try { payload = jwt.verify(pendingToken, process.env.JWT_SECRET); }
  catch (e) { return res.status(401).json({ error: "انتهت صلاحية الرمز، ابدأ التسجيل من جديد" }); }
  if (payload.purpose !== "signup") return res.status(401).json({ error: "طلب غير صالح" });

  const s = sql();
  const otpRows = await s`select id, code, attempts, identifier, user_id from otp_codes where id = ${payload.otpId} and purpose = 'signup'`;
  if (otpRows.length === 0) return res.status(401).json({ error: "رمز غير صالح أو منتهي، اطلب رمز جديد" });
  const otp = otpRows[0];
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return res.status(429).json({ error: "محاولات كثيرة غلط — ابدأ التسجيل من جديد" });
  if (String(otp.code) !== code) {
    await s`update otp_codes set attempts = attempts + 1 where id = ${otp.id}`;
    const left = OTP_MAX_ATTEMPTS - otp.attempts - 1;
    return res.status(401).json({ error: left > 0 ? `هذا الرمز خطأ (بقي ${left} محاولات)` : "محاولات كثيرة غلط — ابدأ التسجيل من جديد" });
  }

  const identifier = payload.method === "email" ? payload.identifier : null;
  const phone = payload.method === "phone" ? payload.identifier : "";

  const existing = payload.method === "email"
    ? await s`select id from users where email = ${identifier}`
    : await s`select id from users where phone = ${phone}`;
  if (existing.length > 0) return res.status(409).json({ error: "في حساب مسجل بهالبيانات أصلًا" });

  const passwordHash = await hashPassword(String(body.password || ""));
  const rows = await s`
    insert into users (name, email, phone, password_hash, referred_by, discount_percent, discount_reason)
    values (${payload.name}, ${identifier}, ${phone}, ${passwordHash}, ${payload.referredBy}, ${WELCOME_COUPON_PERCENT}, ${"كوبون ترحيبي لأول طلب"})
    returning id, name, email, phone, avatar, addresses, wishlist, cart, two_fa_enabled, role, discount_percent, discount_reason, permissions
  `;
  const user = rows[0];
  await s`delete from otp_codes where id = ${otp.id}`; // one-time use

  if (payload.referredBy) {
    await s`
      update users set
        discount_percent = greatest(discount_percent, ${REFERRAL_REWARD_PERCENT}),
        discount_reason = case when discount_percent >= ${REFERRAL_REWARD_PERCENT} then discount_reason else ${"خصم دعوة صديق"} end,
        referral_reward_count = referral_reward_count + 1
      where id = ${payload.referredBy} and referral_reward_count < ${REFERRAL_REWARD_CAP}
    `;
  }

  const { token } = await createSession(user.id, payload.rememberMe, req.headers["user-agent"]);
  setSessionCookie(res, token, payload.rememberMe);
  return res.status(201).json({ user: formatUser(user) });
}

/* ===================== LOGIN ===================== */
async function login(req, res) {
  const rl = await rateLimitBy(null, req, "login");
  if (rl.limited) return res.status(429).json({ error: `محاولات كثيرة، جرب بعد ${rl.retryAfterSec} ثانية` });

  const body = await readJsonBody(req);
  const identifier = String(body.identifier || body.email || "").trim();
  const identifierLower = identifier.toLowerCase();
  const pw = String(body.password || "");
  const rememberMe = !!body.rememberMe;
  const twoFACode = body.twoFACode ? String(body.twoFACode) : null;

  if (!identifier || !pw) return res.status(400).json({ error: "عبي بيانات الدخول وكلمة السر" });

  const lock = await checkLoginLock(identifierLower);
  if (lock.locked) {
    const mins = Math.max(1, Math.ceil((new Date(lock.lockedUntil) - Date.now()) / 60000));
    return res.status(429).json({ error: `محاولات كتير غلط — جرب بعد ${mins} ${mins === 1 ? "دقيقة" : "دقايق"}` });
  }

  const s = sql();
  const rows = await s`
    select id, name, email, phone, avatar, addresses, wishlist, cart, two_fa_enabled, role, discount_percent, discount_reason, permissions, password_hash
    from users where email = ${identifierLower} or phone = ${identifier}
  `;
  const found = rows[0];
  const ok = found ? await comparePassword(pw, found.password_hash) : false;
  if (!found || !ok) {
    const count = await recordFailedLogin(identifierLower);
    if (count >= MAX_LOGIN_ATTEMPTS) return res.status(429).json({ error: "محاولات كتير غلط — جرب بعد 5 دقايق" });
    return res.status(401).json({ error: `بيانات الدخول غلط (محاولة ${count} من ${MAX_LOGIN_ATTEMPTS})` });
  }

  if (found.two_fa_enabled) {
    if (!twoFACode) {
      // server-side 2FA OTP delivered by email — never shown on frontend
      const otp = await insertOtp(s, `2fa:${found.id}`, "2fa", found.id);
      let sent = false;
      if (found.email) sent = await sendOtpEmail(found.email, otp.code, "signup");
      if (!sent) {
        return res.status(400).json({ error: "خدمة تأكيد الإيميل غير مفعّلة — لا يمكن إتمام التحقق بخطوتين" });
      }
      const preToken = jwt.sign({ uid: found.id, purpose: "2fa", otpId: otp.id }, process.env.JWT_SECRET, { expiresIn: "5m" });
      return res.status(200).json({ twoFARequired: true, preToken });
    }
    const preToken = String(body.preToken || "");
    let payload;
    try { payload = jwt.verify(preToken, process.env.JWT_SECRET); } catch (e) { return res.status(401).json({ error: "انتهت صلاحية الكود، سجل دخول من جديد" }); }
    if (payload.purpose !== "2fa" || payload.uid !== found.id) return res.status(401).json({ error: "طلب غير صالح" });

    const otpRows = await s`select id, code, attempts from otp_codes where id = ${payload.otpId} and purpose = '2fa'`;
    if (otpRows.length === 0) return res.status(401).json({ error: "رمز منتهي، اطلب رمز جديد" });
    const otp = otpRows[0];
    if (otp.attempts >= OTP_MAX_ATTEMPTS) return res.status(429).json({ error: "محاولات كثيرة — ابدأ من جديد" });
    if (String(otp.code) !== String(twoFACode).trim()) {
      await s`update otp_codes set attempts = attempts + 1 where id = ${otp.id}`;
      return res.status(401).json({ error: "هذا الرمز خطأ" });
    }
    await s`delete from otp_codes where id = ${otp.id}`;
  }

  await clearLoginAttempts(identifierLower);
  await s`update users set last_login_at = now() where id = ${found.id}`;
  const { token } = await createSession(found.id, rememberMe, req.headers["user-agent"]);
  setSessionCookie(res, token, rememberMe);
  return res.status(200).json({ user: formatUser(found) });
}

async function me(req, res) {
  const auth = await getAuth(req);
  if (!auth) return res.status(200).json({ user: null });
  return res.status(200).json({ user: auth.user });
}

async function logout(req, res) {
  const auth = await getAuth(req);
  if (auth) await revokeSession(auth.sessionId);
  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
}

async function logoutAll(req, res) {
  const auth = await getAuth(req);
  if (!auth) return res.status(401).json({ error: "لازم تسجل دخول" });
  await revokeAllSessions(auth.user.id);
  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
}

/* ===================== FORGOT PASSWORD ===================== */
async function forgotStart(req, res) {
  const rl = await rateLimitBy(null, req, "forgot");
  if (rl.limited) return res.status(429).json({ error: `محاولات كثيرة، جرب بعد ${rl.retryAfterSec} ثانية` });

  const body = await readJsonBody(req);
  const identifier = String(body.identifier || body.email || "").trim();
  const identifierLower = identifier.toLowerCase();
  if (!identifier) return res.status(400).json({ error: "عبي الإيميل أو رقم الهاتف" });

  const s = sql();
  const rows = await s`select id, email from users where email = ${identifierLower} or phone = ${identifier}`;
  if (rows.length === 0) return res.status(404).json({ error: "ما في حساب بهالبيانات" });

  const otp = await insertOtp(s, `pwreset:${identifierLower}`, "pwreset", rows[0].id);
  let sent = false;
  if (rows[0].email) sent = await sendOtpEmail(rows[0].email, otp.code, "reset");
  if (!sent) {
    return res.status(400).json({ error: "خدمة تأكيد الإيميل غير مفعّلة — تواصل مع الإدارة لاستعادة كلمة السر" });
  }
  const pendingToken = jwt.sign({ purpose: "pwreset-otp", uid: rows[0].id, otpId: otp.id }, process.env.JWT_SECRET, { expiresIn: "10m" });
  return res.status(200).json({ pendingToken });
}

async function forgotVerify(req, res) {
  const rl = await rateLimitBy(null, req, "otp_send");
  if (rl.limited) return res.status(429).json({ error: `محاولات كثيرة، جرب بعد ${rl.retryAfterSec} ثانية` });

  const body = await readJsonBody(req);
  const pendingToken = String(body.pendingToken || "");
  const code = String(body.code || "").trim();
  if (!pendingToken || !code) return res.status(400).json({ error: "عبي الكود" });

  let payload;
  try { payload = jwt.verify(pendingToken, process.env.JWT_SECRET); }
  catch (e) { return res.status(401).json({ error: "انتهت صلاحية الرمز، اطلب رمز جديد" }); }
  if (payload.purpose !== "pwreset-otp") return res.status(401).json({ error: "طلب غير صالح" });

  const s = sql();
  const otpRows = await s`select id, code, attempts from otp_codes where id = ${payload.otpId} and purpose = 'pwreset'`;
  if (otpRows.length === 0) return res.status(401).json({ error: "رمز غير صالح أو منتهي" });
  const otp = otpRows[0];
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return res.status(429).json({ error: "محاولات كثيرة غلط — اطلب رمز جديد" });
  if (String(otp.code) !== code) {
    await s`update otp_codes set attempts = attempts + 1 where id = ${otp.id}`;
    return res.status(401).json({ error: "هذا الرمز خطأ" });
  }
  await s`delete from otp_codes where id = ${otp.id}`;

  const resetToken = jwt.sign({ uid: payload.uid, purpose: "pwreset" }, process.env.JWT_SECRET, { expiresIn: "10m" });
  return res.status(200).json({ resetToken });
}

async function forgotReset(req, res) {
  const body = await readJsonBody(req);
  const resetToken = String(body.resetToken || "");
  const newPw = String(body.newPassword || "");
  if (!resetToken || !newPw) return res.status(400).json({ error: "عبي كل الحقول" });
  if (newPw.length < 8) return res.status(400).json({ error: "كلمة السر لازم تكون 8 أحرف عالأقل" });
  if (newPw.length > 128) return res.status(400).json({ error: "كلمة السر طويلة جدًا" });

  let payload;
  try { payload = jwt.verify(resetToken, process.env.JWT_SECRET); } catch (e) {
    return res.status(401).json({ error: "انتهت صلاحية الجلسة، ابدأ استعادة كلمة السر من جديد" });
  }
  if (payload.purpose !== "pwreset") return res.status(401).json({ error: "توكن غير صالح" });

  const s = sql();
  const passwordHash = await hashPassword(newPw);
  await s`update users set password_hash = ${passwordHash} where id = ${payload.uid}`;
  await revokeAllSessions(payload.uid); // invalidate every active session
  return res.status(200).json({ ok: true });
}

function formatUser(u) {
  return {
    id: u.id, name: u.name, email: u.email, phone: u.phone, avatar: u.avatar,
    addresses: u.addresses, wishlist: u.wishlist, cart: u.cart, twoFAEnabled: u.two_fa_enabled, role: u.role,
    discountPercent: Number(u.discount_percent) || 0, discountReason: u.discount_reason || "", permissions: u.permissions || {},
  };
}
