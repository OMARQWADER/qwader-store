import { sql } from "./db.js";
import { ensureSchema } from "./schema.js";
import { getAuth, isStaff, pathAfter, queryParam, readJsonBody } from "./auth.js";
import { rateLimitBy, withErrorHandler } from "./common.js";

/* In-app notification center:
   GET /api/notifications        → mine (cursor pagination)
   GET /api/notifications/unread → count
   POST /api/notifications/read  → mark read (all or by id)
   GET /api/notifications/admin-unread → staff dashboard counts
   POST /api/notifications/broadcast (owner only) → send to all customers
*/

export default withErrorHandler(async (req, res) => {
  await ensureSchema();
  const auth = await getAuth(req);
  if (!auth) return res.status(401).json({ error: "لازم تسجل دخول" });
  const parts = pathAfter(req, "/api/notifications/");
  const first = parts[0] || "";

  if (first === "unread")  return await unreadCount(req, res, auth);
  if (first === "read")    return await markRead(req, res, auth);
  if (first === "admin-unread") return await adminUnread(req, res, auth);
  if (first === "broadcast") {
    if (!isStaff(auth)) return res.status(403).json({ error: "مو مصرح" });
    return await broadcast(req, res, auth);
  }
  if (first === "") return await listMine(req, res, auth);
  return res.status(404).json({ error: "Not found" });
});

async function listMine(req, res, auth) {
  const s = sql();
  const cursor = queryParam(req, "cursor");
  const limit = Math.min(50, Math.max(5, Number(queryParam(req, "limit")) || 20));
  const rows = cursor
    ? await s`select * from notifications where user_id = ${auth.user.id} and id < ${cursor} order by id desc limit ${limit + 1}`
    : await s`select * from notifications where user_id = ${auth.user.id} order by id desc limit ${limit}`;
  const next = rows.length > limit ? rows[limit - 1].id : null;
  return res.status(200).json({ notifications: rows.slice(0, limit), nextCursor: next });
}

async function unreadCount(req, res, auth) {
  const s = sql();
  const rows = await s`select count(*)::int as c from notifications where user_id = ${auth.user.id} and is_read = false`;
  return res.status(200).json({ count: rows[0].c });
}

async function markRead(req, res, auth) {
  const s = sql();
  const body = await readJsonBody(req).catch(() => ({}));
  const id = String(body.id || "");
  if (id) {
    await s`update notifications set is_read = true where id = ${id} and user_id = ${auth.user.id} and is_read = false`;
  } else {
    await s`update notifications set is_read = true where user_id = ${auth.user.id} and is_read = false`;
  }
  return res.status(200).json({ ok: true });
}

async function adminUnread(req, res, auth) {
  const s = sql();
  const rows = await s.unsafe(`
    select
      (select count(*) from conversations where unread_admin > 0)::int as support,
      (select count(*) from notifications where ref_type = 'order')::int as order_notifs
  `);
  return res.status(200).json({ support: rows[0].support });
}

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
  return res.status(200).json({ ok: true, sent: users.length });
}
