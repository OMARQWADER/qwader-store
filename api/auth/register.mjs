import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } });
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
  try {
    const { name, email, password } = req.body;
    
    const existing = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: "الإيميل مستخدم" });
    
    const hash = await bcrypt.hash(password, 10);
    const user = await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'user') RETURNING id, name, email, role",
      [name, email, hash]
    );
    
    const token = jwt.sign({ userId: user.rows[0].id, role: user.rows[0].role }, JWT_SECRET, { expiresIn: "7d" });
    
    res.status(200).json({ success: true, user: user.rows[0], token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
