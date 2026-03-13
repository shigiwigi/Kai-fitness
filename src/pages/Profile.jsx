// ═══════════════════════════════════════════════
//   KAI FITNESS — Profile.jsx
//   Hardware Config · Settings · Account
// ═══════════════════════════════════════════════

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// ─── Toggle Switch ───────────────────────────────
function Toggle({ value, onChange, color = "var(--red)" }) {
  return (
    <motion.div
      onClick={() => onChange(!value)}
      animate={{ background: value ? color : "var(--surface4)" }}
      transition={{ duration: 0.2 }}
      style={{
        width:        44,
        height:       24,
        borderRadius: 12,
        cursor:       "pointer",
        position:     "relative",
        flexShrink:   0,
        border:       "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <motion.div
        animate={{ x: value ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{
          position:     "absolute",
          top:          2,
          width:        18,
          height:       18,
          borderRadius: "50%",
          background:   "#fff",
          boxShadow:    "0 1px 4px rgba(0,0,0,0.4)",
        }}
      />
    </motion.div>
  );
}

// ─── Section wrapper ─────────────────────────────
function Section({ title, icon, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y:  0 }}
      transition={{ duration: 0.4, delay, ease: [0.4, 0, 0.2, 1] }}
      style={{
        background:   "var(--surface)",
        border:       "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        overflow:     "hidden",
      }}
    >
      {/* Section header */}
      <div style={{
        display:      "flex",
        alignItems:   "center",
        gap:          10,
        padding:      "14px 20px",
        borderBottom: "1px solid var(--border)",
        background:   "var(--surface2)",
      }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div style={{
          fontFamily:    "var(--font-display)",
          fontSize:      16,
          letterSpacing: 2,
          color:         "var(--text-dim)",
        }}>
          {title}
        </div>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </motion.div>
  );
}

// ─── Setting row ─────────────────────────────────
function SettingRow({ label, desc, children, danger = false }) {
  return (
    <div style={{
      display:        "flex",
      alignItems:     "center",
      justifyContent: "space-between",
      gap:            16,
      padding:        "13px 0",
      borderBottom:   "1px solid var(--border)",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize:   13,
          fontWeight: 500,
          color:      danger ? "var(--red)" : "var(--text)",
          marginBottom: desc ? 3 : 0,
        }}>
          {label}
        </div>
        {desc && (
          <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", lineHeight: 1.4 }}>
            {desc}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// ─── Calibration Modal ────────────────────────────
function CalibrationModal({ onClose }) {
  const [step, setStep]     = useState(0);
  const [progress, setProg] = useState(0);

  const steps = [
    { label: "STAND STILL",    desc: "Place device on flat surface. Stand straight, feet shoulder-width apart.", icon: "🧍" },
    { label: "RECORDING",      desc: "Hold position for 5 seconds while MPU6050 records baseline orientation.", icon: "📡" },
    { label: "CALIBRATED ✓",   desc: "Zero-point successfully set. Squat detection is now calibrated.", icon: "✅" },
  ];

  const startCalibration = () => {
    setStep(1);
    setProg(0);
    const interval = setInterval(() => {
      setProg((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setStep(2);
          return 100;
        }
        return p + 2;
      });
    }, 100);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{    opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1,    opacity: 1 }}
        exit={{    scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 420, background: "var(--surface)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-xl)", overflow: "hidden", boxShadow: "var(--shadow-lg)" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: 2, color: "var(--text-dim)" }}>MPU6050 CALIBRATION</div>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", width: 28, height: 28, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <div style={{ padding: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center" }}>

          {/* Step indicator */}
          <div style={{ display: "flex", gap: 8 }}>
            {steps.map((_, i) => (
              <div key={i} style={{ width: i === step ? 24 : 8, height: 4, borderRadius: 2, background: i <= step ? "var(--red)" : "var(--surface4)", transition: "all 0.3s" }} />
            ))}
          </div>

          {/* Icon */}
          <motion.div
            key={step}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1,   opacity: 1 }}
            style={{ fontSize: 56 }}
          >
            {steps[step].icon}
          </motion.div>

          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 2, marginBottom: 8 }}>
              {steps[step].label}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6, maxWidth: 300 }}>
              {steps[step].desc}
            </div>
          </div>

          {/* Progress bar (step 1 only) */}
          {step === 1 && (
            <div style={{ width: "100%", maxWidth: 300 }}>
              <div className="progress-track" style={{ height: 6 }}>
                <motion.div
                  animate={{ width: `${progress}%` }}
                  style={{ height: "100%", background: "var(--red)", borderRadius: 3, transition: "width 0.1s linear" }}
                />
              </div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 6 }}>
                {progress}% complete
              </div>
            </div>
          )}

          {/* Action button */}
          {step === 0 && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={startCalibration}
              style={{ padding: "11px 32px", background: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 15, letterSpacing: 2, cursor: "pointer" }}
            >
              START CALIBRATION
            </motion.button>
          )}

          {step === 2 && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              style={{ padding: "11px 32px", background: "var(--success)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 15, letterSpacing: 2, cursor: "pointer" }}
            >
              DONE
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Edit Profile Modal ───────────────────────────
function EditProfileModal({ profile, onClose, onSave }) {
  const [form, setForm] = useState({ ...profile });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{    opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1,    opacity: 1 }}
        exit={{    scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 460, background: "var(--surface)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-xl)", overflow: "hidden", boxShadow: "var(--shadow-lg)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: 2, color: "var(--text-dim)" }}>EDIT PROFILE</div>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", width: 28, height: 28, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 14px", background: "var(--surface2)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
            <div style={{ width: 56, height: 56, background: "linear-gradient(135deg, var(--red-dim), var(--red))", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 20, border: "2px solid var(--border-red)" }}>
              {form.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{form.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{form.email}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { key: "name",   label: "FULL NAME",    placeholder: "Alex Kinetic",     span: 2 },
              { key: "email",  label: "EMAIL",        placeholder: "alex@kai.io",      span: 2 },
              { key: "age",    label: "AGE",          placeholder: "25",               span: 1, type: "number" },
              { key: "height", label: "HEIGHT (cm)",  placeholder: "175",              span: 1, type: "number" },
              { key: "weight", label: "CURRENT WEIGHT (kg)", placeholder: "80.4",      span: 1, type: "number" },
              { key: "goal",   label: "GOAL WEIGHT (kg)",    placeholder: "78",        span: 1, type: "number" },
            ].map((f) => (
              <div key={f.key} style={{ gridColumn: `span ${f.span}` }}>
                <label style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 1, display: "block", marginBottom: 5 }}>{f.label}</label>
                <input
                  className="input"
                  type={f.type || "text"}
                  value={form[f.key] ?? ""}
                  onChange={set(f.key)}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </div>

          {/* Fitness Goal */}
          <div>
            <label style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 1, display: "block", marginBottom: 8 }}>FITNESS GOAL</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {[
                { id: "cut",      emoji: "🔥", label: "Lose Weight" },
                { id: "bulk",     emoji: "💪", label: "Build Muscle" },
                { id: "maintain", emoji: "⚖️", label: "Maintain"    },
                { id: "endure",   emoji: "🏃", label: "Endurance"   },
              ].map((g) => (
                <div
                  key={g.id}
                  onClick={() => setForm((f) => ({ ...f, fitnessGoal: g.id }))}
                  style={{ padding: "10px 6px", textAlign: "center", borderRadius: "var(--radius-sm)", border: `1px solid ${form.fitnessGoal === g.id ? "var(--red)" : "var(--border)"}`, background: form.fitnessGoal === g.id ? "rgba(232,25,44,0.08)" : "var(--surface2)", cursor: "pointer", transition: "all 0.2s" }}
                >
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{g.emoji}</div>
                  <div style={{ fontSize: 9, color: form.fitnessGoal === g.id ? "var(--red)" : "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 0.5 }}>{g.label.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { onSave(form); onClose(); }}
            style={{ padding: "11px", background: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 15, letterSpacing: 2, cursor: "pointer" }}
          >
            SAVE CHANGES
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Danger confirm ───────────────────────────────
function DangerModal({ title, message, onClose, onConfirm }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{    opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)", zIndex: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1,   opacity: 1 }}
        exit={{    scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 380, background: "var(--surface)", border: "1px solid rgba(232,25,44,0.3)", borderRadius: "var(--radius-xl)", padding: 28, textAlign: "center", boxShadow: "0 0 40px rgba(232,25,44,0.15)" }}
      >
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: 2, marginBottom: 10, color: "var(--red)" }}>{title}</div>
        <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 24 }}>{message}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 1, transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-md)"; e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)";    e.currentTarget.style.color = "var(--text-dim)"; }}
          >
            CANCEL
          </button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onConfirm}
            style={{ flex: 1, padding: "10px", background: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 1 }}
          >
            CONFIRM
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Saved toast ──────────────────────────────────
function SavedToast({ message }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, x: "-50%" }}
      animate={{ opacity: 1, y:  0, x: "-50%" }}
      exit={{    opacity: 0, y: 20, x: "-50%" }}
      style={{
        position:     "fixed",
        bottom:       32,
        left:         "50%",
        background:   "var(--surface2)",
        border:       "1px solid var(--success)",
        borderRadius: "var(--radius-md)",
        padding:      "10px 20px",
        zIndex:       900,
        display:      "flex",
        alignItems:   "center",
        gap:          8,
        boxShadow:    "0 4px 20px rgba(34,197,94,0.2)",
        whiteSpace:   "nowrap",
      }}
    >
      <span style={{ color: "var(--success)", fontSize: 14 }}>✓</span>
      <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--text)" }}>{message}</span>
    </motion.div>
  );
}

