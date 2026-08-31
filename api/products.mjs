import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.POSTGRES_URL);

export default async function handler(req, res) {
  try {
    const products = await sql`SELECT * FROM products ORDER BY id DESC`;
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
