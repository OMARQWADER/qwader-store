import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";

export default function ClerkAuth() {
  return (
    <div style={{ position: "fixed", top: 12, right: 12, zIndex: 9999, display: "flex", alignItems: "center", gap: 8 }}>
      <SignedOut>
        <SignInButton mode="modal">
          <button style={{ padding: "10px 20px", background: "linear-gradient(90deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, boxShadow: "0 4px 15px rgba(99,102,241,0.4)" }}>
            🔐 تسجيل الدخول
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  );
}
