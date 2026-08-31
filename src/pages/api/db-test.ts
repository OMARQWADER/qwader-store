import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.POSTGRES_URL);

export default async function handler(req, res) {
  try {
    const result = await sqlSELECT NOW() as time;
    res.status(200).json({ 
      success: true, 
      message: 'Neon شغال!',
      time: result[0].time 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
