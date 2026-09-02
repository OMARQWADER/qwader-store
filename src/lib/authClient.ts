import { createAuthClient } from "@neondatabase/auth";

// ✅ نستخدم VITE_NEON_AUTH_URL (لأنه يبدأ بـ VITE_)
const AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL || "https://ep-wispy-waterfall-au5c4mj6.neonauth.c-10.us-east-1.aws.neon.tech/neondb/auth";

export const authClient = createAuthClient({
  baseURL: AUTH_URL,
  headers: {
    "Origin": window.location.origin,
  },
});

console.log("✅ Auth Client initialized with URL:", AUTH_URL);