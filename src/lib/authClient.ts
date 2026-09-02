import { createAuthClient } from "@neondatabase/auth";

// رابط Neon Auth
const AUTH_URL = "https://ep-wispy-waterfall-au5c4mj6.neonauth.c-10.us-east-1.aws.neon.tech/neondb/auth";

export const authClient = createAuthClient({
  baseURL: AUTH_URL,
  // نضيف الـ Origins هنا
  headers: {
    "Origin": window.location.origin,
  },
});

console.log("✅ Auth Client initialized with URL:", AUTH_URL);
