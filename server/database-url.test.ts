import { describe, expect, it } from "vitest";
import { getDatabaseUrl } from "./db";
import { getDatabaseUrl as legacyGetDatabaseUrl } from "./legacy/db.js";
import { ENV } from "./_core/env";

// Contract: the whole project reads ONE unified DATABASE_URL variable
// (postgresql://). NEON_DATABASE_URL is accepted as an override fallback,
// and a mysql:// DATABASE_URL must NEVER be used by any DB layer.
const isPg = (u: string) =>
  u.startsWith("postgres://") || u.startsWith("postgresql://");
const isMysql = (u: string) =>
  u.startsWith("mysql://") || u.startsWith("mariadb://");

describe("unified DATABASE_URL contract", () => {
  it("server/db.ts getDatabaseUrl resolves a PostgreSQL URL", () => {
    const url = getDatabaseUrl();
    expect(url && isPg(url)).toBe(true);
    expect(isMysql(url)).toBe(false);
  });

  it("legacy server/legacy/db.js getDatabaseUrl resolves a PostgreSQL URL", () => {
    const url = legacyGetDatabaseUrl();
    expect(url && isPg(url)).toBe(true);
    expect(isMysql(url)).toBe(false);
  });

  it("env.ts ENV.databaseUrl exposes the PostgreSQL URL", () => {
    expect(ENV.databaseUrl && isPg(ENV.databaseUrl)).toBe(true);
    expect(isMysql(ENV.databaseUrl)).toBe(false);
  });

  it("drizzle.config.ts dialect is postgresql", async () => {
    const fs = await import("node:fs");
    const cfg = fs.readFileSync("./drizzle.config.ts", "utf8");
    expect(cfg).toContain('dialect: "postgresql"');
    expect(cfg).not.toMatch(/dialect:\s*"mysql"/);
  });

  it("no mysql2 / mysql-core / mysqlTable remnants in runtime source", async () => {
    const fs = await import("node:fs");
    const files = [
      "./drizzle/schema.ts",
      "./server/db.ts",
      "./drizzle.config.ts",
      "./server/_core/index.ts",
      "./server/legacy/db.js",
    ];
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      expect(src, `${f} must not contain MySQL Drizzle primitives`).not.toMatch(
        /mysqlTable|mysqlEnum|mysqlSchema|onDuplicateKeyUpdate|mysql2|from "drizzle-orm\/mysql2"/
      );
    }
  });

  it("package.json has no mysql2 dependency", async () => {
    const fs = await import("node:fs");
    const pkg = JSON.parse(fs.readFileSync("./package.json", "utf8"));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(allDeps["mysql2"]).toBeUndefined();
    expect(allDeps["@neondatabase/serverless"]).toBeTruthy();
    expect(allDeps["drizzle-orm"]).toBeTruthy();
    expect(allDeps["pg"]).toBeTruthy();
  });
});
