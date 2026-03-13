// ═══════════════════════════════════════════════
//   KAI FITNESS — Workout.jsx
//   AI Command Center · Dual-Mode · 3D Hologram
// ═══════════════════════════════════════════════

import { useState, useEffect, useRef, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Cylinder, Box } from "@react-three/drei";
import * as THREE from "three";

// ═══════════════════════════════════════════════
//  3D SQUAT AVATAR (built from primitives)
// ═══════════════════════════════════════════════

function SquatFigure({ phase }) {
  const groupRef = useRef();
  const torsoRef = useRef();
  const lThighRef = useRef();
  const rThighRef = useRef();
  const lShinRef  = useRef();
  const rShinRef  = useRef();
  const lArmRef   = useRef();
  const rArmRef   = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Breathing idle
    if (groupRef.current) groupRef.current.position.y = Math.sin(t * 1.2) * 0.02;

    // Squat animation: phase 0=standing, 1=bottom
    const squat = phase;
    const kneeAngle   = squat * 1.4; // radians
    const torsoLean   = squat * 0.3;
    const hipDrop     = squat * 0.55;

    if (torsoRef.current)  torsoRef.current.rotation.x  =  torsoLean;
    if (lThighRef.current) lThighRef.current.rotation.x =  kneeAngle;
    if (rThighRef.current) rThighRef.current.rotation.x =  kneeAngle;
    if (lShinRef.current)  lShinRef.current.rotation.x  = -kneeAngle * 1.6;
    if (rShinRef.current)  rShinRef.current.rotation.x  = -kneeAngle * 1.6;
    if (lArmRef.current)   lArmRef.current.rotation.x   =  torsoLean + squat * 0.5;
    if (rArmRef.current)   rArmRef.current.rotation.x   =  torsoLean + squat * 0.5;

    if (groupRef.current)  groupRef.current.position.y -= hipDrop;
  });

  const mat = {
    body: new THREE.MeshStandardMaterial({ color: "#E8192C", roughness: 0.4, metalness: 0.3 }),
    skin: new THREE.MeshStandardMaterial({ color: "#c0876a", roughness: 0.6 }),
    joint:new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.3, metalness: 0.5, transparent: true, opacity: 0.6 }),
    line: new THREE.MeshStandardMaterial({ color: "#ff4455", roughness: 0.3, emissive: "#E8192C", emissiveIntensity: 0.3 }),
  };

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Head */}
      <Sphere args={[0.18, 16, 16]} position={[0, 1.72, 0]}>
        <meshStandardMaterial color="#c0876a" roughness={0.6} />
      </Sphere>

      {/* Neck */}
      <Cylinder args={[0.07, 0.07, 0.15, 8]} position={[0, 1.56, 0]}>
        <meshStandardMaterial color="#c0876a" roughness={0.6} />
      </Cylinder>

      {/* Torso */}
      <group ref={torsoRef} position={[0, 1.1, 0]}>
        <Box args={[0.52, 0.62, 0.26]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#E8192C" roughness={0.4} metalness={0.2} />
        </Box>
        {/* Chest lines */}
        <Box args={[0.48, 0.02, 0.27]} position={[0, 0.1, 0]}>
          <meshStandardMaterial color="#ff2235" roughness={0.3} emissive="#E8192C" emissiveIntensity={0.4} />
        </Box>

        {/* Left Arm */}
        <group ref={lArmRef} position={[0.32, 0.22, 0]}>
          <Cylinder args={[0.07, 0.065, 0.38, 8]} position={[0, -0.19, 0]}>
            <meshStandardMaterial color="#E8192C" roughness={0.4} />
          </Cylinder>
          {/* Forearm */}
          <Cylinder args={[0.065, 0.055, 0.34, 8]} position={[0, -0.54, 0]}>
            <meshStandardMaterial color="#c0876a" roughness={0.5} />
          </Cylinder>
        </group>

        {/* Right Arm */}
        <group ref={rArmRef} position={[-0.32, 0.22, 0]}>
          <Cylinder args={[0.07, 0.065, 0.38, 8]} position={[0, -0.19, 0]}>
            <meshStandardMaterial color="#E8192C" roughness={0.4} />
          </Cylinder>
          <Cylinder args={[0.065, 0.055, 0.34, 8]} position={[0, -0.54, 0]}>
            <meshStandardMaterial color="#c0876a" roughness={0.5} />
          </Cylinder>
        </group>
      </group>

      {/* Hips */}
      <Box args={[0.5, 0.2, 0.26]} position={[0, 0.74, 0]}>
        <meshStandardMaterial color="#9C1120" roughness={0.5} />
      </Box>

      {/* Hip joint indicators */}
      <Sphere args={[0.09, 12, 12]} position={[ 0.28, 0.74, 0]}>
        <meshStandardMaterial color="#ffffff" transparent opacity={0.5} roughness={0.2} metalness={0.6} />
      </Sphere>
      <Sphere args={[0.09, 12, 12]} position={[-0.28, 0.74, 0]}>
        <meshStandardMaterial color="#ffffff" transparent opacity={0.5} roughness={0.2} metalness={0.6} />
      </Sphere>

      {/* Left Leg */}
      <group position={[0.22, 0.64, 0]}>
        {/* Thigh */}
        <group ref={lThighRef}>
          <Cylinder args={[0.1, 0.09, 0.44, 8]} position={[0, -0.22, 0]}>
            <meshStandardMaterial color="#c0392b" roughness={0.5} />
          </Cylinder>
          {/* Knee joint */}
          <Sphere args={[0.1, 12, 12]} position={[0, -0.44, 0]}>
            <meshStandardMaterial color="#ffffff" transparent opacity={0.45} roughness={0.2} metalness={0.6} />
          </Sphere>
          {/* Shin */}
          <group ref={lShinRef} position={[0, -0.44, 0]}>
            <Cylinder args={[0.09, 0.075, 0.42, 8]} position={[0, -0.21, 0]}>
              <meshStandardMaterial color="#9C1120" roughness={0.5} />
            </Cylinder>
            {/* Foot */}
            <Box args={[0.12, 0.07, 0.24]} position={[0, -0.45, 0.06]}>
              <meshStandardMaterial color="#333" roughness={0.7} />
            </Box>
          </group>
        </group>
      </group>

      {/* Right Leg */}
      <group position={[-0.22, 0.64, 0]}>
        <group ref={rThighRef}>
          <Cylinder args={[0.1, 0.09, 0.44, 8]} position={[0, -0.22, 0]}>
            <meshStandardMaterial color="#c0392b" roughness={0.5} />
          </Cylinder>
          <Sphere args={[0.1, 12, 12]} position={[0, -0.44, 0]}>
            <meshStandardMaterial color="#ffffff" transparent opacity={0.45} roughness={0.2} metalness={0.6} />
          </Sphere>
          <group ref={rShinRef} position={[0, -0.44, 0]}>
            <Cylinder args={[0.09, 0.075, 0.42, 8]} position={[0, -0.21, 0]}>
              <meshStandardMaterial color="#9C1120" roughness={0.5} />
            </Cylinder>
            <Box args={[0.12, 0.07, 0.24]} position={[0, -0.45, 0.06]}>
              <meshStandardMaterial color="#333" roughness={0.7} />
            </Box>
          </group>
        </group>
      </group>

      {/* Floor shadow disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.62, 0]}>
        <circleGeometry args={[0.45, 32]} />
        <meshBasicMaterial color="#E8192C" transparent opacity={0.08} />
      </mesh>
    </group>
  );
}

// Angle annotation line
function AngleLine({ start, end, color = "#E8192C" }) {
  const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={color} linewidth={2} />
    </line>
  );
}

// 3D Scene
function SquatScene({ phase, showAngles }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 3]} intensity={1.2} castShadow />
      <pointLight position={[-2, 3, -2]} intensity={0.6} color="#E8192C" />
      <pointLight position={[0, -1, 2]} intensity={0.3} color="#4466ff" />

      <SquatFigure phase={phase} />

      {showAngles && (
        <>
          <AngleLine start={[0.22, 0.64, 0]} end={[0.22, 0.2, 0.1]}  color="#22C55E" />
          <AngleLine start={[-0.22,0.64, 0]} end={[-0.22,0.2, 0.1]} color="#22C55E" />
          <AngleLine start={[0, 1.1, 0]}     end={[0, 0.74, 0]}     color="#F59E0B" />
        </>
      )}

      <OrbitControls
        enablePan={false}
        minDistance={2.5}
        maxDistance={6}
        autoRotate
        autoRotateSpeed={1.2}
      />

      {/* Grid floor */}
      <gridHelper args={[4, 16, "#222228", "#1a1a1f"]} position={[0, -0.63, 0]} />
    </>
  );
}

