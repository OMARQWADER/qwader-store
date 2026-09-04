import { createAuthClient } from '@neondatabase/auth';

const AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL || 'https://ep-wispy-waterfall-au5c4mj6.neonauth.c-10.us-east-1.aws.neon.tech/neondb/auth';

export const authClient = createAuthClient(AUTH_URL);

console.log('✅ Auth Client initialized with URL:', AUTH_URL);
