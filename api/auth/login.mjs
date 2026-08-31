import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } });
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
  try {
    const { email, password } = req.body;
    
    const users = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (users.rows.length === 0) return res.status(400).json({ error: "المستخدم غير موجود" });
    
    const user = users.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: "كلمة المرور غلط" });
    
    if (user.two_factor_enabled) {
      return res.status(200).json({ success: true, require2FA: true, userId: user.id });
    }
    
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    
    res.status(200).json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