// ═══════════════════════════════════════════════
//  LIVE METRICS
// ═══════════════════════════════════════════════

function MetricPill({ label, value, unit, color = "var(--red)", pulse = false }) {
  return (
    <div style={{
      background:   "var(--surface2)",
      border:       `1px solid ${color === "var(--red)" ? "var(--border-red)" : "var(--border)"}`,
      borderRadius: "var(--radius-md)",
      padding:      "14px 18px",
      flex:         1,
      minWidth:     0,
      position:     "relative",
      overflow:     "hidden",
    }}>
      {pulse && (
        <div style={{
          position:   "absolute", top: 8, right: 8,
          width:      8, height: 8,
          borderRadius: "50%",
          background: color,
          animation:  "pulse 1.5s ease-in-out infinite",
        }} />
      )}
      <div style={{
        fontSize:   10,
        color:      "var(--text-dim)",
        fontFamily: "var(--font-mono)",
        letterSpacing: 1,
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily:    "var(--font-display)",
        fontSize:      36,
        letterSpacing: 1,
        lineHeight:    1,
        color,
      }}>
        {value}
        <span style={{
          fontSize:   14,
          color:      "var(--text-dim)",
          fontFamily: "var(--font-body)",
          marginLeft: 4,
        }}>
          {unit}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  FORM SCORE GAUGE
// ═══════════════════════════════════════════════

function FormGauge({ score }) {
  const color =
    score >= 80 ? "var(--success)" :
    score >= 55 ? "var(--warning)" : "var(--red)";

  const label =
    score >= 80 ? "EXCELLENT" :
    score >= 55 ? "NEEDS WORK" : "POOR FORM";

  const r    = 48;
  const circ = Math.PI * r; // half-circle
  const [anim, setAnim] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnim(score), 500);
    return () => clearTimeout(t);
  }, [score]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: 120, height: 66 }}>
        <svg width="120" height="66" viewBox="0 0 120 66">
          {/* Track */}
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke="var(--surface3)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Fill */}
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ - (anim / 100) * circ}
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1), stroke 0.4s" }}
          />
          {/* Center value */}
          <text x="60" y="58" textAnchor="middle" fill={color}
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 1 }}>
            {score}
          </text>
        </svg>
      </div>
      <div style={{
        fontFamily:    "var(--font-display)",
        fontSize:      13,
        letterSpacing: 2,
        color,
      }}>
        {label}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  WEBCAM PLACEHOLDER
