// ═══════════════════════════════════════════════
//   KAI FITNESS — Nutrition.jsx
//   Barcode Scanner · Meal Log · Calorie Tracker
// ═══════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Mock food database ──────────────────────────
const FOOD_DB = {
  "737628064502": { name: "Quest Protein Bar",      brand: "Quest Nutrition", cal: 190, protein: 21, carbs: 21, fat: 8,  fiber: 14, serving: "60g" },
  "049000028911": { name: "Coca-Cola Classic",      brand: "The Coca-Cola Co", cal: 140, protein: 0,  carbs: 39, fat: 0,  fiber: 0,  serving: "355ml" },
  "016000275287": { name: "Cheerios Original",      brand: "General Mills",   cal: 100, protein: 3,  carbs: 20, fat: 2,  fiber: 3,  serving: "28g" },
  "021130126026": { name: "Greek Yogurt Plain",     brand: "Kroger",          cal: 90,  protein: 15, carbs: 7,  fat: 0,  fiber: 0,  serving: "170g" },
  "038000845017": { name: "Special K Original",     brand: "Kellogg's",       cal: 120, protein: 3,  carbs: 23, fat: 0,  fiber: 1,  serving: "31g" },
  "CUSTOM":        { name: "",                      brand: "",                cal: 0,   protein: 0,  carbs: 0,  fat: 0,  fiber: 0,  serving: "100g" },
};

const SAMPLE_BARCODES = Object.keys(FOOD_DB).filter((k) => k !== "CUSTOM");

// ─── Default meals for today ─────────────────────
const DEFAULT_MEALS = [
  { id: 1, name: "Eggs & Oats",       brand: "Home",         cal: 420, protein: 28, carbs: 45, fat: 12, time: "7:42 AM",  type: "breakfast" },
  { id: 2, name: "Chicken Salad",     brand: "Home",         cal: 610, protein: 48, carbs: 22, fat: 18, time: "12:30 PM", type: "lunch"     },
  { id: 3, name: "Pre-Workout Snack", brand: "Quest Nutrition", cal: 190, protein: 21, carbs: 21, fat: 8, time: "5:15 PM",  type: "snack"     },
];

const GOAL_CAL = 2400;

// ─── Macro colors ────────────────────────────────
const MACRO_COLOR = {
  protein: "var(--red)",
  carbs:   "var(--warning)",
  fat:     "var(--info)",
  fiber:   "var(--success)",
};

// ─── Confetti particle ───────────────────────────
function Confetti() {
  const particles = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    x:  Math.random() * 100,
    delay: Math.random() * 0.4,
    color: ["var(--red)","var(--warning)","var(--success)","var(--info)","#fff"][i % 5],
    size: 6 + Math.random() * 6,
  }));

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 900, overflow: "hidden" }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: "110vh", opacity: [1, 1, 0], rotate: 720 }}
          transition={{ duration: 2.2 + Math.random(), delay: p.delay, ease: "easeIn" }}
          style={{
            position:     "fixed",
            top:          0,
            width:        p.size,
            height:       p.size,
            borderRadius: Math.random() > 0.5 ? "50%" : 2,
            background:   p.color,
          }}
        />
      ))}
    </div>
  );
}

