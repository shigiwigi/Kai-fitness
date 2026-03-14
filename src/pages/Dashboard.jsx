// ═══════════════════════════════════════════════
//   KAI FITNESS — Dashboard.jsx
//   Place at: src/pages/Dashboard.jsx
//   100% real Firestore data · Fully responsive
// ═══════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection, query, where, orderBy,
  onSnapshot, limit, Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

// ─── Helpers ─────────────────────────────────────
const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(d);
};
const fmtDate = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};
const fmtTime = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

// ─── Streak calculator ────────────────────────────
function calcStreak(workouts) {
  if (!workouts.length) return 0;
  const days = new Set(
    workouts.map((w) => {
      const d = w.createdAt?.toDate ? w.createdAt.toDate() : new Date();
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );
  let streak = 0;
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  if (!days.has(day.getTime())) {
    day.setDate(day.getDate() - 1);
    if (!days.has(day.getTime())) return 0;
    streak = 1;
    day.setDate(day.getDate() - 1);
  }
  while (days.has(day.getTime())) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

// ─── Animated counter ─────────────────────────────
function AnimCounter({ target, decimals = 0, duration = 1000 }) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    if (target === prev.current) return;
    const from = prev.current;
    prev.current = target;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(parseFloat((from + e * (target - from)).toFixed(decimals)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, decimals, duration]);
  return <>{decimals > 0 ? val.toFixed(decimals) : Math.floor(val).toLocaleString()}</>;
}

// ─── Sparkline ─────────────────────────────────────
function Sparkline({ data, color = "var(--red)" }) {
  if (!data || data.length < 2) return (
    <div style={{ height: 44, marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>no data yet</span>
    </div>
  );
  const w = 200, h = 44;
  const min = Math.min(...data), max = Math.max(...data);
  const rng = max - min || 0.1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / rng) * (h - 8) - 4;
    return `${x},${y}`;
  }).join(" ");
  const fill = `${pts} ${w},${h} 0,${h}`;
  const id = `sg${color.replace(/[^a-z]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"
      style={{ width: "100%", height: 44, marginTop: 12 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0"   />
        </linearGradient>
      </defs>
      <polygon points={fill} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── SVG Ring ──────────────────────────────────────
function Ring({ pct, color = "var(--red)", size = 52 }) {
  const r = 20, circ = 2 * Math.PI * r;
  const [anim, setAnim] = useState(0);
  useEffect(() => { const t = setTimeout(() => setAnim(pct), 500); return () => clearTimeout(t); }, [pct]);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 48 48" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--surface3)" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ - (anim / 100) * circ}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontFamily: "var(--font-display)", fontSize: size < 52 ? 11 : 13, letterSpacing: 0.5 }}>
        {pct}%
      </div>
    </div>
  );
}

// ─── Section Header ────────────────────────────────
function SectionHeader({ title }) {
  return (
    <div className="section-header">
      <div className="section-title">{title}</div>
      <div className="section-line" />
    </div>
  );
}

// ─── Skeleton loader ───────────────────────────────
function SkeletonBlock({ w = "100%", h = 20, radius = 4 }) {
  return (
    <div style={{ width: w, height: h, borderRadius: radius, background: "var(--surface3)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)", animation: "shimmer 1.6s infinite" }} />
    </div>
  );
}

// ═══════════════════════════════════════════════
//  MAIN DASHBOARD
// ═══════════════════════════════════════════════
export default function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [todayMeals,     setTodayMeals]     = useState([]);
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [allWorkouts,    setAllWorkouts]    = useState([]);
  const [weightLog,      setWeightLog]      = useState([]);
  const [feedFilter,     setFeedFilter]     = useState("all");
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    let resolved = 0;
    const done = () => { resolved++; if (resolved >= 3) setLoading(false); };

    const mealQ = query(collection(db, "users", uid, "meals"), where("createdAt", ">=", todayStart()), orderBy("createdAt", "desc"));
    const unsubMeals = onSnapshot(mealQ, (s) => { setTodayMeals(s.docs.map((d) => ({ id: d.id, ...d.data() }))); done(); }, (e) => { console.error(e); done(); });

    const workoutQ = query(collection(db, "users", uid, "workouts"), orderBy("createdAt", "desc"), limit(30));
    const unsubWorkouts = onSnapshot(workoutQ, (s) => {
      const data = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRecentWorkouts(data.slice(0, 5));
      setAllWorkouts(data);
      done();
    }, (e) => { console.error(e); done(); });

    const weightQ = query(collection(db, "users", uid, "weightLog"), orderBy("createdAt", "asc"), limit(14));
    const unsubWeight = onSnapshot(weightQ, (s) => { setWeightLog(s.docs.map((d) => ({ id: d.id, ...d.data() }))); done(); }, (e) => { console.error(e); done(); });

    return () => { unsubMeals(); unsubWorkouts(); unsubWeight(); };
  }, [currentUser]);

  // ── Derived values ──
  const profile      = userProfile || {};
  const goalCal      = profile.calorieGoal || 2400;
  const goalProtein  = profile.proteinGoal || 160;
  const goalCarbs    = profile.carbGoal    || 280;
  const goalFat      = profile.fatGoal     || 70;
  const goalWeight   = profile.goalWeight  || 78;
  const displayName  = profile.name || currentUser?.email?.split("@")[0] || "Athlete";
  const firstName    = displayName.split(" ")[0].toUpperCase();
  const lastName     = displayName.split(" ").slice(1).join(" ").toUpperCase() || "";

  const todayTotals = todayMeals.reduce(
    (a, m) => ({ cal: a.cal + (m.cal || 0), protein: a.protein + (m.protein || 0), carbs: a.carbs + (m.carbs || 0), fat: a.fat + (m.fat || 0) }),
    { cal: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const calPct       = Math.min(100, Math.round((todayTotals.cal / goalCal) * 100));
  const calRemaining = Math.max(0, goalCal - todayTotals.cal);

  const currentWeight   = weightLog.length > 0 ? weightLog[weightLog.length - 1].weight : profile.weight || null;
  const weightSparkData = weightLog.map((e) => e.weight);
  const weightDelta     = weightLog.length > 1 ? (weightLog[weightLog.length - 1].weight - weightLog[weightLog.length - 2].weight).toFixed(1) : null;

  const macroProteinPct = Math.min(100, Math.round((todayTotals.protein / goalProtein) * 100));
  const macroCarbsPct   = Math.min(100, Math.round((todayTotals.carbs   / goalCarbs)   * 100));
  const macroFatPct     = Math.min(100, Math.round((todayTotals.fat     / goalFat)     * 100));

  const lastWorkout = recentWorkouts[0] || null;
  const streak      = calcStreak(allWorkouts);

  const weekAgo      = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekWorkouts = allWorkouts.filter((w) => { const d = w.createdAt?.toDate ? w.createdAt.toDate() : null; return d && d >= weekAgo; });
  const weekReps     = weekWorkouts.reduce((a, w) => a + (w.reps || 0), 0);
  const weekSets     = weekWorkouts.reduce((a, w) => a + (w.sets || 0), 0);
  const weekAvgForm  = weekWorkouts.length ? Math.round(weekWorkouts.reduce((a, w) => a + (w.formScore || 0), 0) / weekWorkouts.length) : null;

  const feedItems = [
    ...todayMeals.map((m) => ({
      type: "meal", icon: m.type === "breakfast" ? "🍳" : m.type === "lunch" ? "🥗" : m.type === "snack" ? "🍌" : "🍽️",
      name: m.name, meta: `Today · ${m.time || fmtTime(m.createdAt)}`,
      val: m.cal, unit: "kcal", feedType: m.type, createdAt: m.createdAt,
    })),
    ...recentWorkouts.map((w) => ({
      type: "workout", icon: "🏋️",
      name: `${w.type ? w.type.charAt(0).toUpperCase() + w.type.slice(1) : "Workout"} Session`,
      meta: w.createdAt ? fmtDate(w.createdAt) : "Recent",
      val: w.reps || 0, unit: "reps", feedType: "workout", createdAt: w.createdAt,
    })),
    ...(weightLog.length > 0 ? [{
      type: "weight", icon: "⚖️", name: "Weight Log",
      meta: weightLog[weightLog.length - 1]?.createdAt ? `Today · ${fmtTime(weightLog[weightLog.length - 1].createdAt)}` : "Recent",
      val: currentWeight, unit: "kg", feedType: "weight",
      createdAt: weightLog[weightLog.length - 1]?.createdAt,
    }] : []),
  ].sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));

  const filteredFeed = feedFilter === "all" ? feedItems : feedItems.filter((f) => f.feedType === feedFilter || f.type === feedFilter);

  return (
    <div className="page-content">

      {/* ── Greeting Band ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, flexWrap: "wrap",
          marginBottom: 22, padding: "16px 20px",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)", position: "relative", overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "linear-gradient(to bottom, var(--red), transparent)" }} />
        <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontFamily: "var(--font-display)", fontSize: "clamp(40px, 8vw, 100px)", color: "rgba(255,255,255,0.02)", letterSpacing: 10, pointerEvents: "none", userSelect: "none" }}>KAI</div>

        {/* Name — scales down on small screens */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 2 }}>Welcome back,</div>
          {loading ? <SkeletonBlock w={180} h={32} /> : (
            <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px, 5vw, 36px)", letterSpacing: 2, lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "50vw" }}>
              {firstName}{lastName ? " " : ""}
              <span style={{ color: "var(--red)" }}>{lastName}</span>
            </div>
          )}
        </div>

        {/* Streak — compact on mobile */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface2)", border: "1px solid var(--border)", padding: "10px 14px", borderRadius: "var(--radius-md)", flexShrink: 0 }}>
          {loading ? <SkeletonBlock w={80} h={38} /> : streak > 0 ? (
            <>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 6vw, 42px)", color: "var(--red)", lineHeight: 1 }}>
                <AnimCounter target={streak} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.3 }}>DAY STREAK</div>
                <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 1 }}>🔥 Keep it going!</div>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 6vw, 42px)", color: "var(--text-muted)", lineHeight: 1 }}>0</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)" }}>NO STREAK</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>Log a workout to start!</div>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* ── Today's Snapshot ── */}
      <SectionHeader title="TODAY'S SNAPSHOT" />

      {/* On mobile: stack all 3 cards. On tablet+: 3 columns */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 14,
        marginBottom: 22,
      }}>

        {/* Calories card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          onClick={() => navigate("/nutrition")}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 16, cursor: "pointer" }}
          whileHover={{ y: -2, borderColor: "var(--border-red)", boxShadow: "0 8px 32px var(--red-glow)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: "var(--radius-sm)", background: "var(--surface3)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🔥</div>
            <span className={`badge ${calPct >= 100 ? "badge-green" : calPct >= 50 ? "badge-neutral" : "badge-red"}`}>
              {calPct}% of goal
            </span>
          </div>
          {loading ? <SkeletonBlock w="60%" h={40} radius={6} /> : (
            <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px,6vw,44px)", lineHeight: 1, letterSpacing: 1 }}>
              <AnimCounter target={todayTotals.cal} />
              <span style={{ fontSize: 13, color: "var(--text-dim)", fontFamily: "var(--font-body)", marginLeft: 4 }}>kcal</span>
            </div>
          )}
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 5 }}>
            {loading ? <SkeletonBlock w="80%" h={12} /> : `Daily Calories · Goal ${goalCal.toLocaleString()} kcal`}
          </div>
          {!loading && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginBottom: 5 }}>
                <span>{todayTotals.cal.toLocaleString()} eaten</span>
                <span>Goal {goalCal.toLocaleString()}</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${calPct}%`, background: calPct >= 100 ? "var(--success)" : "var(--red)" }} />
              </div>
              <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 5 }}>
                {calRemaining.toLocaleString()} kcal remaining
              </div>
            </div>
          )}
        </motion.div>

        {/* Weight card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          onClick={() => navigate("/progress")}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 16, cursor: "pointer" }}
          whileHover={{ y: -2, borderColor: "var(--border-red)", boxShadow: "0 8px 32px var(--red-glow)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: "var(--radius-sm)", background: "var(--surface3)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>⚖️</div>
            {!loading && weightDelta !== null && (
              <span className={`badge ${weightDelta < 0 ? "badge-green" : "badge-red"}`}>
                {weightDelta < 0 ? "▼" : "▲"} {Math.abs(weightDelta)} kg
              </span>
            )}
          </div>
          {loading ? <SkeletonBlock w="55%" h={40} radius={6} /> : currentWeight ? (
            <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px,6vw,44px)", lineHeight: 1, letterSpacing: 1 }}>
              {currentWeight}
              <span style={{ fontSize: 13, color: "var(--text-dim)", fontFamily: "var(--font-body)", marginLeft: 4 }}>kg</span>
            </div>
          ) : (
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--text-muted)", lineHeight: 1 }}>No data</div>
          )}
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 5 }}>
            {loading ? <SkeletonBlock w="70%" h={12} /> : `Current Weight · Goal ${goalWeight} kg`}
          </div>
          <Sparkline data={weightSparkData} />
        </motion.div>

        {/* Last Workout card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          onClick={() => navigate("/workout")}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 16, cursor: "pointer" }}
          whileHover={{ y: -2, borderColor: "var(--border-red)", boxShadow: "0 8px 32px var(--red-glow)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: "var(--radius-sm)", background: "var(--surface3)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🏋️</div>
            <span className="badge badge-neutral" style={{ textAlign: "right", maxWidth: 120, whiteSpace: "normal", lineHeight: 1.3 }}>
              {loading ? "..." : lastWorkout?.createdAt ? fmtDate(lastWorkout.createdAt) : "No session yet"}
            </span>
          </div>
          {loading ? <SkeletonBlock w="50%" h={40} radius={6} /> : lastWorkout ? (
            <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px,6vw,44px)", lineHeight: 1, letterSpacing: 1 }}>
              <AnimCounter target={lastWorkout.reps || 0} />
              <span style={{ fontSize: 13, color: "var(--text-dim)", fontFamily: "var(--font-body)", marginLeft: 4 }}>reps</span>
            </div>
          ) : (
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--text-muted)", lineHeight: 1 }}>No data</div>
          )}
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 5 }}>
            {loading ? <SkeletonBlock w="80%" h={12} /> :
              lastWorkout
                ? `Last Session · ${lastWorkout.type ? lastWorkout.type.charAt(0).toUpperCase() + lastWorkout.type.slice(1) : "Workout"} · ${lastWorkout.sets || 0} sets`
                : "No workouts logged yet"
            }
          </div>
          {!loading && lastWorkout?.formScore > 0 && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
              <Ring pct={lastWorkout.formScore} size={44} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>Form Score</div>
                <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 1 }}>
                  {lastWorkout.formScore >= 85 ? "Excellent" : lastWorkout.formScore >= 70 ? "Good" : "Needs work"}
                </div>
              </div>
            </div>
          )}
          {!loading && !lastWorkout && (
            <div style={{ marginTop: 12, padding: "8px 10px", background: "rgba(232,25,44,0.05)", border: "1px solid var(--border-red)", borderRadius: "var(--radius-sm)", fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
              → Head to Workout to log your first session
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Macros + Device + Feed ── */}
      {/* Desktop: [macros+device | feed]. Mobile: all stacked */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 14,
        marginBottom: 22,
      }}>

        {/* Left col: Macros + Device */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Macros */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 16 }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 15, letterSpacing: 2, color: "var(--text-dim)", marginBottom: 14 }}>TODAY'S MACROS</div>
            {loading ? (
              <div style={{ display: "flex", gap: 16, justifyContent: "space-around" }}>
                {[1,2,3].map((i) => <SkeletonBlock key={i} w={64} h={64} radius={32} />)}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 12, justifyContent: "space-around", flexWrap: "wrap" }}>
                {[
                  { label: "Protein", val: todayTotals.protein, goal: goalProtein, pct: macroProteinPct, color: "var(--red)",     unit: "g" },
                  { label: "Carbs",   val: todayTotals.carbs,   goal: goalCarbs,   pct: macroCarbsPct,   color: "var(--warning)", unit: "g" },
                  { label: "Fat",     val: todayTotals.fat,     goal: goalFat,     pct: macroFatPct,     color: "var(--info)",    unit: "g" },
                ].map((m) => (
                  <div key={m.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <Ring pct={m.pct} color={m.color} size={52} />
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 1 }}>{m.val}{m.unit}</div>
                      <div style={{ fontSize: 9, color: "var(--text-dim)", marginTop: 1 }}>{m.label}</div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>/ {m.goal}{m.unit}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!loading && todayMeals.length === 0 && (
              <div style={{ marginTop: 10, padding: "7px 10px", background: "var(--surface2)", borderRadius: "var(--radius-sm)", fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)", textAlign: "center" }}>
                No meals logged today — tap Nutrition to start tracking
              </div>
            )}
          </motion.div>

          {/* Device Status */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 16 }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 15, letterSpacing: 2, color: "var(--text-dim)", marginBottom: 12 }}>DEVICE STATUS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { name: "KAI SENSE",    desc: `ESP32-CAM · ${profile.boxAIP || "192.168.1.42"}:${profile.streamPort || "81"}`, online: false, badge: "HARDWARE PENDING" },
                { name: "KAI CORE",     desc: `MPU6050 · Port ${profile.boxBPort || "8080"}`, online: false, badge: "HARDWARE PENDING" },
                { name: "Device Camera",desc: `Default cam · ${profile.defaultCam === "laptop" ? "Selected" : "Standby"}`, online: profile.defaultCam !== "product", badge: profile.defaultCam === "laptop" ? "ACTIVE" : "STANDBY" },
              ].map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-red)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{ width: 9, height: 9, borderRadius: "50%", background: d.online ? "var(--success)" : "var(--text-muted)" }} />
                    {d.online && <div style={{ position: "absolute", top: -3, left: -3, width: 15, height: 15, borderRadius: "50%", background: "rgba(34,197,94,0.25)", animation: "ping 2s infinite" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{d.name}</div>
                    <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.desc}</div>
                  </div>
                  <span className={`badge ${d.online ? "badge-green" : "badge-neutral"}`} style={{ fontSize: 8, flexShrink: 0 }}>{d.badge}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 16, display: "flex", flexDirection: "column", minHeight: 300 }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 15, letterSpacing: 2, color: "var(--text-dim)" }}>ACTIVITY FEED</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {["all", "meal", "workout", "weight"].map((f) => (
                <button key={f} onClick={() => setFeedFilter(f)}
                  style={{ fontSize: 9, padding: "3px 7px", borderRadius: "var(--radius-sm)", border: `1px solid ${feedFilter === f ? "var(--red)" : "var(--border)"}`, background: feedFilter === f ? "rgba(232,25,44,0.06)" : "transparent", color: feedFilter === f ? "var(--red)" : "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-mono)", transition: "all 0.2s" }}>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 7 }}>
            {loading ? (
              [1,2,3,4].map((i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "10px", background: "var(--surface2)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                  <SkeletonBlock w={34} h={34} radius={8} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                    <SkeletonBlock w="60%" h={12} />
                    <SkeletonBlock w="40%" h={10} />
                  </div>
                </div>
              ))
            ) : filteredFeed.length === 0 ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)", textAlign: "center", padding: "20px 0", gap: 8 }}>
                <span style={{ fontSize: 28 }}>📭</span>
                {feedFilter === "all" ? "No activity today yet" : `No ${feedFilter} entries today`}
              </div>
            ) : (
              <AnimatePresence>
                {filteredFeed.map((item, i) => (
                  <motion.div key={`${item.type}-${i}`}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2, delay: i * 0.04 }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", cursor: "pointer", transition: "all 0.2s" }}
                    whileHover={{ x: 3, borderColor: "var(--border-red)" }}
                    onClick={() => navigate(item.type === "meal" ? "/nutrition" : item.type === "workout" ? "/workout" : "/progress")}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0, background: item.type === "meal" ? "rgba(245,158,11,0.1)" : item.type === "workout" ? "rgba(232,25,44,0.1)" : "rgba(99,102,241,0.1)", border: item.type === "meal" ? "1px solid rgba(245,158,11,0.2)" : item.type === "workout" ? "1px solid var(--border-red)" : "1px solid rgba(99,102,241,0.2)" }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                      <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 1 }}>{item.meta}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 15, letterSpacing: 1 }}>{item.val}</div>
                      <div style={{ fontSize: 9, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>{item.unit}</div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Weekly Stats ── */}
      <SectionHeader title="THIS WEEK" />
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 12,
      }}>
        {loading ? (
          [1,2,3,4].map((i) => (
            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 14 }}>
              <SkeletonBlock w="50%" h={10} radius={3} />
              <div style={{ marginTop: 8 }}><SkeletonBlock w="70%" h={26} radius={4} /></div>
              <div style={{ marginTop: 5 }}><SkeletonBlock w="40%" h={10} radius={3} /></div>
            </div>
          ))
        ) : (
          [
            { label: "WORKOUTS",       val: weekWorkouts.length, unit: "sessions", change: weekWorkouts.length > 0 ? `Last: ${lastWorkout?.createdAt ? fmtDate(lastWorkout.createdAt) : "—"}` : "No workouts yet",        pos: weekWorkouts.length > 0 },
            { label: "CALORIES TODAY", val: todayTotals.cal,     unit: "kcal",     change: calPct >= 100 ? "✓ Goal reached!" : `${calRemaining} kcal remaining`,                                                           pos: calPct >= 80 },
            { label: "TOTAL REPS",     val: weekReps,            unit: "this week", change: weekSets > 0 ? `${weekSets} total sets` : "No reps logged",                                                                   pos: weekReps > 0 },
            { label: "AVG FORM",       val: weekAvgForm !== null ? weekAvgForm : "—", unit: weekAvgForm !== null ? "/100" : "", change: weekAvgForm !== null ? (weekAvgForm >= 85 ? "Excellent form 💪" : weekAvgForm >= 70 ? "Good — keep improving" : "Focus on form") : "Complete a workout", pos: weekAvgForm !== null && weekAvgForm >= 70 },
          ].map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.45 + i * 0.06 }}
              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 14, cursor: "pointer" }}
              whileHover={{ y: -2, borderColor: "var(--border-red)", boxShadow: "0 6px 24px var(--red-glow)" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--text-dim)", letterSpacing: 0.5, marginBottom: 7 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--red)", flexShrink: 0 }} />
                {s.label}
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(20px,4vw,28px)", letterSpacing: 1 }}>
                {typeof s.val === "number" ? <AnimCounter target={s.val} /> : s.val}
                <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-body)", marginLeft: 3 }}>{s.unit}</span>
              </div>
              <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", marginTop: 4, color: s.pos ? "var(--success)" : "var(--text-muted)" }}>
                {s.change}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* FAB */}
      <motion.button className="fab" title="Quick Log" whileTap={{ scale: 0.92 }} onClick={() => navigate("/nutrition")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="22" height="22">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </motion.button>
    </div>
  );
}