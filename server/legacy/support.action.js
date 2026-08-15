import { sql } from "./db.js";
import { ensureSchema } from "./schema.js";
import { getAuth, isStaff, readJsonBody, logActivity, pathAfter, queryParam } from "./auth.js";
import {
  rateLimitBy, notifyUser, validateImageUpload, dataUrlToBuffer, storeFile, withErrorHandler,
} from "./common.js";

/* Unified support center:
   customer: POST /api/support/conversations   (create with subject/category/orderId)
             GET  /api/support/conversations   (mine, with cursor)
             GET  /api/support/conversations/:id/messages?cursor=...&after=...
             POST /api/support/conversations/:id/messages
             POST /api/support/mark-read/:id
   staff:    GET  /api/support/admin/list?status=&assigned=&search=&cursor=...
             GET  /api/support/admin/:id       (detail incl. messages + customer info)
             POST /api/support/admin/:id/status     (assign/resolve/archive/waiting_customer)
*/

const VALID_CATEGORIES = new Set(["payment", "order", "code", "product", "refund", "account", "other"]);

export default withErrorHandler(async (req, res) => {
  await ensureSchema();
  const auth = await getAuth(req);
  const parts = pathAfter(req, "/api/support/");
  const first = parts[0] || "";

  // conversations/:id — detail (GET) and messages (GET/POST)
  const convMatch = /^([0-9a-f-]{36})$/i.exec(parts[1] || "");
  if (first === "conversations" && convMatch) {
    if (parts[2] === "messages") {
      if (req.method === "GET")  return await listMessages(req, res, auth, convMatch[1]);
      if (req.method === "POST") return await createMessage(req, res, auth, convMatch[1]);
      return res.status(405).json({ error: "Method not allowed" });
    }
    if (req.method === "GET") return await conversationDetail(req, res, auth, convMatch[1]);
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (first === "conversations" && !parts[1]) {
    if (req.method === "POST" && !auth) return res.status(401).json({ error: "لازم تسجل دخول" });
    if (req.method === "POST") return await createConversation(req, res, auth);
    if (req.method === "GET")  return await listConversations(req, res, auth);
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (first === "messages") {
    if (req.method === "POST") return await createMessage(req, res, auth);
    if (req.method === "GET")  return await listMessages(req, res, auth);
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (first.startsWith("mark-read")) {
    if (req.method === "POST") return await markRead(req, res, auth, pathAfter(req, "/api/support/mark-read/")[0]);
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (first === "typing") return await typingPing(req, res, auth);

  // customer: “أعلمني لما يتوفر” — works even while logged out (phone only),
  // logged-in users' requests also appear in the staff sourcing queue
  if (first === "notify" && req.method === "POST") return await notifyRequest(req, res, auth);
  // same endpoint reachable at /api/notify (used by the public sourcing widget)
  if ((req.url || "").split("?")[0] === "/api/notify" && req.method === "POST") return await notifyRequest(req, res, auth);

  // staff admin routes
  if (first === "admin") {
    if (!auth || !isStaff(auth)) return res.status(403).json({ error: "مو مصرح" });
    if (parts[1] === "list") return await adminList(req, res, auth);
    const m = /^([0-9a-f-]{36})$/.exec(parts[1] || "");
    if (m && parts[2] === "status" && req.method === "POST") return await adminStatus(req, res, auth, m[1]);
    if (m && parts[2] === "assign" && req.method === "POST") return await adminAssign(req, res, auth, m[1]);
    if (m && !parts[2]) return await adminDetail(req, res, auth, m[1]);
    return res.status(404).json({ error: "Not found" });
  }

  return res.status(404).json({ error: "Not found" });
});

function canSeeConversation(auth, conv) {
  if (auth && isStaff(auth)) return true;
  return auth && conv.user_id === auth.user.id;
}

/* ---------- customer: create conversation ---------- */
async function createConversation(req, res, auth) {
  const body = await readJsonBody(req);
  const subject = String(body.subject || "").trim().slice(0, 120);
  const category = VALID_CATEGORIES.has(body.category) ? body.category : "other";
  const orderId = body.orderId ? String(body.orderId) : null;

  const s = sql();
  // only allow linking one of the user's own orders
  if (orderId) {
    const orows = await s`select id from orders where id = ${orderId} and user_id = ${auth.user.id}`;
    if (orows.length === 0) return res.status(400).json({ error: "الطلب غير موجود أو مو تابعك" });
  }

  const rows = await s`
    insert into conversations (ticket_no, user_id, order_id, subject, category, status, unread_admin, updated_at)
    values ('QW-' || lpad(nextval('conversations_seq')::text, 5, '0'), ${auth.user.id},
      ${orderId}, ${subject || "استفسار بدون موضوع"}, ${category}, 'open', 1, now())
    returning *
  `;
  const conv = rows[0];
  await logActivity(auth.user.id, "support_ticket_created", `تذكرة جديدة ${conv.ticket_no}: ${subject.slice(0, 60)}`, { conversationId: conv.id });
  await notifyUser(s, auth.user.id, "message", `تذكرتك ${conv.ticket_no} وصلت`, "طاقم الدعم رح يرد عليك قريبًا", { type: "conversation", id: conv.id });
  return res.status(201).json({ conversation: conv });
}

/* ---------- customer: list my conversations (cursor pagination) ---------- */
async function listConversations(req, res, auth) {
  if (!auth) return res.status(401).json({ error: "لازم تسجل دخول" });
  const s = sql();
  const cursor = queryParam(req, "cursor");
  const limit = Math.min(50, Math.max(5, Number(queryParam(req, "limit")) || 20));
  const rows = cursor
    ? await s`select * from conversations where user_id = ${auth.user.id} and id < ${cursor} order by id desc limit ${limit + 1}`
    : await s`select * from conversations where user_id = ${auth.user.id} order by id desc limit ${limit}`;
  const next = rows.length > limit ? rows[limit - 1].id : null;
  return res.status(200).json({ conversations: rows.slice(0, limit), nextCursor: next });
}

/* ---------- customer: conversation detail (auto mark read user-side) ---------- */
async function conversationDetail(req, res, auth, convId) {
  if (!auth) return res.status(401).json({ error: "لازم تسجل دخول" });
  const s = sql();
  const rows = await s`select * from conversations where id = ${convId}`;
  if (rows.length === 0) return res.status(404).json({ error: "التذكرة غير موجودة" });
  const conv = rows[0];
  if (!canSeeConversation(auth, conv)) return res.status(404).json({ error: "التذكرة غير موجودة" });

  await s`update conversations set unread_user = 0 where id = ${convId} and unread_user > 0`;
  await s`update conversation_messages set read_by_user = true
          where conversation_id = ${convId} and from_role = 'staff' and not read_by_user`;
  return res.status(200).json({ conversation: conv });
}

/* ---------- messages: list with cursor + unread tracking ---------- */
async function listMessages(req, res, auth, convId = null) {
  if (!auth) return res.status(401).json({ error: "لازم تسجل دخول" });
  const s = sql();
  const target = convId || queryParam(req, "conversationId");
  if (!target) return res.status(400).json({ error: "مطلوب id التذكرة" });

  const crows = await s`select * from conversations where id = ${target}`;
  if (crows.length === 0) return res.status(404).json({ error: "التذكرة غير موجودة" });
  const conv = crows[0];
  if (!canSeeConversation(auth, conv)) return res.status(404).json({ error: "التذكرة غير موجودة" });

  const cursor = queryParam(req, "cursor");
  const limit = Math.min(100, Math.max(10, Number(queryParam(req, "limit")) || 40));
  const rows = cursor
    ? await s`select * from conversation_messages where conversation_id = ${target} and id > ${cursor}
              order by id asc limit ${limit + 1}`
    : await s`select * from conversation_messages where conversation_id = ${target}
              order by id asc limit ${limit}`;
  const next = rows.length > limit ? rows[limit - 1].id : null;

  // lazy mark-read on the user's side for any staff message arrived so far
  if (conv.user_id === auth.user.id) {
    await s`update conversation_messages set read_by_user = true
            where conversation_id = ${target} and from_role = 'staff' and not read_by_user`;
    await s`update conversations set unread_user = 0 where id = ${target}`;
  }
  return res.status(200).json({ messages: rows.slice(0, limit), nextCursor: next });
}

/* ---------- create message (customer or staff) ---------- */
async function createMessage(req, res, auth, convId = null) {
  if (!auth) return res.status(401).json({ error: "لازم تسجل دخول" });
  const rl = await rateLimitBy(auth, req, "chat_send");
  if (rl.limited) return res.status(429).json({ error: `رسائل كثيرة، جرب بعد ${rl.retryAfterSec} ثانية` });

  const body = await readJsonBody(req);
  const text = String(body.text || "").trim();
  const target = convId || String(body.conversationId || "").trim();
  if (!target) return res.status(400).json({ error: "مطلوب id التذكرة" });
  if (!text && !body.image) return res.status(400).json({ error: "اكتب رسالة أو أرفق صورة" });

  const s = sql();
  const crows = await s`select * from conversations where id = ${target}`;
  if (crows.length === 0) return res.status(404).json({ error: "التذكرة غير موجودة" });
  const conv = crows[0];
  if (!canSeeConversation(auth, conv)) return res.status(404).json({ error: "التذكرة غير موجودة" });

  const staff = isStaff(auth);
  const fromRole = staff ? "staff" : "customer";
  let imageUrl = null;

  if (body.image) {
    const parsed = dataUrlToBuffer(body.image);
    if (!parsed) return res.status(400).json({ error: "الصورة غير صالحة" });
    const err = validateImageUpload({ name: "img.jpg", type: parsed.mime }, parsed.buffer.length);
    if (err) return res.status(400).json({ error: err });
    const stored = await storeFile({ buffer: parsed.buffer, mime: parsed.mime, ownerType: "chat", uploadedBy: auth.user.id });
    imageUrl = stored.url;
  }

  await s`
    insert into conversation_messages (conversation_id, from_role, from_user_id, text, image_url)
    values (${target}, ${fromRole}, ${auth.user.id}, ${text}, ${imageUrl})
  `;
  const now = new Date();
  // NOTE: tagged templates parameterize values, so `unread_${staff ? "admin" : "user"}`
  // became a bind placeholder ($2) and broke the query. Branch on the
  // server-controlled `staff` flag instead (never user input).
  if (staff) {
    await s`update conversations set unread_admin = unread_admin + 1,
            last_message_at = ${now}, updated_at = ${now} where id = ${target}`;
  } else {
    await s`update conversations set unread_user = unread_user + 1,
            last_message_at = ${now}, updated_at = ${now} where id = ${target}`;
  }

  // auto-state transitions
  if (staff && conv.status === "open") {
    await s`update conversations set status = 'waiting_customer', updated_at = ${now} where id = ${target}`;
  }
  if (!staff && conv.status === "waiting_customer") {
    await s`update conversations set status = 'waiting_admin', unread_admin = unread_admin + 1, updated_at = ${now} where id = ${target}`;
  }
  if (!staff && conv.status === "waiting_admin") {
    await s`update conversations set unread_admin = unread_admin + 1, updated_at = ${now} where id = ${target}`;
  }

  if (staff) {
    await logActivity(auth.user.id, "support_reply", `رد على التذكرة ${conv.ticket_no}`, { conversationId: conv.id });
    await notifyUser(s, conv.user_id, "message", `رد جديد على تذكرتك ${conv.ticket_no}`, text.slice(0, 120) || "📎 رسالة جديدة", { type: "conversation", id: conv.id });
  }

  return res.status(201).json({ ok: true });
}

async function notifyRequest(req, res, auth) {
  const rl = await rateLimitBy(auth, req, "notify_request");
  if (rl.limited) return res.status(429).json({ error: "محاولات كثيرة، جرب لاحقًا" });
  const body = await readJsonBody(req);
  const gameName = String(body.gameName || "").trim().slice(0, 100);
  if (!gameName) return res.status(400).json({ error: "اسم اللعبة مفقود" });
  const s = sql();
  if (auth) {
    await s`insert into notify_requests (game_name, user_id)
            values (${gameName}, ${auth.user.id})
            on conflict do nothing`;
  } else {
    const phone = String(body.phone || "").trim().slice(0, 30);
    if (!phone) return res.status(400).json({ error: "حط رقم هاتفك حتى نعلمك" });
    await s`insert into notify_requests (game_name, phone) values (${gameName}, ${phone})
            on conflict do nothing`;
  }
  return res.status(201).json({ ok: true });
}

async function markRead(req, res, auth, convId) {
  if (!auth) return res.status(401).json({ error: "لازم تسجل دخول" });
  if (!convId) return res.status(400).json({ error: "مطلوب id التذكرة" });
  const s = sql();
  const crows = await s`select * from conversations where id = ${convId}`;
  if (crows.length === 0) return res.status(404).json({ error: "التذكرة غير موجودة" });
  if (!canSeeConversation(auth, crows[0])) return res.status(404).json({ error: "التذكرة غير موجودة" });
  if (crows[0].user_id === auth.user.id) {
    await s`update conversation_messages set read_by_user = true
            where conversation_id = ${convId} and from_role = 'staff' and not read_by_user`;
    await s`update conversations set unread_user = 0 where id = ${convId}`;
  }
  return res.status(200).json({ ok: true });
}

/* typing indicator — best effort, in-memory-free DB ping (stores nothing; echoes last activity) */
async function typingPing(req, res, auth) {
  if (!auth) return res.status(200).json({ ok: true });
  // intentionally no-op except auth-check; real typing via last_message_at polling
  return res.status(200).json({ ok: true });
}

/* ---------- staff admin ---------- */
async function adminList(req, res, auth) {
  const s = sql();
  const status = queryParam(req, "status") || "";
  const search = queryParam(req, "search") || "";
  const cursor = queryParam(req, "cursor");
  const limit = Math.min(50, Math.max(5, Number(queryParam(req, "limit")) || 25));

  const conds = [];
  const params = [];
  if (status && ["open", "waiting_admin", "waiting_customer", "resolved", "archived"].includes(status)) {
    conds.push(`c.status = $${params.push(status)}`);
  }
  if (search) {
    conds.push(`(c.ticket_no ilike $${params.push(`%${search}%`)} or c.subject ilike $${params.push(`%${search}%`)})`);
  }
  if (cursor) conds.push(`c.id < $${params.push(cursor)}`);
  const where = conds.length ? `where ${conds.join(" and ")}` : "";

  const rows = await s.unsafe(`
    select c.*, u.name as customer_name, u.email as customer_email, o.total as order_total
    from conversations c
    left join users u on u.id = c.user_id
    left join orders o on o.id = c.order_id
    ${where}
    order by c.updated_at desc
    limit ${Number(limit) + 1}
  `, params);
  const next = rows.length > limit ? rows[limit - 1].id : null;
  const agg = await s.unsafe(`
    select
      count(*) filter (where status = 'open') as open,
      count(*) filter (where status = 'waiting_admin') as waiting_admin,
      count(*) filter (where status = 'waiting_customer') as waiting_customer,
      count(*) filter (where status = 'resolved') as resolved,
      count(*) filter (where unread_admin > 0) as unread_total
    from conversations
  `);
  return res.status(200).json({ conversations: rows.slice(0, limit), nextCursor: next, agg: agg[0] });
}

async function adminDetail(req, res, auth, convId) {
  const s = sql();
  const rows = await s.unsafe(`
    select c.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
           o.id as order_id, o.total as order_total, o.status as order_status, o.items_snapshot
    from conversations c
    left join users u on u.id = c.user_id
    left join orders o on o.id = c.order_id
    where c.id = $1
  `, [convId]);
  if (rows.length === 0) return res.status(404).json({ error: "التذكرة غير موجودة" });
  const conv = rows[0];
  await s`update conversation_messages set read_by_staff = true
          where conversation_id = ${conv.id} and from_role = 'customer' and not read_by_staff`;
  await s`update conversations set unread_admin = 0 where id = ${conv.id}`;
  const messages = await s`select * from conversation_messages where conversation_id = ${conv.id} order by id asc`;
  return res.status(200).json({ conversation: conv, messages });
}

async function adminStatus(req, res, auth, convId) {
  const body = await readJsonBody(req);
  const status = String(body.status || "");
  if (!["open", "waiting_admin", "waiting_customer", "resolved", "archived"].includes(status)) {
    return res.status(400).json({ error: "حالة غير صالحة" });
  }
  const s = sql();
  await s`update conversations set status = ${status}, updated_at = now() where id = ${convId}`;
  await logActivity(auth.user.id, "support_status", `تذكرة ${pathAfter(req, "/api/support/admin/")[0]} → ${status}`, { conversationId: convId });
  return res.status(200).json({ ok: true });
}

async function adminAssign(req, res, auth, convId) {
  const body = await readJsonBody(req);
  const staffId = String(body.staffId || "");
  const s = sql();
  await s`update conversations set assigned_to = ${staffId}, status = 'waiting_admin', unread_admin = 1, updated_at = now() where id = ${convId}`;
  await logActivity(auth.user.id, "support_assign", `إسناد التذكرة إلى ${staffId.slice(0, 8)}`, { conversationId: convId });
  return res.status(200).json({ ok: true });
}
