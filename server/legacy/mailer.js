import nodemailer from "nodemailer";

/* Sends the verification code by real email through Gmail's SMTP, using an
   account App Password (not the normal Gmail password — see the setup
   notes shared with the store owner). This module NEVER exposes the code
   to the frontend and has no demo/sandbox mode: callers check the boolean
   return value and fail signup/login openly when real delivery is not
   possible. */

let cachedTransporter = null;
/* DB-stored SMTP credentials (set from the admin settings panel) take
   precedence over the process.env values so the owner can change the
   sender without redeploying. */
let dbSmtp = null;
export async function loadDbSmtp() {
  try {
    const { sql } = await import("./db.js");
    const rows = await sql()`select value from site_content where key = 'settings'`;
    const v = rows[0] && rows[0].value;
    dbSmtp = (v && v.smtpUser && v.smtpPass) ? { user: v.smtpUser, pass: v.smtpPass } : null;
  } catch (e) { dbSmtp = null; }
}
export function refreshTransporter() {
  // drop the cached transporter so the next send picks up new credentials
  cachedTransporter = null;
  loadDbSmtp();
}
function creds() {
  const db = dbSmtp;
  return (db && db.user && db.pass) ? { user: db.user, pass: db.pass }
    : (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) ? { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
    : null;
}
function getTransporter() {
  const c = creds();
  if (!c) return null;
  if (!cachedTransporter || cachedTransporter._user !== c.user) {
    cachedTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: c.user, pass: c.pass },
    });
    cachedTransporter._user = c.user;
  }
  return cachedTransporter;
}

export function emailSendingConfigured() {
  return !!creds();
}

export async function sendEmail(to, subject, html) {
  const transporter = getTransporter();
  if (!transporter) return false;
  try {
    const fromUser = creds()?.user || process.env.GMAIL_USER;
    await transporter.sendMail({ from: `"QWADERGAME" <${fromUser}>`, to, subject, html });
    return true;
  } catch (e) {
    console.error("sendEmail failed:", e.message);
    return false;
  }
}

/* wishlist price-drop alert — sent when the owner lowers a game's price
   and the customer had it saved in their wishlist (see admin/content
   handler for games). Best-effort: failures are logged, never thrown. */
export async function sendPriceDropEmail(to, name, gameName, newPrice) {
  return sendEmail(to, `📉 نزل سعر ${gameName} — QWADERGAME`, `
    <div dir="rtl" style="font-family: system-ui, sans-serif; max-width: 420px; margin: 0 auto; padding: 24px; background: #0a0f20; color: #f4f6fb; border-radius: 16px;">
      <h2 style="color: #ff8a2b; margin: 0 0 12px;">📉 نزل السعر!</h2>
      <p style="color: #c7cee3; font-size: 14px; line-height: 1.6;">أهلين ${name || ""}، لعبة <b>${gameName}</b> يلي بقائمة أمنياتك نزل سعرها لـ <b style="color:#29e0c8;">${newPrice} د.أ</b>. لا تفوّتها!</p>
    </div>
  `);
}

/* purpose: "signup" | "reset" — only changes the wording in the email */
export async function sendOtpEmail(to, code, purpose) {
  const transporter = getTransporter();
  if (!transporter) return false;

  const title = purpose === "reset" ? "رمز استعادة كلمة السر" : "رمز تأكيد حسابك";
  const intro = purpose === "reset"
    ? "استخدم هالرمز لاستعادة كلمة السر لحسابك بمتجر QWADERGAME."
    : "استخدم هالرمز لتأكيد حسابك الجديد بمتجر QWADERGAME.";

  return sendEmail(to, `${title} — QWADERGAME`, `
    <div dir="rtl" style="font-family: system-ui, sans-serif; max-width: 420px; margin: 0 auto; padding: 24px; background: #0a0f20; color: #f4f6fb; border-radius: 16px;">
      <h2 style="color: #ff8a2b; margin: 0 0 12px;">${title}</h2>
      <p style="color: #c7cee3; font-size: 14px; line-height: 1.6;">${intro}</p>
      <div style="background: #131c38; border-radius: 12px; padding: 16px; text-align: center; margin: 16px 0;">
        <span style="font-size: 28px; font-weight: 900; letter-spacing: 6px; color: #29e0c8;">${code}</span>
      </div>
      <p style="color: #8b96b8; font-size: 12px;">الرمز صالح لمدة 10 دقايق. إذا ما طلبت هاد الرمز، تجاهل هالإيميل.</p>
    </div>
  `);
}
