export async function sendOtpEmail({ toEmail, code, purpose }: { toEmail: string; code: string; purpose: string }) {
  // مؤقت: نطبع في الكونسول بدل ما نرسل إيميل
  console.log("📧 OTP Email (mock):", { toEmail, code, purpose });
  return { success: true };
}