// ─── Barcode Scanner Modal ───────────────────────
function ScannerModal({ onClose, onFound }) {
  const [scanning, setScanning]   = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [qty, setQty]             = useState(1);

  const simulateScan = () => {
    setScanning(true);
    setResult(null);
    setError("");
    setTimeout(() => {
      const code = SAMPLE_BARCODES[Math.floor(Math.random() * SAMPLE_BARCODES.length)];
      fetchFood(code);
      setScanning(false);
    }, 1800);
  };

  const fetchFood = (code) => {
    setLoading(true);
    setError("");
    setTimeout(() => {
      const food = FOOD_DB[code];
      if (food) {
        setResult({ ...food, barcode: code });
      } else {
        setError(`No data found for barcode: ${code}`);
      }
      setLoading(false);
    }, 600);
  };

  const handleManual = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    fetchFood(manualCode.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{    opacity: 0 }}
      style={{
        position:       "fixed", inset: 0,
        background:     "rgba(0,0,0,0.8)",
        backdropFilter: "blur(6px)",
        zIndex:         700,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        padding:        24,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1,    opacity: 1 }}
        exit={{    scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width:        "100%",
          maxWidth:     480,
          background:   "var(--surface)",
          border:       "1px solid var(--border-md)",
          borderRadius: "var(--radius-xl)",
          overflow:     "hidden",
          boxShadow:    "var(--shadow-lg)",
        }}
      >
        {/* Header */}
        <div style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "16px 20px",
          borderBottom:   "1px solid var(--border)",
        }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: 2, color: "var(--text-dim)" }}>
            BARCODE SCANNER
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", width: 28, height: 28, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Camera view */}
          <div style={{
            background:   "var(--surface2)",
            border:       "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            height:       200,
            position:     "relative",
            overflow:     "hidden",
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
          }}>
            {/* Grid bg */}
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: "linear-gradient(rgba(232,25,44,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(232,25,44,0.04) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }} />

            {scanning ? (
              <>
                {/* Scan line animation */}
                <motion.div
                  animate={{ y: [0, 192, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  style={{
                    position: "absolute", left: 20, right: 20,
                    height:   2,
                    background: "linear-gradient(to right, transparent, var(--red), transparent)",
                    boxShadow: "0 0 8px var(--red)",
                  }}
                />
                <div style={{ position: "absolute", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--red)", letterSpacing: 1, top: 12 }}>
                  SCANNING...
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", zIndex: 1 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)", letterSpacing: 1 }}>
                  POINT CAMERA AT BARCODE
                </div>
              </div>
            )}

            {/* Corner markers */}
            {[
              { top: 16, left: 16,  borderTop: "2px solid var(--red)", borderLeft: "2px solid var(--red)" },
              { top: 16, right: 16, borderTop: "2px solid var(--red)", borderRight: "2px solid var(--red)" },
              { bottom: 16, left: 16,  borderBottom: "2px solid var(--red)", borderLeft: "2px solid var(--red)" },
              { bottom: 16, right: 16, borderBottom: "2px solid var(--red)", borderRight: "2px solid var(--red)" },
            ].map((s, i) => (
              <div key={i} style={{ position: "absolute", width: 20, height: 20, ...s }} />
            ))}
          </div>

          {/* Scan button */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={simulateScan}
            disabled={scanning || loading}
            style={{
              padding:      "11px",
              background:   scanning ? "var(--red-dim)" : "var(--red)",
              border:       "none",
              borderRadius: "var(--radius-sm)",
              color:        "#fff",
              fontFamily:   "var(--font-display)",
              fontSize:     15,
              letterSpacing: 2,
              cursor:       scanning ? "not-allowed" : "pointer",
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              gap:          8,
            }}
          >
            {scanning ? <><div className="spinner" style={{ width: 16, height: 16 }} /> SCANNING</> : "📷 SCAN BARCODE"}
          </motion.button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>OR ENTER MANUALLY</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          {/* Manual entry */}
          <form onSubmit={handleManual} style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Enter barcode number..."
              className="input"
              style={{ flex: 1 }}
            />
            <motion.button
              type="submit"
              whileTap={{ scale: 0.96 }}
              disabled={loading}
              style={{
                padding:      "9px 16px",
                background:   "var(--surface3)",
                border:       "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                color:        "var(--text)",
                cursor:       "pointer",
                fontFamily:   "var(--font-mono)",
                fontSize:     12,
                letterSpacing: 0.5,
                whiteSpace:   "nowrap",
              }}
            >
              {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : "FETCH"}
            </motion.button>
          </form>

          {/* Sample codes */}
          <div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: 6, letterSpacing: 0.5 }}>
              DEMO BARCODES:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SAMPLE_BARCODES.map((c) => (
                <button
                  key={c}
                  onClick={() => { setManualCode(c); fetchFood(c); }}
                  style={{
                    fontFamily:   "var(--font-mono)",
                    fontSize:     10,
                    padding:      "3px 8px",
                    borderRadius: "var(--radius-sm)",
                    border:       "1px solid var(--border)",
                    background:   "var(--surface3)",
                    color:        "var(--text-dim)",
                    cursor:       "pointer",
                    transition:   "all 0.2s",
                    letterSpacing: 0.3,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-red)"; e.currentTarget.style.color = "var(--red)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)";     e.currentTarget.style.color = "var(--text-dim)"; }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: "10px 12px", background: "rgba(232,25,44,0.07)", border: "1px solid var(--border-red)", borderRadius: "var(--radius-sm)", fontSize: 12, color: "var(--red)", fontFamily: "var(--font-mono)" }}>
              {error}
            </div>
          )}

          {/* Result card */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y:  0 }}
                exit={{    opacity: 0, y: 10 }}
                style={{
                  background:   "var(--surface2)",
                  border:       "1px solid var(--border-red)",
                  borderRadius: "var(--radius-md)",
                  padding:      16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{result.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2, fontFamily: "var(--font-mono)" }}>{result.brand} · {result.serving}</div>
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--red)", letterSpacing: 1 }}>
                    {result.cal * qty}
                    <span style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-body)", marginLeft: 2 }}>kcal</span>
                  </div>
                </div>

                {/* Macros */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
                  {[
                    { label: "Protein", val: result.protein * qty, unit: "g", color: MACRO_COLOR.protein },
                    { label: "Carbs",   val: result.carbs   * qty, unit: "g", color: MACRO_COLOR.carbs   },
                    { label: "Fat",     val: result.fat     * qty, unit: "g", color: MACRO_COLOR.fat     },
                    { label: "Fiber",   val: result.fiber   * qty, unit: "g", color: MACRO_COLOR.fiber   },
                  ].map((m) => (
                    <div key={m.label} style={{ textAlign: "center", padding: "8px 4px", background: "var(--surface3)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: m.color, letterSpacing: 0.5 }}>{m.val}</div>
                      <div style={{ fontSize: 9, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{m.label}</div>
                    </div>
                  ))}
                </div>

                {/* Qty + Add */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>QTY:</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => setQty((q) => Math.max(0.5, q - 0.5))} style={{ width: 26, height: 26, background: "var(--surface3)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, minWidth: 24, textAlign: "center" }}>{qty}</span>
                    <button onClick={() => setQty((q) => q + 0.5)} style={{ width: 26, height: 26, background: "var(--surface3)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { onFound(result, qty); onClose(); }}
                    style={{
                      flex:         1,
                      padding:      "8px",
                      background:   "var(--red)",
                      border:       "none",
                      borderRadius: "var(--radius-sm)",
                      color:        "#fff",
                      fontFamily:   "var(--font-display)",
                      fontSize:     13,
                      letterSpacing: 1.5,
                      cursor:       "pointer",
                    }}
                  >
                    + ADD TO DAILY LOG
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Custom Meal Modal ───────────────────────────
function CustomMealModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: "", brand: "", cal: "", protein: "", carbs: "", fat: "", serving: "100g" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.name || !form.cal) return;
    onAdd({
      name:    form.name,
      brand:   form.brand || "Custom",
      cal:     parseFloat(form.cal)     || 0,
      protein: parseFloat(form.protein) || 0,
      carbs:   parseFloat(form.carbs)   || 0,
      fat:     parseFloat(form.fat)     || 0,
      serving: form.serving,
    }, 1);
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
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 440, background: "var(--surface)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-xl)", overflow: "hidden", boxShadow: "var(--shadow-lg)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: 2, color: "var(--text-dim)" }}>CUSTOM MEAL</div>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", width: 28, height: 28, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <form onSubmit={handleAdd} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 1, display: "block", marginBottom: 5 }}>FOOD NAME *</label>
              <input className="input" value={form.name} onChange={set("name")} placeholder="e.g. Brown Rice" required autoFocus />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 1, display: "block", marginBottom: 5 }}>BRAND</label>
              <input className="input" value={form.brand} onChange={set("brand")} placeholder="Optional" />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 1, display: "block", marginBottom: 5 }}>SERVING SIZE</label>
              <input className="input" value={form.serving} onChange={set("serving")} placeholder="100g" />
            </div>
            {[
              { key: "cal",     label: "CALORIES *", placeholder: "350" },
              { key: "protein", label: "PROTEIN (g)", placeholder: "12" },
              { key: "carbs",   label: "CARBS (g)",   placeholder: "48" },
              { key: "fat",     label: "FAT (g)",     placeholder: "8"  },
            ].map((f) => (
              <div key={f.key}>
                <label style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 1, display: "block", marginBottom: 5 }}>{f.label}</label>
                <input className="input" type="number" value={form[f.key]} onChange={set(f.key)} placeholder={f.placeholder} required={f.key === "cal"} min="0" />
              </div>
            ))}
          </div>
          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            style={{ padding: "11px", background: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 15, letterSpacing: 2, cursor: "pointer", marginTop: 4 }}
          >
            + ADD TO LOG
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Macro donut ─────────────────────────────────
function MacroDonut({ protein, carbs, fat, size = 140 }) {
  const total = protein * 4 + carbs * 4 + fat * 9 || 1;
  const pPct  = (protein * 4) / total;
  const cPct  = (carbs   * 4) / total;
  const fPct  = (fat     * 9) / total;

  const r    = 52;
  const circ = 2 * Math.PI * r;

  const segs = [
    { pct: pPct, color: "var(--red)",     offset: 0 },
    { pct: cPct, color: "var(--warning)", offset: pPct * circ },
    { pct: fPct, color: "var(--info)",    offset: (pPct + cPct) * circ },
  ];

  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 400); return () => clearTimeout(t); }, []);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface3)" strokeWidth="12" />
        {segs.map((s, i) => (
          <circle
            key={i}
            cx="60" cy="60" r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="12"
            strokeDasharray={`${animated ? s.pct * circ : 0} ${circ}`}
            strokeDashoffset={-s.offset}
            style={{ transition: `stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1) ${i * 0.15}s` }}
          />
        ))}
      </svg>
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 1 }}>
          {Math.round(protein + carbs + fat)}
        </div>
        <div style={{ fontSize: 9, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>TOTAL G</div>
      </div>
    </div>
  );
}

