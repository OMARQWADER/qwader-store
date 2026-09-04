export const OTP_FROM = 'قويدر ستور | QWADER STORE <support@qwader.jo>';

export async function sendOtpEmail({ toEmail, code, purpose }: { toEmail: string; code: string; purpose: string }) {
  try {
    const response = await fetch('/api/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail,
        code,
        purpose,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: result?.error || 'Could not send the verification email' };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not send the verification email' };
  }
}
