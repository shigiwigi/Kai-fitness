// ═══════════════════════════════════════════════
//   KAI FITNESS — Progress.jsx
//   Photo Comparison · Weight Graph · Data Vault
// ═══════════════════════════════════════════════

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Dot,
} from "recharts";

// ─── Mock weight data ────────────────────────────
const generateWeightData = () => {
  const base   = [83.5, 83.2, 83.0, 83.4, 82.8, 82.9, 82.5, 82.7, 82.4, 82.2, 82.4, 82.0, 81.8, 82.1, 81.6, 81.9, 81.4, 81.2, 81.5, 81.0, 80.8, 81.1, 80.6, 80.4, 80.7, 80.2, 80.0, 80.4];
  const labels = [];
  const now    = new Date();
  for (let i = base.length - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }));
  }
  return base.map((w, i) => ({
    date:   labels[i],
    weight: w,
    goal:   78,
    avg:    parseFloat((base.slice(Math.max(0, i - 6), i + 1).reduce((a, b) => a + b, 0) / Math.min(i + 1, 7)).toFixed(2)),
  }));
};

const WEIGHT_DATA = generateWeightData();

// ─── Mock photos ─────────────────────────────────
const MOCK_PHOTOS = [
  { id: 1, date: "15 Jan 2026", weight: 86.2, label: "START",   gradient: "linear-gradient(135deg, #1a1a1f 0%, #2a1a1a 100%)" },
  { id: 2, date: "01 Feb 2026", weight: 84.5, label: "4 WEEKS", gradient: "linear-gradient(135deg, #1a1a20 0%, #1a1f1a 100%)" },
  { id: 3, date: "15 Feb 2026", weight: 83.0, label: "6 WEEKS", gradient: "linear-gradient(135deg, #18181f 0%, #1f1a18 100%)" },
  { id: 4, date: "13 Mar 2026", weight: 80.4, label: "NOW",     gradient: "linear-gradient(135deg, #1a1820 0%, #201a18 100%)" },
];

// ─── Body silhouette SVG (simplified) ────────────
function BodySilhouette({ label, gradient, weight, date, highlight = false }) {
  return (
    <div style={{
      background:   gradient,
      border:       `1px solid ${highlight ? "var(--border-red)" : "var(--border)"}`,
      borderRadius: "var(--radius-lg)",
      overflow:     "hidden",
      aspectRatio:  "3/4",
      display:      "flex",
      flexDirection: "column",
      alignItems:   "center",
      justifyContent: "space-between",
      padding:      "16px 12px 12px",
      position:     "relative",
      cursor:       "pointer",
      transition:   "border-color 0.2s",
    }}>
      {/* Label badge */}
      <span className={`badge ${highlight ? "badge-red" : "badge-neutral"}`} style={{ zIndex: 1, alignSelf: "flex-start" }}>
        {label}
      </span>

      {/* Silhouette figure */}
      <svg viewBox="0 0 80 160" style={{ width: "55%", opacity: 0.5 }}>
        {/* Head */}
        <ellipse cx="40" cy="14" rx="12" ry="13" fill={highlight ? "#E8192C" : "#555"} />
        {/* Neck */}
        <rect x="35" y="26" width="10" height="8" rx="4" fill={highlight ? "#9C1120" : "#444"} />
        {/* Torso */}
        <path d="M20 34 Q15 70 18 90 L62 90 Q65 70 60 34 Z" fill={highlight ? "#E8192C" : "#555"} />
        {/* Left arm */}
        <path d="M20 36 Q8 55 10 80 L18 78 Q17 58 24 42 Z" fill={highlight ? "#9C1120" : "#444"} />
        {/* Right arm */}
        <path d="M60 36 Q72 55 70 80 L62 78 Q63 58 56 42 Z" fill={highlight ? "#9C1120" : "#444"} />
        {/* Left leg */}
        <path d="M26 89 Q22 118 24 145 L35 145 Q34 118 34 89 Z" fill={highlight ? "#E8192C" : "#555"} />
        {/* Right leg */}
        <path d="M54 89 Q58 118 56 145 L45 145 Q46 118 46 89 Z" fill={highlight ? "#E8192C" : "#555"} />
      </svg>

      {/* Info */}
      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: 1, color: highlight ? "var(--red)" : "var(--text)" }}>
          {weight} <span style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-body)" }}>kg</span>
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{date}</div>
      </div>
    </div>
  );
}

