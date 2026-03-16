// ═══════════════════════════════════════════════
//   KAI FITNESS — Settings.jsx
//   Place at: src/pages/Settings.jsx
//   Preferences · Account · Danger Zone
// ═══════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, calcCalorieGoal } from "../context/AuthContext";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { db, auth } from "../lib/firebase";

// ─── Toggle ───────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <motion.div onClick={() => onChange(!value)} animate={{ background: value ? "var(--red)" : "var(--surface4)" }} transition={{ duration: 0.2 }}
      style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", position: "relative", flexShrink: 0, border: "1px solid rgba(255,255,255,0.06)" }}>
      <motion.div animate={{ x: value ? 22 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{ position: "absolute", top: 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
    </motion.div>
  );
}

function Section({ title, icon, children, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay, ease: [0.4,0,0.2,1] }}
      style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface2)" }}>
        <span style={{ fontSize: 17 }}>{icon}</span>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 15, letterSpacing: 2, color: "var(--text-dim)" }}>{title}</div>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </motion.div>
  );
}

function Row({ label, desc, children, danger }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "11px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: danger ? "var(--red)" : "var(--text)", marginBottom: desc ? 2 : 0 }}>{label}</div>
        {desc && <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Toast({ msg, isError }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: 20, x: "-50%" }}
      style={{ position: "fixed", bottom: 32, left: "50%", background: "var(--surface2)", border: `1px solid ${isError ? "var(--red)" : "var(--success)"}`, borderRadius: "var(--radius-md)", padding: "9px 18px", zIndex: 900, display: "flex", alignItems: "center", gap: 8, boxShadow: `0 4px 20px ${isError ? "rgba(232,25,44,0.2)" : "rgba(34,197,94,0.2)"}`, whiteSpace: "nowrap" }}>
      <span style={{ color: isError ? "var(--red)" : "var(--success)", fontSize: 13 }}>{isError ? "✗" : "✓"}</span>
      <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text)" }}>{msg}</span>
    </motion.div>
  );
}

