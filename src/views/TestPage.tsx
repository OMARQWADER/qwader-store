import { SocialLoginTest } from "../components/SocialLoginTest";

export function TestPage() {
  return (
    <div style={{ minHeight: "100vh", padding: "40px 20px", backgroundColor: "#f9f9f9" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ textAlign: "center", color: "#333", marginBottom: "30px" }}>
          🧪 Social Login Test Page
        </h1>
        
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "12px",
          padding: "30px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <SocialLoginTest />
        </div>

        <div style={{
          marginTop: "40px",
          padding: "20px",
          backgroundColor: "#fff3cd",
          borderRadius: "8px",
          border: "1px solid #ffc107"
        }}>
          <h3 style={{ marginTop: 0, color: "#856404" }}>⚠️ Prerequisites</h3>
          <ul style={{ marginBottom: 0 }}>
            <li>Make sure you have Clerk account set up at https://dashboard.clerk.com</li>
            <li>Enable Google OAuth in Clerk Dashboard → Social Connections</li>
            <li>Enable Facebook OAuth in Clerk Dashboard → Social Connections</li>
            <li>Configure Google and Facebook OAuth credentials</li>
            <li>Set VITE_CLERK_PUBLISHABLE_KEY in your .env file</li>
            <li>Restart your dev server after changing .env</li>
          </ul>
        </div>

        <div style={{
          marginTop: "20px",
          padding: "20px",
          backgroundColor: "#d4edda",
          borderRadius: "8px",
          border: "1px solid #28a745"
        }}>
          <h3 style={{ marginTop: 0, color: "#155724" }}>✓ What to Test</h3>
          <ul style={{ marginBottom: 0 }}>
            <li><strong>Google Login:</strong> Click the Google button and verify you can log in with your Google account</li>
            <li><strong>Facebook Login:</strong> Click the Facebook button and verify you can log in with your Facebook account</li>
            <li><strong>User Info:</strong> After login, verify your name and email appear correctly</li>
            <li><strong>Provider Display:</strong> Check that the connected provider (Google or Facebook) is shown</li>
            <li><strong>Sign Out:</strong> Click the user button and verify you can sign out</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
