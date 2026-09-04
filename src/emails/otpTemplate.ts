const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export const buildOtpEmailHtml = ({ toEmail, code, purpose }: { toEmail: string; code: string; purpose: string }) => {
  const safeEmail = escapeHtml(toEmail);
  const safeCode = escapeHtml(code);
  const safePurpose = escapeHtml(purpose);

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>رمز التحقق - قويدر ستور</title></head>
  <body style="margin:0;background:#0d0914;padding:24px;font-family:Arial,sans-serif;color:#e2e8f0;">
    <div style="max-width:520px;margin:0 auto;background:#1a1425;border:1px solid #3b2a54;border-radius:20px;padding:36px;text-align:center;">
      <h1 style="margin:0;color:#c084fc;font-size:28px;">قويدر ستور</h1>
      <p style="margin:6px 0 22px;color:#a78bfa;font-size:14px;letter-spacing:1px;">QWADER STORE</p>
      <div style="height:4px;width:60px;margin:0 auto 24px;background:#7c3aed;border-radius:10px;"></div>
      <p style="font-size:16px;margin:0 0 8px;">مرحباً بك</p>
      <p style="color:#cbd5e1;font-size:14px;line-height:1.8;margin:0;">${safePurpose}</p>
      <div style="margin:24px 0;padding:18px;background:#2a1a3e;border:1px solid #7c3aed;border-radius:16px;direction:ltr;">
        <strong style="color:#c084fc;font-size:36px;letter-spacing:8px;">${safeCode}</strong>
      </div>
      <p style="color:#94a3b8;font-size:12px;">هذا الرمز صالح لمدة 10 دقائق.</p>
      <p style="color:#64748b;font-size:12px;line-height:1.8;">تم إرسال هذا الرمز إلى ${safeEmail}. إذا لم تطلبه، يمكنك تجاهل الرسالة.</p>
      <div style="border-top:1px solid #2d1b47;margin-top:28px;padding-top:18px;color:#64748b;font-size:12px;">
        <a href="https://qwader-store.vercel.app/support" style="color:#a78bfa;text-decoration:none;">الدعم الفني</a>
        &nbsp; | &nbsp;
        <a href="mailto:support@qwader.jo" style="color:#a78bfa;text-decoration:none;">support@qwader.jo</a>
        <br><br>© 2026 قويدر ستور | QWADER STORE
      </div>
    </div>
  </body>
</html>`;
};