import { neon } from "@neondatabase/serverless";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

// The project uses one unified database variable: DATABASE_URL (PostgreSQL/Neon).
// If a platform injects DATABASE_URL as a mysql:// string (legacy), the
// NEON_DATABASE_URL fallback is used instead.
export function getDatabaseUrl(): string {
  const isPg = (u: string) => u.startsWith("postgres://") || u.startsWith("postgresql://");
  const unified = process.env.DATABASE_URL ?? "";
  const neon = process.env.NEON_DATABASE_URL ?? "";
  if (isPg(neon)) return neon;
  if (isPg(unified)) return unified;
  return "";
}

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && getDatabaseUrl()) {
    try {
      const sql = neon(getDatabaseUrl());
      _db = drizzle(sql);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * Ensure the users table and the additive OAuth columns exist.
 * Idempotent — safe to run on every startup, against a fresh database or
 * the existing production Neon schema. No data is lost or modified.
 */
export async function ensureSchema(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    const sql = db as unknown as { execute: (q: string) => Promise<unknown> };
    await sql.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id serial PRIMARY KEY,
        name text,
        email varchar(320),
        phone varchar(32),
        password_hash text,
        security_q text,
        security_a_hash text,
        avatar text,
        addresses jsonb,
        wishlist jsonb,
        cart jsonb,
        two_fa_enabled boolean DEFAULT false,
        role text NOT NULL DEFAULT 'user',
        referred_by text,
        created_at text,
        last_login_at text,
        points_balance integer DEFAULT 0,
        discount_percent integer DEFAULT 0,
        discount_reason text,
        referral_reward_count integer DEFAULT 0,
        permissions jsonb,
        recently_viewed jsonb
      );
    `);
    await sql.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS open_id varchar(64)`);
    await sql.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS login_method varchar(64)`);
    await sql.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at text`);
  } catch (error) {
    console.warn("[Database] Schema ensure failed (continuing):", error);
  }
}

function toRow(user: InsertUser): Record<string, unknown> {
  const row: Record<string, unknown> = {
    open_id: user.openId ?? null,
    login_method: (user.loginMethod as string | undefined) ?? null,
  };
  if (user.name !== undefined) row.name = user.name;
  if (user.email !== undefined) row.email = user.email;
  if (user.role !== undefined) row.role = user.role;
  if (user.updatedAt !== undefined) row.updated_at = String(user.updatedAt);
  return row;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values = toRow(user);
    if (!values.updated_at) values.updated_at = new Date().toISOString();

    const updateSet: Record<string, unknown> = { updated_at: values.updated_at };
    if (values.name !== undefined) updateSet.name = values.name;
    if (values.email !== undefined) updateSet.email = values.email;
    if (values.role !== undefined) updateSet.role = values.role;
    else if (user.openId === ENV.ownerOpenId) {
      updateSet.role = "admin";
      values.role = "admin";
    }

    // Ensure owner always gets admin role.
    if (user.openId === ENV.ownerOpenId && values.role === undefined) {
      values.role = "admin";
    }

    const sql = db as unknown as { execute: (q: string, params?: unknown[]) => Promise<unknown> };
    await sql.execute(
      `INSERT INTO users (open_id, login_method, name, email, role, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (open_id) DO UPDATE
       SET name = $3, email = $4, role = $5, updated_at = $6`,
      [values.open_id, values.login_method, values.name, values.email, values.role, values.updated_at],
    );
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.openId, openId), eq(users.openId, openId)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.
