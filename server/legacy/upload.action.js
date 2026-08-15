import { sql } from "./db.js";
import { ensureSchema } from "./schema.js";
import { getAuth, pathAfter, isStaff } from "./auth.js";
import {
  getUpload, validateImageUpload, dataUrlToBuffer, storeFile,
  withErrorHandler,
} from "./common.js";

/* File storage endpoint:
   POST /api/upload/:ownerType  → body { file: dataUrl, name }  → { url }
   GET  /api/upload/:id         → serves stored file (bytes/data-url)

   Proof/chat/avatar/product images are NEVER stored as base64 inside the
   domain tables — they go through Storage (Vercel Blob when configured,
   else a compressed-bytes uploads table served by this same route). */

const ALLOWED_OWNER_TYPES = new Set(["proof", "chat", "avatar", "product"]);

export default withErrorHandler(async (req, res) => {
  await ensureSchema();
  const auth = await getAuth(req);
  const parts = pathAfter(req, "/api/upload/");
  const first = parts[0] || "";

  // GET /api/upload/:id — serve file
  const idMatch = /^([0-9a-f-]{36})$/.exec(first);
  if (idMatch && req.method === "GET") {
    // IDOR protection: no anonymous serving of stored files.
    if (!auth) return res.status(401).json({ error: "لازم تسجل دخول" });
    const file = await getUpload(idMatch[1]);
    if (!file) return res.status(404).json({ error: "الملف غير موجود" });
    const mine = auth.user.id === String(file.uploaded_by);
    const staff = isStaff(auth);
    // proof/chat files are sensitive: only the uploader (order owner or the
    // customer who chatted) and staff may view them. avatars and product
    // images are publicly displayed in the store UI.
    if (!mine && !staff && file.owner_type !== "avatar" && file.owner_type !== "product") {
      return res.status(403).json({ error: "مو مصرح" });
    }
    if (file.data_url) {
      res.setHeader("Content-Type", file.mime_type);
      res.setHeader("Cache-Control", "private, max-age=3600");
      return res.send(Buffer.from(file.data_url.split(",")[1] || "", "base64"));
    }
    res.setHeader("Content-Type", file.mime_type);
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.send(file.bytes);
  }

  // POST /api/upload/:ownerType
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!auth) return res.status(401).json({ error: "لازم تسجل دخول" });
  const ownerType = ALLOWED_OWNER_TYPES.has(first) ? first : "chat";

  const body = await readBody(req);
  const fileMeta = body?.file ? { name: String(body.name || "file.jpg"), type: String(body.type || "image/jpeg") } : null;
  const parsed = dataUrlToBuffer(body?.file);
  if (!parsed) return res.status(400).json({ error: "الملف غير صالح" });
  const err = validateImageUpload(fileMeta, parsed.buffer.length);
  if (err) return res.status(400).json({ error: err });

  const stored = await storeFile({ buffer: parsed.buffer, mime: parsed.mime, ownerType, uploadedBy: auth.user.id });
  return res.status(201).json({ url: stored.url, size: stored.size });
});

async function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; if (data.length > 12 * 1024 * 1024) req.destroy(); });
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : null); }
      catch (e) { resolve(null); }
    });
    req.on("error", () => resolve(null));
  });
}
