import { createAuthClient } from "@neondatabase/auth";

// نجرب نقرأ من VITE_NEON_AUTH_URL أولاً، وإذا مش موجودة نقرأ من NEON_AUTH_URL (لـ Vercel)
const authUrl = import.meta.env.VITE_NEON_AUTH_URL || import.meta.env.NEON_AUTH_URL;

if (!authUrl) {
  console.error("❌ NEON_AUTH_URL is not defined in environment variables!");
}

export const authClient = createAuthClient(authUrl || "");