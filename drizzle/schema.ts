import { jsonb, pgTable, serial, text, varchar, boolean, integer } from "drizzle-orm/pg-core";

/**
 * The store `users` table.
 *
 * Matches the live Neon (PostgreSQL) schema used by the legacy API, plus the
 * OAuth columns added for the auth flow (`openId`, `loginMethod`, `updatedAt`).
 * Those three columns are additive and are created at startup by
 * `server/db.ts` via `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`,
 * so this file works against both a fresh database and the existing production one.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  passwordHash: text("password_hash"),
  securityQ: text("security_q"),
  securityAHash: text("security_a_hash"),
  avatar: text("avatar"),
  addresses: jsonb("addresses"),
  wishlist: jsonb("wishlist"),
  cart: jsonb("cart"),
  twoFaEnabled: boolean("two_fa_enabled").default(false),
  role: text("role").default("user"),
  referredBy: text("referred_by"),
  createdAt: text("created_at"),
  lastLoginAt: text("last_login_at"),
  pointsBalance: integer("points_balance").default(0),
  discountPercent: integer("discount_percent").default(0),
  discountReason: text("discount_reason"),
  referralRewardCount: integer("referral_reward_count").default(0),
  permissions: jsonb("permissions"),
  recentlyViewed: jsonb("recently_viewed"),
  // OAuth columns (additive; migrated at runtime if missing)
  openId: varchar("open_id", { length: 64 }).unique(),
  loginMethod: varchar("login_method", { length: 64 }),
  updatedAt: text("updated_at"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
