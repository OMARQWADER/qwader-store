import pg from "pg";
import jwt from "jsonwebtoken";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } });
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Unauthorized" });
  
  try {
    const token = auth.replace("Bearer ", "");
    const decoded = jwt.verify(token, JWT_SECRET);
    const users = await pool.query("SELECT id, name, email, role, avatar FROM users WHERE id = $1", [decoded.userId]);
    
    if (users.rows.length === 0) return res.status(404).json({ error: "User not found" });
    
    res.status(200).json({ user: users.rows[0] });
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
}