function DangerModal({ title, message, onClose, onConfirm }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)", zIndex: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 360, background: "var(--surface)", border: "1px solid rgba(232,25,44,0.3)", borderRadius: "var(--radius-xl)", padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 14 }}>⚠️</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: 2, marginBottom: 8, color: "var(--red)" }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 22 }}>{message}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px", background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: 1 }}>CANCEL</button>
          <motion.button whileTap={{ scale: 0.96 }} onClick={onConfirm} style={{ flex: 1, padding: "9px", background: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: 1 }}>CONFIRM</motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { currentUser, userProfile, updateProfile, logout } = useAuth();

  const [form,       setForm]       = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState(null);
  const [toastErr,   setToastErr]   = useState(false);
  const [danger,     setDanger]     = useState(null);
  const [statsCount, setStatsCount] = useState({ workouts: 0, meals: 0, entries: 0 });

  useEffect(() => {
    if (userProfile && !form) setForm({ ...userProfile });
  }, [userProfile, form]);

  useEffect(() => {
    if (!currentUser) return;
    const fetch = async () => {
      try {
        const [wSnap, mSnap, eSnap] = await Promise.all([
          getDocs(query(collection(db, "users", currentUser.uid, "workouts"),  orderBy("createdAt","desc"), limit(200))),
          getDocs(query(collection(db, "users", currentUser.uid, "meals"),     orderBy("createdAt","desc"), limit(200))),
          getDocs(query(collection(db, "users", currentUser.uid, "weightLog"), orderBy("createdAt","desc"), limit(200))),
        ]);
        setStatsCount({ workouts: wSnap.size, meals: mSnap.size, entries: eSnap.size });
      } catch (e) { console.error(e); }
    };
    fetch();
  }, [currentUser]);

  const showToast = (msg, isError = false) => {
    setToast(msg); setToastErr(isError);
    setTimeout(() => setToast(null), 2800);
  };

  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  const saveSection = async (keys) => {
    if (!form) return;
    setSaving(true);
    const partial = Object.fromEntries(keys.map((k) => [k, form[k]]));
    await updateProfile(partial);
    setSaving(false);
    showToast("Saved ✓");
  };

  const handleLogout = async () => { await logout(); navigate("/login"); };

  const handlePasswordReset = async () => {
    if (!form?.email) return;
    try {
      await sendPasswordResetEmail(auth, form.email);
      showToast("Reset email sent — check your inbox");
    } catch (e) { showToast(e.message, true); }
  };

  if (!form) return <div style={{ display:"flex", justifyContent:"center", padding:"80px" }}><div className="spinner" /></div>;

  return (
    <div className="page-content">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        style={{ marginBottom: 22, padding: "18px 22px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, position: "relative", overflow: "hidden", flexWrap: "wrap" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "linear-gradient(to bottom, var(--red), transparent)" }} />
        <div style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", fontFamily: "var(--font-display)", fontSize: 72, color: "rgba(255,255,255,0.02)", letterSpacing: 8, pointerEvents: "none" }}>SETTINGS</div>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, letterSpacing: 2, lineHeight: 1 }}>APP SETTINGS</div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 4 }}>{form.email}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[{ label: "workouts", val: statsCount.workouts }, { label: "meals", val: statsCount.meals }, { label: "weigh-ins", val: statsCount.entries }].map((s) => (
            <div key={s.label} style={{ textAlign: "center", padding: "6px 10px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--red)", letterSpacing: 1 }}>{s.val}</div>
              <div style={{ fontSize: 8, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Two-column grid ── */}
      <div className="grid-2col">

        {/* Preferences */}
        <Section title="PREFERENCES" icon="⚙️" delay={0.05}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 1, marginBottom: 8 }}>MEASUREMENT UNITS</div>
            <div style={{ display: "flex", gap: 8 }}>
              {["metric","imperial"].map((u) => (
                <button key={u} onClick={() => setForm((p) => ({ ...p, units: u }))}
                  style={{ flex: 1, padding: "7px", borderRadius: "var(--radius-sm)", border: `1px solid ${form.units === u ? "var(--red)" : "var(--border)"}`, background: form.units === u ? "rgba(232,25,44,0.08)" : "transparent", color: form.units === u ? "var(--red)" : "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1, transition: "all 0.2s" }}>
                  {u.toUpperCase()}
                  <div style={{ fontSize: 8, color: "var(--text-muted)", marginTop: 2 }}>{u === "metric" ? "kg · cm" : "lbs · in"}</div>
                </button>
              ))}
            </div>
          </div>
          {[
            { key: "notifications", label: "Notifications",       desc: "Reminders & milestones"         },
            { key: "soundFeedback", label: "Audio Form Feedback",  desc: "Voice cues during sets"         },
            { key: "repCountBeep",  label: "Rep Count Beep",       desc: "Beep on each completed rep"     },
            { key: "autoStartCam",  label: "Auto-start Camera",    desc: "Open cam on Workout page entry" },
            { key: "restTimer",     label: "Rest Timer",           desc: "Countdown between sets"         },
          ].map((s) => (
            <Row key={s.key} label={s.label} desc={s.desc}>
              <Toggle value={form[s.key] ?? true} onChange={set(s.key)} />
            </Row>
          ))}
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => saveSection(["units","notifications","soundFeedback","repCountBeep","autoStartCam","restTimer"])} disabled={saving}
            style={{ marginTop: 14, width: "100%", padding: "9px", background: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: 2, cursor: "pointer" }}>
            {saving ? "SAVING..." : "SAVE PREFERENCES"}
          </motion.button>
        </Section>

        {/* Account */}
        <Section title="ACCOUNT" icon="🔐" delay={0.1}>
          <Row label="Email" desc="Your login email">
            <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>{form.email}</span>
          </Row>
          <Row label="Change Password" desc="Send a password reset link">
            <motion.button whileTap={{ scale: 0.96 }} onClick={handlePasswordReset}
              style={{ padding: "5px 12px", background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 0.5, transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-md)"; e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)";    e.currentTarget.style.color = "var(--text-dim)"; }}>
              SEND RESET
            </motion.button>
          </Row>
          <Row label="Sign Out" desc="Log out of this device">
            <button onClick={handleLogout}
              style={{ padding: "5px 12px", background: "rgba(232,25,44,0.07)", border: "1px solid var(--border-red)", borderRadius: "var(--radius-sm)", color: "var(--red)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 0.5, transition: "all 0.2s" }}>
              SIGN OUT
            </button>
          </Row>

          {/* App info */}
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: 2, color: "var(--text-muted)", marginBottom: 8 }}>APP INFO</div>
            {[
              ["Version",  "KAI Fitness v1.0.0"],
              ["Firebase", "Firestore + Auth"],
              ["AI Engine","MediaPipe Pose"],
              ["Build",    "2026.03.14"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text-dim)" }}>{k}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Danger Zone */}
          <div style={{ marginTop: 18, padding: 14, background: "rgba(232,25,44,0.04)", border: "1px solid rgba(232,25,44,0.2)", borderRadius: "var(--radius-md)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 2, color: "var(--red)", marginBottom: 10 }}>DANGER ZONE</div>
            <Row label="Reset All Data" desc="Delete all meals, workouts & weight entries" danger>
              <button onClick={() => setDanger({ title: "RESET ALL DATA", message: "This permanently deletes all your meals, workouts, and weight entries. Cannot be undone.", onConfirm: () => { setDanger(null); showToast("Data reset coming soon"); } })}
                style={{ padding: "5px 10px", background: "rgba(232,25,44,0.08)", border: "1px solid var(--border-red)", borderRadius: "var(--radius-sm)", color: "var(--red)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 0.5 }}>
                RESET
              </button>
            </Row>
            <Row label="Delete Account" desc="Permanently remove your account" danger>
              <button onClick={() => setDanger({ title: "DELETE ACCOUNT", message: "Your account and all data will be permanently deleted. This is irreversible.", onConfirm: () => { setDanger(null); handleLogout(); } })}
                style={{ padding: "5px 10px", background: "rgba(232,25,44,0.08)", border: "1px solid var(--border-red)", borderRadius: "var(--radius-sm)", color: "var(--red)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 0.5 }}>
                DELETE
              </button>
            </Row>
          </div>
        </Section>
      </div>

      <AnimatePresence>
        {danger && <DangerModal title={danger.title} message={danger.message} onClose={() => setDanger(null)} onConfirm={danger.onConfirm} />}
        {toast  && <Toast msg={toast} isError={toastErr} />}
      </AnimatePresence>
    </div>
  );
}