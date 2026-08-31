import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.POSTGRES_URL!);

export async function testConnection() {
  const result = await sqlSELECT NOW() as time;
  return result[0];
}

export { sql };
