import { createAuthClient } from "@neondatabase/auth";

// رابط Neon Auth - مكتوب مباشرة للتجربة
const AUTH_URL = "https://ep-wispy-waterfall-au5c4mj6.neonauth.c-10.us-east-1.aws.neon.tech/neondb/auth";

export const authClient = createAuthClient(AUTH_URL);

console.log("✅ Auth Client initialized with URL:", AUTH_URL);