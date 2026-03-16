// ═══════════════════════════════════════════════
//   KAI FITNESS — Profile.jsx
//   Place at: src/pages/Profile.jsx
//   Real Firestore profile read/write
// ═══════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, calcBMR, calcCalorieGoal } from "../context/AuthContext";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

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

// ─── Section ─────────────────────────────────────
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

// ─── Toast ────────────────────────────────────────
function Toast({ msg }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: 20, x: "-50%" }}
      style={{ position: "fixed", bottom: 32, left: "50%", background: "var(--surface2)", border: "1px solid var(--success)", borderRadius: "var(--radius-md)", padding: "9px 18px", zIndex: 900, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(34,197,94,0.2)", whiteSpace: "nowrap" }}>
      <span style={{ color: "var(--success)", fontSize: 13 }}>✓</span>
      <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text)" }}>{msg}</span>
    </motion.div>
  );
}

// ─── Danger Modal ─────────────────────────────────
function DangerModal({ title, message, onClose, onConfirm }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)", zIndex: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 360, background: "var(--surface)", border: "1px solid rgba(232,25,44,0.3)", borderRadius: "var(--radius-xl)", padding: 28, textAlign: "center", boxShadow: "0 0 40px rgba(232,25,44,0.12)" }}>
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

// ─── NumInput — custom number field with +/− buttons ─
function NumInput({ value, onChange, placeholder, min = 0, step = 1 }) {
  const val = parseFloat(value) || 0;
  const dec = step < 1 ? 1 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => onChange({ target: { value: Math.max(min, +(val - step).toFixed(dec)) } })}
        style={{ width: 28, height: 34, background: "transparent", border: "none", borderRight: "1px solid var(--border)", color: "var(--text-dim)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface3)"; e.currentTarget.style.color = "var(--text)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-dim)"; }}
      >−</button>
      <input
        type="number"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{ width: 64, height: 34, background: "transparent", border: "none", color: "var(--text)", fontFamily: "var(--font-body)", fontSize: 13, textAlign: "center", outline: "none", MozAppearance: "textfield" }}
      />
      <button
        type="button"
        onClick={() => onChange({ target: { value: +(val + step).toFixed(dec) } })}
        style={{ width: 28, height: 34, background: "transparent", border: "none", borderLeft: "1px solid var(--border)", color: "var(--text-dim)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface3)"; e.currentTarget.style.color = "var(--text)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-dim)"; }}
      >+</button>
    </div>
  );
}


