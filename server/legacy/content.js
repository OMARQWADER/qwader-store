import { sql } from "./db.js";

const KEYS = ["games", "prices", "faq", "banners", "testimonials", "about", "coupons", "paymentInfo", "quickReplies", "priceComparison", "refundPolicy", "socialLinks", "maintenanceMode", "shipping"];

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const s = sql();
    const rows = await s`select key, value from site_content where key = any(${KEYS})`;
    const content = {};
    for (const row of rows) content[row.key] = row.value;
    // any key with no row yet is simply omitted — the frontend falls back
    // to its own built-in defaults for those, same as the old sGet(key, DEFAULT_X)
    return res.status(200).json({ content });
  } catch (e) {
    console.error("content error:", e);
    return res.status(500).json({ error: "صار خطأ بالسيرفر" });
  }
}
