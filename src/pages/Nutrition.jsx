// ═══════════════════════════════════════════════
//   KAI FITNESS — Nutrition.jsx
//   Place at: src/pages/Nutrition.jsx
//   Real Firestore meal CRUD · Live calorie tracking
// ═══════════════════════════════════════════════

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection, addDoc, deleteDoc, doc,
  query, where, orderBy, onSnapshot,
  serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

// ─── Mock food DB ─────────────────────────────────
const FOOD_DB = {
  "737628064502": { name: "Quest Protein Bar",  brand: "Quest Nutrition",  cal: 190, protein: 21, carbs: 21, fat: 8,  fiber: 14, serving: "60g"   },
  "049000028911": { name: "Coca-Cola Classic",  brand: "The Coca-Cola Co", cal: 140, protein: 0,  carbs: 39, fat: 0,  fiber: 0,  serving: "355ml" },
  "016000275287": { name: "Cheerios Original",  brand: "General Mills",    cal: 100, protein: 3,  carbs: 20, fat: 2,  fiber: 3,  serving: "28g"   },
  "021130126026": { name: "Greek Yogurt Plain", brand: "Kroger",           cal: 90,  protein: 15, carbs: 7,  fat: 0,  fiber: 0,  serving: "170g"  },
  "038000845017": { name: "Special K Original", brand: "Kellogg's",        cal: 120, protein: 3,  carbs: 23, fat: 0,  fiber: 1,  serving: "31g"   },
};
const DEMO_CODES = Object.keys(FOOD_DB);

// ─── Helpers ─────────────────────────────────────
const todayStart = () => {
  const d = new Date(); d.setHours(0,0,0,0);
  return Timestamp.fromDate(d);
};

const mealTypeOf = () => {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 18) return "snack";
  return "dinner";
};

const MEAL_COLOR = { breakfast: "var(--warning)", lunch: "var(--success)", snack: "var(--info)", dinner: "var(--red)" };
const MEAL_ICON  = { breakfast: "🍳", lunch: "🥗", snack: "🍌", dinner: "🍽️" };

