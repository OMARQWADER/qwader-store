import { describe, expect, it } from "vitest";
import { neon } from "@neondatabase/serverless";

describe("NEON_DATABASE_URL connectivity", () => {
  it(
    "connects to the external Neon database and reads users table",
    { timeout: 30000 },
    async () => {
    const url = process.env.NEON_DATABASE_URL;
    expect(url && url.startsWith("postgres")).toBe(true);

    const sql = neon(url!);
    const rows = await sql`SELECT COUNT(*)::int AS cnt FROM users`;
    expect(rows[0].cnt).toBeGreaterThanOrEqual(0);
  },
  );
});
