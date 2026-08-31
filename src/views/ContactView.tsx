import { useState } from "react";

export default function ContactView() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div style={{ maxWidth: 500, margin: "80px auto", padding: 20, textAlign: "center", direction: "rtl" }}>
        <h1 style={{ color: "#4ade80", fontSize: 28 }}>✅ تم الإرسال!</h1>
        <p style={{ color: "#94a3b8", marginTop: 10 }}>شكراً لتواصلك معنا. سنرد عليك في أقرب وقت.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 500, margin: "50px auto", padding: 20, direction: "rtl" }}>
      <h1 style={{ color: "#f1f5f9", marginBottom: 10 }}>📧 تواصل معنا</h1>
      <p style={{ color: "#64748b", marginBottom: 30 }}>ارسل لنا رسالتك وسنرد عليك فوراً</p>
      
      <form action="https://formspree.io/f/xbgjgjyq" method="POST" onSubmit={() => setSubmitted(true)}>
        <input
          type="text"
          name="name"
          placeholder="اسمك الكامل"
          required
          style={{ width: "100%", padding: 12, marginBottom: 12, borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: 16 }}
        />
        <input
          type="email"
          name="email"
          placeholder="بريدك الإلكتروني"
          required
          style={{ width: "100%", padding: 12, marginBottom: 12, borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: 16 }}
        />
        <input
          type="text"
          name="subject"
          placeholder="الموضوع"
          required
          style={{ width: "100%", padding: 12, marginBottom: 12, borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: 16 }}
        />
        <textarea
          name="message"
          placeholder="رسالتك..."
          rows={5}
          required
          style={{ width: "100%", padding: 12, marginBottom: 12, borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: 16, resize: "vertical" }}
        />
        <button
          type="submit"
          style={{ width: "100%", padding: 14, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 8, fontSize: 18, fontWeight: 700, cursor: "pointer" }}
        >
          🚀 إرسال الرسالة
        </button>
      </form>
    </div>
  );
}
