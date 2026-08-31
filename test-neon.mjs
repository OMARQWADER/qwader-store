import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.POSTGRES_URL);

async function test() {
  try {
    const result = await sql`SELECT NOW() as time`;
    console.log("✅ Neon شغال!");
    console.log("الوقت:", result[0].time);
  } catch (error) {
    console.log("❌ خطأ:", error.message);
  }
}

test();
