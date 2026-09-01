import { SignedIn, SignedOut, SignIn, UserButton, useUser } from "@clerk/clerk-react";
import { useState } from "react";
import { X, AlertCircle, CheckCircle } from "lucide-react";

export function SocialLoginTest() {
  const [showSignIn, setShowSignIn] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const { user, isSignedIn, isLoaded } = useUser();

  const logDebugInfo = (message: string) => {
    console.log(message);
    setDebugInfo(prev => `${prev}\n${new Date().toLocaleTimeString()}: ${message}`);
  };

  return (
    <div style={{ padding: "20px", backgroundColor: "#f5f5f5", borderRadius: "10px", margin: "20px" }}>
      <h2 style={{ marginBottom: "15px", color: "#333" }}>🔐 Social Login Test Panel</h2>

      {/* Status Information */}
      <div style={{
        padding: "15px",
        backgroundColor: "#fff",
        borderRadius: "8px",
        marginBottom: "15px",
        border: "1px solid #ddd"
      }}>
        <div style={{ marginBottom: "10px" }}>
          <strong>Clerk Status:</strong>
          <span style={{ marginLeft: "10px", color: isLoaded ? "green" : "orange" }}>
            {isLoaded ? "✓ Loaded" : "⏳ Loading..."}
          </span>
        </div>
        
        {isSignedIn && user && (
          <>
            <div style={{ marginBottom: "10px", color: "green" }}>
              <CheckCircle size={16} style={{ display: "inline", marginRight: "5px" }} />
              <strong>User Signed In:</strong> {user.primaryEmailAddress?.emailAddress}
            </div>
            <div style={{ marginBottom: "10px" }}>
              <strong>Name:</strong> {user.firstName} {user.lastName}
            </div>
            {user.externalAccounts && user.externalAccounts.length > 0 && (
              <div>
                <strong>OAuth Providers:</strong>
                <ul style={{ marginTop: "5px", paddingLeft: "20px" }}>
                  {user.externalAccounts.map((account, idx) => (
                    <li key={idx}>{account.provider}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {!isSignedIn && isLoaded && (
          <div style={{ color: "#666" }}>
            <AlertCircle size={16} style={{ display: "inline", marginRight: "5px" }} />
            <strong>Not Signed In</strong>
          </div>
        )}
      </div>

      {/* Main Controls */}
      <SignedOut>
        <button
          onClick={() => {
            setShowSignIn(!showSignIn);
            logDebugInfo("Sign-in modal toggled");
          }}
          style={{
            padding: "12px 24px",
            background: "linear-gradient(90deg,#6366f1,#8b5cf6)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "16px",
            boxShadow: "0 4px 15px rgba(99,102,241,0.4)",
            marginBottom: "15px"
          }}
        >
          🔐 {showSignIn ? "Hide" : "Show"} Sign-In Modal
        </button>

        {/* Sign-in Modal */}
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
              borderRadius: "15px",
              padding: "30px",
              maxWidth: "400px",
              width: "90%",
              position: "relative",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)"
            }}>
              <button
                onClick={() => {
                  setShowSignIn(false);
                  logDebugInfo("Sign-in modal closed");
                }}
                style={{
                  position: "absolute",
                  top: "15px",
                  right: "15px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "24px"
                }}
              >
                <X size={24} />
              </button>

              <SignIn
                routing="virtual"
                afterSignInUrl="/"
                appearance={{
                  elements: {
                    socialButtonsBlockButton: "w-full py-3 my-2",
                    socialButtonsBlockButtonText: "font-bold"
                  }
                }}
                signUpUrl="/sign-up"
              />
            </div>
          </div>
        )}
      </SignedOut>

      <SignedIn>
        <div style={{ marginBottom: "15px" }}>
          <UserButton afterSignOutUrl="/" />
        </div>
      </SignedIn>

      {/* Debug Info */}
      <details style={{ marginTop: "15px" }}>
        <summary style={{
          cursor: "pointer",
          fontWeight: "bold",
          padding: "10px",
          backgroundColor: "#f0f0f0",
          borderRadius: "5px",
          userSelect: "none"
        }}>
          📋 Debug Information
        </summary>
        <pre style={{
          marginTop: "10px",
          padding: "10px",
          backgroundColor: "#1e1e1e",
          color: "#00ff00",
          borderRadius: "5px",
          fontSize: "12px",
          overflow: "auto",
          maxHeight: "200px"
        }}>
          {debugInfo || "No debug information yet. Try opening the sign-in modal."}
        </pre>
      </details>

      {/* Instructions */}
      <div style={{
        marginTop: "20px",
        padding: "15px",
        backgroundColor: "#e3f2fd",
        borderRadius: "8px",
        border: "1px solid #1976d2"
      }}>
        <h3 style={{ marginTop: 0, color: "#1976d2" }}>Testing Instructions:</h3>
        <ol style={{ marginBottom: 0, paddingLeft: "20px" }}>
          <li>Click "Show Sign-In Modal" button</li>
          <li>Look for Google and Facebook OAuth buttons</li>
          <li>Click Google to test Google OAuth</li>
          <li>Click Facebook to test Facebook OAuth</li>
          <li>Complete the OAuth flow in the provider's login page</li>
          <li>You should be redirected back and see your user info above</li>
          <li>Check the debug panel for any errors or logs</li>
        </ol>
      </div>
    </div>
  );
}
