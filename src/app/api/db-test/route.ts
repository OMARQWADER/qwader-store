import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/db';

export async function GET() {
  try {
    const result = await testConnection();
    return NextResponse.json({ 
      success: true, 
      message: 'Neon شغال!',
      time: result.time 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}
