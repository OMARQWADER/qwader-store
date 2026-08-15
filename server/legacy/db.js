import { neon } from "@neondatabase/serverless";

// ONE unified connection string: DATABASE_URL (must be postgresql://).
// If a hosting platform injects DATABASE_URL as a mysql:// value
// (legacy template), NEON_DATABASE_URL takes precedence instead.
const isPg = (u) => u && (u.startsWith("postgres://") || u.startsWith("postgresql://"));
export function getDatabaseUrl() {
  if (isPg(process.env.NEON_DATABASE_URL)) return process.env.NEON_DATABASE_URL;
  if (isPg(process.env.DATABASE_URL)) return process.env.DATABASE_URL;
  return process.env.DATABASE_URL || "";
}

let _client = null;
let _sql = null;
export function sql() {
  if (!getDatabaseUrl()) {
    throw new Error("DATABASE_URL (postgresql://...) is not set. Add it in your platform → Environment Variables.");
  }
  if (!_sql) {
    _sql = neon(getDatabaseUrl());
    // Neon's serverless tagged template has no `sql.unsafe(...)` raw-DSL
    // support. Existing reporting queries use `s.unsafe(sql, params)` with
    // parameterized statements ($1, $2...) — implement it here with a
    // short-lived `pg` TCP connection (the same approach used by the DDL
    // path above). The SQL structure is always server-controlled; user
    // input only arrives as bound parameters.
    _sql.unsafe = async (statement, params = []) => {
      const { Client } = await import("pg");
      const client = new Client({ connectionString: getDatabaseUrl(), connectionTimeoutMillis: 15000 });
      await client.connect();
      try { return (await client.query(statement, params)).rows; }
      finally { await client.end(); }
    };
  }
  return _sql;
}
/* raw (non-parameterized) statement execution — ONLY used by the
   idempotent add-only schema upgrade (api/_lib/schema.js), whose SQL is
   fully controlled server-side. Never pass user input to unsafeSql(). */
export async function unsafeSql() {
  // serverless `neon()` (HTTP) has no raw-DSL support, so we open a short
  // real TCP connection via `pg` for the DDL step only
  const { Client } = await import("pg");
  const conn = getDatabaseUrl();
  const client = new Client({ connectionString: conn, connectionTimeoutMillis: 15000 });
  await client.connect();
  return async (statement) => {
    try { await client.query(statement); } finally { /* client closed by caller */ }
  };
}

// Postgres NUMERIC columns come back from the driver as strings (to avoid
// silent float precision loss) — fine for storage, but the frontend does
// real arithmetic (totals, reports) expecting a number. Coerce here once
// instead of at every call site.
/* The live Neon orders.items is text[] — each element is a JSON snapshot string.
   Older schema versions store items_snapshot as jsonb arrays. Normalize either. */
function parseSnapshot(v) {
  if (Array.isArray(v)) {
    const out = [];
    for (const el of v) {
      if (el && typeof el === "object") { out.push(el); continue; }
      try { out.push(JSON.parse(el)); } catch { out.push({ name: String(el || "") }); }
    }
    return out;
  }
  if (typeof v === "string" && v.trim().startsWith("[")) {
    try { return JSON.parse(v); } catch { return []; }
  }
  return [];
}
export function numifyOrder(row) {
  const items = parseSnapshot(row.items);
  const snapshot = parseSnapshot(row.items_snapshot).length > 0
    ? parseSnapshot(row.items_snapshot)
    : parseSnapshot(row.item_snapshot);
  return { ...row, total: Number(row.total), items, items_snapshot: snapshot, item_snapshot: snapshot };
}