// ═══════════════════════════════════════════════

function CamFeed({ mode }) {
  const [streaming, setStreaming] = useState(false);

  return (
    <div style={{
      background:   "var(--surface2)",
      border:       "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      overflow:     "hidden",
      aspectRatio:  "16/9",
      position:     "relative",
      display:      "flex",
      alignItems:   "center",
      justifyContent: "center",
    }}>
      {!streaming ? (
        /* Offline state */
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>
            {mode === "product" ? "📡" : "📷"}
          </div>
          <div style={{
            fontFamily:    "var(--font-display)",
            fontSize:      16,
            letterSpacing: 2,
            color:         "var(--text-dim)",
            marginBottom:  8,
          }}>
            {mode === "product" ? "ESP32-CAM FEED" : "LAPTOP WEBCAM"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16, fontFamily: "var(--font-mono)" }}>
            {mode === "product" ? "192.168.1.42:81/stream" : "navigator.mediaDevices.getUserMedia"}
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setStreaming(true)}
            style={{
              padding:      "9px 20px",
              background:   "var(--red)",
              border:       "none",
              borderRadius: "var(--radius-sm)",
              color:        "#fff",
              fontFamily:   "var(--font-display)",
              fontSize:     13,
              letterSpacing: 2,
              cursor:       "pointer",
            }}
          >
            START FEED
          </motion.button>
        </div>
      ) : (
        /* Streaming simulation */
        <>
          {/* Fake video noise background */}
          <div style={{
            position:   "absolute", inset: 0,
            background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)",
            animation:  "scanLine 3s linear infinite",
          }} />

          {/* Grid overlay */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "linear-gradient(rgba(232,25,44,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(232,25,44,0.05) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />

          {/* Pose skeleton overlay */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 640 360">
            {/* Skeleton lines */}
            <line x1="320" y1="80"  x2="320" y2="180" stroke="#E8192C" strokeWidth="2" opacity="0.7" />
            <line x1="320" y1="110" x2="270" y2="150" stroke="#E8192C" strokeWidth="2" opacity="0.7" />
            <line x1="320" y1="110" x2="370" y2="150" stroke="#E8192C" strokeWidth="2" opacity="0.7" />
            <line x1="320" y1="180" x2="290" y2="260" stroke="#22C55E" strokeWidth="2" opacity="0.8" />
            <line x1="320" y1="180" x2="350" y2="260" stroke="#22C55E" strokeWidth="2" opacity="0.8" />
            <line x1="290" y1="260" x2="285" y2="330" stroke="#22C55E" strokeWidth="2" opacity="0.8" />
            <line x1="350" y1="260" x2="355" y2="330" stroke="#22C55E" strokeWidth="2" opacity="0.8" />
            {/* Joints */}
            {[[320,80],[320,110],[270,150],[370,150],[320,180],[290,260],[350,260],[285,330],[355,330]].map(([x,y],i) => (
              <circle key={i} cx={x} cy={y} r="5" fill="#E8192C" opacity="0.9" />
            ))}
            {/* Angle arcs */}
            <path d="M 300 255 A 20 20 0 0 1 280 265" fill="none" stroke="#F59E0B" strokeWidth="1.5" opacity="0.8" />
            <text x="258" y="260" fill="#F59E0B" fontSize="12" opacity="0.9" fontFamily="monospace">87°</text>
            <path d="M 340 255 A 20 20 0 0 0 360 265" fill="none" stroke="#F59E0B" strokeWidth="1.5" opacity="0.8" />
            <text x="362" y="260" fill="#F59E0B" fontSize="12" opacity="0.9" fontFamily="monospace">87°</text>
          </svg>

          {/* HUD corners */}
          {[
            { top: 8,    left: 8,  borderTop: "2px solid var(--red)", borderLeft: "2px solid var(--red)" },
            { top: 8,    right: 8, borderTop: "2px solid var(--red)", borderRight: "2px solid var(--red)" },
            { bottom: 8, left: 8,  borderBottom: "2px solid var(--red)", borderLeft: "2px solid var(--red)" },
            { bottom: 8, right: 8, borderBottom: "2px solid var(--red)", borderRight: "2px solid var(--red)" },
          ].map((s, i) => (
            <div key={i} style={{ position: "absolute", width: 18, height: 18, ...s }} />
          ))}

          {/* Status badges */}
          <div style={{
            position: "absolute", top: 12, left: "50%",
            transform: "translateX(-50%)",
            display: "flex", gap: 8,
          }}>
            <span className="badge badge-red" style={{ animation: "pulse 2s infinite" }}>● REC</span>
            <span className="badge badge-green">AI ACTIVE</span>
            <span className="badge badge-neutral">
              {mode === "product" ? "BOX A" : "WEBCAM"}
            </span>
          </div>

          {/* Depth warning */}
          {mode === "product" && (
            <div style={{
              position:     "absolute",
              bottom:       12, left: "50%",
              transform:    "translateX(-50%)",
              background:   "rgba(245,158,11,0.1)",
              border:       "1px solid rgba(245,158,11,0.4)",
              borderRadius: "var(--radius-sm)",
              padding:      "4px 10px",
              fontSize:     11,
              color:        "var(--warning)",
              fontFamily:   "var(--font-mono)",
              whiteSpace:   "nowrap",
            }}>
              ⚠ STEP BACK — FULL BODY NOT VISIBLE
            </div>
          )}

          {/* Stop button */}
          <button
            onClick={() => setStreaming(false)}
            style={{
              position:     "absolute",
              top:          12, right: 12,
              background:   "rgba(0,0,0,0.6)",
              border:       "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color:        "var(--text-dim)",
              fontSize:     11,
              padding:      "4px 10px",
              cursor:       "pointer",
              fontFamily:   "var(--font-mono)",
            }}
          >
            STOP
          </button>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  HOLOGRAM MODAL (full-screen 3D)
// ═══════════════════════════════════════════════

function HologramModal({ onClose, phase, showAngles, setShowAngles }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{    opacity: 0 }}
      style={{
        position:   "fixed", inset: 0,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(6px)",
        zIndex:     800,
        display:    "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding:    24,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1,   opacity: 1 }}
        exit={{    scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width:        "100%",
          maxWidth:     840,
          background:   "var(--surface)",
          border:       "1px solid var(--border-md)",
          borderRadius: "var(--radius-xl)",
          overflow:     "hidden",
          boxShadow:    "var(--shadow-lg)",
        }}
      >
        {/* Header */}
        <div style={{
          display:      "flex",
          alignItems:   "center",
          justifyContent: "space-between",
          padding:      "16px 20px",
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: 2, color: "var(--text-dim)" }}>
            3D FORM GUIDE — PERFECT SQUAT
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={() => setShowAngles((p) => !p)}
              style={{
                padding:    "5px 12px",
                background: showAngles ? "rgba(34,197,94,0.1)" : "transparent",
                border:     `1px solid ${showAngles ? "rgba(34,197,94,0.3)" : "var(--border)"}`,
                borderRadius: "var(--radius-sm)",
                color:      showAngles ? "var(--success)" : "var(--text-dim)",
                fontSize:   11,
                cursor:     "pointer",
                fontFamily: "var(--font-mono)",
                letterSpacing: 0.5,
              }}
            >
              JOINT ANGLES
            </button>
            <button
              onClick={onClose}
              style={{
                width:        28, height: 28,
                background:   "transparent",
                border:       "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                color:        "var(--text-dim)",
                fontSize:     18,
                cursor:       "pointer",
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
                lineHeight:   1,
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ height: 480 }}>
          <Canvas camera={{ position: [0, 1, 3.5], fov: 50 }} style={{ background: "var(--bg)" }}>
            <Suspense fallback={null}>
              <SquatScene phase={phase} showAngles={showAngles} />
            </Suspense>
          </Canvas>
        </div>

        {/* Tips */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1,
          borderTop: "1px solid var(--border)",
        }}>
          {[
            { label: "FEET",   tip: "Shoulder-width apart, toes 15–30° out" },
            { label: "KNEES",  tip: "Track over toes, don't cave inward" },
            { label: "HIPS",   tip: "Break parallel — crease below knee" },
            { label: "CHEST",  tip: "Stay tall, brace core, eyes forward" },
          ].map((t) => (
            <div
              key={t.label}
              style={{
                padding:    "12px 14px",
                background: "var(--surface2)",
                borderRight: "1px solid var(--border)",
              }}
            >
              <div style={{ fontSize: 10, color: "var(--red)", fontFamily: "var(--font-mono)", letterSpacing: 1, marginBottom: 4 }}>
                {t.label}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.5 }}>{t.tip}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════
//  MAIN WORKOUT PAGE
// ═══════════════════════════════════════════════

export default function Workout() {
  const [mode, setMode]             = useState("product"); // "product" | "laptop"
  const [holoOpen, setHoloOpen]     = useState(false);
  const [showAngles, setShowAngles] = useState(true);
  const [isRunning, setIsRunning]   = useState(false);
  const [reps, setReps]             = useState(0);
  const [sets, setSets]             = useState(0);
  const [formScore, setFormScore]   = useState(87);
  const [squatPhase, setSquatPhase] = useState(0); // 0=stand 1=bottom
  const [elapsed, setElapsed]       = useState(0);
  const [feedback, setFeedback]     = useState([]);
  const timerRef = useRef(null);
  const phaseRef = useRef(null);

  // Timer
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  // Simulate squat reps
  useEffect(() => {
    if (!isRunning) { clearInterval(phaseRef.current); return; }

    let going = true;
    let ph = 0;
    const SPEED = 80;

    const tick = () => {
      if (!going) return;
      if (ph < 1) {
        ph = Math.min(ph + 0.025, 1);
        setSquatPhase(ph);
      } else {
        ph = Math.max(ph - 0.025, 0);
        setSquatPhase(ph);
        if (ph <= 0) {
          setReps((r) => {
            const nr = r + 1;
            if (nr % 5 === 0) setSets((s) => s + 1);
            // Simulate form feedback
            const msgs = [
              "✅ Good depth — keep it up!",
              "⚠ Left knee slightly caving",
              "✅ Hip crease below parallel",
              "⚠ Brace your core harder",
              "✅ Excellent bar path",
            ];
            setFeedback((prev) => [
              { id: Date.now(), msg: msgs[nr % msgs.length], time: new Date().toLocaleTimeString() },
              ...prev.slice(0, 5),
            ]);
            // Vary form score slightly
            setFormScore(Math.min(99, Math.max(60, 87 + Math.floor(Math.random() * 10 - 4))));
            return nr;
          });
          going = false;
          setTimeout(() => { going = true; ph = 0; }, 800);
        }
      }
      requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => { going = false; };
  }, [isRunning]);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;

  const handleReset = () => {
    setIsRunning(false);
    setReps(0);
    setSets(0);
    setElapsed(0);
    setFormScore(87);
    setSquatPhase(0);
    setFeedback([]);
  };

  return (
    <div style={{ padding: "28px 32px" }}>

      {/* ── Mode Toggle Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y:   0 }}
        transition={{ duration: 0.35 }}
        style={{
          display:      "flex",
          alignItems:   "center",
          justifyContent: "space-between",
          marginBottom: 24,
          padding:      "14px 20px",
          background:   "var(--surface)",
          border:       "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          flexWrap:     "wrap",
          gap:          12,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { id: "product", label: "📦  PRODUCT MODE", desc: "Box A + B · ESP32-CAM · MPU6050" },
            { id: "laptop",  label: "💻  LAPTOP MODE",  desc: "Webcam only · AI pose detection" },
          ].map((m) => (
            <motion.button
              key={m.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setMode(m.id)}
              style={{
                padding:      "10px 18px",
                borderRadius: "var(--radius-sm)",
                border:       `1px solid ${mode === m.id ? "var(--red)" : "var(--border)"}`,
                background:   mode === m.id ? "rgba(232,25,44,0.08)" : "transparent",
                color:        mode === m.id ? "var(--text)" : "var(--text-dim)",
                cursor:       "pointer",
                transition:   "all 0.2s",
                textAlign:    "left",
              }}
            >
              <div style={{ fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 1.5, marginBottom: 2 }}>
                {m.label}
              </div>
              <div style={{ fontSize: 10, color: mode === m.id ? "var(--text-dim)" : "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                {m.desc}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Session controls */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 22,
            color: isRunning ? "var(--red)" : "var(--text-dim)",
            letterSpacing: 2,
            minWidth: 72,
          }}>
            {fmt(elapsed)}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsRunning((p) => !p)}
            style={{
              padding:      "9px 20px",
              background:   isRunning ? "rgba(232,25,44,0.1)" : "var(--red)",
              border:       `1px solid ${isRunning ? "var(--border-red)" : "var(--red)"}`,
              borderRadius: "var(--radius-sm)",
              color:        isRunning ? "var(--red)" : "#fff",
              fontFamily:   "var(--font-display)",
              fontSize:     14,
              letterSpacing: 2,
              cursor:       "pointer",
              transition:   "all 0.2s",
            }}
          >
            {isRunning ? "⏸ PAUSE" : "▶ START"}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleReset}
            style={{
              padding:      "9px 14px",
              background:   "transparent",
              border:       "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color:        "var(--text-dim)",
              fontFamily:   "var(--font-display)",
              fontSize:     14,
              letterSpacing: 1,
              cursor:       "pointer",
              transition:   "all 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-md)"; e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-dim)"; }}
          >
            ↺ RESET
          </motion.button>
        </div>
      </motion.div>

      {/* ── Main Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16, marginBottom: 16 }}>

        {/* Left col */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Camera Feed */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y:  0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <CamFeed mode={mode} />
          </motion.div>

          {/* Live Metrics Row */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y:  0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            style={{ display: "flex", gap: 12 }}
          >
            <MetricPill
              label="TOTAL REPS"
              value={reps}
              unit="reps"
              color="var(--red)"
              pulse={isRunning}
            />
            <MetricPill
              label="SETS DONE"
              value={sets}
              unit="sets"
              color="var(--warning)"
            />
            <MetricPill
              label="ELAPSED"
              value={fmt(elapsed)}
              unit=""
              color="var(--info)"
            />
            <MetricPill
              label="CADENCE"
              value={isRunning ? "~12" : "—"}
              unit="reps/min"
              color="var(--success)"
            />
          </motion.div>

          {/* Feedback Log */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y:  0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            style={{
              background:   "var(--surface)",
              border:       "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding:      16,
            }}
          >
            <div style={{
              fontFamily:    "var(--font-display)",
              fontSize:      16,
              letterSpacing: 2,
              color:         "var(--text-dim)",
              marginBottom:  12,
            }}>
              AI FORM FEEDBACK
            </div>
            <div style={{
              display:       "flex",
              flexDirection: "column",
              gap:           8,
              minHeight:     80,
            }}>
              <AnimatePresence>
                {feedback.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)", padding: "8px 0" }}>
                    Start a session to receive real-time form feedback...
                  </div>
                ) : (
                  feedback.map((f) => (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x:   0 }}
                      exit={{    opacity: 0, height: 0 }}
                      style={{
                        display:      "flex",
                        alignItems:   "center",
                        gap:          10,
                        padding:      "8px 12px",
                        background:   "var(--surface2)",
                        borderRadius: "var(--radius-sm)",
                        border:       "1px solid var(--border)",
                        fontSize:     12,
                      }}
                    >
                      <span style={{ flex: 1 }}>{f.msg}</span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                        {f.time}
                      </span>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Right col */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Form Score */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y:  0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            style={{
              background:   "var(--surface)",
              border:       "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding:      20,
              display:      "flex",
              flexDirection: "column",
              alignItems:   "center",
              gap:          10,
            }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 2, color: "var(--text-dim)", alignSelf: "flex-start" }}>
              FORM SCORE
            </div>
            <FormGauge score={formScore} />

            {/* Breakdown */}
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              {[
                { label: "Hip Depth",  val: 92, color: "var(--success)" },
                { label: "Knee Track", val: 78, color: "var(--warning)" },
                { label: "Back Angle", val: 88, color: "var(--success)" },
                { label: "Bar Path",   val: 95, color: "var(--success)" },
              ].map((b) => (
                <div key={b.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
                    <span>{b.label}</span><span style={{ color: b.color }}>{b.val}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${b.val}%`, background: b.color }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 3D Hologram */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y:  0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            style={{
              background:   "var(--surface)",
              border:       "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              overflow:     "hidden",
              cursor:       "pointer",
              position:     "relative",
            }}
            whileHover={{ borderColor: "var(--border-red)", boxShadow: "0 8px 32px var(--red-glow)" }}
            onClick={() => setHoloOpen(true)}
          >
            {/* Header */}
            <div style={{
              display:      "flex",
              alignItems:   "center",
              justifyContent: "space-between",
              padding:      "12px 16px",
              borderBottom: "1px solid var(--border)",
            }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 15, letterSpacing: 2, color: "var(--text-dim)" }}>
                3D FORM GUIDE
              </div>
              <span className="badge badge-red">CLICK TO EXPAND</span>
            </div>

            {/* Mini canvas */}
            <div style={{ height: 220 }}>
              <Canvas camera={{ position: [0, 1, 3.2], fov: 50 }} style={{ background: "var(--bg)" }}>
                <Suspense fallback={null}>
                  <SquatScene phase={squatPhase} showAngles={false} />
                </Suspense>
              </Canvas>
            </div>

            {/* Hologram tint overlay */}
            <div style={{
              position:   "absolute", inset: 0,
              background: "linear-gradient(to bottom, transparent 60%, rgba(232,25,44,0.06))",
              pointerEvents: "none",
            }} />

            <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                Auto-synced to your rep timing · Drag to rotate in full screen
              </div>
            </div>
          </motion.div>

          {/* MPU6050 / Ultrasonic (product mode only) */}
          <AnimatePresence>
            {mode === "product" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{    opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  background:   "var(--surface)",
                  border:       "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding:      16,
                  overflow:     "hidden",
                }}
              >
                <div style={{ fontFamily: "var(--font-display)", fontSize: 15, letterSpacing: 2, color: "var(--text-dim)", marginBottom: 12 }}>
                  BOX B SENSORS
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { label: "ACCEL X", val: "0.12 g",  color: "var(--red)"     },
                    { label: "ACCEL Y", val: "0.03 g",  color: "var(--red)"     },
                    { label: "GYRO Z",  val: "2.4°/s",  color: "var(--warning)" },
                    { label: "DISTANCE",val: "148 cm",  color: "var(--success)" },
                  ].map((s) => (
                    <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "var(--surface2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                      <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 0.5 }}>{s.label}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: s.color }}>{s.val}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Hologram Modal ── */}
      <AnimatePresence>
        {holoOpen && (
          <HologramModal
            onClose={() => setHoloOpen(false)}
            phase={squatPhase}
            showAngles={showAngles}
            setShowAngles={setShowAngles}
          />
        )}
      </AnimatePresence>
    </div>
  );
}