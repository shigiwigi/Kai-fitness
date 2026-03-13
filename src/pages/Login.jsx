// ═══════════════════════════════════════════════
//   KAI FITNESS — Login.jsx
//   Place at: src/pages/Login.jsx
//   Real Firebase Auth + Firestore profile creation
// ═══════════════════════════════════════════════

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, calcBMR, calcTDEE, calcCalorieGoal } from "../context/AuthContext";

const GOAL_OPTIONS = [
  { id: "cut",      emoji: "🔥", label: "Lose Weight",   desc: "Caloric deficit + cardio"    },
  { id: "bulk",     emoji: "💪", label: "Build Muscle",  desc: "Surplus + strength training" },
  { id: "maintain", emoji: "⚖️", label: "Maintain",      desc: "Stay at current weight"      },
  { id: "endure",   emoji: "🏃", label: "Endurance",     desc: "Cardio & stamina focus"      },
];

const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "Sedentary",         desc: "Little or no exercise",  mult: 1.2   },
  { id: "light",     label: "Lightly Active",    desc: "1–3 days / week",        mult: 1.375 },
  { id: "moderate",  label: "Moderately Active", desc: "3–5 days / week",        mult: 1.55  },
  { id: "very",      label: "Very Active",        desc: "6–7 days / week",        mult: 1.725 },
];

const slide = {
  enter:  (d) => ({ opacity: 0, x: d > 0 ?  40 : -40 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.4,0,0.2,1] } },
  exit:   (d) => ({ opacity: 0, x: d > 0 ? -40 :  40, transition: { duration: 0.2 } }),
};

function Field({ label, type = "text", value, onChange, placeholder, unit, autoFocus, error }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 1 }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          style={{
            width: "100%",
            background: "var(--surface2)",
            border: `1px solid ${error ? "var(--red)" : "var(--border)"}`,
            borderRadius: "var(--radius-sm)",
            padding: unit ? "9px 44px 9px 12px" : "9px 12px",
            color: "var(--text)",
            fontFamily: "var(--font-body)",
            fontSize: 14,
            outline: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
          onFocus={(e) => { e.target.style.borderColor = "var(--border-red)"; e.target.style.boxShadow = "0 0 0 3px var(--red-glow-sm)"; }}
          onBlur={(e)  => { e.target.style.borderColor = error ? "var(--red)" : "var(--border)"; e.target.style.boxShadow = "none"; }}
        />
        {unit && (
          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", pointerEvents: "none" }}>
            {unit}
          </span>
        )}
      </div>
      {error && <div style={{ fontSize: 10, color: "var(--red)", fontFamily: "var(--font-mono)" }}>{error}</div>}
    </div>
  );
}

function StepDots({ current, total }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 28 }}>
      {Array.from({ length: total }).map((_, i) => (
        <motion.div key={i} animate={{ width: i === current ? 24 : 8, background: i <= current ? "var(--red)" : "var(--surface4)" }} transition={{ duration: 0.3 }} style={{ height: 4, borderRadius: 2 }} />
      ))}
    </div>
  );
}

