import { sql } from "./db.js";

// Vercel Cron calls this on the schedule set in vercel.json ("crons"). When
// CRON_SECRET is set in the project's environment variables, Vercel
// automatically sends it as a Bearer token on cron-triggered requests — see
// https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
// This keeps the endpoint from being triggerable by a random visitor who
// finds the URL, without needing a whole separate auth flow for a cron job.
export default async function handler(req, res) {
  // CRON_SECRET is MANDATORY — the backup endpoint must never execute (and
  // never be reachable) without it. Vercel sends it automatically as a
  // Bearer token for endpoints registered under vercel.json "crons".
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ error: "Cron disabled: CRON_SECRET is not configured in Vercel environment variables" });
  const auth = req.headers.authorization || "";
  if (auth !== `Bearer ${secret}`) return res.status(401).json({ error: "Unauthorized" });
  try {
    const s = sql();
    const content = await s`select key, value from site_content`;
    const contentObj = {};
    for (const row of content) contentObj[row.key] = row.value;

    const orders = await s`select * from orders order by created_at desc`;
    const messages = await s`select * from contact_messages order by created_at desc`;
    const users = await s`select id, name, email, phone, role, created_at from users order by created_at desc`;

    const data = { ...contentObj, orders, messages, users, backedUpAt: new Date().toISOString() };
    await s`insert into backups (data) values (${JSON.stringify(data)}::jsonb)`;

    // keep only the most recent 20 automatic snapshots so the table doesn't grow forever
    await s`delete from backups where id not in (select id from backups order by created_at desc limit 20)`;

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("weekly-backup error:", e);
    return res.status(500).json({ error: "backup failed" });
  }
}
