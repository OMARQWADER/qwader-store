import emailjs from '@emailjs/browser';

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;

console.log('[EmailJS] runtime configuration:', {
  serviceId: EMAILJS_SERVICE_ID,
  templateId: EMAILJS_TEMPLATE_ID,
  publicKey: EMAILJS_PUBLIC_KEY,
});

export interface OtpEmailPayload {
  toEmail: string;
  code: string;
  purpose?: string;
}

export async function sendOtpEmail({
  toEmail,
  code,
  purpose = 'verification'
}: OtpEmailPayload): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = String(toEmail || '').trim();
  const cleanCode = String(code || '').trim();

  if (!cleanEmail || !cleanCode) {
    return { success: false, error: 'Missing email address or OTP code.' };
  }

  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    return {
      success: false,
      error: 'EmailJS environment variables are missing. Please configure VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY.'
    };
  }

  try {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  } catch (error) {
    console.error('[EmailJS] init failed:', error);
  }

  try {
    console.log('[EmailJS] sending OTP with configuration:', {
      serviceId: EMAILJS_SERVICE_ID,
      templateId: EMAILJS_TEMPLATE_ID,
      publicKey: EMAILJS_PUBLIC_KEY,
    });

    const result = await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      code: cleanCode,
      to_email: cleanEmail,
      purpose,
      toEmail: cleanEmail,
    });

    console.log('[EmailJS] send succeeded:', result);

    return { success: true };
  } catch (error) {
    console.error('[EmailJS] send failed:', error);
    const message = error instanceof Error ? error.message : 'Unable to send verification email.';
    return { success: false, error: message };
  }
}
