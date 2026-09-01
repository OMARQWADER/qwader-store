import { SignedIn, SignedOut, SignIn, UserButton } from "@clerk/clerk-react";
import { useState } from "react";
import { X } from "lucide-react";

export default function ClerkAuth() {
  const [showSignIn, setShowSignIn] = useState(false);

  return (
    <div style={{ position: "fixed", top: 12, right: 12, zIndex: 9999, display: "flex", alignItems: "center", gap: 8 }}>
      <SignedOut>
        <button
          onClick={() => setShowSignIn(!showSignIn)}
          style={{
            padding: "10px 20px",
            background: "linear-gradient(90deg,#6366f1,#8b5cf6)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 14,
            boxShadow: "0 4px 15px rgba(99,102,241,0.4)"
          }}
        >
          🔐 تسجيل الدخول
        </button>

        {showSignIn && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000
          }}>
            <div style={{
              background: "#fff",
              borderRadius: 15,
              padding: 30,
              maxWidth: 400,
              width: "90%",
              position: "relative",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)"
            }}>
              <button
                onClick={() => setShowSignIn(false)}
                style={{
                  position: "absolute",
                  top: 15,
                  right: 15,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 24
                }}
              >
                <X size={24} />
              </button>
              <SignIn
                routing="virtual"
                afterSignInUrl="/"
                appearance={{
                  elements: {
                    socialButtonsBlockButton: "w-full",
                    socialButtonsBlockButtonText: "font-bold"
                  }
                }}
              />
            </div>
          </div>
        )}
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  );
}