function CalibModal({ onClose }) {
  const [step, setStep]   = useState(0);
  const [prog, setProg]   = useState(0);
  const steps = [
    { label: "STAND STILL",  desc: "Place device on flat surface, stand straight.", icon: "🧍" },
    { label: "RECORDING...", desc: "Hold position for 5 seconds.",                   icon: "📡" },
    { label: "CALIBRATED ✓", desc: "Zero-point set. Squat detection ready.",         icon: "✅" },
  ];
  const start = () => {
    setStep(1); setProg(0);
    const iv = setInterval(() => setProg((p) => { if (p >= 100) { clearInterval(iv); setStep(2); return 100; } return p + 2; }), 100);
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 400, background: "var(--surface)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-xl)", overflow: "hidden", boxShadow: "var(--shadow-lg)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 2, color: "var(--text-dim)" }}>KAI SENSE CALIBRATION</div>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", width: 28, height: 28, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <div style={{ padding: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, textAlign: "center" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {steps.map((_,i) => <div key={i} style={{ width: i === step ? 22 : 7, height: 4, borderRadius: 2, background: i <= step ? "var(--red)" : "var(--surface4)", transition: "all 0.3s" }} />)}
          </div>
          <motion.div key={step} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ fontSize: 52 }}>{steps[step].icon}</motion.div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: 2, marginBottom: 6 }}>{steps[step].label}</div>
            <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6, maxWidth: 280 }}>{steps[step].desc}</div>
          </div>
          {step === 1 && (
            <div style={{ width: "100%", maxWidth: 280 }}>
              <div className="progress-track" style={{ height: 5 }}>
                <div style={{ height: "100%", width: `${prog}%`, background: "var(--red)", borderRadius: 3, transition: "width 0.1s linear" }} />
              </div>
              <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 5 }}>{prog}%</div>
            </div>
          )}
          {step === 0 && <motion.button whileTap={{ scale: 0.97 }} onClick={start} style={{ padding: "10px 28px", background: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: 2, cursor: "pointer" }}>START</motion.button>}
          {step === 2 && <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.97 }} onClick={onClose} style={{ padding: "10px 28px", background: "var(--success)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: 2, cursor: "pointer" }}>DONE</motion.button>}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────
export default function Profile() {
  const navigate                       = useNavigate();
  const { currentUser, userProfile, updateProfile, logout } = useAuth();

  // Local form state — initialized from Firestore profile
  const [form,       setForm]       = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState(null);
  const [danger,     setDanger]     = useState(null);
  const [calibOpen,  setCalibOpen]  = useState(false);
  const [statsCount, setStatsCount] = useState({ workouts: 0, meals: 0, entries: 0 });

  // Sync form from profile
  useEffect(() => {
    if (userProfile && !form) setForm({ ...userProfile });
  }, [userProfile, form]);

  // Fetch activity counts
  useEffect(() => {
    if (!currentUser) return;
    const fetch = async () => {
      try {
        const [wSnap, mSnap, eSnap] = await Promise.all([
          getDocs(query(collection(db,"users",currentUser.uid,"workouts"), orderBy("createdAt","desc"), limit(200))),
          getDocs(query(collection(db,"users",currentUser.uid,"meals"),    orderBy("createdAt","desc"), limit(200))),
          getDocs(query(collection(db,"users",currentUser.uid,"weightLog"),orderBy("createdAt","desc"), limit(200))),
        ]);
        setStatsCount({ workouts: wSnap.size, meals: mSnap.size, entries: eSnap.size });
      } catch (e) { console.error(e); }
    };
    fetch();
  }, [currentUser]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));
  const setInput = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const saveSection = async (keys) => {
    if (!form) return;
    setSaving(true);
    const partial = Object.fromEntries(keys.map((k) => [k, form[k]]));
    // Recalculate calorie goal if relevant fields change
    if (keys.some((k) => ["fitnessGoal","activityLevel","age","weight","height","gender"].includes(k))) {
      partial.calorieGoal = calcCalorieGoal(form);
    }
    await updateProfile(partial);
    setSaving(false);
    showToast("Changes saved ✓");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (!form) return <div style={{ display: "flex", justifyContent: "center", padding: "80px" }}><div className="spinner" /></div>;

  const bmr = calcBMR(form);
  const goalLabels = { cut: "🔥 Lose Weight", bulk: "💪 Build Muscle", maintain: "⚖️ Maintain", endure: "🏃 Endurance" };

  const inputStyle = (w) => ({
    width: w || 140, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
    padding: "6px 10px", color: "var(--text)", fontFamily: "var(--font-body)", fontSize: 12, outline: "none",
    textAlign: "right", transition: "border-color 0.2s",
  });

  return (
    <div className="page-content">

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        style={{ marginBottom: 22, padding: "clamp(14px,3vw,22px) clamp(14px,3vw,26px)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, position: "relative", overflow: "hidden", flexWrap: "wrap" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "linear-gradient(to bottom, var(--red), transparent)" }} />
        <div style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", fontFamily: "var(--font-display)", fontSize: 72, color: "rgba(255,255,255,0.02)", letterSpacing: 8, pointerEvents: "none" }}>PROFILE</div>

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <motion.div whileHover={{ scale: 1.05 }}
            style={{ width: 68, height: 68, background: "linear-gradient(135deg, var(--red-dim), var(--red))", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 22, border: "3px solid var(--border-red)", flexShrink: 0 }}>
            {(form.name || "KF").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0,2)}
          </motion.div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 26, letterSpacing: 2, lineHeight: 1 }}>{form.name || "User"}</div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 3 }}>{form.email}</div>
            <div style={{ display: "flex", gap: 7, marginTop: 8, flexWrap: "wrap" }}>
              <span className="badge badge-red">{goalLabels[form.fitnessGoal] || "🎯 Goal"}</span>
              {bmr > 0 && <span className="badge badge-neutral">BMR {bmr.toLocaleString()} kcal</span>}
              <span className="badge badge-neutral">{statsCount.workouts} workouts</span>
              <span className="badge badge-neutral">{statsCount.meals} meals logged</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "CURRENT", val: `${form.weight || "—"} kg`, color: "var(--red)"     },
            { label: "GOAL",    val: `${form.goalWeight || "—"} kg`, color: "var(--warning)" },
            { label: "TO GO",   val: form.weight && form.goalWeight ? `${Math.abs((form.weight - form.goalWeight).toFixed(1))} kg` : "—", color: "var(--success)" },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center", padding: "10px 14px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", minWidth: 76 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: s.color, letterSpacing: 1, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 3, letterSpacing: 0.5 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Settings Grid */}
      <div className="grid-2col" style={{ marginBottom: 16 }}>

        {/* Personal Info */}
        <Section title="PERSONAL INFO" icon="👤" delay={0.05}>
          {[
            { key: "name",       label: "Full Name",      placeholder: "Alex Kinetic", type: "text", w: 160 },
          ].map((f) => (
            <Row key={f.key} label={f.label}>
              <input style={inputStyle(f.w)} type="text" value={form[f.key] || ""} onChange={setInput(f.key)} placeholder={f.placeholder}
                onFocus={(e) => (e.target.style.borderColor = "var(--border-red)")}
                onBlur={(e)  => (e.target.style.borderColor = "var(--border)")} />
            </Row>
          ))}
          <Row label="Age">
            <NumInput value={form.age || ""} onChange={setInput("age")} placeholder="25" min={1} step={1} />
          </Row>
          <Row label="Height (cm)">
            <NumInput value={form.height || ""} onChange={setInput("height")} placeholder="175" min={50} step={1} />
          </Row>
          <Row label="Current Weight">
            <NumInput value={form.weight || ""} onChange={setInput("weight")} placeholder="80.4" min={20} step={0.1} />
          </Row>
          <Row label="Goal Weight">
            <NumInput value={form.goalWeight || ""} onChange={setInput("goalWeight")} placeholder="78" min={20} step={0.1} />
          </Row>
          <Row label="Gender">
            <div style={{ display: "flex", gap: 6 }}>
              {["male","female"].map((g) => (
                <button key={g} onClick={() => setForm((p) => ({ ...p, gender: g }))}
                  style={{ padding: "5px 12px", borderRadius: "var(--radius-sm)", border: `1px solid ${form.gender === g ? "var(--red)" : "var(--border)"}`, background: form.gender === g ? "rgba(232,25,44,0.08)" : "transparent", color: form.gender === g ? "var(--red)" : "var(--text-dim)", cursor: "pointer", fontSize: 12, transition: "all 0.2s" }}>
                  {g}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Fitness Goal">
            <div style={{ display: "flex", gap: 5 }}>
              {[{ id:"cut",emoji:"🔥"},{id:"bulk",emoji:"💪"},{id:"maintain",emoji:"⚖️"},{id:"endure",emoji:"🏃"}].map((g) => (
                <button key={g.id} onClick={() => setForm((p) => ({ ...p, fitnessGoal: g.id }))} title={g.id}
                  style={{ width: 30, height: 30, borderRadius: "var(--radius-sm)", border: `1px solid ${form.fitnessGoal === g.id ? "var(--red)" : "var(--border)"}`, background: form.fitnessGoal === g.id ? "rgba(232,25,44,0.08)" : "transparent", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                  {g.emoji}
                </button>
              ))}
            </div>
          </Row>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => saveSection(["name","age","height","weight","goalWeight","gender","fitnessGoal"])} disabled={saving}
            style={{ marginTop: 14, width: "100%", padding: "9px", background: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: 2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {saving ? <div className="spinner" style={{ width: 13, height: 13 }} /> : "SAVE PERSONAL INFO"}
          </motion.button>
        </Section>

        {/* Hardware Config */}
        <Section title="HARDWARE CONFIG" icon="🔧" delay={0.1}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 1, marginBottom: 8 }}>DEFAULT CAMERA</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ id:"laptop",label:"💻 Laptop Mode",desc:"Webcam · MediaPipe"},{ id:"product",label:"📦 KAI SENSE",desc:"ESP32-CAM stream"}].map((c) => (
                <div key={c.id} onClick={() => setForm((p) => ({ ...p, defaultCam: c.id }))}
                  style={{ flex: 1, padding: "9px 10px", borderRadius: "var(--radius-md)", border: `1px solid ${form.defaultCam === c.id ? "var(--red)" : "var(--border)"}`, background: form.defaultCam === c.id ? "rgba(232,25,44,0.07)" : "var(--surface2)", cursor: "pointer", transition: "all 0.2s" }}>
                  <div style={{ fontSize: 11, fontWeight: form.defaultCam === c.id ? 600 : 400, color: form.defaultCam === c.id ? "var(--text)" : "var(--text-dim)", marginBottom: 2 }}>{c.label}</div>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
          <Row label="KAI SENSE IP" desc="ESP32-CAM stream address">
            <input style={inputStyle(150)} value={form.boxAIP || ""} onChange={setInput("boxAIP")} placeholder="192.168.1.42"
              onFocus={(e) => (e.target.style.borderColor = "var(--border-red)")}
              onBlur={(e)  => (e.target.style.borderColor = "var(--border)")} />
          </Row>
          <Row label="KAI Device ID" desc="MAC address shown in Arduino Serial Monitor">
            <input style={inputStyle(150)} value={form.kaiDeviceId || ""} onChange={setInput("kaiDeviceId")} placeholder="6CC84034002C"
              onFocus={(e) => (e.target.style.borderColor = "var(--border-red)")}
              onBlur={(e)  => (e.target.style.borderColor = "var(--border)")} />
          </Row>
          <Row label="Stream Port" desc="MJPEG stream port">
            <input style={inputStyle(70)} value={form.streamPort || ""} onChange={setInput("streamPort")} placeholder="81"
              onFocus={(e) => (e.target.style.borderColor = "var(--border-red)")}
              onBlur={(e)  => (e.target.style.borderColor = "var(--border)")} />
          </Row>
          <Row label="KAI CORE Port" desc="MPU6050 data port">
            <input style={inputStyle(70)} value={form.boxBPort || ""} onChange={setInput("boxBPort")} placeholder="8080"
              onFocus={(e) => (e.target.style.borderColor = "var(--border-red)")}
              onBlur={(e)  => (e.target.style.borderColor = "var(--border)")} />
          </Row>
          <Row label="Ultrasonic Alerts" desc="Warn if too close/far from KAI SENSE">
            <Toggle value={form.ultrasonicOn ?? true} onChange={set("ultrasonicOn")} />
          </Row>
          <Row label="Auto-detect Devices" desc="Scan network for KAI hardware">
            <Toggle value={form.autoDetect ?? true} onChange={set("autoDetect")} />
          </Row>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setCalibOpen(true)}
              style={{ width: "100%", padding: "9px", background: "transparent", border: "1px solid var(--border-red)", borderRadius: "var(--radius-sm)", color: "var(--red)", fontFamily: "var(--font-display)", fontSize: 11, letterSpacing: 1.5, cursor: "pointer", marginBottom: 8, transition: "background 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(232,25,44,0.06)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              ⚡ CALIBRATE KAI SENSE (MPU6050)
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => saveSection(["defaultCam","boxAIP","kaiDeviceId","streamPort","boxBPort","ultrasonicOn","autoDetect"])} disabled={saving}
              style={{ width: "100%", padding: "9px", background: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: 2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {saving ? <div className="spinner" style={{ width: 13, height: 13 }} /> : "SAVE HARDWARE CONFIG"}
            </motion.button>
          </div>
        </Section>
      </div>

      <div className="grid-2col">

        {/* Preferences */}
        <Section title="PREFERENCES" icon="⚙️" delay={0.15}>
          <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-mono)" }}>
            Preferences have moved to{" "}
            <span
              onClick={() => navigate("/settings")}
              style={{ color: "var(--red)", cursor: "pointer", textDecoration: "underline" }}
            >Settings →</span>
          </div>
        </Section>

        {/* Account */}
        <Section title="ACCOUNT" icon="🔐" delay={0.2}>
          <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-mono)" }}>
            Account settings have moved to{" "}
            <span
              onClick={() => navigate("/settings")}
              style={{ color: "var(--red)", cursor: "pointer", textDecoration: "underline" }}
            >Settings →</span>
          </div>
        </Section>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {calibOpen && <CalibModal onClose={() => setCalibOpen(false)} />}
        {danger    && <DangerModal title={danger.title} message={danger.message} onClose={() => setDanger(null)} onConfirm={danger.onConfirm} />}
        {toast     && <Toast msg={toast} />}
      </AnimatePresence>
    </div>
  );
}