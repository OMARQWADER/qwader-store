import { buildOtpEmailHtml } from '../emails/otpTemplate';

export const OTP_FROM = 'قويدر ستور | QWADER STORE <support@qwader.jo>';

export async function sendOtpEmail({ toEmail, code, purpose }: { toEmail: string; code: string; purpose: string }) {
  const html = buildOtpEmailHtml({ toEmail, code, purpose });
  console.log('Local OTP preview:', { from: OTP_FROM, toEmail, code, purpose, html });
  return { success: true };
}
