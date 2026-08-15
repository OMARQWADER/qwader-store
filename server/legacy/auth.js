import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { sql } from "./db.js";

/* Extracts the path segments after a known prefix directly from req.url,
   instead of trusting req.query.<catchAllParam> to already be an array —
   more robust across Vercel's Node.js runtime than relying on the
   dynamic-route query population, which turned out not to behave the way
   the catch-all routes here originally assumed. Used by every
   api dispatcher (auth, account, admin). */
export function pathAfter(req, prefix) {
  const path = (req.url || "").split("?")[0];
  const i = path.indexOf(prefix);
  if (i === -1) return [];
  return path.slice(i + prefix.length).split("/").filter(Boolean);
}
/* same idea, but for a literal ?name=value query-string parameter —
   parses req.url directly instead of trusting req.query, for the same
   reliability reason as pathAfter above. */
export function queryParam(req, name) {
  const q = (req.url || "").split("?")[1] || "";
  const params = new URLSearchParams(q);
  return params.get(name) || "";
}

const COOKIE_NAME = "qg_session";
const DEFAULT_MAX_AGE = 60 * 60 * 24;       // 1 day, in seconds
const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, in seconds

function jwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error("JWT_SECRET is not set (or too short). Set a long random string in Vercel → Environment Variables.");
  }
  return s;
}

export async function hashPassword(pw) {
  return bcrypt.hash(pw, 12);
}
export async function comparePassword(pw, hash) {
  return bcrypt.compare(pw, hash);
}

/* ---------- cookies ---------- */
export function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  header.split(";").forEach(part => {
    const i = part.indexOf("=");
    if (i === -1) return;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}
export function setSessionCookie(res, token, rememberMe) {
  const maxAge = rememberMe ? REMEMBER_MAX_AGE : DEFAULT_MAX_AGE;
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAge}`,
  ];
  if (process.env.NODE_ENV !== "development") parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}
export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

/* ---------- JWT + DB-backed session (so we can really revoke it) ---------- */
export async function createSession(userId, rememberMe, userAgent) {
  const s = sql();
  const maxAgeSec = rememberMe ? REMEMBER_MAX_AGE : DEFAULT_MAX_AGE;
  const rows = await s`
    insert into sessions (user_id, expires_at, remember_me, user_agent)
    values (${userId}, now() + (${maxAgeSec} || ' seconds')::interval, ${rememberMe}, ${userAgent || ""})
    returning id
  `;
  const sessionId = rows[0].id;
  const token = jwt.sign({ sid: sessionId, uid: userId }, jwtSecret(), { expiresIn: maxAgeSec });
  return { token, sessionId, maxAgeSec };
}

/* returns { user, sessionId } or null. Also enforces expiry/revocation
   against the sessions table — a stolen/leaked JWT stops working the
   moment the session row is revoked or its expiry passes, which plain
   stateless JWT can't do on its own. */
export async function getAuth(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  let payload;
  try { payload = jwt.verify(token, jwtSecret()); } catch (e) { return null; }
  const s = sql();
  const rows = await s`
    select u.id, u.name, u.email, u.phone, u.avatar, u.addresses, u.wishlist, u.cart, u.two_fa_enabled, u.role,
           u.discount_percent, u.discount_reason, u.permissions,
           se.revoked, se.expires_at
    from sessions se join users u on u.id = se.user_id
    where se.id = ${payload.sid} and se.user_id = ${payload.uid}
  `;
  if (rows.length === 0) return null;
  const row = rows[0];
  if (row.revoked || new Date(row.expires_at) < new Date()) return null;
  return {
    sessionId: payload.sid,
    user: {
      id: row.id, name: row.name, email: row.email, phone: row.phone,
      avatar: row.avatar, addresses: row.addresses, wishlist: row.wishlist, cart: row.cart,
      twoFAEnabled: row.two_fa_enabled, role: row.role,
      discountPercent: Number(row.discount_percent) || 0, discountReason: row.discount_reason || "",
      permissions: row.permissions || {},
    },
  };
}

/* true if this authenticated user is allowed into the admin/staff side
   (customer accounts default to role='customer' and are rejected).
   Promoting the site owner's own account to role='owner' is a one-time
   manual step — see README "Making yourself the owner". */
export function isStaff(auth) {
  return !!auth && (auth.user.role === "owner" || auth.user.role === "staff");
}
/* only the owner can manage staff accounts / see certain settings —
   narrower than isStaff, which also allows plain staff members in */
export function isOwner(auth) {
  return !!auth && auth.user.role === "owner";
}
/* per-staff granular permission check. The owner always passes (they're
   not limited by the permissions jsonb — that's a staff-only concept). */
export function hasPerm(auth, key) {
  if (isOwner(auth)) return true;
  return !!auth && auth.user.role === "staff" && auth.user.permissions && auth.user.permissions[key] === true;
}

/* appends one row to activity_log — called from inside the mutating
   endpoints themselves (server-side) rather than trusted from the client,
   so the log can't be spoofed by calling it with a fake action string. */
export async function logActivity(who, action) {
  try {
    const s = sql();
    await s`insert into activity_log (who, action) values (${who}, ${action})`;
  } catch (e) { console.warn("logActivity failed:", e.message); }
}


export async function revokeSession(sessionId) {
  const s = sql();
  await s`update sessions set revoked = true where id = ${sessionId}`;
}
export async function revokeAllSessions(userId) {
  const s = sql();
  await s`update sessions set revoked = true where user_id = ${userId}`;
}

/* ---------- server-side login throttling ---------- */
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 5;
export async function checkLoginLock(email) {
  const s = sql();
  const rows = await s`select attempt_count, locked_until from login_attempts where email = ${email}`;
  if (rows.length === 0) return { locked: false, count: 0 };
  const row = rows[0];
  const locked = row.locked_until && new Date(row.locked_until) > new Date();
  return { locked: !!locked, count: row.attempt_count, lockedUntil: row.locked_until };
}
export async function recordFailedLogin(email) {
  const s = sql();
  const rows = await s`
    insert into login_attempts (email, attempt_count, locked_until)
    values (${email}, 1, null)
    on conflict (email) do update set attempt_count = login_attempts.attempt_count + 1
    returning attempt_count
  `;
  const count = rows[0].attempt_count;
  if (count >= MAX_LOGIN_ATTEMPTS) {
    // NOTE: interpolating a value directly inside a quoted SQL string
    // literal (e.g. interval '${x} minutes') does NOT get substituted
    // correctly by parameterized drivers — the driver binds it as a
    // separate parameter, not as text spliced into the string literal.
    // Casting a concatenated string to ::interval avoids that pitfall
    // (same pattern used in createSession above).
    await s`update login_attempts set locked_until = now() + (${LOCKOUT_MINUTES} || ' minutes')::interval where email = ${email}`;
  }
  return count;
}
export async function clearLoginAttempts(email) {
  const s = sql();
  await s`delete from login_attempts where email = ${email}`;
}

/* ---------- small request helpers ---------- */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}
export async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body; // Vercel usually pre-parses JSON
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}
