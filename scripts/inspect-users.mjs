import pg from "pg";

const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString: url });
const conn = await pool.connect();
try {
  const cols = await conn.query(`SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position`);
  console.log("COLUMNS:", cols.rows.map(r => r.column_name).join(", "));
  const users = await conn.query(`SELECT id, name, email, role FROM users LIMIT 20`);
  console.log("USERS:", JSON.stringify(users.rows, null, 1));
} finally {
  conn.release();
  await pool.end();
}