// ─── Main Profile Page ────────────────────────────
export default function Profile() {
  const navigate = useNavigate();

  // Profile state
  const [profile, setProfile] = useState({
    name:        "Alex Kinetic",
    email:       "alex@kaifitness.io",
    age:         25,
    height:      175,
    weight:      80.4,
    goal:        78,
    fitnessGoal: "cut",
  });

  // Hardware settings
  const [defaultCam,   setDefaultCam]   = useState("product");
  const [boxAIP,       setBoxAIP]       = useState("192.168.1.42");
  const [boxBPort,     setBoxBPort]     = useState("8080");
  const [streamPort,   setStreamPort]   = useState("81");
  const [ultrasonicOn, setUltrasonicOn] = useState(true);
  const [autoDetect,   setAutoDetect]   = useState(true);

  // Preferences
  const [units,         setUnits]         = useState("metric");
  const [notifications, setNotifications] = useState(true);
  const [soundFeedback, setSoundFeedback] = useState(true);
  const [autoStartCam,  setAutoStartCam]  = useState(false);
  const [repCountBeep,  setRepCountBeep]  = useState(true);
  const [restTimer,     setRestTimer]     = useState(true);

  // Modals
  const [calibOpen,  setCalibOpen]  = useState(false);
  const [editOpen,   setEditOpen]   = useState(false);
  const [dangerModal,setDangerModal] = useState(null); // { title, message, onConfirm }
  const [toast,      setToast]      = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSaveProfile = (newProfile) => {
    setProfile(newProfile);
    showToast("Profile saved successfully");
  };

  const handleSaveHardware = () => showToast("Hardware config saved");
  const handleSavePrefs    = () => showToast("Preferences saved");

  // Computed BMR
  const bmr = Math.round(10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5);

  const goalLabels = { cut: "🔥 Lose Weight", bulk: "💪 Build Muscle", maintain: "⚖️ Maintain", endure: "🏃 Endurance" };

  return (
    <div style={{ padding: "28px 32px" }}>

      {/* ── Profile Hero Card ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y:   0 }}
        transition={{ duration: 0.35 }}
        style={{
          marginBottom:   24,
          padding:        "24px 28px",
          background:     "var(--surface)",
          border:         "1px solid var(--border)",
          borderRadius:   "var(--radius-lg)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          gap:            20,
          position:       "relative",
          overflow:       "hidden",
          flexWrap:       "wrap",
        }}
      >
        {/* Red left bar */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "linear-gradient(to bottom, var(--red), transparent)" }} />

        {/* BG watermark */}
        <div style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", fontFamily: "var(--font-display)", fontSize: 80, color: "rgba(255,255,255,0.02)", letterSpacing: 8, pointerEvents: "none", userSelect: "none" }}>PROFILE</div>

        {/* Left: avatar + info */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <motion.div
            whileHover={{ scale: 1.05 }}
            style={{ width: 72, height: 72, background: "linear-gradient(135deg, var(--red-dim), var(--red))", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 24, border: "3px solid var(--border-red)", cursor: "pointer", flexShrink: 0 }}
            onClick={() => setEditOpen(true)}
          >
            {profile.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
          </motion.div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: 2, lineHeight: 1 }}>{profile.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 4 }}>{profile.email}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <span className="badge badge-red">{goalLabels[profile.fitnessGoal]}</span>
              <span className="badge badge-neutral">AGE {profile.age}</span>
              <span className="badge badge-neutral">{profile.height} cm</span>
              <span className="badge badge-neutral">BMR {bmr.toLocaleString()} kcal</span>
            </div>
          </div>
        </div>

        {/* Right: quick stats */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { label: "CURRENT",  val: `${profile.weight} kg`, color: "var(--red)"     },
            { label: "GOAL",     val: `${profile.goal} kg`,   color: "var(--warning)" },
            { label: "TO GO",    val: `${(profile.weight - profile.goal).toFixed(1)} kg`, color: "var(--success)" },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center", padding: "12px 16px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", minWidth: 80 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: s.color, letterSpacing: 1, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 4, letterSpacing: 0.5 }}>{s.label}</div>
            </div>
          ))}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setEditOpen(true)}
            style={{ padding: "10px 18px", background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 1.5, cursor: "pointer", transition: "all 0.2s", alignSelf: "center" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-red)"; e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)";     e.currentTarget.style.color = "var(--text-dim)"; }}
          >
            ✏️ EDIT PROFILE
          </motion.button>
        </div>
      </motion.div>

      {/* ── Settings grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Hardware Config */}
        <Section title="HARDWARE CONFIG" icon="🔧" delay={0.1}>
          {/* Default camera */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 1, marginBottom: 10 }}>DEFAULT CAMERA SOURCE</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { id: "product", label: "📦 Product Mode", desc: "ESP32-CAM (Box A)" },
                { id: "laptop",  label: "💻 Laptop Mode",  desc: "Built-in webcam"   },
              ].map((c) => (
                <div
                  key={c.id}
                  onClick={() => setDefaultCam(c.id)}
                  style={{ flex: 1, padding: "10px 12px", borderRadius: "var(--radius-md)", border: `1px solid ${defaultCam === c.id ? "var(--red)" : "var(--border)"}`, background: defaultCam === c.id ? "rgba(232,25,44,0.07)" : "var(--surface2)", cursor: "pointer", transition: "all 0.2s" }}
                >
                  <div style={{ fontSize: 12, fontWeight: defaultCam === c.id ? 600 : 400, color: defaultCam === c.id ? "var(--text)" : "var(--text-dim)", marginBottom: 3 }}>{c.label}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Box A IP */}
          <SettingRow label="Box A IP Address" desc="ESP32-CAM stream endpoint">
            <input
              className="input"
              value={boxAIP}
              onChange={(e) => setBoxAIP(e.target.value)}
              style={{ width: 148, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12 }}
            />
          </SettingRow>

          <SettingRow label="Stream Port" desc="ESP32-CAM MJPEG stream port">
            <input
              className="input"
              value={streamPort}
              onChange={(e) => setStreamPort(e.target.value)}
              style={{ width: 72, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12 }}
            />
          </SettingRow>

          <SettingRow label="Box B Port" desc="MPU6050 / Ultrasonic data port">
            <input
              className="input"
              value={boxBPort}
              onChange={(e) => setBoxBPort(e.target.value)}
              style={{ width: 72, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12 }}
            />
          </SettingRow>

          <SettingRow label="Ultrasonic Distance Alert" desc="Warn if user is too close or far from camera">
            <Toggle value={ultrasonicOn} onChange={setUltrasonicOn} />
          </SettingRow>

          <SettingRow label="Auto-detect Boxes" desc="Scan local network for KAI devices on startup">
            <Toggle value={autoDetect} onChange={setAutoDetect} />
          </SettingRow>

          {/* Calibrate */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: 1.5, color: "var(--text-dim)", marginBottom: 10 }}>BOX A — CALIBRATION</div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setCalibOpen(true)}
              style={{ width: "100%", padding: "10px", background: "transparent", border: "1px solid var(--border-red)", borderRadius: "var(--radius-sm)", color: "var(--red)", fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 2, cursor: "pointer", transition: "background 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(232,25,44,0.06)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              ⚡ CALIBRATE MPU6050 ZERO POINT
            </motion.button>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSaveHardware}
            style={{ marginTop: 12, width: "100%", padding: "10px", background: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 2, cursor: "pointer" }}
          >
            SAVE HARDWARE CONFIG
          </motion.button>
        </Section>

        {/* Preferences */}
        <Section title="USER PREFERENCES" icon="⚙️" delay={0.15}>
          {/* Units */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 1, marginBottom: 10 }}>MEASUREMENT UNITS</div>
            <div style={{ display: "flex", gap: 8 }}>
              {["metric", "imperial"].map((u) => (
                <button
                  key={u}
                  onClick={() => setUnits(u)}
                  style={{ flex: 1, padding: "9px", borderRadius: "var(--radius-sm)", border: `1px solid ${units === u ? "var(--red)" : "var(--border)"}`, background: units === u ? "rgba(232,25,44,0.08)" : "transparent", color: units === u ? "var(--red)" : "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1, transition: "all 0.2s" }}
                >
                  {u.toUpperCase()}
                  <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 3 }}>{u === "metric" ? "kg · cm" : "lbs · in"}</div>
                </button>
              ))}
            </div>
          </div>

          <SettingRow label="Workout Notifications" desc="Reminders, rep milestones, rest timers">
            <Toggle value={notifications} onChange={setNotifications} />
          </SettingRow>

          <SettingRow label="Audio Form Feedback" desc="Voice cues for form corrections during sets">
            <Toggle value={soundFeedback} onChange={setSoundFeedback} />
          </SettingRow>

          <SettingRow label="Rep Count Beep" desc="Audible beep on each completed rep">
            <Toggle value={repCountBeep} onChange={setRepCountBeep} />
          </SettingRow>

          <SettingRow label="Auto-start Camera" desc="Open camera feed when entering Workout page">
            <Toggle value={autoStartCam} onChange={setAutoStartCam} />
          </SettingRow>

          <SettingRow label="Rest Timer" desc="Auto-start countdown between sets">
            <Toggle value={restTimer} onChange={setRestTimer} />
          </SettingRow>

          {/* Theme */}
          <div style={{ paddingTop: 16, marginTop: 4, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 1, marginBottom: 10 }}>THEME</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { id: "dark",  label: "DARK",  preview: "#0D0D0F" },
                { id: "light", label: "LIGHT", preview: "#F5F5F7" },
                { id: "red",   label: "DEEP RED", preview: "#1a0508" },
              ].map((t) => (
                <div
                  key={t.id}
                  onClick={() => showToast(`${t.label} theme coming soon!`)}
                  style={{ flex: 1, padding: "10px 8px", borderRadius: "var(--radius-md)", border: `1px solid ${t.id === "dark" ? "var(--border-red)" : "var(--border)"}`, background: "var(--surface2)", cursor: "pointer", textAlign: "center", transition: "all 0.2s", display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-red)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = t.id === "dark" ? "var(--border-red)" : "var(--border)")}
                >
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: t.preview, border: "2px solid var(--border)", flexShrink: 0 }} />
                  <div style={{ fontSize: 9, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 0.5 }}>{t.label}</div>
                  {t.id === "dark" && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--red)" }} />}
                </div>
              ))}
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSavePrefs}
            style={{ marginTop: 16, width: "100%", padding: "10px", background: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 2, cursor: "pointer" }}
          >
            SAVE PREFERENCES
          </motion.button>
        </Section>
      </div>

      {/* ── App Info + Danger Zone ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* App Info */}
        <Section title="APP INFO" icon="ℹ️" delay={0.2}>
          {[
            { label: "App Version",     val: "KAI Fitness v1.0.0"     },
            { label: "AI Model",        val: "PoseNet / MediaPipe"     },
            { label: "Hardware SDK",    val: "ESP32-CAM · MPU6050"     },
            { label: "Build",           val: "2026.03.13 · production" },
            { label: "React",           val: "v19.2.4"                 },
            { label: "Three.js",        val: "r170"                    },
          ].map((i) => (
            <SettingRow key={i.label} label={i.label}>
              <span style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>{i.val}</span>
            </SettingRow>
          ))}

          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button
              onClick={() => showToast("Checking for updates...")}
              style={{ flex: 1, padding: "9px", background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 0.5, transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-md)"; e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)";    e.currentTarget.style.color = "var(--text-dim)"; }}
            >
              CHECK FOR UPDATES
            </button>
            <button
              onClick={() => showToast("Diagnostics report generated")}
              style={{ flex: 1, padding: "9px", background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 0.5, transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-md)"; e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)";    e.currentTarget.style.color = "var(--text-dim)"; }}
            >
              DIAGNOSTICS REPORT
            </button>
          </div>
        </Section>

        {/* Danger Zone */}
        <Section title="ACCOUNT" icon="🔐" delay={0.25}>
          <SettingRow
            label="Change Password"
            desc="Update your account password"
          >
            <button
              onClick={() => showToast("Password reset email sent")}
              style={{ padding: "6px 14px", background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 0.5, transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-md)"; e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)";    e.currentTarget.style.color = "var(--text-dim)"; }}
            >
              SEND RESET
            </button>
          </SettingRow>

          <SettingRow
            label="Export My Data"
            desc="Download all meals, workouts, and progress as CSV"
          >
            <button
              onClick={() => showToast("Data export started — check your email")}
              style={{ padding: "6px 14px", background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 0.5, transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-md)"; e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)";    e.currentTarget.style.color = "var(--text-dim)"; }}
            >
              EXPORT CSV
            </button>
          </SettingRow>

          <SettingRow
            label="Sign Out"
            desc="Sign out of your KAI Fitness account"
          >
            <button
              onClick={() => navigate("/login")}
              style={{ padding: "6px 14px", background: "transparent", border: "1px solid var(--border-red)", borderRadius: "var(--radius-sm)", color: "var(--red)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 0.5, transition: "all 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(232,25,44,0.07)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              SIGN OUT
            </button>
          </SettingRow>

          {/* Danger zone */}
          <div style={{ marginTop: 20, padding: 16, background: "rgba(232,25,44,0.04)", border: "1px solid rgba(232,25,44,0.2)", borderRadius: "var(--radius-md)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: 2, color: "var(--red)", marginBottom: 12 }}>DANGER ZONE</div>

            <SettingRow label="Reset All Progress Data" desc="Wipe all weight entries and photos" danger>
              <button
                onClick={() =>
                  setDangerModal({
                    title:     "RESET PROGRESS DATA",
                    message:   "This will permanently delete all weight entries, progress photos, and workout history. This cannot be undone.",
                    onConfirm: () => { setDangerModal(null); showToast("All progress data cleared"); },
                  })
                }
                style={{ padding: "6px 12px", background: "rgba(232,25,44,0.08)", border: "1px solid var(--border-red)", borderRadius: "var(--radius-sm)", color: "var(--red)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 0.5, transition: "all 0.2s" }}
              >
                RESET
              </button>
            </SettingRow>

            <SettingRow label="Delete Account" desc="Permanently remove all data and account" danger>
              <button
                onClick={() =>
                  setDangerModal({
                    title:     "DELETE ACCOUNT",
                    message:   "Your account and all associated data will be permanently deleted. This action is irreversible.",
                    onConfirm: () => { setDangerModal(null); navigate("/login"); },
                  })
                }
                style={{ padding: "6px 12px", background: "rgba(232,25,44,0.08)", border: "1px solid var(--border-red)", borderRadius: "var(--radius-sm)", color: "var(--red)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 0.5 }}
              >
                DELETE
              </button>
            </SettingRow>
          </div>
        </Section>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {calibOpen  && <CalibrationModal onClose={() => setCalibOpen(false)} />}
        {editOpen   && <EditProfileModal  profile={profile} onClose={() => setEditOpen(false)}  onSave={handleSaveProfile} />}
        {dangerModal && (
          <DangerModal
            title={dangerModal.title}
            message={dangerModal.message}
            onClose={() => setDangerModal(null)}
            onConfirm={dangerModal.onConfirm}
          />
        )}
        {toast && <SavedToast message={toast} />}
      </AnimatePresence>
    </div>
  );
}