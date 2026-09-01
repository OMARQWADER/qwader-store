import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.POSTGRES_URL!);
const JWT_SECRET = process.env.JWT_SECRET!;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { firstName, lastName, phone, email, authUid, avatar } = req.body;
    if (!firstName || !lastName || !phone || !email) {
      return res.status(400).json({ success: false, error: 'يرجى تعبئة جميع الحقول المطلوبة' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const name = `${firstName.trim()} ${lastName.trim()}`;

    const existing = await sql`SELECT * FROM users WHERE email = ${cleanEmail}`;
    let user = existing[0];

    if (!user) {
      const inserted = await sql`
        INSERT INTO users (name, email, phone, role, google_id, avatar, login_method, created_at)
        VALUES (${name}, ${cleanEmail}, ${phone.trim()}, 'customer', ${authUid || null}, ${avatar || null}, ${authUid ? 'google' : 'otp'}, NOW()::text)
        RETURNING *
      `;
      user = inserted[0];
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    return res.status(200).json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, avatar: user.avatar }
    });
  } catch (error: any) {
    console.error('complete-profile error:', error);
    return res.status(500).json({ success: false, error: 'صار خطأ، حاول مرة ثانية' });
  }
}
