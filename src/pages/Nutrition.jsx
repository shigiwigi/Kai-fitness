// ═══════════════════════════════════════════════
//   KAI FITNESS — Nutrition.jsx
//   Place at: src/pages/Nutrition.jsx
//   Unified food search: barcode + name search
// ═══════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection, addDoc, deleteDoc, doc,
  query, where, orderBy, onSnapshot,
  serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

// ─────────────────────────────────────────────────
//  PASTE YOUR FREE USDA API KEY HERE
//  Get it free at: https://fdc.nal.usda.gov/api-key-signup.html
// ─────────────────────────────────────────────────
const USDA_API_KEY = "rBdXtNSTLfIReLMGL8FDZhadgY3vvVeNHawcPTHr";

// ─── USDA FoodData Central search ────────────────
// Searches 600,000+ foods by name: "chicken breast", "rice", "dosa", etc.
async function searchUSDA(query) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&api_key=${USDA_API_KEY}&pageSize=12&dataType=Foundation,SR%20Legacy,Survey%20(FNDDS)`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("USDA API error");
  const data = await res.json();
  return (data.foods || []).map((f) => {
    const get = (name) => {
      const n = f.foodNutrients?.find((x) => x.nutrientName?.toLowerCase().includes(name));
      return n ? Math.round((n.value || 0) * 10) / 10 : 0;
    };
    return {
      name:    f.description || "Unknown",
      brand:   f.brandOwner  || f.dataType || "USDA",
      serving: "100g",
      cal:     Math.round(get("energy") || get("calories")),
      protein: get("protein"),
      carbs:   get("carbohydrate"),
      fat:     get("total lipid"),
      fiber:   get("fiber"),
      fdcId:   f.fdcId,
    };
  });
}

// ─── Open Food Facts barcode lookup ──────────────
async function fetchByBarcode(barcode) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode.trim()}.json`);
  if (!res.ok) throw new Error("Network error");
  const data = await res.json();
  if (data.status !== 1 || !data.product) {
    // Fallback: also try USDA barcode search
    return null;
  }
  const p = data.product;
  const n = p.nutriments || {};
  const hasSrv = n["energy-kcal_serving"] != null;
  return {
    name:    p.product_name || p.abbreviated_product_name || "Unknown Product",
    brand:   p.brands       || "Unknown Brand",
    serving: p.serving_size || (hasSrv ? "1 serving" : "100g"),
    cal:     Math.round(hasSrv ? n["energy-kcal_serving"]    : n["energy-kcal_100g"]    ?? 0),
    protein: Math.round(((hasSrv ? n["proteins_serving"]      : n["proteins_100g"]      ?? 0)) * 10) / 10,
    carbs:   Math.round(((hasSrv ? n["carbohydrates_serving"] : n["carbohydrates_100g"] ?? 0)) * 10) / 10,
    fat:     Math.round(((hasSrv ? n["fat_serving"]           : n["fat_100g"]           ?? 0)) * 10) / 10,
    fiber:   Math.round(((hasSrv ? n["fiber_serving"]         : n["fiber_100g"]         ?? 0)) * 10) / 10,
    barcode,
  };
}

// ─── BarcodeDetector helper ──────────────────────
async function decodeBarcodeFromImage(imgSrc) {
  try {
    if (!("BarcodeDetector" in window)) return null;
    const detector = new window.BarcodeDetector({ formats: ["ean_13","ean_8","upc_a","upc_e","code_128","code_39","qr_code"] });
    const img = new Image();
    img.src = imgSrc;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    const found = await detector.detect(img);
    return found.length > 0 ? found[0].rawValue : null;
  } catch { return null; }
}

// ─── Demo barcodes ───────────────────────────────
const DEMO_CODES = [
  { code: "737628064502", label: "Quest Bar"    },
  { code: "049000028911", label: "Coca-Cola"    },
  { code: "038000845017", label: "Special K"    },
  { code: "016000275287", label: "Cheerios"     },
  { code: "021130126026", label: "Greek Yogurt" },
];

