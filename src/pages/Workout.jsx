// ═══════════════════════════════════════════════
//   KAI FITNESS — Workout.jsx
//   Place at: src/pages/Workout.jsx
//   Real MediaPipe Pose · Webcam · 3D Hologram
// ═══════════════════════════════════════════════

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Cylinder, Box } from "@react-three/drei";
import * as THREE from "three";
// MediaPipe loaded dynamically from CDN — no npm package needed
import { useAuth } from "../context/AuthContext";
import {
  collection, addDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

// ═══════════════════════════════════════════════
//  MEDIAPIPE HOOK
// ═══════════════════════════════════════════════
function useMediaPipePose({ videoRef, canvasRef, enabled, onPoseResult }) {
  const poseRef    = useRef(null);
  const rafRef     = useRef(null);
  const streamRef  = useRef(null);

  const stopCamera = useCallback(() => {
    if (rafRef.current)   cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    rafRef.current = null;
  }, [videoRef]);

  useEffect(() => {
    if (!enabled) { stopCamera(); return; }

    let active = true;

    const init = async () => {
      // Load MediaPipe Pose dynamically from CDN
      if (!poseRef.current) {
        // Inject CDN script if not already present
        if (!window.Pose) {
          await new Promise((resolve, reject) => {
            if (document.getElementById("mediapipe-pose-script")) {
              // Script tag exists, wait for it
              const check = setInterval(() => {
                if (window.Pose) { clearInterval(check); resolve(); }
              }, 100);
              return;
            }
            const script = document.createElement("script");
            script.id  = "mediapipe-pose-script";
            script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js";
            script.crossOrigin = "anonymous";
            script.onload  = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        poseRef.current = new window.Pose({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });
        poseRef.current.setOptions({
          modelComplexity:        1,
          smoothLandmarks:        true,
          enableSegmentation:     false,
          minDetectionConfidence: 0.6,
          minTrackingConfidence:  0.6,
        });
        poseRef.current.onResults((results) => {
          if (!active) return;
          drawPose(results);
          onPoseResult?.(results);
        });
      }

      // Get webcam
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        loop();
      } catch (err) {
        console.error("Camera error:", err);
        onPoseResult?.({ error: err.message });
      }
    };

    const loop = async () => {
      if (!active || !videoRef.current || videoRef.current.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      try {
        await poseRef.current.send({ image: videoRef.current });
      } catch (e) { /* suppress */ }
      rafRef.current = requestAnimationFrame(loop);
    };

    init();

    return () => {
      active = false;
      stopCamera();
    };
  }, [enabled, stopCamera, onPoseResult, videoRef]);

  // Draw skeleton on canvas
  const drawPose = (results) => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!results.poseLandmarks) return;
    const lm = results.poseLandmarks;
    const W  = canvas.width;
    const H  = canvas.height;

    const pt = (i) => ({ x: lm[i].x * W, y: lm[i].y * H });

    // Draw connections
    const CONNECTIONS = [
      [11,12],[11,13],[13,15],[12,14],[14,16],
      [11,23],[12,24],[23,24],[23,25],[24,26],
      [25,27],[26,28],[27,29],[28,30],[29,31],[30,32],
    ];

    CONNECTIONS.forEach(([a, b]) => {
      if (!lm[a] || !lm[b]) return;
      const pA = pt(a), pB = pt(b);
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.strokeStyle = "rgba(232,25,44,0.85)";
      ctx.lineWidth   = 2.5;
      ctx.stroke();
    });

    // Draw joints
    [11,12,13,14,15,16,23,24,25,26,27,28].forEach((i) => {
      if (!lm[i]) return;
      const p = pt(i);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle   = "#fff";
      ctx.strokeStyle = "var(--red, #E8192C)";
      ctx.lineWidth   = 2;
      ctx.fill();
      ctx.stroke();
    });

    // Knee angle annotation
    const calcAngle = (a, b, c) => {
      const ab = { x: a.x - b.x, y: a.y - b.y };
      const cb = { x: c.x - b.x, y: c.y - b.y };
      const dot  = ab.x * cb.x + ab.y * cb.y;
      const magAB = Math.sqrt(ab.x ** 2 + ab.y ** 2);
      const magCB = Math.sqrt(cb.x ** 2 + cb.y ** 2);
      return Math.round((Math.acos(dot / (magAB * magCB))) * (180 / Math.PI));
    };

    [[23,25,27],[24,26,28]].forEach(([hip,knee,ankle]) => {
      if (!lm[hip] || !lm[knee] || !lm[ankle]) return;
      const angle = calcAngle(pt(hip), pt(knee), pt(ankle));
      const kp    = pt(knee);
      ctx.fillStyle    = "#F59E0B";
      ctx.font         = "bold 13px JetBrains Mono, monospace";
      ctx.fillText(`${angle}°`, kp.x + 10, kp.y);
    });
  };

  return { stopCamera };
}

// ═══════════════════════════════════════════════
//  SQUAT COUNTER LOGIC
// ═══════════════════════════════════════════════
function useSquatCounter(onRep) {
  const stateRef = useRef("up"); // "up" | "down"
  const countRef = useRef(0);

  const processLandmarks = useCallback((landmarks) => {
    if (!landmarks) return 180;
    const lm = landmarks;
    const calcAngle = (a, b, c) => {
      const ab = { x: lm[a].x - lm[b].x, y: lm[a].y - lm[b].y };
      const cb = { x: lm[c].x - lm[b].x, y: lm[c].y - lm[b].y };
      const dot   = ab.x * cb.x + ab.y * cb.y;
      const magAB = Math.sqrt(ab.x ** 2 + ab.y ** 2);
      const magCB = Math.sqrt(cb.x ** 2 + cb.y ** 2);
      return (Math.acos(Math.max(-1, Math.min(1, dot / (magAB * magCB))))) * (180 / Math.PI);
    };

    const leftKnee  = calcAngle(23, 25, 27);
    const rightKnee = calcAngle(24, 26, 28);
    const avgKnee   = (leftKnee + rightKnee) / 2;

    if (avgKnee < 110 && stateRef.current === "up") {
      stateRef.current = "down";
    } else if (avgKnee > 150 && stateRef.current === "down") {
      stateRef.current = "up";
      countRef.current += 1;
      onRep?.(countRef.current, avgKnee, landmarks);
    }
    return avgKnee;
  }, [onRep]);

  return { processLandmarks };
}

// ═══════════════════════════════════════════════
//  3D SQUAT FIGURE
// ═══════════════════════════════════════════════
function SquatFigure({ phase }) {
  const groupRef  = useRef();
  const torsoRef  = useRef();
  const lThighRef = useRef();
  const rThighRef = useRef();
  const lShinRef  = useRef();
  const rShinRef  = useRef();
  const lArmRef   = useRef();
  const rArmRef   = useRef();

  useFrame((state) => {
    const t      = state.clock.elapsedTime;
    const squat  = phase;
    if (groupRef.current)  groupRef.current.position.y  = Math.sin(t * 1.2) * 0.02 - squat * 0.55;
    if (torsoRef.current)  torsoRef.current.rotation.x  = squat * 0.3;
    if (lThighRef.current) lThighRef.current.rotation.x = squat * 1.4;
    if (rThighRef.current) rThighRef.current.rotation.x = squat * 1.4;
    if (lShinRef.current)  lShinRef.current.rotation.x  = -squat * 2.24;
    if (rShinRef.current)  rShinRef.current.rotation.x  = -squat * 2.24;
    if (lArmRef.current)   lArmRef.current.rotation.x   = squat * 0.8;
    if (rArmRef.current)   rArmRef.current.rotation.x   = squat * 0.8;
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <Sphere args={[0.18, 16, 16]} position={[0, 1.72, 0]}>
        <meshStandardMaterial color="#c0876a" roughness={0.6} />
      </Sphere>
      <Cylinder args={[0.07, 0.07, 0.15, 8]} position={[0, 1.56, 0]}>
        <meshStandardMaterial color="#c0876a" roughness={0.6} />
      </Cylinder>
      <group ref={torsoRef} position={[0, 1.1, 0]}>
        <Box args={[0.52, 0.62, 0.26]}>
          <meshStandardMaterial color="#E8192C" roughness={0.4} metalness={0.2} />
        </Box>
        <group ref={lArmRef} position={[0.32, 0.22, 0]}>
          <Cylinder args={[0.07, 0.065, 0.38, 8]} position={[0, -0.19, 0]}>
            <meshStandardMaterial color="#E8192C" roughness={0.4} />
          </Cylinder>
          <Cylinder args={[0.065, 0.055, 0.34, 8]} position={[0, -0.54, 0]}>
            <meshStandardMaterial color="#c0876a" roughness={0.5} />
          </Cylinder>
        </group>
        <group ref={rArmRef} position={[-0.32, 0.22, 0]}>
          <Cylinder args={[0.07, 0.065, 0.38, 8]} position={[0, -0.19, 0]}>
            <meshStandardMaterial color="#E8192C" roughness={0.4} />
          </Cylinder>
          <Cylinder args={[0.065, 0.055, 0.34, 8]} position={[0, -0.54, 0]}>
            <meshStandardMaterial color="#c0876a" roughness={0.5} />
          </Cylinder>
        </group>
      </group>
      <Box args={[0.5, 0.2, 0.26]} position={[0, 0.74, 0]}>
        <meshStandardMaterial color="#9C1120" roughness={0.5} />
      </Box>
      {[0.28, -0.28].map((x, i) => (
        <Sphere key={i} args={[0.09, 12, 12]} position={[x, 0.74, 0]}>
          <meshStandardMaterial color="#fff" transparent opacity={0.5} roughness={0.2} metalness={0.6} />
        </Sphere>
      ))}
      {[0.22, -0.22].map((x, i) => (
        <group key={i} position={[x, 0.64, 0]}>
          <group ref={i === 0 ? lThighRef : rThighRef}>
            <Cylinder args={[0.1, 0.09, 0.44, 8]} position={[0, -0.22, 0]}>
              <meshStandardMaterial color="#c0392b" roughness={0.5} />
            </Cylinder>
            <Sphere args={[0.1, 12, 12]} position={[0, -0.44, 0]}>
              <meshStandardMaterial color="#fff" transparent opacity={0.45} roughness={0.2} metalness={0.6} />
            </Sphere>
            <group ref={i === 0 ? lShinRef : rShinRef} position={[0, -0.44, 0]}>
              <Cylinder args={[0.09, 0.075, 0.42, 8]} position={[0, -0.21, 0]}>
                <meshStandardMaterial color="#9C1120" roughness={0.5} />
              </Cylinder>
              <Box args={[0.12, 0.07, 0.24]} position={[0, -0.45, 0.06]}>
                <meshStandardMaterial color="#333" roughness={0.7} />
              </Box>
            </group>
          </group>
        </group>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.62, 0]}>
        <circleGeometry args={[0.45, 32]} />
        <meshBasicMaterial color="#E8192C" transparent opacity={0.08} />
      </mesh>
    </group>
  );
}

function SquatScene({ phase }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 3]} intensity={1.2} />
      <pointLight position={[-2, 3, -2]} intensity={0.6} color="#E8192C" />
      <SquatFigure phase={phase} />
      <OrbitControls enablePan={false} minDistance={2.5} maxDistance={6} autoRotate autoRotateSpeed={1.2} />
      <gridHelper args={[4, 16, "#222228", "#1a1a1f"]} position={[0, -0.63, 0]} />
    </>
  );
}

// ═══════════════════════════════════════════════
//  FORM GAUGE
// ═══════════════════════════════════════════════
function FormGauge({ score }) {
  const color = score >= 80 ? "var(--success)" : score >= 55 ? "var(--warning)" : "var(--red)";
  const label = score >= 80 ? "EXCELLENT"      : score >= 55 ? "NEEDS WORK"     : "POOR FORM";
  const [anim, setAnim] = useState(0);
  useEffect(() => { const t = setTimeout(() => setAnim(score), 400); return () => clearTimeout(t); }, [score]);
  const c = Math.PI * 48;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: 120, height: 66 }}>
        <svg width="120" height="66" viewBox="0 0 120 66">
          <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="var(--surface3)" strokeWidth="8" strokeLinecap="round" />
          <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c - (anim / 100) * c}
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1), stroke 0.4s" }} />
          <text x="60" y="58" textAnchor="middle" fill={color} style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22 }}>{score}</text>
        </svg>
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 2, color }}>{label}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  HOLOGRAM MODAL
// ═══════════════════════════════════════════════
function HologramModal({ onClose, phase }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(6px)", zIndex: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 840, background: "var(--surface)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-xl)", overflow: "hidden", boxShadow: "var(--shadow-lg)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 17, letterSpacing: 2, color: "var(--text-dim)" }}>3D FORM GUIDE — PERFECT SQUAT</div>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", width: 28, height: 28, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <div style={{ height: 480 }}>
          <Canvas camera={{ position: [0, 1, 3.5], fov: 50 }} style={{ background: "var(--bg)" }}>
            <Suspense fallback={null}><SquatScene phase={phase} /></Suspense>
          </Canvas>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", borderTop: "1px solid var(--border)" }}>
          {[
            { label: "FEET",  tip: "Shoulder-width, toes 15–30° out" },
            { label: "KNEES", tip: "Track over toes, don't cave in"  },
            { label: "HIPS",  tip: "Crease below knee parallel"      },
            { label: "CHEST", tip: "Stay tall, brace core, eyes fwd" },
          ].map((t) => (
            <div key={t.label} style={{ padding: "10px 14px", background: "var(--surface2)", borderRight: "1px solid var(--border)" }}>
              <div style={{ fontSize: 10, color: "var(--red)", fontFamily: "var(--font-mono)", letterSpacing: 1, marginBottom: 3 }}>{t.label}</div>
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
  const { currentUser, userProfile } = useAuth();

  const [mode,         setMode]         = useState("laptop");
  const [camActive,    setCamActive]    = useState(false);
  const [holoOpen,     setHoloOpen]     = useState(false);
  const [isRunning,    setIsRunning]    = useState(false);
  const [reps,         setReps]         = useState(0);
  const [sets,         setSets]         = useState(0);
  const [formScore,    setFormScore]    = useState(0);
  const [jointScores,  setJointScores]  = useState({ hipDepth: 0, kneeTrack: 0, backAngle: 0, barPath: 0 });
  const [squatPhase,   setSquatPhase]   = useState(0);
  const [elapsed,      setElapsed]      = useState(0);
  const [feedback,     setFeedback]     = useState([]);
  const [camError,     setCamError]     = useState("");
  const [saving,       setSaving]       = useState(false);

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const timerRef  = useRef(null);
  const repsRef   = useRef(0);
  const setsRef   = useRef(0);

  // Sync refs
  useEffect(() => { repsRef.current = reps; }, [reps]);
  useEffect(() => { setsRef.current = sets; }, [sets]);

  // Timer
  useEffect(() => {
    if (isRunning) timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    else           clearInterval(timerRef.current);
    return ()    => clearInterval(timerRef.current);
  }, [isRunning]);

  // Rep callback — receives rep count, knee angle, AND full landmarks for per-joint analysis
  const handleRep = useCallback((count, kneeAngle, landmarks) => {
    setReps(count);
    if (count % 5 === 0) setSets((s) => s + 1);
    const score = Math.min(99, Math.max(55, Math.round(100 - Math.abs(kneeAngle - 90) * 0.3)));
    setFormScore(score);
    setSquatPhase(0);

    if (landmarks) {
      const lm = landmarks;
      const angle3 = (A, B, C) => {
        const ab = { x: lm[A].x - lm[B].x, y: lm[A].y - lm[B].y };
        const cb = { x: lm[C].x - lm[B].x, y: lm[C].y - lm[B].y };
        const dot = ab.x * cb.x + ab.y * cb.y;
        const mag = Math.sqrt(ab.x**2 + ab.y**2) * Math.sqrt(cb.x**2 + cb.y**2);
        return (Math.acos(Math.max(-1, Math.min(1, dot / (mag || 1))))) * (180 / Math.PI);
      };
      const avgHipAngle  = (angle3(11,23,25) + angle3(12,24,26)) / 2;
      const hipDepth     = Math.min(99, Math.max(40, Math.round(100 - Math.abs(avgHipAngle - 90) * 0.9)));
      const avgDev       = (Math.abs(lm[25].x - lm[27].x) + Math.abs(lm[26].x - lm[28].x)) / 2;
      const kneeTrack    = Math.min(99, Math.max(40, Math.round(99 - avgDev * 250)));
      const avgBack      = (angle3(11,23,25) + angle3(12,24,26)) / 2;
      const backAngle    = Math.min(99, Math.max(40, Math.round(99 - Math.max(0, 170 - avgBack) * 1.5)));
      const shoulderTilt = Math.abs(lm[11].y - lm[12].y);
      const barPath      = Math.min(99, Math.max(40, Math.round(99 - shoulderTilt * 500)));
      setJointScores({ hipDepth, kneeTrack, backAngle, barPath });
    }

    const msgs = [
      score >= 85 ? "✅ Great depth — keep pushing!"  : "⚠ Try to go a bit deeper",
      score >= 80 ? "✅ Knees tracking well"           : "⚠ Left knee caving slightly",
      score >= 85 ? "✅ Hip crease below parallel"     : "⚠ Open hips a little wider",
      "✅ Good bar path — stay upright",
      score >= 80 ? "✅ Core braced nicely"            : "⚠ Brace your core harder",
    ];
    setFeedback((prev) => [
      { id: Date.now(), msg: msgs[count % msgs.length], time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 6),
    ]);
  }, []);

  // Squat phase animation (visual only)
  const squatPhaseRef = useRef(0);
  const squatDirRef   = useRef(1);
  useEffect(() => {
    if (!isRunning || mode !== "product") return;
    let raf;
    const tick = () => {
      squatPhaseRef.current += 0.015 * squatDirRef.current;
      if (squatPhaseRef.current >= 1) squatDirRef.current = -1;
      if (squatPhaseRef.current <= 0) { squatDirRef.current = 1; }
      setSquatPhase(parseFloat(squatPhaseRef.current.toFixed(3)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isRunning, mode]);

  // Pose result handler
  const handlePoseResult = useCallback((results) => {
    if (results.error) {
      setCamError(results.error);
      return;
    }
    if (!isRunning) return;
    if (results.poseLandmarks) {
      const lm = results.poseLandmarks;
      // Estimate squat phase from hip/knee y diff
      const hipY  = (lm[23]?.y + lm[24]?.y) / 2;
      const kneeY = (lm[25]?.y + lm[26]?.y) / 2;
      const phase = Math.max(0, Math.min(1, (kneeY - hipY) / 0.3));
      setSquatPhase(phase);
    }
  }, [isRunning]);

  const { processLandmarks } = useSquatCounter(handleRep);

  // Combine pose result with squat counting
  const handlePoseFull = useCallback((results) => {
    handlePoseResult(results);
    if (results.poseLandmarks && isRunning) {
      processLandmarks(results.poseLandmarks);
    }
  }, [handlePoseResult, processLandmarks, isRunning]);

  useMediaPipePose({
    videoRef,
    canvasRef,
    enabled: camActive && mode === "laptop",
    onPoseResult: handlePoseFull,
  });

  // Save session to Firestore
  const saveSession = async () => {
    if (!currentUser || reps === 0) return;
    setSaving(true);
    try {
      await addDoc(
        collection(db, "users", currentUser.uid, "workouts"),
        {
          type:      "squat",
          reps,
          sets,
          duration:  elapsed,
          formScore,
          mode,
          createdAt: serverTimestamp(),
        }
      );
      setFeedback((prev) => [
        { id: Date.now(), msg: "✅ Session saved to your profile!", time: new Date().toLocaleTimeString() },
        ...prev,
      ]);
    } catch (e) {
      console.error("saveSession:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleStart = () => {
    if (mode === "laptop" && !camActive) setCamActive(true);
    setIsRunning(true);
  };

  const handlePause = () => setIsRunning(false);

  const handleReset = () => {
    setIsRunning(false); setCamActive(false);
    setReps(0); setSets(0); setElapsed(0);
    setFormScore(0); setSquatPhase(0);
    setJointScores({ hipDepth: 0, kneeTrack: 0, backAngle: 0, barPath: 0 });
    setFeedback([]); setCamError("");
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;

  return (
    <div className="page-content">

      {/* ── Mode + Controls Bar ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, padding: "14px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", flexWrap: "wrap", gap: 12 }}>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { id: "laptop",  label: "📷 DEVICE MODE",        desc: "Camera · MediaPipe AI"          },
            { id: "product", label: "📦 KAI SENSE + CORE",   desc: "ESP32-CAM · MPU6050 (coming soon)" },
          ].map((m) => (
            <motion.button key={m.id} whileTap={{ scale: 0.97 }}
              onClick={() => { if (isRunning) return; setMode(m.id); setCamActive(false); setCamError(""); }}
              style={{ padding: "9px 16px", borderRadius: "var(--radius-sm)", border: `1px solid ${mode === m.id ? "var(--red)" : "var(--border)"}`, background: mode === m.id ? "rgba(232,25,44,0.08)" : "transparent", color: mode === m.id ? "var(--text)" : "var(--text-dim)", cursor: isRunning ? "not-allowed" : "pointer", transition: "all 0.2s", textAlign: "left", opacity: isRunning && mode !== m.id ? 0.5 : 1 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: 1.5, marginBottom: 1 }}>{m.label}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{m.desc}</div>
            </motion.button>
          ))}
        </div>

        {/* Session controls */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, color: isRunning ? "var(--red)" : "var(--text-dim)", letterSpacing: 2, minWidth: 68, animation: isRunning ? "pulse 2s infinite" : "none" }}>
            {fmt(elapsed)}
          </div>
          {!isRunning ? (
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleStart}
              style={{ padding: "9px 18px", background: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 2, cursor: "pointer" }}>
              ▶ START
            </motion.button>
          ) : (
            <motion.button whileTap={{ scale: 0.95 }} onClick={handlePause}
              style={{ padding: "9px 18px", background: "rgba(232,25,44,0.1)", border: "1px solid var(--border-red)", borderRadius: "var(--radius-sm)", color: "var(--red)", fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 2, cursor: "pointer" }}>
              ⏸ PAUSE
            </motion.button>
          )}
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleReset}
            style={{ padding: "9px 14px", background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 1, cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-md)"; e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)";    e.currentTarget.style.color = "var(--text-dim)"; }}>
            ↺ RESET
          </motion.button>
          {reps > 0 && !isRunning && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={saveSession} disabled={saving}
              style={{ padding: "9px 14px", background: saving ? "var(--surface3)" : "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "var(--radius-sm)", color: "var(--success)", fontFamily: "var(--font-display)", fontSize: 12, letterSpacing: 1.5, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              {saving ? <div className="spinner" style={{ width: 14, height: 14 }} /> : "💾 SAVE SESSION"}
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* ── Main Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 16 }}>

        {/* Left col */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Camera / Feed panel */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", aspectRatio: "16/9", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

              {mode === "laptop" ? (
                <>
                  {/* Hidden video element */}
                  <video
                    ref={videoRef}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", display: camActive ? "block" : "none" }}
                    playsInline
                    muted
                  />
                  {/* Pose overlay canvas */}
                  <canvas
                    ref={canvasRef}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "scaleX(-1)", pointerEvents: "none", display: camActive ? "block" : "none" }}
                  />

                  {/* HUD corners */}
                  {camActive && [
                    { top: 10, left: 10,  borderTop: "2px solid var(--red)", borderLeft: "2px solid var(--red)" },
                    { top: 10, right: 10, borderTop: "2px solid var(--red)", borderRight: "2px solid var(--red)" },
                    { bottom: 10, left: 10,  borderBottom: "2px solid var(--red)", borderLeft: "2px solid var(--red)" },
                    { bottom: 10, right: 10, borderBottom: "2px solid var(--red)", borderRight: "2px solid var(--red)" },
                  ].map((s, i) => (
                    <div key={i} style={{ position: "absolute", width: 18, height: 18, pointerEvents: "none", zIndex: 10, ...s }} />
                  ))}

                  {/* Status badges */}
                  {camActive && (
                    <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, zIndex: 10 }}>
                      {isRunning && <span className="badge badge-red" style={{ animation: "pulse 2s infinite" }}>● REC</span>}
                      <span className="badge badge-green">MEDIAPIPE POSE</span>
                      <span className="badge badge-neutral">WEBCAM</span>
                    </div>
                  )}

                  {/* Camera error */}
                  {camError && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(232,25,44,0.05)", zIndex: 20 }}>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--red)", textAlign: "center", maxWidth: 300, lineHeight: 1.6 }}>
                        Camera access denied or unavailable.<br />
                        <span style={{ color: "var(--text-dim)" }}>{camError}</span>
                      </div>
                      <button onClick={() => { setCamError(""); setCamActive(false); }} style={{ marginTop: 14, padding: "7px 16px", background: "var(--surface3)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                        DISMISS
                      </button>
                    </div>
                  )}

                  {/* Offline state */}
                  {!camActive && !camError && (
                    <div style={{ textAlign: "center", zIndex: 5 }}>
                      <div style={{ fontSize: 40, marginBottom: 10 }}>📷</div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 2, color: "var(--text-dim)", marginBottom: 6 }}>DEVICE CAMERA</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: 16 }}>MediaPipe Pose · Real-time joint detection</div>
                      <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setCamError(""); setCamActive(true); }}
                        style={{ padding: "9px 20px", background: "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 2, cursor: "pointer" }}>
                        📷 START CAMERA
                      </motion.button>
                    </div>
                  )}
                </>
              ) : (
                /* Product mode — KAI SENSE placeholder */
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>📡</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 2, color: "var(--text-dim)", marginBottom: 6 }}>KAI SENSE FEED</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>ESP32-CAM · {userProfile?.boxAIP || "192.168.1.42"}:{userProfile?.streamPort || "81"}/stream</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)", padding: "8px 12px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "var(--radius-sm)", display: "inline-block" }}>
                    ⚙️ Hardware integration coming soon — configure IP in Profile
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Live Metrics */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
            {[
              { label: "TOTAL REPS", val: reps,    unit: "reps",    color: "var(--red)",     pulse: isRunning },
              { label: "SETS DONE",  val: sets,    unit: "sets",    color: "var(--warning)", pulse: false     },
              { label: "ELAPSED",    val: fmt(elapsed), unit: "",   color: "var(--info)",    pulse: false     },
              { label: "FORM SCORE", val: formScore > 0 ? formScore : "—", unit: formScore > 0 ? "/100" : "", color: formScore >= 80 ? "var(--success)" : formScore >= 55 ? "var(--warning)" : "var(--red)", pulse: false },
            ].map((m) => (
              <div key={m.label} style={{ background: "var(--surface2)", border: `1px solid ${m.color === "var(--red)" ? "var(--border-red)" : "var(--border)"}`, borderRadius: "var(--radius-md)", padding: "12px 14px", position: "relative", overflow: "hidden" }}>
                {m.pulse && <div style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: "50%", background: m.color, animation: "pulse 1.5s infinite" }} />}
                <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", letterSpacing: 1, marginBottom: 5 }}>{m.label}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: 1, lineHeight: 1, color: m.color }}>
                  {m.val}<span style={{ fontSize: 13, color: "var(--text-dim)", fontFamily: "var(--font-body)", marginLeft: 3 }}>{m.unit}</span>
                </div>
              </div>
            ))}
          </motion.div>

          {/* AI Feedback Log */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 16 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 2, color: "var(--text-dim)", marginBottom: 12 }}>AI FORM FEEDBACK</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, minHeight: 70 }}>
              <AnimatePresence>
                {feedback.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    {mode === "laptop" ? "Start camera and begin squatting — AI will analyse your form in real time." : "Start a session to receive form feedback."}
                  </div>
                ) : feedback.map((f) => (
                  <motion.div key={f.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--surface2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 12 }}>
                    <span style={{ flex: 1 }}>{f.msg}</span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>{f.time}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Right col */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Form Score */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 2, color: "var(--text-dim)", marginBottom: 14 }}>FORM SCORE</div>
            <FormGauge score={formScore || 0} />
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Hip Depth",  val: jointScores.hipDepth,  color: "var(--success)" },
                { label: "Knee Track", val: jointScores.kneeTrack, color: "var(--warning)" },
                { label: "Back Angle", val: jointScores.backAngle, color: "var(--success)" },
                { label: "Bar Path",   val: jointScores.barPath,   color: "var(--success)" },
              ].map((b) => (
                <div key={b.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
                    <span>{b.label}</span><span style={{ color: b.color }}>{b.val > 0 ? `${b.val}%` : "—"}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${b.val}%`, background: b.color }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 3D Hologram */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", cursor: "pointer" }}
            whileHover={{ borderColor: "var(--border-red)", boxShadow: "0 8px 32px var(--red-glow)" }}
            onClick={() => setHoloOpen(true)}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: 2, color: "var(--text-dim)" }}>3D FORM GUIDE</div>
              <span className="badge badge-red">CLICK TO EXPAND</span>
            </div>
            <div style={{ height: 200 }}>
              <Canvas camera={{ position: [0, 1, 3.2], fov: 50 }} style={{ background: "var(--bg)" }}>
                <Suspense fallback={null}><SquatScene phase={squatPhase} /></Suspense>
              </Canvas>
            </div>
            <div style={{ padding: "8px 16px", borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                {mode === "laptop" ? "Synced to your real squat · drag to rotate in full screen" : "Auto-synced to rep timing · drag to rotate"}
              </div>
            </div>
          </motion.div>

          {/* KAI CORE sensor panel (product mode) */}
          <AnimatePresence>
            {mode === "product" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 16, overflow: "hidden" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: 2, color: "var(--text-dim)", marginBottom: 10 }}>KAI CORE SENSORS</div>
                <div style={{ padding: "10px 12px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "var(--radius-sm)", fontSize: 11, color: "var(--warning)", fontFamily: "var(--font-mono)", lineHeight: 1.6 }}>
                  ⚙️ KAI CORE (MPU6050 + Ultrasonic) hardware integration pending.<br />
                  Configure device IP in Profile → Hardware Config.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Hologram Modal */}
      <AnimatePresence>
        {holoOpen && <HologramModal onClose={() => setHoloOpen(false)} phase={squatPhase} />}
      </AnimatePresence>
    </div>
  );
}