export default function Login() {
  const navigate         = useNavigate();
  const { login, signup } = useAuth();

  const [mode,     setMode]     = useState("login");
  const [step,     setStep]     = useState(0);
  const [dir,      setDir]      = useState(1);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});
  const [fireErr,  setFireErr]  = useState("");

  // Auth fields
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");

  // Personal fields
  const [age,      setAge]      = useState("");
  const [weight,   setWeight]   = useState("");
  const [height,   setHeight]   = useState("");
  const [gender,   setGender]   = useState("male");
  const [units,    setUnits]    = useState("metric");
  const [activity, setActivity] = useState("moderate");
  const [goal,     setGoal]     = useState("cut");

  const profileData = { name, age, weight, height, gender, activityLevel: activity, fitnessGoal: goal, units };
  const bmr  = calcBMR(profileData);
  const tdee = calcTDEE(profileData);

  const goNext = () => { setDir(1);  setStep((s) => s + 1); };
  const goBack = () => { setDir(-1); setStep((s) => s - 1); };

  // ── STEP 0: Auth ──
  const handleAuth = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!email)                    errs.email    = "Required";
    if (!password || password.length < 6) errs.password = "Min 6 characters";
    if (mode === "signup" && !name) errs.name    = "Required";
    setErrors(errs);
    if (Object.keys(errs).length)  return;

    setLoading(true);
    setFireErr("");
    try {
      if (mode === "login") {
        await login(email, password);
        navigate("/");
      } else {
        goNext(); // go to personal info first
      }
    } catch (err) {
      const msg = err.code === "auth/user-not-found"    ? "No account found with this email."
                : err.code === "auth/wrong-password"    ? "Incorrect password."
                : err.code === "auth/email-already-in-use" ? "Email already in use."
                : err.code === "auth/invalid-email"     ? "Invalid email address."
                : err.message;
      setFireErr(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 1: Personal info ──
  const handlePersonal = (e) => {
    e.preventDefault();
    const errs = {};
    if (!age    || age    <= 0) errs.age    = "Required";
    if (!weight || weight <= 0) errs.weight = "Required";
    if (!height || height <= 0) errs.height = "Required";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    goNext();
  };

  // ── STEP 2: Goals ──
  const handleFinishSignup = async () => {
    setLoading(true);
    setFireErr("");
    try {
      await signup(email, password, profileData);
      goNext(); // done screen
    } catch (err) {
      const msg = err.code === "auth/email-already-in-use" ? "Email already in use." : err.message;
      setFireErr(msg);
      setStep(0); // back to auth
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 3: Done ──
  const handleEnter = () => navigate("/");

  const fireErrLabel = (code) => {
    const map = {
      "auth/user-not-found":     "No account found.",
      "auth/wrong-password":     "Wrong password.",
      "auth/email-already-in-use": "Email in use.",
      "auth/invalid-email":      "Invalid email.",
      "auth/too-many-requests":  "Too many attempts. Try later.",
    };
    return map[code] || "Something went wrong. Try again.";
  };

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>

      {/* BG geometry */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.03 }}>
          <defs><pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="1"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(232,25,44,0.08) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: -120, left: -80,  width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(232,25,44,0.05) 0%, transparent 70%)" }} />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y:  0 }}
        transition={{ duration: 0.45, ease: [0.4,0,0.2,1] }}
        style={{ width: "100%", maxWidth: 460, background: "var(--surface)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-xl)", padding: "36px 36px 32px", boxShadow: "var(--shadow-lg)", position: "relative", overflow: "hidden", zIndex: 1 }}
      >
        {/* Top accent */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(to right, var(--red), var(--red-dim), transparent)" }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32, justifyContent: "center" }}>
          <motion.div
            animate={{ boxShadow: ["0 0 0 0 rgba(232,25,44,0)","0 0 20px 6px rgba(232,25,44,0.25)","0 0 0 0 rgba(232,25,44,0)"] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ width: 44, height: 44, background: "var(--red)", clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 16, color: "#fff" }}
          >K</motion.div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 26, letterSpacing: 4 }}>
            K<span style={{ color: "var(--red)" }}>AI</span>{" "}<span style={{ color: "var(--text-dim)", fontSize: 18 }}>FITNESS</span>
          </div>
        </div>

        {mode === "signup" && step > 0 && <StepDots current={step - 1} total={3} />}

        <AnimatePresence mode="wait" custom={dir}>

          {/* ── STEP 0: Auth ── */}
          {step === 0 && (
            <motion.div key="auth" custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 24, letterSpacing: 2, marginBottom: 6 }}>
                  {mode === "login" ? "WELCOME BACK" : "CREATE ACCOUNT"}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
                  {mode === "login" ? "Sign in to your KAI Fitness account" : "Start your kinetic journey today"}
                </div>
              </div>

              <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {mode === "signup" && (
                  <Field label="FULL NAME" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Kinetic" autoFocus error={errors.name} />
                )}
                <Field label="EMAIL" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@kaifitness.io" autoFocus={mode === "login"} error={errors.email} />
                <Field label="PASSWORD" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" error={errors.password} />

                {mode === "login" && (
                  <div style={{ textAlign: "right", marginTop: -4 }}>
                    <span style={{ fontSize: 11, color: "var(--red)", cursor: "pointer", fontFamily: "var(--font-mono)" }}>FORGOT PASSWORD?</span>
                  </div>
                )}

                {fireErr && (
                  <div style={{ padding: "9px 12px", background: "rgba(232,25,44,0.07)", border: "1px solid var(--border-red)", borderRadius: "var(--radius-sm)", fontSize: 12, color: "var(--red)", fontFamily: "var(--font-mono)" }}>
                    {fireErr}
                  </div>
                )}

                <motion.button type="submit" whileTap={{ scale: 0.97 }} disabled={loading}
                  style={{ marginTop: 6, padding: "11px", background: loading ? "var(--red-dim)" : "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 2, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {loading ? <div className="spinner" style={{ width: 18, height: 18 }} /> : mode === "login" ? "SIGN IN" : "CONTINUE"}
                </motion.button>
              </form>

              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>OR</span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>

              <div style={{ textAlign: "center", fontSize: 13, color: "var(--text-dim)" }}>
                {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErrors({}); setFireErr(""); }} style={{ color: "var(--red)", cursor: "pointer", fontWeight: 600 }}>
                  {mode === "login" ? "Sign up" : "Sign in"}
                </span>
              </div>
            </motion.div>
          )}

          {/* ── STEP 1: Personal ── */}
          {step === 1 && (
            <motion.div key="personal" custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 2, marginBottom: 4 }}>PERSONAL INFO</div>
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>We'll calculate your BMR & calorie target</div>
              </div>

              {/* Unit toggle */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {["metric","imperial"].map((u) => (
                  <button key={u} onClick={() => setUnits(u)} style={{ flex: 1, padding: "7px", borderRadius: "var(--radius-sm)", border: `1px solid ${units === u ? "var(--red)" : "var(--border)"}`, background: units === u ? "rgba(232,25,44,0.08)" : "transparent", color: units === u ? "var(--red)" : "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1, transition: "all 0.2s" }}>
                    {u.toUpperCase()}
                  </button>
                ))}
              </div>

              <form onSubmit={handlePersonal} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Gender */}
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 1, marginBottom: 6 }}>BIOLOGICAL SEX</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["male","female"].map((g) => (
                      <button key={g} type="button" onClick={() => setGender(g)} style={{ flex: 1, padding: "8px", borderRadius: "var(--radius-sm)", border: `1px solid ${gender === g ? "var(--red)" : "var(--border)"}`, background: gender === g ? "rgba(232,25,44,0.08)" : "var(--surface2)", color: gender === g ? "var(--red)" : "var(--text-dim)", cursor: "pointer", fontSize: 13, transition: "all 0.2s", textTransform: "capitalize" }}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <Field label="AGE" type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="25" unit="yrs" error={errors.age} />
                  <Field label="WEIGHT" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={units === "metric" ? "75" : "165"} unit={units === "metric" ? "kg" : "lbs"} error={errors.weight} />
                  <Field label="HEIGHT" type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder={units === "metric" ? "175" : "69"} unit={units === "metric" ? "cm" : "in"} error={errors.height} />
                </div>

                {/* Activity */}
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 1, marginBottom: 6 }}>ACTIVITY LEVEL</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {ACTIVITY_LEVELS.map((a) => (
                      <div key={a.id} onClick={() => setActivity(a.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: `1px solid ${activity === a.id ? "var(--border-red)" : "var(--border)"}`, background: activity === a.id ? "rgba(232,25,44,0.06)" : "var(--surface2)", cursor: "pointer", transition: "all 0.2s" }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: activity === a.id ? 600 : 400, color: activity === a.id ? "var(--text)" : "var(--text-dim)" }}>{a.label}</div>
                          <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 1 }}>{a.desc}</div>
                        </div>
                        <div style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${activity === a.id ? "var(--red)" : "var(--surface4)"}`, background: activity === a.id ? "var(--red)" : "transparent", flexShrink: 0, transition: "all 0.2s" }} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* BMR preview */}
                {bmr > 0 && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    style={{ padding: 10, background: "rgba(232,25,44,0.05)", border: "1px solid var(--border-red)", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-around" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--red)", letterSpacing: 1 }}>{bmr.toLocaleString()}</div>
                      <div style={{ fontSize: 9, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 1 }}>BMR kcal</div>
                    </div>
                    <div style={{ width: 1, background: "var(--border)" }} />
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--warning)", letterSpacing: 1 }}>{tdee.toLocaleString()}</div>
                      <div style={{ fontSize: 9, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 1 }}>TDEE kcal</div>
                    </div>
                  </motion.div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button type="button" onClick={goBack} style={{ flex: 1, padding: "9px", background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 1 }}>BACK</button>
                  <motion.button type="submit" whileTap={{ scale: 0.97 }} style={{ flex: 2, padding: "9px", background: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 2, cursor: "pointer" }}>NEXT →</motion.button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ── STEP 2: Goals ── */}
          {step === 2 && (
            <motion.div key="goals" custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 2, marginBottom: 4 }}>YOUR GOAL</div>
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Sets your default calorie target</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                {GOAL_OPTIONS.map((g) => (
                  <motion.div key={g.id} whileTap={{ scale: 0.97 }} onClick={() => setGoal(g.id)}
                    style={{ padding: 14, borderRadius: "var(--radius-md)", border: `1px solid ${goal === g.id ? "var(--red)" : "var(--border)"}`, background: goal === g.id ? "rgba(232,25,44,0.07)" : "var(--surface2)", cursor: "pointer", textAlign: "center", transition: "all 0.2s", position: "relative" }}>
                    {goal === g.id && <div style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: "50%", background: "var(--red)" }} />}
                    <div style={{ fontSize: 26, marginBottom: 6 }}>{g.emoji}</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 1, color: goal === g.id ? "var(--text)" : "var(--text-dim)", marginBottom: 3 }}>{g.label}</div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{g.desc}</div>
                  </motion.div>
                ))}
              </div>

              {bmr > 0 && (
                <div style={{ padding: 10, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>🎯</span>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginBottom: 2 }}>DAILY CALORIE TARGET</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--red)", letterSpacing: 1 }}>
                      {calcCalorieGoal({ ...profileData, fitnessGoal: goal }).toLocaleString()}
                      <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-body)", marginLeft: 4 }}>kcal/day</span>
                    </div>
                  </div>
                </div>
              )}

              {fireErr && (
                <div style={{ marginBottom: 12, padding: "9px 12px", background: "rgba(232,25,44,0.07)", border: "1px solid var(--border-red)", borderRadius: "var(--radius-sm)", fontSize: 12, color: "var(--red)", fontFamily: "var(--font-mono)" }}>{fireErr}</div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={goBack} style={{ flex: 1, padding: "9px", background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 1 }}>BACK</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleFinishSignup} disabled={loading}
                  style={{ flex: 2, padding: "9px", background: loading ? "var(--red-dim)" : "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 2, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {loading ? <div className="spinner" style={{ width: 16, height: 16 }} /> : "CREATE ACCOUNT →"}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: Done ── */}
          {step === 3 && (
            <motion.div key="done" custom={dir} variants={slide} initial="enter" animate="center" exit="exit" style={{ textAlign: "center", padding: "8px 0" }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 14 }}
                style={{ width: 68, height: 68, borderRadius: "50%", background: "rgba(34,197,94,0.1)", border: "2px solid var(--success)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, margin: "0 auto 20px", color: "var(--success)" }}>
                ✓
              </motion.div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 26, letterSpacing: 2, marginBottom: 6 }}>YOU'RE ALL SET!</div>
              <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 24, lineHeight: 1.6 }}>Profile saved. Time to start your kinetic journey.</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 24, padding: 14, background: "var(--surface2)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                {[
                  { label: "BMR",  val: `${calcBMR(profileData).toLocaleString()} kcal`, color: "var(--red)" },
                  { label: "TDEE", val: `${calcTDEE(profileData).toLocaleString()} kcal`, color: "var(--warning)" },
                  { label: "GOAL", val: GOAL_OPTIONS.find((g) => g.id === goal)?.emoji ?? "🎯", color: "var(--success)" },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: s.color, letterSpacing: 0.5 }}>{s.val}</div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <motion.button whileTap={{ scale: 0.97 }} onClick={handleEnter}
                style={{ width: "100%", padding: "11px", background: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 15, letterSpacing: 3, cursor: "pointer" }}>
                ENTER KAI FITNESS →
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}