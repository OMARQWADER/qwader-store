// Unified database variable: DATABASE_URL must be a postgresql:// string.
// If a platform injects DATABASE_URL as mysql://, NEON_DATABASE_URL wins.
function getDatabaseUrl(): string {
  const isPg = (u: string) => u.startsWith("postgres://") || u.startsWith("postgresql://");
  if (isPg(process.env.NEON_DATABASE_URL ?? "")) return process.env.NEON_DATABASE_URL!;
  if (isPg(process.env.DATABASE_URL ?? "")) return process.env.DATABASE_URL!;
  return process.env.DATABASE_URL ?? "";
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: getDatabaseUrl(),
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