// ─── Popular quick-search suggestions ────────────
const QUICK_SEARCHES = [
  "chicken breast","brown rice","egg","banana","oats","milk",
  "salmon","sweet potato","lentils","Greek yogurt","almonds","apple",
];

// ═══════════════════════════════════════════════
//  UNIFIED FOOD SEARCH MODAL
// ═══════════════════════════════════════════════
function FoodSearchModal({ onClose, onAdd }) {
  // ── tabs: "search" | "camera" | "upload"
  const [tab,         setTab]        = useState("search");
  const [query,       setQuery]      = useState("");
  const [results,     setResults]    = useState([]);
  const [selected,    setSelected]   = useState(null);
  const [loading,     setLoading]    = useState(false);
  const [error,       setError]      = useState("");
  const [qty,         setQty]        = useState(1);
  const [barcodeCode, setBarcodeCode]= useState("");
  const [uploadedImg, setUploadedImg]= useState(null);
  const [uploadMsg,   setUploadMsg]  = useState("");
  const [camReady,    setCamReady]   = useState(false);
  const [camError,    setCamError]   = useState("");
  const searchTimeout = useRef(null);
  const videoRef      = useRef(null);
  const streamRef     = useRef(null);
  const scannerRef    = useRef(null);
  const fileRef       = useRef(null);
  const inputRef      = useRef(null);

  // ── Camera ───────────────────────────────────
  const stopCamera = useCallback(() => {
    if (scannerRef.current) { clearInterval(scannerRef.current); scannerRef.current = null; }
    if (streamRef.current)  { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setCamReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCamError(""); setCamReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(() => {});
            setCamReady(true);
            // Auto-scan with BarcodeDetector
            if ("BarcodeDetector" in window) {
              const det = new window.BarcodeDetector({ formats: ["ean_13","ean_8","upc_a","upc_e","code_128","code_39"] });
              scannerRef.current = setInterval(async () => {
                if (!videoRef.current || videoRef.current.readyState < 2) return;
                try {
                  const codes = await det.detect(videoRef.current);
                  if (codes.length > 0) {
                    clearInterval(scannerRef.current);
                    handleBarcodeFound(codes[0].rawValue);
                  }
                } catch { /* silent */ }
              }, 500);
            }
          };
        }
      });
    } catch (e) {
      setCamError(
        e.name === "NotAllowedError" ? "Camera permission denied — allow camera in browser settings." :
        e.name === "NotFoundError"   ? "No camera found on this device." :
        `Camera error: ${e.message}`
      );
    }
  }, [stopCamera]);

  useEffect(() => {
    if (tab === "camera") startCamera();
    else stopCamera();
    return stopCamera;
  }, [tab]);

  // ── Barcode found (camera or upload) ─────────
  const handleBarcodeFound = async (code) => {
    setBarcodeCode(code);
    setLoading(true); setError(""); setResults([]); setSelected(null);
    try {
      const food = await fetchByBarcode(code);
      if (food) {
        setSelected(food);
        setTab("search"); // switch to result view
      } else {
        // No barcode result — search by code as text fallback
        setError(`No packaged product found for ${code}. Try searching by name.`);
        setTab("search");
        setQuery(code);
      }
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // ── Name search (USDA) ────────────────────────
  const doSearch = useCallback(async (q) => {
    if (!q.trim() || q.trim().length < 2) { setResults([]); return; }
    setLoading(true); setError(""); setSelected(null);
    try {
      const foods = await searchUSDA(q);
      setResults(foods);
      if (foods.length === 0) setError(`No results for "${q}" — try different keywords`);
    } catch (e) {
      // DEMO_KEY has rate limits — guide user
      if (e.message.includes("429") || USDA_API_KEY === "DEMO_KEY") {
        setError("USDA API key needed. Get your free key at fdc.nal.usda.gov/api-key-signup.html then paste it in Nutrition.jsx");
      } else {
        setError("Search failed — check your connection.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search as user types
  useEffect(() => {
    if (tab !== "search") return;
    clearTimeout(searchTimeout.current);
    if (query.trim().length >= 2) {
      searchTimeout.current = setTimeout(() => doSearch(query), 500);
    } else {
      setResults([]);
    }
    return () => clearTimeout(searchTimeout.current);
  }, [query, tab]);

  // ── Upload ────────────────────────────────────
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadMsg("Reading image…"); setResults([]); setSelected(null); setError(""); setBarcodeCode("");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const src = ev.target.result;
      setUploadedImg(src);
      setUploadMsg("Scanning for barcode…");
      const detected = await decodeBarcodeFromImage(src);
      if (detected) {
        setUploadMsg(`✓ Barcode found: ${detected} — fetching product…`);
        handleBarcodeFound(detected);
      } else {
        setUploadMsg("No barcode detected — switch to Search tab to look up by name.");
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Result card ───────────────────────────────
  const food = selected;
  const ResultPanel = () => !food ? null : (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      style={{ background:"var(--surface2)", border:"1px solid var(--border-red)", borderRadius:"var(--radius-md)", padding:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <div style={{ flex:1, minWidth:0, marginRight:10 }}>
          <div style={{ fontWeight:600, fontSize:13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{food.name}</div>
          <div style={{ fontSize:10, color:"var(--text-dim)", fontFamily:"var(--font-mono)", marginTop:2 }}>{food.brand} · {food.serving}</div>
        </div>
        <div style={{ fontFamily:"var(--font-display)", fontSize:22, color:"var(--red)", letterSpacing:1, flexShrink:0 }}>
          {Math.round(food.cal*qty)}<span style={{ fontSize:10, color:"var(--text-dim)", marginLeft:2, fontFamily:"var(--font-body)" }}>kcal</span>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:5, marginBottom:12 }}>
        {[["Protein",food.protein,"var(--red)"],["Carbs",food.carbs,"var(--warning)"],["Fat",food.fat,"var(--info)"],["Fiber",food.fiber,"var(--success)"]].map(([l,v,c]) => (
          <div key={l} style={{ textAlign:"center", padding:"6px 2px", background:"var(--surface3)", borderRadius:"var(--radius-sm)", border:"1px solid var(--border)" }}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:14, color:c }}>{Math.round(v*qty)}</div>
            <div style={{ fontSize:8, color:"var(--text-dim)", fontFamily:"var(--font-mono)", marginTop:1 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <span style={{ fontSize:10, color:"var(--text-dim)", fontFamily:"var(--font-mono)" }}>QTY:</span>
        <button onClick={() => setQty((q) => Math.max(0.5,+(q-0.5).toFixed(1)))} style={{ width:28, height:28, background:"var(--surface3)", border:"1px solid var(--border)", borderRadius:4, color:"var(--text)", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
        <span style={{ fontFamily:"var(--font-mono)", fontSize:13, minWidth:26, textAlign:"center" }}>{qty}</span>
        <button onClick={() => setQty((q) => +(q+0.5).toFixed(1))} style={{ width:28, height:28, background:"var(--surface3)", border:"1px solid var(--border)", borderRadius:4, color:"var(--text)", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
        <motion.button whileTap={{ scale:0.97 }} onClick={() => { onAdd(food,qty); onClose(); }}
          style={{ flex:1, padding:"9px", background:"var(--red)", border:"none", borderRadius:"var(--radius-sm)", color:"#fff", fontFamily:"var(--font-display)", fontSize:13, letterSpacing:1.5, cursor:"pointer" }}>
          + ADD TO LOG
        </motion.button>
      </div>
    </motion.div>
  );

  const supportsAutoScan = "BarcodeDetector" in window;

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", backdropFilter:"blur(6px)", zIndex:700, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
      onClick={onClose}>
      <motion.div
        initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
        transition={{ type:"spring", damping:32, stiffness:300 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width:"100%", maxWidth:540, background:"var(--surface)", borderRadius:"var(--radius-xl) var(--radius-xl) 0 0", border:"1px solid var(--border-md)", boxShadow:"var(--shadow-lg)", maxHeight:"94vh", display:"flex", flexDirection:"column" }}>

        {/* Drag handle */}
        <div style={{ display:"flex", justifyContent:"center", paddingTop:10, flexShrink:0 }}>
          <div style={{ width:36, height:4, borderRadius:2, background:"var(--surface4)" }} />
        </div>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 20px 0", flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:18, letterSpacing:2, color:"var(--text-dim)" }}>ADD FOOD</div>
            <div style={{ fontSize:10, color:"var(--text-muted)", fontFamily:"var(--font-mono)", marginTop:1 }}>Search · Scan · Upload</div>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", color:"var(--text-dim)", width:30, height:30, cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>

        {/* Tab pills */}
        <div style={{ display:"flex", margin:"10px 20px 0", background:"var(--surface2)", borderRadius:"var(--radius-md)", padding:3, gap:3, flexShrink:0 }}>
          {[
            { id:"search", label:"🔍 Search", desc:"by name" },
            { id:"camera", label:"📷 Scan",   desc:"barcode" },
            { id:"upload", label:"🖼 Upload",  desc:"photo"  },
          ].map((t) => (
            <button key={t.id}
              onClick={() => { setTab(t.id); setSelected(null); setError(""); setBarcodeCode(""); setUploadedImg(null); setUploadMsg(""); }}
              style={{ flex:1, padding:"7px 4px", background:tab===t.id?"var(--surface)":"transparent", border:"none", borderRadius:"var(--radius-sm)", color:tab===t.id?"var(--text)":"var(--text-dim)", cursor:"pointer", transition:"all 0.2s", boxShadow:tab===t.id?"0 1px 4px rgba(0,0,0,0.3)":"none" }}>
              <div style={{ fontSize:12, fontFamily:"var(--font-mono)" }}>{t.label}</div>
              <div style={{ fontSize:9, color: tab===t.id ? "var(--text-dim)" : "var(--text-muted)", marginTop:1 }}>{t.desc}</div>
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:"auto", padding:"14px 20px 24px", display:"flex", flexDirection:"column", gap:12 }}>

          {/* ═══ SEARCH TAB ═══ */}
          {tab === "search" && (
            <>
              {/* Search input */}
              <div style={{ position:"relative" }}>
                <input
                  ref={inputRef}
                  className="input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key==="Enter" && doSearch(query)}
                  placeholder="Search any food — chicken breast, rice, dosa…"
                  autoFocus
                  style={{ paddingRight:44 }}
                />
                {loading ? (
                  <div className="spinner" style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", width:16, height:16 }} />
                ) : query && (
                  <button onClick={() => { setQuery(""); setResults([]); setSelected(null); inputRef.current?.focus(); }}
                    style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", color:"var(--text-muted)", cursor:"pointer", fontSize:16, lineHeight:1 }}>×</button>
                )}
              </div>

              {/* Quick search pills */}
              {!query && !selected && (
                <div>
                  <div style={{ fontSize:10, color:"var(--text-muted)", fontFamily:"var(--font-mono)", marginBottom:7, letterSpacing:0.5 }}>QUICK SEARCH</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {QUICK_SEARCHES.map((s) => (
                      <button key={s} onClick={() => { setQuery(s); doSearch(s); }}
                        style={{ padding:"5px 11px", borderRadius:20, border:"1px solid var(--border)", background:"var(--surface2)", color:"var(--text-dim)", cursor:"pointer", fontSize:11, fontFamily:"var(--font-mono)", transition:"all 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor="var(--border-red)"; e.currentTarget.style.color="var(--red)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.color="var(--text-dim)"; }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Barcode fallback input */}
              {!query && !selected && (
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <div style={{ flex:1, height:1, background:"var(--border)" }} />
                  <span style={{ fontSize:10, color:"var(--text-muted)", fontFamily:"var(--font-mono)", whiteSpace:"nowrap" }}>OR ENTER BARCODE</span>
                  <div style={{ flex:1, height:1, background:"var(--border)" }} />
                </div>
              )}
              {!query && !selected && (
                <div style={{ display:"flex", gap:8 }}>
                  <input className="input" style={{ flex:1 }} value={barcodeCode}
                    onChange={(e) => setBarcodeCode(e.target.value)}
                    placeholder="Enter barcode number…" inputMode="numeric"
                    onKeyDown={(e) => e.key==="Enter" && handleBarcodeFound(barcodeCode)} />
                  <button onClick={() => handleBarcodeFound(barcodeCode)} disabled={loading||!barcodeCode.trim()}
                    style={{ padding:"9px 14px", background:"var(--red)", border:"none", borderRadius:"var(--radius-sm)", color:"#fff", cursor:"pointer", fontFamily:"var(--font-mono)", fontSize:11, opacity:barcodeCode.trim()?1:0.5 }}>
                    {loading ? <div className="spinner" style={{ width:13, height:13 }} /> : "FETCH"}
                  </button>
                </div>
              )}

              {/* Search results list */}
              {results.length > 0 && !selected && (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <div style={{ fontSize:10, color:"var(--text-muted)", fontFamily:"var(--font-mono)", letterSpacing:0.5 }}>{results.length} RESULTS (per 100g unless stated)</div>
                  {results.map((f, i) => (
                    <motion.button key={f.fdcId || i}
                      initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.03 }}
                      onClick={() => { setSelected(f); setQty(1); }}
                      style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"11px 13px", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor="var(--border-red)"; e.currentTarget.style.background="var(--surface3)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.background="var(--surface2)"; }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{f.name}</div>
                        <div style={{ fontSize:10, color:"var(--text-muted)", fontFamily:"var(--font-mono)", marginTop:1 }}>{f.brand} · {f.serving}</div>
                      </div>
                      <div style={{ display:"flex", gap:10, flexShrink:0 }}>
                        {[["P",f.protein,"var(--red)"],["C",f.carbs,"var(--warning)"],["F",f.fat,"var(--info)"]].map(([l,v,c]) => (
                          <div key={l} style={{ textAlign:"center", minWidth:28 }}>
                            <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:c }}>{v}g</div>
                            <div style={{ fontSize:8, color:"var(--text-muted)" }}>{l}</div>
                          </div>
                        ))}
                        <div style={{ textAlign:"center", minWidth:36 }}>
                          <div style={{ fontFamily:"var(--font-display)", fontSize:14, color:"var(--red)", letterSpacing:0.5 }}>{f.cal}</div>
                          <div style={{ fontSize:8, color:"var(--text-muted)" }}>kcal</div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Selected result → show qty + add */}
              {selected && (
                <div>
                  <button onClick={() => { setSelected(null); }}
                    style={{ display:"flex", alignItems:"center", gap:5, marginBottom:10, background:"transparent", border:"none", color:"var(--text-dim)", cursor:"pointer", fontSize:11, fontFamily:"var(--font-mono)", padding:0 }}>
                    ← back to results
                  </button>
                  <ResultPanel />
                </div>
              )}
            </>
          )}

          {/* ═══ CAMERA TAB ═══ */}
          {tab === "camera" && (
            <>
              <div style={{ position:"relative", borderRadius:"var(--radius-lg)", overflow:"hidden", background:"#000", aspectRatio:"4/3" }}>
                <video ref={videoRef} muted playsInline autoPlay
                  style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", opacity:camReady?1:0 }} />

                {/* Corner guides */}
                {["tl","tr","bl","br"].map((p,i) => (
                  <div key={p} style={{ position:"absolute",
                    top:i<2?14:undefined, bottom:i>=2?14:undefined,
                    left:i%2===0?14:undefined, right:i%2===1?14:undefined,
                    width:22, height:22,
                    borderTop:i<2?"2.5px solid var(--red)":undefined,
                    borderBottom:i>=2?"2.5px solid var(--red)":undefined,
                    borderLeft:i%2===0?"2.5px solid var(--red)":undefined,
                    borderRight:i%2===1?"2.5px solid var(--red)":undefined,
                  }} />
                ))}

                {camReady && supportsAutoScan && (
                  <motion.div animate={{ y:["0%","88%","0%"] }} transition={{ duration:2.5, repeat:Infinity, ease:"easeInOut" }}
                    style={{ position:"absolute", left:14, right:14, height:2, background:"linear-gradient(to right,transparent,var(--red),transparent)", boxShadow:"0 0 8px var(--red)" }} />
                )}

                {!camReady && !camError && (
                  <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10 }}>
                    <div className="spinner" style={{ width:24, height:24 }} />
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"rgba(255,255,255,0.6)" }}>Starting camera…</span>
                  </div>
                )}

                {camError && (
                  <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, padding:20, background:"rgba(0,0,0,0.75)" }}>
                    <span style={{ fontSize:28 }}>📵</span>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--red)", textAlign:"center", lineHeight:1.6 }}>{camError}</span>
                    <motion.button whileTap={{ scale:0.96 }} onClick={startCamera}
                      style={{ padding:"7px 18px", background:"var(--red)", border:"none", borderRadius:"var(--radius-sm)", color:"#fff", fontFamily:"var(--font-mono)", fontSize:11, cursor:"pointer" }}>
                      RETRY
                    </motion.button>
                  </div>
                )}

                {camReady && (
                  <div style={{ position:"absolute", bottom:10, left:"50%", transform:"translateX(-50%)", fontFamily:"var(--font-mono)", fontSize:9, color:"rgba(255,255,255,0.8)", background:"rgba(0,0,0,0.55)", padding:"3px 10px", borderRadius:4, whiteSpace:"nowrap" }}>
                    {supportsAutoScan ? "Auto-scanning — hold barcode steady" : "Point camera at barcode · type number below"}
                  </div>
                )}
              </div>

              {/* Barcode fallback input below camera */}
              <div style={{ display:"flex", gap:8 }}>
                <input className="input" style={{ flex:1 }} value={barcodeCode}
                  onChange={(e) => setBarcodeCode(e.target.value)}
                  placeholder={loading ? "Fetching…" : "Or type barcode number…"}
                  onKeyDown={(e) => e.key==="Enter" && handleBarcodeFound(barcodeCode)}
                  inputMode="numeric" />
                <button onClick={() => handleBarcodeFound(barcodeCode)} disabled={loading||!barcodeCode.trim()}
                  style={{ padding:"9px 14px", background:barcodeCode.trim()?"var(--red)":"var(--surface3)", border:"none", borderRadius:"var(--radius-sm)", color:"#fff", cursor:barcodeCode.trim()?"pointer":"not-allowed", fontFamily:"var(--font-mono)", fontSize:11, opacity:barcodeCode.trim()?1:0.5 }}>
                  {loading ? <div className="spinner" style={{ width:13, height:13 }} /> : "GO"}
                </button>
              </div>

              {selected && <ResultPanel />}
            </>
          )}

          {/* ═══ UPLOAD TAB ═══ */}
          {tab === "upload" && (
            <>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display:"none" }} />

              {uploadedImg ? (
                <div style={{ position:"relative", borderRadius:"var(--radius-lg)", overflow:"hidden", border:`1px solid ${uploadMsg.includes("✓") ? "var(--border-red)" : "var(--border)"}` }}>
                  <img src={uploadedImg} alt="" style={{ width:"100%", maxHeight:200, objectFit:"contain", display:"block", background:"#000" }} />
                  <button onClick={() => { setUploadedImg(null); setUploadMsg(""); setBarcodeCode(""); setSelected(null); setError(""); }}
                    style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.65)", border:"none", borderRadius:"50%", color:"#fff", width:26, height:26, cursor:"pointer", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                </div>
              ) : (
                <motion.button whileTap={{ scale:0.97 }} onClick={() => fileRef.current?.click()}
                  style={{ padding:"36px 20px", background:"var(--surface2)", border:"2px dashed var(--border)", borderRadius:"var(--radius-lg)", color:"var(--text-dim)", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:8, transition:"all 0.2s", width:"100%" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor="var(--border-red)"; e.currentTarget.style.color="var(--text)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.color="var(--text-dim)"; }}>
                  <span style={{ fontSize:40 }}>🖼</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:12, letterSpacing:0.5 }}>TAP TO UPLOAD BARCODE PHOTO</span>
                  <span style={{ fontSize:10, color:"var(--text-muted)", fontFamily:"var(--font-mono)" }}>Gallery or camera · auto-reads barcode</span>
                </motion.button>
              )}

              {uploadMsg && (
                <div style={{ padding:"8px 12px", background:uploadMsg.includes("✓")?"rgba(34,197,94,0.07)":uploadMsg.includes("No barcode")?"rgba(245,158,11,0.07)":"rgba(99,102,241,0.07)", border:`1px solid ${uploadMsg.includes("✓")?"rgba(34,197,94,0.3)":uploadMsg.includes("No barcode")?"rgba(245,158,11,0.3)":"rgba(99,102,241,0.3)"}`, borderRadius:"var(--radius-sm)", fontSize:11, color:uploadMsg.includes("✓")?"var(--success)":uploadMsg.includes("No barcode")?"var(--warning)":"var(--info)", fontFamily:"var(--font-mono)", lineHeight:1.5 }}>
                  {loading ? "🔍 Fetching product data…" : uploadMsg}
                </div>
              )}

              {/* Manual fallback after upload */}
              {uploadedImg && !selected && (
                <div style={{ display:"flex", gap:8 }}>
                  <input className="input" style={{ flex:1 }} value={barcodeCode}
                    onChange={(e) => setBarcodeCode(e.target.value)}
                    placeholder="Type barcode number manually…"
                    onKeyDown={(e) => e.key==="Enter" && handleBarcodeFound(barcodeCode)}
                    inputMode="numeric" />
                  <button onClick={() => handleBarcodeFound(barcodeCode)} disabled={loading||!barcodeCode.trim()}
                    style={{ padding:"9px 14px", background:barcodeCode.trim()?"var(--red)":"var(--surface3)", border:"none", borderRadius:"var(--radius-sm)", color:"#fff", cursor:barcodeCode.trim()?"pointer":"not-allowed", fontFamily:"var(--font-mono)", fontSize:11, opacity:barcodeCode.trim()?1:0.5 }}>
                    {loading ? <div className="spinner" style={{ width:13, height:13 }} /> : "GO"}
                  </button>
                </div>
              )}

              {selected && <ResultPanel />}
            </>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding:"9px 12px", background:"rgba(232,25,44,0.07)", border:"1px solid var(--border-red)", borderRadius:"var(--radius-sm)", fontSize:11, color:"var(--red)", fontFamily:"var(--font-mono)", lineHeight:1.5 }}>
              {error}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}


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
  const [foodOpen,    setFoodOpen]    = useState(false);
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
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => setFoodOpen(true)}
          style={{ padding: "9px 18px", background: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 2, cursor: "pointer" }}>
          🔍 ADD FOOD
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
        {foodOpen    && <FoodSearchModal onClose={() => setFoodOpen(false)}   onAdd={addMeal} />}
        {customOpen && <CustomMealModal onClose={() => setCustomOpen(false)} onAdd={addMeal} />}
      </AnimatePresence>
    </div>
  );
}