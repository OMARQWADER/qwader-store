export async function sendOtpEmail({ toEmail, code, purpose }: { toEmail: string; code: string; purpose: string }) {
  try {
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: toEmail,
        subject: purpose,
        html: `
          <div style="font-family:Arial;direction:rtl;text-align:center;padding:40px;background:#0f172a;color:#fff;">
            <h1 style="color:#818cf8;">🔐 رمز التحقق</h1>
            <p>رمزك هو:</p>
            <div style="font-size:36px;font-weight:bold;letter-spacing:8px;background:#1e293b;padding:20px;border-radius:12px;display:inline-block;margin:20px 0;">${code}</div>
            <p style="color:#94a3b8;">صالح لمدة 10 دقائق</p>
          </div>
        `
      })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Email Error:", error);
    return { success: false, error: error.message };
  }
}