// ─── Main Nutrition page ─────────────────────────
export default function Nutrition() {
  const [meals, setMeals]           = useState(DEFAULT_MEALS);
  const [scanOpen, setScanOpen]     = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [celebrate, setCelebrate]   = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const totals = meals.reduce(
    (acc, m) => ({
      cal:     acc.cal     + m.cal,
      protein: acc.protein + m.protein,
      carbs:   acc.carbs   + m.carbs,
      fat:     acc.fat     + m.fat,
    }),
    { cal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const remaining  = Math.max(0, GOAL_CAL - totals.cal);
  const calPct     = Math.min(100, (totals.cal / GOAL_CAL) * 100);
  const goalMet    = totals.cal >= GOAL_CAL;

  const addMeal = (food, qty) => {
    const now  = new Date();
    const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const newMeal = {
      id:      Date.now(),
      name:    food.name,
      brand:   food.brand,
      cal:     Math.round(food.cal     * qty),
      protein: Math.round(food.protein * qty),
      carbs:   Math.round(food.carbs   * qty),
      fat:     Math.round(food.fat     * qty),
      time,
      type: now.getHours() < 11 ? "breakfast" : now.getHours() < 15 ? "lunch" : now.getHours() < 18 ? "snack" : "dinner",
    };
    setMeals((prev) => {
      const updated = [...prev, newMeal];
      const newTotal = updated.reduce((a, m) => a + m.cal, 0);
      if (newTotal >= GOAL_CAL && !goalMet) {
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 3000);
      }
      return updated;
    });
  };

  const removeMeal = (id) => {
    setDeletingId(id);
    setTimeout(() => {
      setMeals((prev) => prev.filter((m) => m.id !== id));
      setDeletingId(null);
    }, 300);
  };

  const mealTypeColor = { breakfast: "var(--warning)", lunch: "var(--success)", snack: "var(--info)", dinner: "var(--red)" };
  const mealTypeIcon  = { breakfast: "🍳", lunch: "🥗", snack: "🍌", dinner: "🍽️" };

  return (
    <div style={{ padding: "28px 32px" }}>

      {/* Confetti */}
      <AnimatePresence>{celebrate && <Confetti />}</AnimatePresence>

      {/* ── Goal Reached Banner ── */}
      <AnimatePresence>
        {goalMet && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y:   0 }}
            exit={{    opacity: 0, y: -16 }}
            style={{
              marginBottom:   20,
              padding:        "14px 20px",
              background:     "rgba(34,197,94,0.08)",
              border:         "1px solid rgba(34,197,94,0.3)",
              borderRadius:   "var(--radius-lg)",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24 }}>🎯</span>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 2, color: "var(--success)" }}>DAILY GOAL REACHED!</div>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>You've hit your {GOAL_CAL.toLocaleString()} kcal target for today.</div>
              </div>
            </div>
            <span className="badge badge-green">✓ COMPLETE</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top row: Summary + Macros ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>

        {/* Calorie Summary */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y:  0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20 }}
        >
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: 2, color: "var(--text-dim)", marginBottom: 16 }}>
            DAILY CALORIES
          </div>

          {/* Big numbers row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 18 }}>
            {[
              { label: "CONSUMED", val: totals.cal,  color: "var(--red)"     },
              { label: "REMAINING",val: remaining,   color: goalMet ? "var(--success)" : "var(--text)" },
              { label: "GOAL",     val: GOAL_CAL,    color: "var(--text-dim)" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center", padding: "12px 8px", background: "var(--surface2)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: s.color, letterSpacing: 1, lineHeight: 1 }}>{s.val.toLocaleString()}</div>
                <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 4, letterSpacing: 0.5 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="progress-track" style={{ height: 8, borderRadius: 4 }}>
            <motion.div
              className={`progress-fill ${goalMet ? "green" : ""}`}
              initial={{ width: 0 }}
              animate={{ width: `${calPct}%` }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
              style={{ height: "100%", background: goalMet ? "var(--success)" : "var(--red)", borderRadius: 4, position: "relative", overflow: "hidden" }}
            >
              <div style={{ position: "absolute", top: 0, left: "-100%", width: "100%", height: "100%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)", animation: "shimmer 2s infinite" }} />
            </motion.div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
            <span>{calPct.toFixed(0)}% of daily goal</span>
            <span>{remaining > 0 ? `${remaining} kcal to go` : "✓ Goal reached!"}</span>
          </div>
        </motion.div>

        {/* Macro breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y:  0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20 }}
        >
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: 2, color: "var(--text-dim)", marginBottom: 16 }}>
            MACRONUTRIENTS
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <MacroDonut protein={totals.protein} carbs={totals.carbs} fat={totals.fat} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Protein", val: totals.protein, goal: 160, color: "var(--red)"     },
                { label: "Carbs",   val: totals.carbs,   goal: 280, color: "var(--warning)" },
                { label: "Fat",     val: totals.fat,     goal: 70,  color: "var(--info)"    },
              ].map((m) => (
                <div key={m.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
                    <span>{m.label}</span>
                    <span style={{ color: m.color }}>{m.val}g <span style={{ color: "var(--text-muted)" }}>/ {m.goal}g</span></span>
                  </div>
                  <div className="progress-track">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (m.val / m.goal) * 100)}%` }}
                      transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
                      style={{ height: "100%", background: m.color, borderRadius: 2 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Action Buttons ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setScanOpen(true)}
          style={{ padding: "10px 20px", background: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: 2, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
        >
          📷 SCAN BARCODE
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setCustomOpen(true)}
          style={{ padding: "10px 20px", background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: 2, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-red)"; e.currentTarget.style.color = "var(--text)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)";     e.currentTarget.style.color = "var(--text-dim)"; }}
        >
          ✏️ CUSTOM MEAL
        </motion.button>
      </div>

      {/* ── Meal Log ── */}
      <div className="section-header">
        <div className="section-title">TODAY'S MEALS</div>
        <div className="section-line" />
        <span className="badge badge-neutral">{meals.length} ITEMS</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <AnimatePresence>
          {meals.map((meal) => (
            <motion.div
              key={meal.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: deletingId === meal.id ? 0 : 1, x: deletingId === meal.id ? 20 : 0 }}
              exit={{    opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:          14,
                padding:      "14px 16px",
                background:   "var(--surface)",
                border:       "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                transition:   "border-color 0.2s, background 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-red)"; e.currentTarget.style.background = "var(--surface2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)";     e.currentTarget.style.background = "var(--surface)"; }}
            >
              {/* Type icon */}
              <div style={{
                width:        44, height: 44,
                borderRadius: "var(--radius-md)",
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
                fontSize:     20,
                flexShrink:   0,
                background:   `${mealTypeColor[meal.type]}18`,
                border:       `1px solid ${mealTypeColor[meal.type]}30`,
              }}>
                {mealTypeIcon[meal.type]}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meal.name}</div>
                  <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: `${mealTypeColor[meal.type]}18`, color: mealTypeColor[meal.type], fontFamily: "var(--font-mono)", letterSpacing: 0.5, flexShrink: 0 }}>
                    {meal.type.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                  {meal.brand} · {meal.time}
                </div>
              </div>

              {/* Macros */}
              <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                {[
                  { val: meal.protein, label: "P", color: "var(--red)"     },
                  { val: meal.carbs,   label: "C", color: "var(--warning)" },
                  { val: meal.fat,     label: "F", color: "var(--info)"    },
                ].map((m) => (
                  <div key={m.label} style={{ textAlign: "center", minWidth: 36 }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: m.color }}>{m.val}g</div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Calories */}
              <div style={{ textAlign: "right", flexShrink: 0, minWidth: 64 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--red)", letterSpacing: 1, lineHeight: 1 }}>{meal.cal}</div>
                <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>kcal</div>
              </div>

              {/* Delete */}
              <button
                onClick={() => removeMeal(meal.id)}
                style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-red)"; e.currentTarget.style.color = "var(--red)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)";     e.currentTarget.style.color = "var(--text-muted)"; }}
              >
                ×
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {meals.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontSize: 13, fontFamily: "var(--font-mono)" }}>
            No meals logged yet · Scan a barcode or add a custom meal to get started
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {scanOpen   && <ScannerModal   onClose={() => setScanOpen(false)}   onFound={addMeal} />}
        {customOpen && <CustomMealModal onClose={() => setCustomOpen(false)} onAdd={addMeal}   />}
      </AnimatePresence>
    </div>
  );
}