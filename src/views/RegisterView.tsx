import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function RegisterView() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const data = await register(name, email, password);
    if (data.success) {
      window.location.href = "/";
    } else {
      setError(data.error || "خطأ في التسجيل");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "50px auto", padding: 20, direction: "rtl" }}>
      <h1>تسجيل حساب جديد</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="الاسم الكامل"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
          required
        />
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
        <button type="submit" style={{ width: "100%", padding: 10, background: "#2196F3", color: "white", border: "none", cursor: "pointer" }}>
          تسجيل
        </button>
      </form>
      <p>
        عندك حساب؟ <a href="/login">سجل دخول</a>
      </p>
    </div>
  );
}
