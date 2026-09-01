import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';

const sql = neon(process.env.POSTGRES_URL!);
const resend = new Resend(process.env.RESEND_API_KEY);

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'الرجاء إدخال البريد الإلكتروني' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const code = generateOTP();

    await sql`
      INSERT INTO otp_codes (identifier, purpose, code, attempts)
      VALUES (${cleanEmail}, 'login', ${code}, 0)
    `;

    await resend.emails.send({
      from: 'Qwader Store <onboarding@resend.dev>',
      to: cleanEmail,
      subject: 'رمز التحقق - Qwader Store',
      html: `<div dir="rtl" style="font-family:sans-serif;text-align:center;padding:20px"><h2>رمز التحقق الخاص فيك</h2><p style="font-size:32px;font-weight:bold;letter-spacing:8px">${code}</p><p>الرمز صالح لمدة 10 دقائق</p></div>`
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('send-otp error:', error);
    return res.status(500).json({ success: false, error: 'تعذر إرسال رمز التحقق' });
  }
}
