import pg from "pg";
import speakeasy from "speakeasy";
import jwt from "jsonwebtoken";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } });
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
  try {
    const { userId, code } = req.body;
    
    const users = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    if (users.rows.length === 0) return res.status(404).json({ error: "User not found" });
    
    const user = users.rows[0];
    const valid = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: "base32",
      token: code,
      window: 2
    });
    
    if (!valid) return res.status(400).json({ error: "الكود غلط" });
    
    await pool.query("UPDATE users SET two_factor_enabled = TRUE WHERE id = $1", [userId]);
    
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    
    res.status(200).json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
