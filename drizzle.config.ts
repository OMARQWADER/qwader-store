import { defineConfig } from "drizzle-kit";

// Unified database variable: DATABASE_URL (postgresql://). If a platform
// injects DATABASE_URL as a mysql:// string, NEON_DATABASE_URL is used.
function getConnectionString(): string {
  const isPg = (u: string) => u.startsWith("postgres://") || u.startsWith("postgresql://");
  if (isPg(process.env.DATABASE_URL ?? "")) return process.env.DATABASE_URL!;
  if (isPg(process.env.NEON_DATABASE_URL ?? "")) return process.env.NEON_DATABASE_URL!;
  return process.env.DATABASE_URL ?? "";
}

const connectionString = getConnectionString();
if (!connectionString) {
  throw new Error("DATABASE_URL (postgresql://...) is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
