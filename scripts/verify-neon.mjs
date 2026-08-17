// Verify Neon connectivity, schema setup, and user CRUD against the real Neon database.
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../drizzle/schema.ts";
import "dotenv/config";

const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
console.log("URL available:", !!url && `...${url.slice(-12)}`);

const sql = neon(url);
const db = drizzle(sql, { schema });

console.log("Step 1: schema check");
const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`;
console.log("tables:", tables.map(t => t.table_name).join(", "));

console.log("Step 2: insert user");
await db.insert(schema.users).values({
  email: "neon-verify@example.com",
  login_method: "email",
  open_id: "verify-open-id-" + Date.now(),
  created_at: new Date(),
  updated_at: new Date(),
}).returning({ id: schema.users.id, email: schema.users.email });

console.log("Step 3: select users count");
const all = await db.select({ id: schema.users.id }).from(schema.users);
console.log("user count:", all.length);

console.log("Step 4: query with eq");
const found = await db.select().from(schema.users).where(
  require("drizzle-orm").eq(schema.users.email, "neon-verify@example.com"),
);
console.log("found:", found.length);

console.log("Step 5: cleanup");
await db.delete(schema.users).where(
  require("drizzle-orm").eq(schema.users.email, "neon-verify@example.com"),
);
const after = await db.select().from(schema.users);
console.log("after cleanup:", after.length);

console.log("ALL NEON CHECKS PASSED");
