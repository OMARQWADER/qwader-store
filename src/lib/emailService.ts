export async function sendOtpEmail({ toEmail, code, purpose }: { toEmail: string; code: string; purpose: string }) {
  console.log('Mock OTP:', { toEmail, code, purpose });
  return { success: true };
}
