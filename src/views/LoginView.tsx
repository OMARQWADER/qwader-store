import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function LoginView() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const data = await login(email, password);
    setLoading(false);
    
    if (data.success) {
      window.location.href = "/";
    } else {
      setError(data.error || "خطأ في بيانات الدخول");
    }
  };

  const handleGoogleLogin = () => {
    const clientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      "756502895226-cbkim0mrfonmoqtq1u471glc4likj3rd.apps.googleusercontent.com";

    const redirectUri = `${window.location.origin}/api/auth/callback/google`;

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=email%20profile&prompt=select_account`;

    window.location.href = googleAuthUrl;
  };

  return (
    <div style={{ maxWidth: 400, margin: "50px auto", padding: 20, direction: "rtl", fontFamily: "sans-serif" }}>
      <h1 style={{ textAlign: "center" }}>تسجيل الدخول</h1>
      
      {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}

      <button
        onClick={handleGoogleLogin}
        type="button"
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: 20,
          backgroundColor: "#4285F4",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontSize: "16px",
          fontWeight: "bold",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px"
        }}
      >
        <span>التسجيل بواسطة Google</span>
      </button>

      <div style={{ textAlign: "center", margin: "15px 0", color: "#888" }}>أو</div>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="البريد الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 12, marginBottom: 12, boxSizing: "border-box", borderRadius: 4, border: "1px solid #ccc" }}
          required
        />
        <input
          type="password"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 12, marginBottom: 15, boxSizing: "border-box", borderRadius: 4, border: "1px solid #ccc" }}
          required
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 12,
            background: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: "16px"
          }}
        >
          {loading ? "جاري الدخول..." : "دخول"}
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: 20 }}>
        ما عندك حساب؟ <a href="/register">سجل هنا</a>
      </p>
    </div>
  );
}