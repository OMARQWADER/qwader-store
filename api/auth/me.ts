import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.POSTGRES_URL!);
const JWT_SECRET = process.env.JWT_SECRET!;

export default async function handler(req: any, res: any) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: 'غير مصرح' });

    const token = authHeader.replace('Bearer ', '');
    const decoded: any = jwt.verify(token, JWT_SECRET);

    const result = await sql`
      SELECT id, name, email, role FROM users WHERE id = ${decoded.userId}
    `;

    if (result.length === 0) {
      return res.status(401).json({ success: false, error: 'المستخدم مش موجود' });
    }

    return res.status(200).json({ success: true, user: result[0] });
  } catch (error) {
    return res.status(401).json({ success: false, error: 'التوكن غير صالح' });
  }
}
