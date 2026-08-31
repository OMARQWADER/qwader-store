import pg from "pg";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
  try {
    const { userId } = req.body;
    
    const secret = speakeasy.generateSecret({ name: "Qwader Store" });
    
    await pool.query("UPDATE users SET two_factor_secret = $1 WHERE id = $2", [secret.base32, userId]);
    
    const qrUrl = await QRCode.toDataURL(secret.otpauth_url);
    
    res.status(200).json({ success: true, secret: secret.base32, qrCode: qrUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
