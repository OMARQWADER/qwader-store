import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.POSTGRES_URL!);
const JWT_SECRET = process.env.JWT_SECRET!;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'الرجاء تعبئة كل الحقول' });
    }
    const cleanEmail = email.trim().toLowerCase();

    const rows = await sql`
      SELECT * FROM otp_codes
      WHERE identifier = ${cleanEmail} AND purpose = 'login'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const record = rows[0];

    if (!record) {
      return res.status(400).json({ success: false, error: 'الرجاء طلب رمز تحقق جديد' });
    }
    const isExpired = new Date(record.created_at).getTime() < Date.now() - 10 * 60 * 1000;
    if (isExpired) {
      return res.status(400).json({ success: false, error: 'انتهت صلاحية رمز التحقق' });
    }
    if (record.attempts >= 5) {
      return res.status(400).json({ success: false, error: 'محاولات كثيرة، اطلب رمز جديد' });
    }
    if (record.code !== code.trim()) {
      await sql`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ${record.id}`;
      return res.status(400).json({ success: false, error: 'رمز التحقق غير صحيح' });
    }

    const userRows = await sql`SELECT * FROM users WHERE email = ${cleanEmail}`;
    const user = userRows[0];

    if (!user) {
      return res.status(200).json({ success: true, requiresProfile: true });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    return res.status(200).json({
      success: true,
      requiresProfile: false,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, avatar: user.avatar }
    });
  } catch (error: any) {
    console.error('verify-otp error:', error);
    return res.status(500).json({ success: false, error: 'صار خطأ، حاول مرة ثانية' });
  }
}
