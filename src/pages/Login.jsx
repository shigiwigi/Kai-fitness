// ═══════════════════════════════════════════════
//   KAI FITNESS — Login.jsx
//   Place at: src/pages/Login.jsx
//   Email/password + Google Sign-In
// ═══════════════════════════════════════════════

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { calcCalorieGoal, DEFAULT_PROFILE } from "../context/AuthContext";

// ─── Google provider ──────────────────────────────
const googleProvider = new GoogleAuthProvider();

// ─── Divider ──────────────────────────────────────
function Divider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: 0.5 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
    </div>
  );
}

// ─── Google SVG icon ──────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
      <path d="M44.5 20H24v8.5h11.8C34.7 33.9 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
      <path d="M6.3 14.7l7 5.1C15.1 16.5 19.2 14 24 14c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3c-7.6 0-14.2 4.2-17.7 10.7z" fill="#FF3D00"/>
      <path d="M24 45c5.5 0 10.5-1.9 14.3-5.1l-6.6-5.5C29.7 36.1 27 37 24 37c-5.8 0-10.6-3.9-12.3-9.3l-7 5.4C8.1 40.7 15.4 45 24 45z" fill="#4CAF50"/>
      <path d="M44.5 20H24v8.5h11.8c-.8 2.9-2.7 5.4-5.3 7l6.6 5.5C41 37.4 44.5 31.2 44.5 24c0-1.3-.2-2.7-.5-4z" fill="#1976D2"/>
    </svg>
  );
}

export default function Login() {
  const [mode,     setMode]     = useState("login"); // "login" | "signup"
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [gLoading, setGLoading] = useState(false);

  const clearError = () => setError("");

  // ── Email / Password sign in ────────────────────
  const handleEmail = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Create default Firestore profile
        const profile = {
          ...DEFAULT_PROFILE,
          email,
          name: email.split("@")[0],
          calorieGoal: calcCalorieGoal(DEFAULT_PROFILE),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(doc(db, "users", cred.user.uid, "profile", "data"), profile);
      }
    } catch (err) {
      const msgs = {
        "auth/user-not-found":   "No account found with this email.",
        "auth/wrong-password":   "Incorrect password.",
        "auth/email-already-in-use": "An account with this email already exists.",
        "auth/weak-password":    "Password must be at least 6 characters.",
        "auth/invalid-email":    "Please enter a valid email address.",
        "auth/too-many-requests":"Too many attempts. Try again later.",
      };
      setError(msgs[err.code] || err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Google Sign-In ──────────────────────────────
  const handleGoogle = async () => {
    setGLoading(true); setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user   = result.user;
      // Check if profile exists — create one if first time
      const profileRef = doc(db, "users", user.uid, "profile", "data");
      const existing   = await getDoc(profileRef);
      if (!existing.exists()) {
        const profile = {
          ...DEFAULT_PROFILE,
          email: user.email,
          name:  user.displayName || user.email.split("@")[0],
          calorieGoal: calcCalorieGoal(DEFAULT_PROFILE),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(profileRef, profile);
      }
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message);
      }
    } finally {
      setGLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "11px 14px",
    color: "var(--text)",
    fontFamily: "var(--font-body)",
    fontSize: 15,
    outline: "none",
    transition: "border-color 0.2s",
  };

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}>
      {/* Background glow */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(232,25,44,0.07) 0%, transparent 70%)",
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        style={{
          width: "100%", maxWidth: 400,
          background: "var(--surface)",
          border: "1px solid var(--border-md)",
          borderRadius: "var(--radius-xl)",
          padding: "36px 32px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top accent line */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: "linear-gradient(90deg, var(--red), transparent)",
        }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#E8192C"/>
            <line x1="9" y1="8"  x2="9"  y2="24" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="9" y1="16" x2="22" y2="8"  stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="9" y1="16" x2="22" y2="24" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 26, letterSpacing: 4, lineHeight: 1 }}>
              K<span style={{ color: "var(--red)" }}>AI</span> FITNESS
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: 1, marginTop: 2 }}>
              KINETIC AI FITNESS
            </div>
          </div>
        </div>

        {/* Mode tabs */}
        <div style={{ display: "flex", background: "var(--surface2)", borderRadius: "var(--radius-sm)", padding: 3, marginBottom: 24 }}>
          {["login", "signup"].map((m) => (
            <button key={m} onClick={() => { setMode(m); clearError(); }}
              style={{
                flex: 1, padding: "8px", border: "none", borderRadius: "var(--radius-sm)",
                background: mode === m ? "var(--surface)" : "transparent",
                color: mode === m ? "var(--text)" : "var(--text-dim)",
                fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 1.5,
                cursor: "pointer", transition: "all 0.2s",
                boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
              }}>
              {m === "login" ? "SIGN IN" : "SIGN UP"}
            </button>
          ))}
        </div>

        {/* Google button */}
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleGoogle} disabled={gLoading}
          style={{
            width: "100%", padding: "11px", marginBottom: 16,
            background: "var(--surface2)", border: "1px solid var(--border-md)",
            borderRadius: "var(--radius-sm)", color: "var(--text)",
            fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500,
            cursor: gLoading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { if (!gLoading) { e.currentTarget.style.borderColor = "var(--border-red)"; e.currentTarget.style.background = "var(--surface3)"; }}}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-md)"; e.currentTarget.style.background = "var(--surface2)"; }}
        >
          {gLoading
            ? <div className="spinner" style={{ width: 18, height: 18 }} />
            : <><GoogleIcon /> Continue with Google</>
          }
        </motion.button>

        <Divider label="OR" />

        {/* Email / password form */}
        <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
          <input
            type="email" required value={email}
            onChange={(e) => { setEmail(e.target.value); clearError(); }}
            placeholder="Email address"
            style={inputStyle}
            onFocus={(e)  => (e.target.style.borderColor = "var(--border-red)")}
            onBlur={(e)   => (e.target.style.borderColor = "var(--border)")}
          />
          <input
            type="password" required value={password}
            onChange={(e) => { setPassword(e.target.value); clearError(); }}
            placeholder="Password"
            style={inputStyle}
            onFocus={(e)  => (e.target.style.borderColor = "var(--border-red)")}
            onBlur={(e)   => (e.target.style.borderColor = "var(--border)")}
          />

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ padding: "9px 12px", background: "rgba(232,25,44,0.07)", border: "1px solid var(--border-red)", borderRadius: "var(--radius-sm)", fontSize: 12, color: "var(--red)", fontFamily: "var(--font-mono)" }}>
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading}
            style={{
              width: "100%", padding: "12px",
              background: loading ? "var(--red-dim)" : "var(--red)",
              border: "none", borderRadius: "var(--radius-sm)",
              color: "#fff", fontFamily: "var(--font-display)",
              fontSize: 15, letterSpacing: 2,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              marginTop: 4,
            }}>
            {loading
              ? <><div className="spinner" style={{ width: 16, height: 16 }} /> {mode === "login" ? "SIGNING IN..." : "CREATING..."}</>
              : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"
            }
          </motion.button>
        </form>

        {/* Footer note */}
        <div style={{ marginTop: 20, textAlign: "center", fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", lineHeight: 1.6 }}>
          {mode === "login"
            ? <>No account? <span onClick={() => { setMode("signup"); clearError(); }} style={{ color: "var(--red)", cursor: "pointer" }}>Create one →</span></>
            : <>Already have an account? <span onClick={() => { setMode("login"); clearError(); }} style={{ color: "var(--red)", cursor: "pointer" }}>Sign in →</span></>
          }
        </div>
      </motion.div>
    </div>
  );
}