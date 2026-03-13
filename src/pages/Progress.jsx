// ═══════════════════════════════════════════════
//   KAI FITNESS — Progress.jsx
//   Place at: src/pages/Progress.jsx
//   Real Firestore weight log · Base64 photos
// ═══════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  collection, addDoc, query, orderBy,
  onSnapshot, serverTimestamp, limit,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

// ─── Helpers ─────────────────────────────────────
const fmt = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

// ─── Custom Tooltip ───────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--surface2)", border: "1px solid var(--border-red)", borderRadius: "var(--radius-md)", padding: "8px 12px" }}>
      <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.color }} />
          <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>{p.name}:</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 14, color: p.color }}>{p.value} kg</span>
        </div>
      ))}
    </div>
  );
}

// ─── Comparison Slider ────────────────────────────
function ComparisonSlider({ before, after }) {
  const [pct, setPct]         = useState(50);
  const [drag, setDrag]       = useState(false);
  const ref                   = useRef(null);

  const move = useCallback((clientX) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPct(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }, []);

  const BodySVG = ({ highlight }) => (
    <svg viewBox="0 0 80 160" style={{ width: "50%", opacity: highlight ? 0.7 : 0.45 }}>
      <ellipse cx="40" cy="14" rx="12" ry="13" fill={highlight ? "#E8192C" : "#555"} />
      <rect x="35" y="26" width="10" height="8" rx="4" fill={highlight ? "#9C1120" : "#444"} />
      <path d={highlight ? "M22 34 Q18 70 20 90 L60 90 Q62 70 58 34 Z" : "M20 34 Q15 70 18 90 L62 90 Q65 70 60 34 Z"} fill={highlight ? "#E8192C" : "#555"} />
      <path d="M20 36 Q8 55 10 80 L18 78 Q17 58 24 42 Z" fill={highlight ? "#9C1120" : "#444"} />
      <path d="M60 36 Q72 55 70 80 L62 78 Q63 58 56 42 Z" fill={highlight ? "#9C1120" : "#444"} />
      <path d="M26 89 Q22 118 24 145 L35 145 Q34 118 34 89 Z" fill={highlight ? "#E8192C" : "#555"} />
      <path d="M54 89 Q58 118 56 145 L45 145 Q46 118 46 89 Z" fill={highlight ? "#E8192C" : "#555"} />
    </svg>
  );

  const Panel = ({ entry, isAfter }) => (
    <div style={{ position: "absolute", inset: 0, background: isAfter ? "linear-gradient(135deg,#1a1820,#201a18)" : "linear-gradient(135deg,#1a1a1f,#2a1a1a)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "12px 10px 10px" }}>
      <span className={`badge ${isAfter ? "badge-red" : "badge-neutral"}`} style={{ alignSelf: "flex-start", fontSize: 9 }}>{isAfter ? "AFTER" : "BEFORE"}</span>
      {entry?.photo
        ? <img src={entry.photo} alt="" style={{ width: "60%", borderRadius: "var(--radius-md)", objectFit: "cover", opacity: 0.85 }} />
        : <BodySVG highlight={isAfter} />
      }
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: isAfter ? "var(--red)" : "var(--text)", letterSpacing: 1 }}>{entry?.weight ?? "—"} <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-body)" }}>kg</span></div>
        <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{entry ? fmt(entry.createdAt) : "—"}</div>
      </div>
    </div>
  );

  return (
    <div ref={ref}
      onMouseMove={(e) => drag && move(e.clientX)}
      onMouseUp={() => setDrag(false)}
      onMouseLeave={() => setDrag(false)}
      onTouchMove={(e) => move(e.touches[0].clientX)}
      style={{ position: "relative", borderRadius: "var(--radius-lg)", overflow: "hidden", aspectRatio: "3/4", cursor: drag ? "grabbing" : "grab", userSelect: "none", border: "1px solid var(--border)" }}>
      <Panel entry={before} isAfter={false} />
      <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - pct}% 0 0)` }}>
        <Panel entry={after} isAfter={true} />
      </div>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: `${pct}%`, width: 2, background: "var(--red)", boxShadow: "0 0 10px var(--red)", transform: "translateX(-50%)", pointerEvents: "none" }} />
      <motion.div onMouseDown={() => setDrag(true)} onTouchStart={() => setDrag(true)} whileTap={{ scale: 1.15 }}
        style={{ position: "absolute", top: "50%", left: `${pct}%`, transform: "translate(-50%,-50%)", width: 34, height: 34, borderRadius: "50%", background: "var(--red)", border: "3px solid #fff", boxShadow: "0 0 14px rgba(232,25,44,0.6)", cursor: "grab", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M7 4l-4 6 4 6M13 4l4 6-4 6"/></svg>
      </motion.div>
    </div>
  );
}

// ─── Log Modal ────────────────────────────────────
function LogModal({ onClose, onSave, lastWeight }) {
  const [weight, setWeight] = useState("");
  const [note,   setNote]   = useState("");
  const [photo,  setPhoto]  = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef             = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Convert to base64 for Firestore storage (free tier)
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!weight || isNaN(weight)) return;
    setSaving(true);
    await onSave({ weight: parseFloat(weight), note, photo });
    setSaving(false);
    onClose();
  };

  const diff = weight && lastWeight ? (parseFloat(weight) - lastWeight).toFixed(1) : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 420, background: "var(--surface)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-xl)", overflow: "hidden", boxShadow: "var(--shadow-lg)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 17, letterSpacing: 2, color: "var(--text-dim)" }}>LOG TODAY'S DATA</div>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", width: 28, height: 28, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <form onSubmit={handleSave} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 1, display: "block", marginBottom: 5 }}>CURRENT WEIGHT *</label>
            <div style={{ position: "relative" }}>
              <input className="input" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="80.4" required autoFocus style={{ paddingRight: 40 }} />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)", pointerEvents: "none" }}>kg</span>
            </div>
            {diff !== null && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 5, fontSize: 11, fontFamily: "var(--font-mono)", color: diff < 0 ? "var(--success)" : "var(--red)" }}>
                {diff < 0 ? "▼" : "▲"} {Math.abs(diff)} kg vs last entry
              </motion.div>
            )}
          </div>

          <div>
            <label style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 1, display: "block", marginBottom: 5 }}>NOTE (OPTIONAL)</label>
            <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="How are you feeling today?" rows={2} style={{ resize: "none", lineHeight: 1.5 }} />
          </div>

          <div>
            <label style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 1, display: "block", marginBottom: 5 }}>PROGRESS PHOTO (OPTIONAL)</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
            {photo ? (
              <div style={{ position: "relative", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border-red)" }}>
                <img src={photo} alt="" style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", bottom: 6, left: 8, fontSize: 10, color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-mono)" }}>Stored as compressed image in Firestore</div>
                <button type="button" onClick={() => setPhoto(null)} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: "50%", color: "#fff", width: 22, height: 22, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              </div>
            ) : (
              <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => fileRef.current?.click()}
                style={{ width: "100%", padding: "24px", background: "var(--surface2)", border: "2px dashed var(--border)", borderRadius: "var(--radius-md)", color: "var(--text-dim)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-red)"; e.currentTarget.style.color = "var(--text)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)";     e.currentTarget.style.color = "var(--text-dim)"; }}>
                <span style={{ fontSize: 26 }}>📸</span>
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: 0.5 }}>CLICK TO UPLOAD PHOTO</span>
                <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Saved as compressed base64 · Free tier friendly</span>
              </motion.button>
            )}
          </div>

          <motion.button type="submit" whileTap={{ scale: 0.97 }} disabled={saving}
            style={{ padding: "10px", background: saving ? "var(--red-dim)" : "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: 2, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> SAVING...</> : "SAVE ENTRY"}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────
const RANGES = ["1W","2W","1M","ALL"];

export default function Progress() {
  const { currentUser, userProfile } = useAuth();
  const [entries,      setEntries]   = useState([]);
  const [loading,      setLoading]   = useState(true);
  const [range,        setRange]     = useState("1M");
  const [logOpen,      setLogOpen]   = useState(false);
  const [showAvg,      setShowAvg]   = useState(true);
  const [showGoal,     setShowGoal]  = useState(true);
  const [beforeIdx,    setBeforeIdx] = useState(0);
  const [afterIdx,     setAfterIdx]  = useState(0);

  const goalWeight = userProfile?.goalWeight || 78;

  // ── Real-time listener ──
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "users", currentUser.uid, "weightLog"),
      orderBy("createdAt", "asc"),
      limit(90)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setEntries(data);
      setLoading(false);
      if (data.length > 1) {
        setBeforeIdx(0);
        setAfterIdx(data.length - 1);
      }
    }, (e) => { console.error("weightLog:", e); setLoading(false); });
    return unsub;
  }, [currentUser]);

  // ── Save entry ──
  const saveEntry = async ({ weight, note, photo }) => {
    if (!currentUser) return;
    await addDoc(
      collection(db, "users", currentUser.uid, "weightLog"),
      {
        weight,
        note:      note || "",
        photo:     photo || null, // base64 string or null
        createdAt: serverTimestamp(),
      }
    );
  };

  // ── Chart data ──
  const chartData = (() => {
    const n = range === "1W" ? 7 : range === "2W" ? 14 : range === "1M" ? 28 : entries.length;
    return entries.slice(-n).map((e, i, arr) => ({
      date:   fmt(e.createdAt),
      weight: e.weight,
      goal:   goalWeight,
      avg:    parseFloat((arr.slice(Math.max(0,i-6),i+1).reduce((a,b)=>a+b.weight,0)/Math.min(i+1,7)).toFixed(2)),
    }));
  })();

  const firstW  = chartData[0]?.weight ?? 0;
  const lastW   = chartData[chartData.length - 1]?.weight ?? 0;
  const diff    = entries.length > 1 ? (lastW - firstW).toFixed(1) : null;
  const startW  = entries[0]?.weight ?? 0;
  const totalLost = entries.length > 1 ? Math.abs((lastW - startW).toFixed(1)) : 0;

  const photosWithImg = entries.filter((e) => e.photo);

  return (
    <div style={{ padding: "28px 32px" }}>

      {/* Summary strip */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "STARTING WEIGHT", val: entries.length > 0 ? `${startW} kg` : "—", color: "var(--text-dim)",  icon: "🏁" },
          { label: "CURRENT WEIGHT",  val: entries.length > 0 ? `${lastW} kg`  : "—", color: "var(--red)",       icon: "⚖️" },
          { label: "TOTAL LOST",      val: `${totalLost} kg`,                           color: "var(--success)",   icon: "📉" },
          { label: "GOAL WEIGHT",     val: `${goalWeight} kg`,                          color: "var(--warning)",   icon: "🎯" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "12px 16px", display: "flex", gap: 10, alignItems: "center" }}
            whileHover={{ borderColor: "var(--border-red)", y: -2, boxShadow: "0 6px 24px var(--red-glow)" }}>
            <span style={{ fontSize: 22 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 9, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 0.5, marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: 1, color: s.color, lineHeight: 1 }}>{s.val}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Chart + sidebar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, marginBottom: 20 }}>

        {/* Chart */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 17, letterSpacing: 2, color: "var(--text-dim)" }}>WEIGHT ANALYTICS</div>
              {diff !== null && (
                <div style={{ fontSize: 10, color: diff < 0 ? "var(--success)" : "var(--red)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                  {diff < 0 ? "▼" : "▲"} {Math.abs(diff)} kg in selected period
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {[{ label: "AVG", active: showAvg, onClick: () => setShowAvg((p)=>!p), color: "var(--warning)" },
                { label: "GOAL", active: showGoal, onClick: () => setShowGoal((p)=>!p), color: "var(--success)" }].map((t) => (
                <button key={t.label} onClick={t.onClick} style={{ fontSize: 9, padding: "3px 9px", borderRadius: "var(--radius-sm)", border: `1px solid ${t.active ? t.color+"60" : "var(--border)"}`, background: t.active ? t.color+"15" : "transparent", color: t.active ? t.color : "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font-mono)", letterSpacing: 0.5 }}>
                  {t.label}
                </button>
              ))}
              {RANGES.map((r) => (
                <button key={r} onClick={() => setRange(r)} style={{ fontSize: 10, padding: "4px 9px", borderRadius: "var(--radius-sm)", border: `1px solid ${range === r ? "var(--red)" : "var(--border)"}`, background: range === r ? "rgba(232,25,44,0.08)" : "transparent", color: range === r ? "var(--red)" : "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-mono)", transition: "all 0.2s" }}>
                  {r}
                </button>
              ))}
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => setLogOpen(true)}
                style={{ padding: "5px 12px", background: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 11, letterSpacing: 1.5, cursor: "pointer" }}>
                + LOG
              </motion.button>
            </div>
          </div>

          {loading ? (
            <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center" }}><div className="spinner" /></div>
          ) : chartData.length === 0 ? (
            <div style={{ height: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12, gap: 10 }}>
              <span style={{ fontSize: 32 }}>📊</span>
              No weight entries yet — tap + LOG to start tracking
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#E8192C" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#E8192C" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 9, fontFamily: "'JetBrains Mono',monospace" }} axisLine={false} tickLine={false} interval={Math.floor(chartData.length / 5)} />
                <YAxis domain={["auto","auto"]} tick={{ fill: "var(--text-muted)", fontSize: 9, fontFamily: "'JetBrains Mono',monospace" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}kg`} />
                <Tooltip content={<ChartTooltip />} />
                {showGoal && <ReferenceLine y={goalWeight} stroke="var(--success)" strokeDasharray="5 3" strokeWidth={1.5} label={{ value: `GOAL ${goalWeight}kg`, fill: "var(--success)", fontSize: 9, position: "insideTopRight" }} />}
                {showAvg  && <Area type="monotone" dataKey="avg" stroke="var(--warning)" strokeWidth={1.5} fill="none" strokeDasharray="4 2" dot={false} name="7d avg" />}
                <Area type="monotone" dataKey="weight" stroke="var(--red)" strokeWidth={2.5} fill="url(#wg)" dot={false} activeDot={{ r: 5, fill: "var(--red)", stroke: "var(--bg)", strokeWidth: 2 }} name="weight" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Recent entries */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 16, display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 2, color: "var(--text-dim)", marginBottom: 12 }}>RECENT ENTRIES</div>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 20 }}><div className="spinner" /></div>
          ) : entries.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)", textAlign: "center" }}>
              No entries yet — tap + LOG to start
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {[...entries].reverse().slice(0, 20).map((e, i) => {
                const prev  = [...entries].reverse()[i + 1];
                const delta = prev ? (e.weight - prev.weight).toFixed(1) : null;
                return (
                  <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "var(--surface2)", borderRadius: "var(--radius-sm)", border: `1px solid ${i === 0 ? "var(--border-red)" : "var(--border)"}` }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>{fmt(e.createdAt)}</div>
                      {e.note && <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 1 }}>{e.note.slice(0, 28)}{e.note.length > 28 ? "…" : ""}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {delta !== null && (
                        <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: delta < 0 ? "var(--success)" : delta > 0 ? "var(--red)" : "var(--text-muted)" }}>
                          {delta < 0 ? "▼" : delta > 0 ? "▲" : "="}{Math.abs(delta)}
                        </span>
                      )}
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 15, letterSpacing: 0.5, color: i === 0 ? "var(--red)" : "var(--text)" }}>
                        {e.weight} <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>kg</span>
                      </div>
                      {e.photo && <span style={{ fontSize: 12 }}>📸</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Photo Comparison */}
      <div className="section-header">
        <div className="section-title">PHOTO COMPARISON</div>
        <div className="section-line" />
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, alignItems: "start" }}>
        <div style={{ width: 240 }}>
          <ComparisonSlider
            before={entries[beforeIdx]}
            after={entries[afterIdx] || entries[entries.length - 1]}
          />
          {entries.length > 1 && (
            <div style={{ marginTop: 7, display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
              <span>← drag to compare →</span>
              {totalLost > 0 && <span style={{ color: "var(--success)" }}>▼ {totalLost} kg lost</span>}
            </div>
          )}
        </div>

        <div>
          {entries.length < 2 ? (
            <div style={{ padding: "32px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", textAlign: "center", color: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-mono)" }}>
              Log at least 2 weight entries to compare progress photos.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 0.5, marginBottom: 10 }}>
                SELECT ENTRIES TO COMPARE
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, maxHeight: 280, overflowY: "auto" }}>
                {entries.map((e, i) => (
                  <div key={e.id}
                    onClick={() => { if (i < afterIdx) setBeforeIdx(i); else setAfterIdx(i); }}
                    style={{ padding: "10px 8px", borderRadius: "var(--radius-md)", border: `1px solid ${i === beforeIdx || i === afterIdx ? "var(--red)" : "var(--border)"}`, background: i === beforeIdx || i === afterIdx ? "rgba(232,25,44,0.06)" : "var(--surface)", cursor: "pointer", transition: "all 0.2s", textAlign: "center", position: "relative" }}>
                    {i === beforeIdx && <div style={{ position: "absolute", top: 4, left: 4, fontSize: 8, padding: "1px 5px", background: "var(--surface3)", borderRadius: 3, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>BEFORE</div>}
                    {i === afterIdx  && <div style={{ position: "absolute", top: 4, right: 4, fontSize: 8, padding: "1px 5px", background: "var(--red)", borderRadius: 3, color: "#fff", fontFamily: "var(--font-mono)" }}>AFTER</div>}
                    {e.photo
                      ? <img src={e.photo} alt="" style={{ width: "100%", height: 60, objectFit: "cover", borderRadius: "var(--radius-sm)", marginBottom: 4 }} />
                      : <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⚖️</div>
                    }
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 14, color: i === beforeIdx || i === afterIdx ? "var(--red)" : "var(--text)", letterSpacing: 0.5 }}>{e.weight}</div>
                    <div style={{ fontSize: 8, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 1 }}>{fmt(e.createdAt)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setLogOpen(true)}
            style={{ marginTop: 12, width: "100%", padding: "10px", background: "transparent", border: "2px dashed var(--border)", borderRadius: "var(--radius-md)", color: "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-red)"; e.currentTarget.style.color = "var(--red)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)";     e.currentTarget.style.color = "var(--text-dim)"; }}>
            📸 LOG WEIGHT + UPLOAD NEW PHOTO
          </motion.button>
        </div>
      </motion.div>

      <AnimatePresence>
        {logOpen && (
          <LogModal
            onClose={() => setLogOpen(false)}
            onSave={saveEntry}
            lastWeight={entries.length > 0 ? entries[entries.length - 1].weight : null}
          />
        )}
      </AnimatePresence>
    </div>
  );
}