// ─── Photo Comparison Slider ─────────────────────
function ComparisonSlider({ before, after }) {
  const [sliderX, setSliderX]   = useState(50);
  const [dragging, setDragging] = useState(false);
  const containerRef            = useRef(null);

  const handleMove = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct  = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setSliderX(pct);
  }, []);

  const onMouseMove = (e) => { if (dragging) handleMove(e.clientX); };
  const onTouchMove = (e) => handleMove(e.touches[0].clientX);

  return (
    <div
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseUp={() => setDragging(false)}
      onMouseLeave={() => setDragging(false)}
      onTouchMove={onTouchMove}
      onTouchEnd={() => setDragging(false)}
      style={{
        position:   "relative",
        borderRadius: "var(--radius-lg)",
        overflow:   "hidden",
        aspectRatio: "3/4",
        cursor:     dragging ? "grabbing" : "grab",
        userSelect: "none",
        border:     "1px solid var(--border)",
      }}
    >
      {/* Before (full) */}
      <div style={{ position: "absolute", inset: 0, background: before.gradient }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "16px 12px 12px" }}>
          <span className="badge badge-neutral" style={{ alignSelf: "flex-start" }}>BEFORE</span>
          <svg viewBox="0 0 80 160" style={{ width: "55%", opacity: 0.45 }}>
            <ellipse cx="40" cy="14" rx="12" ry="13" fill="#555" />
            <rect x="35" y="26" width="10" height="8" rx="4" fill="#444" />
            <path d="M20 34 Q15 70 18 90 L62 90 Q65 70 60 34 Z" fill="#555" />
            <path d="M20 36 Q8 55 10 80 L18 78 Q17 58 24 42 Z" fill="#444" />
            <path d="M60 36 Q72 55 70 80 L62 78 Q63 58 56 42 Z" fill="#444" />
            <path d="M26 89 Q22 118 24 145 L35 145 Q34 118 34 89 Z" fill="#555" />
            <path d="M54 89 Q58 118 56 145 L45 145 Q46 118 46 89 Z" fill="#555" />
          </svg>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: 1 }}>{before.weight} <span style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-body)" }}>kg</span></div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{before.date}</div>
          </div>
        </div>
      </div>

      {/* After (clipped) */}
      <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - sliderX}% 0 0)`, background: after.gradient }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "16px 12px 12px" }}>
          <span className="badge badge-red" style={{ alignSelf: "flex-start" }}>AFTER</span>
          <svg viewBox="0 0 80 160" style={{ width: "55%", opacity: 0.7 }}>
            <ellipse cx="40" cy="14" rx="12" ry="13" fill="#E8192C" />
            <rect x="35" y="26" width="10" height="8" rx="4" fill="#9C1120" />
            <path d="M22 34 Q18 70 20 90 L60 90 Q62 70 58 34 Z" fill="#E8192C" />
            <path d="M22 36 Q10 55 12 80 L20 78 Q19 58 26 42 Z" fill="#9C1120" />
            <path d="M58 36 Q70 55 68 80 L60 78 Q61 58 54 42 Z" fill="#9C1120" />
            <path d="M28 89 Q24 118 26 145 L37 145 Q36 118 36 89 Z" fill="#E8192C" />
            <path d="M52 89 Q56 118 54 145 L43 145 Q44 118 44 89 Z" fill="#E8192C" />
          </svg>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: 1, color: "var(--red)" }}>{after.weight} <span style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-body)" }}>kg</span></div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{after.date}</div>
          </div>
        </div>
      </div>

      {/* Divider line */}
      <div style={{
        position:   "absolute",
        top: 0, bottom: 0,
        left:       `${sliderX}%`,
        width:      2,
        background: "var(--red)",
        boxShadow:  "0 0 12px var(--red)",
        transform:  "translateX(-50%)",
        pointerEvents: "none",
      }} />

      {/* Handle */}
      <motion.div
        onMouseDown={() => setDragging(true)}
        onTouchStart={() => setDragging(true)}
        style={{
          position:   "absolute",
          top:        "50%",
          left:       `${sliderX}%`,
          transform:  "translate(-50%, -50%)",
          width:      36,
          height:     36,
          borderRadius: "50%",
          background: "var(--red)",
          border:     "3px solid #fff",
          boxShadow:  "0 0 16px rgba(232,25,44,0.6)",
          cursor:     "grab",
          display:    "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex:     10,
        }}
        whileTap={{ scale: 1.15 }}
      >
        <svg viewBox="0 0 20 20" width="16" height="16" fill="white">
          <path d="M7 4l-4 6 4 6M13 4l4 6-4 6" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
        </svg>
      </motion.div>
    </div>
  );
}

// ─── Custom Tooltip ──────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:   "var(--surface2)",
      border:       "1px solid var(--border-red)",
      borderRadius: "var(--radius-md)",
      padding:      "10px 14px",
      boxShadow:    "var(--shadow-card)",
    }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)", marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-mono)", textTransform: "capitalize" }}>{p.name}:</span>
          <span style={{ fontSize: 13, fontFamily: "var(--font-display)", letterSpacing: 0.5, color: p.color }}>{p.value} kg</span>
        </div>
      ))}
    </div>
  );
}

// ─── Log Entry Modal ─────────────────────────────
function LogModal({ onClose, onSave }) {
  const [weight, setWeight]   = useState("");
  const [note,   setNote]     = useState("");
  const [photo,  setPhoto]    = useState(null);
  const fileRef               = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhoto(url);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!weight) return;
    onSave({ weight: parseFloat(weight), note, photo });
    onClose();
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
        style={{ width: "100%", maxWidth: 440, background: "var(--surface)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-xl)", overflow: "hidden", boxShadow: "var(--shadow-lg)" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: 2, color: "var(--text-dim)" }}>LOG TODAY'S DATA</div>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", width: 28, height: 28, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <form onSubmit={handleSave} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Weight */}
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 1, display: "block", marginBottom: 6 }}>CURRENT WEIGHT *</label>
            <div style={{ position: "relative" }}>
              <input
                className="input"
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="80.4"
                required
                autoFocus
                style={{ paddingRight: 44 }}
              />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", pointerEvents: "none" }}>kg</span>
            </div>
            {/* Change preview */}
            {weight && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: 6, fontSize: 12, fontFamily: "var(--font-mono)" }}
              >
                {(() => {
                  const diff  = (parseFloat(weight) - WEIGHT_DATA[WEIGHT_DATA.length - 1].weight).toFixed(1);
                  const isNeg = diff < 0;
                  return (
                    <span style={{ color: isNeg ? "var(--success)" : "var(--red)" }}>
                      {isNeg ? "▼" : "▲"} {Math.abs(diff)} kg vs last entry
                    </span>
                  );
                })()}
              </motion.div>
            )}
          </div>

          {/* Note */}
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 1, display: "block", marginBottom: 6 }}>NOTE (OPTIONAL)</label>
            <textarea
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Feeling lean today, good sleep..."
              rows={2}
              style={{ resize: "none", lineHeight: 1.5 }}
            />
          </div>

          {/* Photo upload */}
          <div>
            <label style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 1, display: "block", marginBottom: 6 }}>PROGRESS PHOTO (OPTIONAL)</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
            {photo ? (
              <div style={{ position: "relative", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border-red)" }}>
                <img src={photo} alt="Progress" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: "50%", color: "#fff", width: 24, height: 24, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
                >×</button>
              </div>
            ) : (
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => fileRef.current?.click()}
                style={{ width: "100%", padding: "28px", background: "var(--surface2)", border: "2px dashed var(--border)", borderRadius: "var(--radius-md)", color: "var(--text-dim)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-red)"; e.currentTarget.style.color = "var(--text)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)";     e.currentTarget.style.color = "var(--text-dim)"; }}
              >
                <span style={{ fontSize: 28 }}>📸</span>
                <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", letterSpacing: 0.5 }}>CLICK TO UPLOAD PHOTO</span>
              </motion.button>
            )}
          </div>

          {/* Save */}
          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            style={{ padding: "11px", background: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 15, letterSpacing: 2, cursor: "pointer" }}
          >
            SAVE ENTRY
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Range selector ──────────────────────────────
const RANGES = ["1W", "2W", "1M", "ALL"];

// ─── Main Progress Page ──────────────────────────
export default function Progress() {
  const [range, setRange]         = useState("1M");
  const [logOpen, setLogOpen]     = useState(false);
  const [selectedBefore, setSelectedBefore] = useState(0);
  const [selectedAfter,  setSelectedAfter]  = useState(3);
  const [showAvg, setShowAvg]     = useState(true);
  const [showGoal, setShowGoal]   = useState(true);
  const [entries, setEntries]     = useState(WEIGHT_DATA);

  const filteredData = (() => {
    const n = range === "1W" ? 7 : range === "2W" ? 14 : range === "1M" ? 28 : entries.length;
    return entries.slice(-n);
  })();

  const firstW = filteredData[0]?.weight  ?? 0;
  const lastW  = filteredData[filteredData.length - 1]?.weight ?? 0;
  const diff   = (lastW - firstW).toFixed(1);
  const minW   = Math.min(...filteredData.map((d) => d.weight));
  const maxW   = Math.max(...filteredData.map((d) => d.weight));

  const handleSave = ({ weight, note, photo }) => {
    const now  = new Date();
    const date = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    setEntries((prev) => [
      ...prev,
      { date, weight, goal: 78, avg: weight, note },
    ]);
  };

  return (
    <div style={{ padding: "28px 32px" }}>

      {/* ── Summary stats strip ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y:   0 }}
        transition={{ duration: 0.35 }}
        style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}
      >
        {[
          { label: "STARTING WEIGHT", val: `${WEIGHT_DATA[0].weight} kg`,  color: "var(--text-dim)",  icon: "🏁" },
          { label: "CURRENT WEIGHT",  val: `${lastW} kg`,                  color: "var(--red)",       icon: "⚖️" },
          { label: "TOTAL LOST",      val: `${Math.abs((lastW - WEIGHT_DATA[0].weight).toFixed(1))} kg`, color: "var(--success)", icon: "📉" },
          { label: "GOAL WEIGHT",     val: "78.0 kg",                       color: "var(--warning)",   icon: "🎯" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y:  0 }}
            transition={{ duration: 0.35, delay: i * 0.07 }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}
            whileHover={{ borderColor: "var(--border-red)", y: -2, boxShadow: "0 6px 24px var(--red-glow)" }}
          >
            <span style={{ fontSize: 24 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 0.5, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 1, color: s.color, lineHeight: 1 }}>{s.val}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Main grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, marginBottom: 20 }}>

        {/* Weight chart */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y:  0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20 }}
        >
          {/* Chart header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: 2, color: "var(--text-dim)" }}>WEIGHT ANALYTICS</div>
              <div style={{ fontSize: 11, color: diff < 0 ? "var(--success)" : "var(--red)", fontFamily: "var(--font-mono)", marginTop: 3 }}>
                {diff < 0 ? "▼" : "▲"} {Math.abs(diff)} kg in selected period · Min {minW} · Max {maxW}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {/* Toggles */}
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { label: "AVG LINE", active: showAvg, onClick: () => setShowAvg((p) => !p), color: "var(--warning)" },
                  { label: "GOAL",     active: showGoal, onClick: () => setShowGoal((p) => !p), color: "var(--success)" },
                ].map((t) => (
                  <button
                    key={t.label}
                    onClick={t.onClick}
                    style={{ fontSize: 10, padding: "4px 10px", borderRadius: "var(--radius-sm)", border: `1px solid ${t.active ? t.color + "60" : "var(--border)"}`, background: t.active ? t.color + "15" : "transparent", color: t.active ? t.color : "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font-mono)", letterSpacing: 0.5, transition: "all 0.2s" }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {/* Range */}
              <div style={{ display: "flex", gap: 4 }}>
                {RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    style={{ fontSize: 11, padding: "5px 10px", borderRadius: "var(--radius-sm)", border: `1px solid ${range === r ? "var(--red)" : "var(--border)"}`, background: range === r ? "rgba(232,25,44,0.08)" : "transparent", color: range === r ? "var(--red)" : "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-mono)", transition: "all 0.2s" }}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {/* Log button */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setLogOpen(true)}
                style={{ padding: "6px 14px", background: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: 1.5, cursor: "pointer" }}
              >
                + LOG
              </motion.button>
            </div>
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#E8192C" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#E8192C" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="avgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#F59E0B" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
                axisLine={false}
                tickLine={false}
                interval={Math.floor(filteredData.length / 6)}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}kg`}
              />
              <Tooltip content={<CustomTooltip />} />
              {showGoal && (
                <ReferenceLine
                  y={78}
                  stroke="var(--success)"
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                  label={{ value: "GOAL 78kg", fill: "var(--success)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", position: "insideTopRight" }}
                />
              )}
              {showAvg && (
                <Area
                  type="monotone"
                  dataKey="avg"
                  stroke="var(--warning)"
                  strokeWidth={1.5}
                  fill="url(#avgGrad)"
                  strokeDasharray="4 2"
                  dot={false}
                  name="7-day avg"
                />
              )}
              <Area
                type="monotone"
                dataKey="weight"
                stroke="var(--red)"
                strokeWidth={2.5}
                fill="url(#weightGrad)"
                dot={(props) => {
                  const { cx, cy, index } = props;
                  if (index !== filteredData.length - 1) return <g key={index} />;
                  return (
                    <g key={index}>
                      <circle cx={cx} cy={cy} r={5} fill="var(--red)" />
                      <circle cx={cx} cy={cy} r={9} fill="none" stroke="var(--red)" strokeWidth={1.5} opacity={0.4} />
                    </g>
                  );
                }}
                activeDot={{ r: 6, fill: "var(--red)", stroke: "var(--bg)", strokeWidth: 2 }}
                name="weight"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Right col: stats + history */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Weekly breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y:  0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 16 }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 2, color: "var(--text-dim)", marginBottom: 14 }}>WEEKLY BREAKDOWN</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { week: "This week",  start: 81.2, end: 80.4, days: 7  },
                { week: "Last week",  start: 82.0, end: 81.2, days: 7  },
                { week: "2 weeks ago",start: 82.8, end: 82.0, days: 7  },
                { week: "3 weeks ago",start: 83.2, end: 82.8, days: 7  },
              ].map((w) => {
                const d    = (w.end - w.start).toFixed(1);
                const isNeg= d < 0;
                return (
                  <div
                    key={w.week}
                    style={{ padding: "10px 12px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>{w.week}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{w.start} → {w.end} kg</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: isNeg ? "var(--success)" : "var(--red)", fontWeight: 600 }}>
                        {isNeg ? "▼" : "▲"} {Math.abs(d)} kg
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Recent entries */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y:  0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 16, flex: 1 }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 2, color: "var(--text-dim)", marginBottom: 14 }}>RECENT ENTRIES</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
              {[...entries].reverse().slice(0, 10).map((e, i) => (
                <div
                  key={i}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "var(--surface2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
                >
                  <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>{e.date}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 0.5, color: i === 0 ? "var(--red)" : "var(--text)" }}>
                    {e.weight} <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>kg</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Photo Comparison ── */}
      <div className="section-header">
        <div className="section-title">PHOTO COMPARISON</div>
        <div className="section-line" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y:  0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, marginBottom: 24, alignItems: "start" }}
      >
        {/* Slider */}
        <div style={{ width: 260 }}>
          <ComparisonSlider
            before={MOCK_PHOTOS[selectedBefore]}
            after={MOCK_PHOTOS[selectedAfter]}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
            <span>← drag to compare →</span>
            <span style={{ color: "var(--success)" }}>
              ▼ {(MOCK_PHOTOS[selectedBefore].weight - MOCK_PHOTOS[selectedAfter].weight).toFixed(1)} kg lost
            </span>
          </div>
        </div>

        {/* Photo vault grid */}
        <div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 0.5, marginBottom: 10 }}>
            SELECT BEFORE / AFTER — click a photo to set it
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {MOCK_PHOTOS.map((p, i) => (
              <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div
                  onClick={() => {
                    if (i < selectedAfter) setSelectedBefore(i);
                    else setSelectedAfter(i);
                  }}
                  style={{ position: "relative" }}
                >
                  <BodySilhouette
                    label={p.label}
                    gradient={p.gradient}
                    weight={p.weight}
                    date={p.date}
                    highlight={i === selectedBefore || i === selectedAfter}
                  />
                  {/* Selection indicator */}
                  {(i === selectedBefore || i === selectedAfter) && (
                    <div style={{
                      position: "absolute", top: 4, right: 4,
                      background: i === selectedBefore ? "var(--surface3)" : "var(--red)",
                      borderRadius: "var(--radius-sm)",
                      padding: "2px 6px",
                      fontSize: 9,
                      color: "#fff",
                      fontFamily: "var(--font-mono)",
                      letterSpacing: 0.5,
                    }}>
                      {i === selectedBefore ? "BEFORE" : "AFTER"}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Upload new photo cta */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setLogOpen(true)}
            style={{ marginTop: 12, width: "100%", padding: "12px", background: "transparent", border: "2px dashed var(--border)", borderRadius: "var(--radius-md)", color: "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-red)"; e.currentTarget.style.color = "var(--red)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)";     e.currentTarget.style.color = "var(--text-dim)"; }}
          >
            📸 LOG WEIGHT + UPLOAD NEW PHOTO
          </motion.button>
        </div>
      </motion.div>

      {/* Log Modal */}
      <AnimatePresence>
        {logOpen && <LogModal onClose={() => setLogOpen(false)} onSave={handleSave} />}
      </AnimatePresence>
    </div>
  );
}