// ─── Confetti ─────────────────────────────────────
function Confetti() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 900, overflow: "hidden" }}>
      {Array.from({ length: 28 }, (_, i) => (
        <motion.div key={i}
          initial={{ y: -20, x: `${Math.random() * 100}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: "110vh", opacity: [1,1,0], rotate: 720 }}
          transition={{ duration: 2 + Math.random(), delay: Math.random() * 0.4, ease: "easeIn" }}
          style={{ position: "fixed", top: 0, width: 7 + Math.random() * 6, height: 7 + Math.random() * 6, borderRadius: Math.random() > 0.5 ? "50%" : 2, background: ["var(--red)","var(--warning)","var(--success)","var(--info)","#fff"][i % 5] }} />
      ))}
    </div>
  );
}

// ─── Macro Donut ──────────────────────────────────
function MacroDonut({ protein, carbs, fat }) {
  const total = protein * 4 + carbs * 4 + fat * 9 || 1;
  const segs  = [
    { pct: (protein * 4) / total, color: "var(--red)",     offset: 0 },
    { pct: (carbs   * 4) / total, color: "var(--warning)", offset: (protein * 4) / total },
    { pct: (fat     * 9) / total, color: "var(--info)",    offset: (protein * 4 + carbs * 4) / total },
  ];
  const r    = 52;
  const circ = 2 * Math.PI * r;
  const [anim, setAnim] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnim(true), 400); return () => clearTimeout(t); }, []);

  return (
    <div style={{ position: "relative", width: 140, height: 140, flexShrink: 0 }}>
      <svg width="140" height="140" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface3)" strokeWidth="12" />
        {segs.map((s, i) => (
          <circle key={i} cx="60" cy="60" r={r} fill="none" stroke={s.color} strokeWidth="12"
            strokeDasharray={`${anim ? s.pct * circ : 0} ${circ}`}
            strokeDashoffset={-s.offset * circ}
            style={{ transition: `stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1) ${i * 0.15}s` }} />
        ))}
      </svg>
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: 1 }}>{Math.round(protein + carbs + fat)}</div>
        <div style={{ fontSize: 9, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>TOTAL G</div>
      </div>
    </div>
  );
}

// ─── Scanner Modal ────────────────────────────────
function ScannerModal({ onClose, onAdd }) {
  const [scanning, setScanning] = useState(false);
  const [code,     setCode]     = useState("");
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [qty,      setQty]      = useState(1);

  const lookup = (c) => {
    setLoading(true); setError(""); setResult(null);
    setTimeout(() => {
      const food = FOOD_DB[c.trim()];
      if (food) setResult({ ...food, barcode: c });
      else      setError(`No data for barcode: ${c}`);
      setLoading(false);
    }, 500);
  };

  const simulateScan = () => {
    setScanning(true); setResult(null); setError("");
    setTimeout(() => {
      const c = DEMO_CODES[Math.floor(Math.random() * DEMO_CODES.length)];
      setCode(c); lookup(c); setScanning(false);
    }, 1600);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 460, background: "var(--surface)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-xl)", overflow: "hidden", boxShadow: "var(--shadow-lg)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 17, letterSpacing: 2, color: "var(--text-dim)" }}>BARCODE SCANNER</div>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", width: 28, height: 28, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Camera view */}
          <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", height: 180, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(232,25,44,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(232,25,44,0.04) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            {scanning ? (
              <>
                <motion.div animate={{ y: [0, 172, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                  style={{ position: "absolute", left: 20, right: 20, height: 2, background: "linear-gradient(to right, transparent, var(--red), transparent)", boxShadow: "0 0 8px var(--red)" }} />
                <div style={{ position: "absolute", top: 10, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--red)", letterSpacing: 1 }}>SCANNING...</div>
              </>
            ) : (
              <div style={{ textAlign: "center", zIndex: 1 }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>📷</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)", letterSpacing: 1 }}>POINT AT BARCODE</div>
              </div>
            )}
            {[{ top: 12, left: 12, borderTop: "2px solid var(--red)", borderLeft: "2px solid var(--red)" },
              { top: 12, right: 12, borderTop: "2px solid var(--red)", borderRight: "2px solid var(--red)" },
              { bottom: 12, left: 12, borderBottom: "2px solid var(--red)", borderLeft: "2px solid var(--red)" },
              { bottom: 12, right: 12, borderBottom: "2px solid var(--red)", borderRight: "2px solid var(--red)" },
            ].map((s, i) => <div key={i} style={{ position: "absolute", width: 18, height: 18, ...s }} />)}
          </div>

          <motion.button whileTap={{ scale: 0.96 }} onClick={simulateScan} disabled={scanning || loading}
            style={{ padding: "10px", background: scanning ? "var(--red-dim)" : "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: 2, cursor: scanning ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {scanning ? <><div className="spinner" style={{ width: 14, height: 14 }} /> SCANNING</> : "📷 SCAN BARCODE"}
          </motion.button>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>OR ENTER MANUALLY</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" style={{ flex: 1 }} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter barcode..." onKeyDown={(e) => e.key === "Enter" && lookup(code)} />
            <button onClick={() => lookup(code)} disabled={loading} style={{ padding: "9px 14px", background: "var(--surface3)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11 }}>
              {loading ? <div className="spinner" style={{ width: 13, height: 13 }} /> : "FETCH"}
            </button>
          </div>

          <div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: 6 }}>DEMO BARCODES:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {DEMO_CODES.map((c) => (
                <button key={c} onClick={() => { setCode(c); lookup(c); }}
                  style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "2px 7px", borderRadius: 3, border: "1px solid var(--border)", background: "var(--surface3)", color: "var(--text-dim)", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-red)"; e.currentTarget.style.color = "var(--red)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)";     e.currentTarget.style.color = "var(--text-dim)"; }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {error && <div style={{ padding: "8px 12px", background: "rgba(232,25,44,0.07)", border: "1px solid var(--border-red)", borderRadius: "var(--radius-sm)", fontSize: 11, color: "var(--red)", fontFamily: "var(--font-mono)" }}>{error}</div>}

          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ background: "var(--surface2)", border: "1px solid var(--border-red)", borderRadius: "var(--radius-md)", padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{result.name}</div>
                    <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{result.brand} · {result.serving}</div>
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--red)", letterSpacing: 1 }}>
                    {Math.round(result.cal * qty)}<span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-body)", marginLeft: 2 }}>kcal</span>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 12 }}>
                  {[["Protein", result.protein, "var(--red)"], ["Carbs", result.carbs, "var(--warning)"], ["Fat", result.fat, "var(--info)"], ["Fiber", result.fiber, "var(--success)"]].map(([l, v, c]) => (
                    <div key={l} style={{ textAlign: "center", padding: "7px 4px", background: "var(--surface3)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: c }}>{Math.round(v * qty)}</div>
                      <div style={{ fontSize: 9, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 1 }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>QTY:</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <button onClick={() => setQty((q) => Math.max(0.5, +(q - 0.5).toFixed(1)))} style={{ width: 24, height: 24, background: "var(--surface3)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, minWidth: 22, textAlign: "center" }}>{qty}</span>
                    <button onClick={() => setQty((q) => +(q + 0.5).toFixed(1))} style={{ width: 24, height: 24, background: "var(--surface3)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => { onAdd(result, qty); onClose(); }}
                    style={{ flex: 1, padding: "8px", background: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: 1.5, cursor: "pointer" }}>
                    + ADD TO LOG
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

// ─── Custom Meal Modal ────────────────────────────
function CustomMealModal({ onClose, onAdd }) {
  const [f, setF] = useState({ name: "", brand: "", cal: "", protein: "", carbs: "", fat: "", serving: "100g" });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 420, background: "var(--surface)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-xl)", overflow: "hidden", boxShadow: "var(--shadow-lg)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 17, letterSpacing: 2, color: "var(--text-dim)" }}>CUSTOM MEAL</div>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", width: 28, height: 28, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (!f.name || !f.cal) return; onAdd({ name: f.name, brand: f.brand || "Custom", cal: +f.cal, protein: +f.protein || 0, carbs: +f.carbs || 0, fat: +f.fat || 0, fiber: 0, serving: f.serving }, 1); onClose(); }} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
            {[
              { key: "name",    label: "FOOD NAME *", placeholder: "Brown Rice",    span: 2 },
              { key: "brand",   label: "BRAND",       placeholder: "Optional",      span: 1 },
              { key: "serving", label: "SERVING",     placeholder: "100g",          span: 1 },
              { key: "cal",     label: "CALORIES *",  placeholder: "350", type: "number", span: 1 },
              { key: "protein", label: "PROTEIN (g)", placeholder: "12",  type: "number", span: 1 },
              { key: "carbs",   label: "CARBS (g)",   placeholder: "48",  type: "number", span: 1 },
              { key: "fat",     label: "FAT (g)",     placeholder: "8",   type: "number", span: 1 },
            ].map((field) => (
              <div key={field.key} style={{ gridColumn: `span ${field.span}` }}>
                <label style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 1, display: "block", marginBottom: 4 }}>{field.label}</label>
                <input className="input" type={field.type || "text"} value={f[field.key]} onChange={set(field.key)} placeholder={field.placeholder} required={field.key === "name" || field.key === "cal"} min="0" />
              </div>
            ))}
          </div>
          <motion.button type="submit" whileTap={{ scale: 0.97 }} style={{ padding: "10px", background: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: 2, cursor: "pointer", marginTop: 2 }}>+ ADD TO LOG</motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────
export default function Nutrition() {
  const { currentUser, userProfile } = useAuth();

  const [meals,       setMeals]       = useState([]);
  const [scanOpen,    setScanOpen]    = useState(false);
  const [customOpen,  setCustomOpen]  = useState(false);
  const [celebrate,   setCelebrate]   = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [feedFilter,  setFeedFilter]  = useState("all");

  const goalCal = userProfile?.calorieGoal || 2400;

  // ── Real-time Firestore listener for today's meals ──
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "users", currentUser.uid, "meals"),
      where("createdAt", ">=", todayStart()),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMeals(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => { console.error("meals listener:", err); setLoading(false); });
    return unsub;
  }, [currentUser]);

  const totals = meals.reduce(
    (a, m) => ({ cal: a.cal + m.cal, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }),
    { cal: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const remaining = Math.max(0, goalCal - totals.cal);
  const calPct    = Math.min(100, (totals.cal / goalCal) * 100);
  const goalMet   = totals.cal >= goalCal;

  // ── Add meal to Firestore ──
  const addMeal = async (food, qty) => {
    if (!currentUser) return;
    const now  = new Date();
    const meal = {
      name:    food.name,
      brand:   food.brand || "Custom",
      cal:     Math.round(food.cal     * qty),
      protein: Math.round(food.protein * qty),
      carbs:   Math.round(food.carbs   * qty),
      fat:     Math.round(food.fat     * qty),
      fiber:   Math.round((food.fiber  || 0) * qty),
      time:    now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      type:    mealTypeOf(),
      createdAt: serverTimestamp(),
    };
    await addDoc(collection(db, "users", currentUser.uid, "meals"), meal);

    // Check goal
    if (totals.cal + meal.cal >= goalCal && !goalMet) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 3000);
    }
  };

  // ── Delete meal ──
  const deleteMeal = async (id) => {
    if (!currentUser) return;
    await deleteDoc(doc(db, "users", currentUser.uid, "meals", id));
  };

  const filtered = feedFilter === "all" ? meals : meals.filter((m) => m.type === feedFilter);

  return (
    <div className="page-content">
      <AnimatePresence>{celebrate && <Confetti />}</AnimatePresence>

      {/* Goal Banner */}
      <AnimatePresence>
        {goalMet && (
          <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
            style={{ marginBottom: 18, padding: "12px 18px", background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>🎯</span>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 15, letterSpacing: 2, color: "var(--success)" }}>DAILY GOAL REACHED!</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 1 }}>You've hit your {goalCal.toLocaleString()} kcal target.</div>
              </div>
            </div>
            <span className="badge badge-green">✓ COMPLETE</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top row */}
      <div className="grid-2col" style={{ marginBottom: 18 }}>

        {/* Calorie summary */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 17, letterSpacing: 2, color: "var(--text-dim)", marginBottom: 14 }}>DAILY CALORIES</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
            {[
              { label: "CONSUMED",  val: totals.cal,  color: "var(--red)"     },
              { label: "REMAINING", val: remaining,   color: goalMet ? "var(--success)" : "var(--text)" },
              { label: "GOAL",      val: goalCal,     color: "var(--text-dim)" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center", padding: "10px 6px", background: "var(--surface2)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: s.color, letterSpacing: 1, lineHeight: 1 }}>{s.val.toLocaleString()}</div>
                <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 3, letterSpacing: 0.5 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div className="progress-track" style={{ height: 7 }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${calPct}%` }} transition={{ duration: 1.2, ease: [0.4,0,0.2,1] }}
              style={{ height: "100%", background: goalMet ? "var(--success)" : "var(--red)", borderRadius: 4, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)", animation: "shimmer 2s infinite" }} />
            </motion.div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
            <span>{calPct.toFixed(0)}% of goal</span>
            <span>{remaining > 0 ? `${remaining} kcal to go` : "✓ Goal reached!"}</span>
          </div>
        </motion.div>

        {/* Macros */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 17, letterSpacing: 2, color: "var(--text-dim)", marginBottom: 14 }}>MACRONUTRIENTS</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <MacroDonut protein={totals.protein} carbs={totals.carbs} fat={totals.fat} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Protein", val: totals.protein, goal: userProfile?.proteinGoal || 160, color: "var(--red)"     },
                { label: "Carbs",   val: totals.carbs,   goal: userProfile?.carbGoal    || 280, color: "var(--warning)" },
                { label: "Fat",     val: totals.fat,     goal: userProfile?.fatGoal     || 70,  color: "var(--info)"    },
              ].map((m) => (
                <div key={m.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginBottom: 3 }}>
                    <span>{m.label}</span>
                    <span style={{ color: m.color }}>{m.val}g <span style={{ color: "var(--text-muted)" }}>/ {m.goal}g</span></span>
                  </div>
                  <div className="progress-track">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (m.val / m.goal) * 100)}%` }} transition={{ duration: 1.2, ease: [0.4,0,0.2,1] }}
                      style={{ height: "100%", background: m.color, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => setScanOpen(true)}
          style={{ padding: "9px 18px", background: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 2, cursor: "pointer" }}>
          📷 SCAN BARCODE
        </motion.button>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => setCustomOpen(true)}
          style={{ padding: "9px 18px", background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 2, cursor: "pointer", transition: "all 0.2s" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-red)"; e.currentTarget.style.color = "var(--text)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)";     e.currentTarget.style.color = "var(--text-dim)"; }}>
          ✏️ CUSTOM MEAL
        </motion.button>
      </div>

      {/* Meal log */}
      <div className="section-header">
        <div className="section-title">TODAY'S MEALS</div>
        <div className="section-line" />
        <div style={{ display: "flex", gap: 5 }}>
          {["all","breakfast","lunch","snack","dinner"].map((f) => (
            <button key={f} onClick={() => setFeedFilter(f)}
              style={{ fontSize: 10, padding: "3px 8px", borderRadius: "var(--radius-sm)", border: `1px solid ${feedFilter === f ? "var(--red)" : "var(--border)"}`, background: feedFilter === f ? "rgba(232,25,44,0.06)" : "transparent", color: feedFilter === f ? "var(--red)" : "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-mono)", letterSpacing: 0.5, transition: "all 0.2s" }}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <span className="badge badge-neutral">{meals.length} ITEMS</span>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}><div className="spinner" /></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <AnimatePresence>
            {filtered.map((meal) => (
              <motion.div key={meal.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20, height: 0 }} transition={{ duration: 0.22 }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-red)"; e.currentTarget.style.background = "var(--surface2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)";     e.currentTarget.style.background = "var(--surface)"; }}>
                <div style={{ width: 42, height: 42, borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, background: `${MEAL_COLOR[meal.type] || "var(--red)"}18`, border: `1px solid ${MEAL_COLOR[meal.type] || "var(--red)"}30` }}>
                  {MEAL_ICON[meal.type] || "🍽️"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meal.name}</div>
                    <span style={{ fontSize: 9, padding: "2px 5px", borderRadius: 3, background: `${MEAL_COLOR[meal.type] || "var(--red)"}18`, color: MEAL_COLOR[meal.type] || "var(--red)", fontFamily: "var(--font-mono)", letterSpacing: 0.5, flexShrink: 0 }}>{(meal.type || "meal").toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>{meal.brand} · {meal.time}</div>
                </div>
                <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                  {[["P", meal.protein, "var(--red)"], ["C", meal.carbs, "var(--warning)"], ["F", meal.fat, "var(--info)"]].map(([l, v, c]) => (
                    <div key={l} style={{ textAlign: "center", minWidth: 34 }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: c }}>{v}g</div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, minWidth: 60 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--red)", letterSpacing: 1 }}>{meal.cal}</div>
                  <div style={{ fontSize: 9, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>kcal</div>
                </div>
                <button onClick={() => deleteMeal(meal.id)}
                  style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-red)"; e.currentTarget.style.color = "var(--red)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)";     e.currentTarget.style.color = "var(--text-muted)"; }}>
                  ×
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && !loading && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-mono)" }}>
              {feedFilter === "all" ? "No meals logged yet · Scan a barcode or add a custom meal" : `No ${feedFilter} items logged`}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {scanOpen   && <ScannerModal   onClose={() => setScanOpen(false)}   onAdd={addMeal} />}
        {customOpen && <CustomMealModal onClose={() => setCustomOpen(false)} onAdd={addMeal} />}
      </AnimatePresence>
    </div>
  );
}