// ═══════════════════════════════════════════════
//   KAI FITNESS — Dashboard.jsx
//   Homepage · Stats · Devices · Feed
// ═══════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// ─── Animated Number Counter ─────────────────────
function AnimCounter({ target, decimals = 0, duration = 1200 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      setVal(parseFloat((ease * target).toFixed(decimals)));
      if (prog < 1) requestAnimationFrame(step);
    };
    const id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [target, decimals, duration]);
  return <>{decimals > 0 ? val.toFixed(decimals) : val.toLocaleString()}</>;
}

// ─── Sparkline ───────────────────────────────────
function Sparkline({ data, color = "var(--red)" }) {
  const w = 200, h = 44;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / (max - min + 0.01)) * (h - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");
  const fillPts = `${pts} ${w},${h} 0,${h}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: 44, marginTop: 12 }}
    >
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0"   />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill="url(#spark-grad)" />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── SVG Ring ────────────────────────────────────
function Ring({ pct, color = "var(--red)", size = 52 }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(pct), 500);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--surface3)" strokeWidth="4" />
        <circle
          cx="24" cy="24" r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - (animated / 100) * circ}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div
        style={{
          position:   "absolute",
          top: "50%", left: "50%",
          transform:  "translate(-50%, -50%)",
          fontFamily: "var(--font-display)",
          fontSize:   size < 52 ? 11 : 13,
          letterSpacing: 0.5,
        }}
      >
        {pct}%
      </div>
    </div>
  );
}

// ─── Data ────────────────────────────────────────
const WEIGHT_DATA   = [83.2, 83.0, 82.8, 82.9, 82.5, 82.7, 82.4, 82.2, 82.4];
const CALORIE_DATA  = [2100, 2350, 1980, 2200, 2410, 1870, 2180, 1840];

const FEED_DATA = [
  { type: "meal",    icon: "🍳", name: "Breakfast – Eggs & Oats",    meta: "Today · 7:42 AM",   val: 420,  unit: "kcal" },
  { type: "workout", icon: "🏋️", name: "Squat Session – 5×5",        meta: "Today · 6:15 AM",   val: 48,   unit: "reps" },
  { type: "meal",    icon: "🥗", name: "Lunch – Chicken Salad",      meta: "Today · 12:30 PM",  val: 610,  unit: "kcal" },
  { type: "weight",  icon: "⚖️", name: "Weight Log",                 meta: "Today · 7:00 AM",   val: 82.4, unit: "kg"   },
  { type: "meal",    icon: "🍌", name: "Pre-Workout Snack",           meta: "Yesterday · 5:30 PM",val: 180, unit: "kcal" },
  { type: "workout", icon: "🏃", name: "Morning Jog – 5 km",         meta: "Yesterday · 6:00 AM",val: 312, unit: "kcal" },
  { type: "meal",    icon: "🍗", name: "Dinner – Rice & Chicken",    meta: "Yesterday · 7:00 PM",val: 720, unit: "kcal" },
];

const DEVICES = [
  { name: "Box A — Camera Unit",  desc: "ESP32-CAM · 192.168.1.42",    online: true,  signal: 4 },
  { name: "Box B — Motion Unit",  desc: "MPU6050 · Ultrasonic Active", online: true,  signal: 3 },
  { name: "Laptop Webcam",        desc: "Fallback Mode · 1080p",       online: false, signal: 0 },
];

const MACROS = [
  { label: "Protein", val: "144g", pct: 72, color: "var(--red)"     },
  { label: "Carbs",   val: "218g", pct: 58, color: "var(--warning)" },
  { label: "Fat",     val: "67g",  pct: 45, color: "var(--info)"    },
];

const WEEKLY = [
  { label: "Workouts",      val: 5,    unit: "sessions", change: "+2 vs last wk",  pos: true  },
  { label: "Avg. Calories", val: 2180, unit: "kcal/day", change: "−120 deficit",   pos: false },
  { label: "Total Reps",    val: 340,  unit: "this week", change: "+12% vs last",  pos: true  },
  { label: "Water Intake",  val: 2.8,  unit: "L/day avg", change: "On target ✓",  pos: true  },
];

// ─── Sub-components ──────────────────────────────

function SectionHeader({ title }) {
  return (
    <div className="section-header">
      <div className="section-title">{title}</div>
      <div className="section-line" />
    </div>
  );
}

function StatCard({ children, delay = 0, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0  }}
      transition={{ duration: 0.4, delay, ease: [0.4, 0, 0.2, 1] }}
      onClick={onClick}
      style={{
        background:   "var(--surface)",
        border:       "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding:      20,
        cursor:       onClick ? "pointer" : "default",
        position:     "relative",
        overflow:     "hidden",
        transition:   "border-color 0.25s, box-shadow 0.25s, transform 0.25s",
      }}
      whileHover={{
        y: -2,
        boxShadow: "0 8px 32px var(--red-glow)",
        borderColor: "var(--border-red)",
      }}
    >
      {/* Corner glow */}
      <div
        style={{
          position:   "absolute",
          top: 0, right: 0,
          width:      80,
          height:     80,
          background: "radial-gradient(circle at top right, var(--red-glow), transparent 70%)",
          opacity:    0,
          transition: "opacity 0.3s",
          pointerEvents: "none",
        }}
        className="card-corner-glow"
      />
      {children}
    </motion.div>
  );
}

// ─── Dashboard ───────────────────────────────────
export default function Dashboard() {
  const navigate      = useNavigate();
  const [feedFilter, setFeedFilter] = useState("all");
  const [calPct]      = useState(76.6);

  const filtered =
    feedFilter === "all"
      ? FEED_DATA
      : FEED_DATA.filter((f) => f.type === feedFilter);

  return (
    <div style={{ padding: "28px 32px" }}>

      {/* ── Greeting Band ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y:   0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        style={{
          display:      "flex",
          alignItems:   "center",
          justifyContent: "space-between",
          marginBottom: 28,
          padding:      "20px 24px",
          background:   "var(--surface)",
          border:       "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          position:     "relative",
          overflow:     "hidden",
        }}
      >
        {/* Left accent bar */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: 4,
          background: "linear-gradient(to bottom, var(--red), transparent)",
        }} />

        {/* BG watermark */}
        <div style={{
          position:   "absolute",
          right:      20, top: "50%",
          transform:  "translateY(-50%)",
          fontFamily: "var(--font-display)",
          fontSize:   100,
          letterSpacing: 10,
          color:      "rgba(255,255,255,0.02)",
          pointerEvents: "none",
          userSelect: "none",
        }}>
          KAI
        </div>

        <div>
          <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 4 }}>
            Welcome back,
          </div>
          <div style={{
            fontFamily:    "var(--font-display)",
            fontSize:      36,
            letterSpacing: 2,
            lineHeight:    1,
          }}>
            ALEX{" "}
            <span style={{ color: "var(--red)" }}>KINETIC</span>
          </div>
        </div>

        <div style={{
          display:      "flex",
          alignItems:   "center",
          gap:          12,
          background:   "var(--surface2)",
          border:       "1px solid var(--border)",
          padding:      "12px 18px",
          borderRadius: "var(--radius-md)",
        }}>
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize:   42,
            color:      "var(--red)",
            lineHeight: 1,
          }}>
            <AnimCounter target={12} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.3 }}>
              DAY STREAK
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
              🔥 Keep it going!
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Status Cards ── */}
      <SectionHeader title="TODAY'S SNAPSHOT" />
      <div style={{
        display:             "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap:                 16,
        marginBottom:        28,
      }}>

        {/* Calories */}
        <StatCard delay={0.1} onClick={() => navigate("/nutrition")}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "var(--radius-sm)",
              background: "var(--surface3)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>🔥</div>
            <span className="badge badge-green">+8% vs avg</span>
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 44, lineHeight: 1, letterSpacing: 1 }}>
            <AnimCounter target={1840} />
            <span style={{ fontSize: 14, color: "var(--text-dim)", fontFamily: "var(--font-body)", marginLeft: 4 }}>kcal</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 6 }}>Daily Calories Consumed</div>
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginBottom: 6 }}>
              <span>1,840 eaten</span><span>Goal 2,400</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${calPct}%` }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
              <span>560 kcal remaining</span><span>76%</span>
            </div>
          </div>
        </StatCard>

        {/* Weight */}
        <StatCard delay={0.2}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "var(--radius-sm)",
              background: "var(--surface3)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>⚖️</div>
            <span className="badge badge-red">−0.4 kg / wk</span>
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 44, lineHeight: 1, letterSpacing: 1 }}>
            82<span style={{ fontSize: 14, color: "var(--text-dim)", fontFamily: "var(--font-body)", marginLeft: 2 }}>.4 kg</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 6 }}>Current Weight · Goal 78 kg</div>
          <Sparkline data={WEIGHT_DATA} />
        </StatCard>

        {/* Last Workout */}
        <StatCard delay={0.3} onClick={() => navigate("/workout")}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "var(--radius-sm)",
              background: "var(--surface3)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>🏋️</div>
            <span className="badge badge-neutral">TODAY · 6:15 AM</span>
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 44, lineHeight: 1, letterSpacing: 1 }}>
            <AnimCounter target={48} />
            <span style={{ fontSize: 14, color: "var(--text-dim)", fontFamily: "var(--font-body)", marginLeft: 4 }}>reps</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 6 }}>Last Workout · Squat Session 5×5</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 14 }}>
            <Ring pct={87} size={48} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Form Score</div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                Excellent · Hip depth OK
              </div>
            </div>
          </div>
        </StatCard>
      </div>

      {/* ── Devices + Feed ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>

        {/* Device Panel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ duration: 0.4, delay: 0.35, ease: [0.4, 0, 0.2, 1] }}
          style={{
            background:   "var(--surface)",
            border:       "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding:      20,
          }}
        >
          <div style={{
            fontFamily: "var(--font-display)", fontSize: 18,
            letterSpacing: 2, color: "var(--text-dim)", marginBottom: 16,
          }}>
            DEVICE STATUS
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {DEVICES.map((d, i) => (
              <div
                key={i}
                style={{
                  display:      "flex",
                  alignItems:   "center",
                  gap:          12,
                  padding:      "12px 14px",
                  background:   "var(--surface2)",
                  border:       "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  cursor:       "pointer",
                  transition:   "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-red)";
                  e.currentTarget.style.background  = "var(--surface3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background  = "var(--surface2)";
                }}
              >
                {/* Status dot */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: d.online ? "var(--success)" : "var(--text-muted)",
                  }} />
                  {d.online && (
                    <div style={{
                      position: "absolute",
                      top: -3, left: -3,
                      width: 16, height: 16,
                      borderRadius: "50%",
                      background: "rgba(34,197,94,0.25)",
                      animation: "ping 2s infinite",
                    }} />
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                    {d.desc}
                  </div>
                </div>

                {/* Signal bars */}
                {d.online && (
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 16 }}>
                    {[4, 8, 12, 16].map((h, idx) => (
                      <div
                        key={idx}
                        style={{
                          width:        4,
                          height:       h,
                          borderRadius: 2,
                          background:   idx < d.signal ? "var(--success)" : "var(--surface4)",
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Tag */}
                <span className={`badge ${d.online ? "badge-green" : "badge-neutral"}`}>
                  {d.online ? "ONLINE" : "OFFLINE"}
                </span>
              </div>
            ))}
          </div>

          {/* Macro Rings */}
          <div style={{
            marginTop:    18,
            padding:      14,
            background:   "var(--surface2)",
            borderRadius: "var(--radius-md)",
            border:       "1px solid var(--border)",
          }}>
            <div style={{
              fontSize: 11, color: "var(--text-dim)",
              fontFamily: "var(--font-mono)", letterSpacing: 1, marginBottom: 14,
            }}>
              TODAY'S MACROS
            </div>
            <div style={{ display: "flex", justifyContent: "space-around", gap: 16 }}>
              {MACROS.map((m) => (
                <div key={m.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <Ring pct={m.pct} color={m.color} size={52} />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 1 }}>{m.val}</div>
                    <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>{m.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ duration: 0.4, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
          style={{
            background:   "var(--surface)",
            border:       "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding:      20,
            display:      "flex",
            flexDirection: "column",
          }}
        >
          {/* Feed header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: 2, color: "var(--text-dim)" }}>
              ACTIVITY FEED
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {["all", "meal", "workout", "weight"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFeedFilter(f)}
                  style={{
                    fontSize:     10,
                    padding:      "3px 8px",
                    borderRadius: "var(--radius-sm)",
                    border:       `1px solid ${feedFilter === f ? "var(--red)" : "var(--border)"}`,
                    background:   feedFilter === f ? "rgba(232,25,44,0.06)" : "transparent",
                    color:        feedFilter === f ? "var(--red)" : "var(--text-dim)",
                    cursor:       "pointer",
                    fontFamily:   "var(--font-mono)",
                    letterSpacing: 0.5,
                    transition:   "all 0.2s",
                  }}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Feed list */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            <AnimatePresence>
              {filtered.map((item, i) => (
                <motion.div
                  key={`${item.name}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x:  0 }}
                  exit={{    opacity: 0, x: -8 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                  style={{
                    display:      "flex",
                    alignItems:   "center",
                    gap:          12,
                    padding:      "11px 12px",
                    background:   "var(--surface2)",
                    border:       "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    cursor:       "pointer",
                    transition:   "all 0.2s",
                  }}
                  whileHover={{
                    x: 3,
                    borderColor: "var(--border-red)",
                    background: "var(--surface3)",
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width:        36,
                    height:       36,
                    borderRadius: "var(--radius-sm)",
                    display:      "flex",
                    alignItems:   "center",
                    justifyContent: "center",
                    fontSize:     16,
                    flexShrink:   0,
                    background:
                      item.type === "meal"    ? "rgba(245,158,11,0.1)"  :
                      item.type === "workout" ? "rgba(232,25,44,0.1)"   :
                      "rgba(99,102,241,0.1)",
                    border:
                      item.type === "meal"    ? "1px solid rgba(245,158,11,0.2)" :
                      item.type === "workout" ? "1px solid var(--border-red)"   :
                      "1px solid rgba(99,102,241,0.2)",
                  }}>
                    {item.icon}
                  </div>

                  {/* Body */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                      {item.meta}
                    </div>
                  </div>

                  {/* Value */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 1 }}>
                      {item.val}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                      {item.unit}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* ── Weekly Stats ── */}
      <SectionHeader title="WEEKLY STATS" />
      <div style={{
        display:             "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap:                 16,
      }}>
        {WEEKLY.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y:   0 }}
            transition={{ duration: 0.4, delay: 0.45 + i * 0.06, ease: [0.4, 0, 0.2, 1] }}
            style={{
              background:   "var(--surface)",
              border:       "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding:      16,
              cursor:       "pointer",
            }}
            whileHover={{
              y: -2,
              borderColor: "var(--border-red)",
              boxShadow:   "0 6px 24px var(--red-glow)",
            }}
          >
            <div style={{
              display:     "flex",
              alignItems:  "center",
              gap:         6,
              fontSize:    11,
              color:       "var(--text-dim)",
              letterSpacing: 0.5,
              marginBottom: 8,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--red)", flexShrink: 0 }} />
              {s.label.toUpperCase()}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 30, letterSpacing: 1 }}>
              {s.val}
              <span style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-body)", marginLeft: 4 }}>
                {s.unit}
              </span>
            </div>
            <div style={{
              fontSize:   11,
              fontFamily: "var(--font-mono)",
              marginTop:  4,
              color:      s.pos ? "var(--success)" : "var(--red)",
            }}>
              {s.change}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── FAB ── */}
      <motion.button
        className="fab"
        title="Quick Log"
        whileTap={{ scale: 0.92 }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="22" height="22">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5"  y1="12" x2="19" y2="12" />
        </svg>
      </motion.button>

    </div>
  );
}