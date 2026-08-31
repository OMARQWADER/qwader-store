import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function LoginView() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const data = await login(email, password);
    if (data.success) {
      window.location.href = "/";
    } else {
      setError(data.error || "خطأ في الدخول");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "50px auto", padding: 20, direction: "rtl" }}>
      <h1>تسجيل الدخول</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="الإيميل"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
          required
        />
        <input
          type="password"
          placeholder="كلمة المرور"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
          required
        />
        <button type="submit" style={{ width: "100%", padding: 10, background: "#4CAF50", color: "white", border: "none", cursor: "pointer" }}>
          دخول
        </button>
      </form>
      <p>
        ما عندك حساب؟ <a href="/register">سجل هنا</a>
      </p>
    </div>
  );
}
