// ═══════════════════════════════════════════════
//   KAI FITNESS — Workout.jsx
//   Place at: src/pages/Workout.jsx
//   Real MediaPipe Pose · Webcam · 3D Hologram
// ═══════════════════════════════════════════════

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Cylinder } from "@react-three/drei";
import { useAuth } from "../context/AuthContext";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

// ═══════════════════════════════════════════════
//  VOICE FEEDBACK ENGINE
//  Uses Web Speech API (SpeechSynthesis) — free,
//  built into every browser, works offline.
// ═══════════════════════════════════════════════

// Feedback message library — specific, actionable coaching cues
const VOICE_CUES = {
  // Rep milestones
  repMilestone: (n) => {
    if (n === 1)  return "First rep. Nice start.";
    if (n === 5)  return "5 reps. Keep that rhythm.";
    if (n === 10) return "10 reps. Excellent work.";
    if (n === 15) return "15 reps. You're on fire.";
    if (n === 20) return "20 reps. Outstanding.";
    if (n % 10 === 0) return `${n} reps. Keep pushing.`;
    return null;
  },

  // Form cues — called per joint that's failing
  hipDepth: (score) => {
    if (score >= 85) return null; // good, stay quiet
    if (score >= 70) return "Drive your hips a little lower.";
    return "Hip crease needs to break parallel. Squat deeper.";
  },
  kneeTrack: (score) => {
    if (score >= 85) return null;
    if (score >= 70) return "Push your knees out over your toes.";
    return "Knees caving in. Drive them wide.";
  },
  backAngle: (score) => {
    if (score >= 85) return null;
    if (score >= 70) return "Chest up slightly.";
    return "Too much forward lean. Brace your core and stay upright.";
  },
  barPath: (score) => {
    if (score >= 85) return null;
    if (score >= 70) return "Keep the bar centered.";
    return "Bar is tilting. Even out both sides.";
  },

  // Overall score cues (only spoken every few reps to avoid spam)
  overallGood:  () => ["Perfect form.", "Excellent technique.", "Beautiful squat.", "Great rep."][Math.floor(Math.random()*4)],
  overallOk:    () => ["Good rep, stay focused.", "Solid effort.", "Keep tightening that form."][Math.floor(Math.random()*3)],
  overallBad:   () => ["Focus on your form.", "Slow down and control it.", "Quality over speed."][Math.floor(Math.random()*3)],

  // Set complete
  setComplete:  (n) => `Set ${n} complete. Rest up.`,

  // Encouragement (random, every ~8 reps)
  encourage: () => ["Keep it up.", "You got this.", "Stay strong.", "Breathe and push."][Math.floor(Math.random()*4)],
};

// ─── useTTS hook ──────────────────────────────────
function useTTS(enabled) {
  const queueRef    = useRef([]);
  const speakingRef = useRef(false);
  const voiceRef    = useRef(null);
  const enabledRef  = useRef(enabled);
  // Sync ref synchronously on every render (not just in effect)
  enabledRef.current = enabled;

  // Pick best English voice
  useEffect(() => {
    const pickVoice = () => {
      const voices = window.speechSynthesis?.getVoices() || [];
      // Prefer natural voices
      const preferred = [
        "Google UK English Male", "Google US English",
        "Microsoft David - English (United States)",
        "Alex", "Daniel", "Karen", "Samantha",
      ];
      for (const name of preferred) {
        const v = voices.find((v) => v.name === name);
        if (v) { voiceRef.current = v; return; }
      }
      voiceRef.current = voices.find((v) => v.lang?.startsWith("en")) || null;
    };
    pickVoice();
    window.speechSynthesis?.addEventListener("voiceschanged", pickVoice);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", pickVoice);
  }, []);

  // Chrome bug: speechSynthesis pauses itself after ~15s of inactivity
  // Fix: call resume() periodically while speaking
  useEffect(() => {
    const id = setInterval(() => {
      if (window.speechSynthesis?.paused) window.speechSynthesis.resume();
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const processQueue = useCallback(() => {
    if (speakingRef.current || queueRef.current.length === 0) return;
    if (!window.speechSynthesis) return;
    const text = queueRef.current.shift();
    const utt  = new SpeechSynthesisUtterance(text);
    utt.voice  = voiceRef.current || null;
    utt.lang   = "en-US";
    utt.rate   = 0.95;   // slightly slower = clearer mid-workout
    utt.pitch  = 1.0;
    utt.volume = 1.0;
    utt.onend  = () => { speakingRef.current = false; setTimeout(processQueue, 100); };
    utt.onerror= (e) => {
      // "interrupted" is fine (we cancelled deliberately), ignore it
      if (e.error !== "interrupted") console.warn("TTS error:", e.error);
      speakingRef.current = false;
      setTimeout(processQueue, 100);
    };
    speakingRef.current = true;
    window.speechSynthesis.speak(utt);
  }, []);

  // Stable speak — reads enabledRef so this NEVER recreates
  const speak = useCallback((text, priority = false) => {
    if (!enabledRef.current || !text || !window.speechSynthesis) return;
    if (queueRef.current.includes(text)) return;
    if (priority) {
      window.speechSynthesis.cancel();
      speakingRef.current = false;
      queueRef.current = [text];
    } else {
      if (queueRef.current.length < 2) queueRef.current.push(text);
    }
    // Small delay ensures cancel() has fully resolved before new speak
    setTimeout(processQueue, priority ? 80 : 0);
  }, [processQueue]); // no enabled dep

  // Unlock browser autoplay — must be called on a direct user gesture (button click)
  // Uses real text because Chrome ignores empty utterances
  const unlock = useCallback(() => {
    if (!window.speechSynthesis) return;
    // Speak a real but silent-ish word to unlock the audio context
    const utt = new SpeechSynthesisUtterance(".");
    utt.volume = 0.01;
    utt.rate   = 10;   // super fast so it's imperceptible
    utt.onend  = () => {};
    window.speechSynthesis.speak(utt);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    queueRef.current    = [];
    speakingRef.current = false;
  }, []);

  return { speak, stop, unlock };
}


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
//  SQUAT COUNTER — fixed with smoothing + cooldown
// ═══════════════════════════════════════════════
function useSquatCounter(onRep) {
  const stateRef        = useRef("up");
  const countRef        = useRef(0);
  const angleHistRef    = useRef([]);
  const cooldownRef     = useRef(false);
  const minAngleRef     = useRef(180);
  // Store landmarks captured at the DEEPEST point of the squat
  // so form analysis reflects actual squat depth, not the stand-up position
  const deepestLandmarks = useRef(null);

  const calcAngle = (lm, a, b, c) => {
    const ab = { x: lm[a].x - lm[b].x, y: lm[a].y - lm[b].y };
    const cb = { x: lm[c].x - lm[b].x, y: lm[c].y - lm[b].y };
    const dot   = ab.x * cb.x + ab.y * cb.y;
    const magAB = Math.sqrt(ab.x**2 + ab.y**2);
    const magCB = Math.sqrt(cb.x**2 + cb.y**2);
    return (Math.acos(Math.max(-1, Math.min(1, dot / ((magAB * magCB) || 1))))) * (180 / Math.PI);
  };

  const processLandmarks = useCallback((landmarks) => {
    if (!landmarks) return 180;
    const lm = landmarks;

    const rawLeft  = calcAngle(lm, 23, 25, 27);
    const rawRight = calcAngle(lm, 24, 26, 28);
    const rawAngle = (rawLeft + rawRight) / 2;

    const hist = angleHistRef.current;
    hist.push(rawAngle);
    if (hist.length > 5) hist.shift();
    const smoothAngle = hist.reduce((s, v) => s + v, 0) / hist.length;

    if (smoothAngle < 100 && stateRef.current === "up" && !cooldownRef.current) {
      stateRef.current   = "down";
      minAngleRef.current = smoothAngle;
      deepestLandmarks.current = landmarks; // capture initial deep landmarks
    }

    if (stateRef.current === "down") {
      // Keep updating deepest landmarks while going lower
      if (smoothAngle < minAngleRef.current) {
        minAngleRef.current      = smoothAngle;
        deepestLandmarks.current = landmarks; // update to even deeper frame
      }
    }

    if (smoothAngle > 160 && stateRef.current === "down") {
      if (minAngleRef.current < 105) {
        stateRef.current = "up";
        countRef.current += 1;
        const savedMinAngle = minAngleRef.current; // save before resetting
        const deepLm = deepestLandmarks.current;
        minAngleRef.current      = 180;
        deepestLandmarks.current = null;

        cooldownRef.current = true;
        setTimeout(() => { cooldownRef.current = false; }, 600);

        // Pass savedMinAngle (deepest knee angle) AND deepest landmarks
        onRep?.(countRef.current, savedMinAngle, deepLm);
      } else {
        stateRef.current         = "up";
        minAngleRef.current      = 180;
        deepestLandmarks.current = null;
      }
    }

    return smoothAngle;
  }, [onRep]);

  const reset = useCallback(() => {
    stateRef.current         = "up";
    countRef.current         = 0;
    angleHistRef.current     = [];
    cooldownRef.current      = false;
    minAngleRef.current      = 180;
    deepestLandmarks.current = null;
  }, []);

  return { processLandmarks, reset };
}

// ═══════════════════════════════════════════════
//  3D SQUAT FIGURE — clean stick person
//  Uses only Sphere + Cylinder (Three.js r128 safe)
//  phase 0 = standing, phase 1 = full squat
// ═══════════════════════════════════════════════
function SquatFigure({ phase }) {
  // All rotations/positions are computed each frame from phase
  // so the figure always shows a biomechanically correct squat

  const groupRef = useRef();

  useFrame(() => {
    if (!groupRef.current) return;
    // Whole body sinks as we squat (phase 0=standing, 1=full squat)
    groupRef.current.position.y = -phase * 0.52;
  });

  // Interpolated values for a realistic squat
  const hipFlex    = phase * 1.18;
  const kneeFlex   = phase * 2.18;
  const torsoLean  = phase * 0.32;
  const armSwing   = phase * 0.70;
  const ankleAngle = phase * 0.22;

  const mat = (color, roughness = 0.45, metalness = 0.1) => (
    <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
  );

  // Joint sphere
  const Joint = ({ pos, r = 0.055, color = "#aaa" }) => (
    <Sphere args={[r, 10, 10]} position={pos}>
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.4} />
    </Sphere>
  );

  // Limb segment: cylinder between two points
  const Limb = ({ length, color, radius = 0.045 }) => (
    <Cylinder args={[radius, radius * 0.9, length, 8]} position={[0, -length / 2, 0]}>
      {mat(color)}
    </Cylinder>
  );

  return (
    <group ref={groupRef} position={[0, -0.90, 0]}>

      {/* HEAD */}
      <Sphere args={[0.13, 14, 14]} position={[0, 1.68, 0]}>
        {mat("#d4a88a", 0.65, 0)}
      </Sphere>

      {/* NECK */}
      <group position={[0, 1.58, 0]}>
        <Limb length={0.10} color="#d4a88a" radius={0.038} />
      </group>

      {/* TORSO — leans forward in squat */}
      <group position={[0, 1.48, 0]} rotation={[torsoLean, 0, 0]}>
        <Cylinder args={[0.095, 0.11, 0.56, 8]} position={[0, -0.28, 0]}>
          {mat("#E8192C", 0.4, 0.2)}
        </Cylinder>

        {/* SHOULDERS */}
        <Joint pos={[-0.19, 0, 0]} r={0.065} color="#E8192C" />
        <Joint pos={[ 0.19, 0, 0]} r={0.065} color="#E8192C" />

        {/* LEFT ARM — swings forward during squat */}
        <group position={[-0.19, 0, 0]} rotation={[-armSwing, 0, 0]}>
          <Cylinder args={[0.036, 0.032, 0.30, 7]} position={[0, -0.15, 0]}>
            {mat("#E8192C")}
          </Cylinder>
          <Joint pos={[0, -0.30, 0]} r={0.042} color="#ccc" />
          <group position={[0, -0.30, 0]} rotation={[armSwing * 0.5, 0, 0]}>
            <Cylinder args={[0.030, 0.025, 0.26, 7]} position={[0, -0.13, 0]}>
              {mat("#d4a88a")}
            </Cylinder>
          </group>
        </group>

        {/* RIGHT ARM */}
        <group position={[0.19, 0, 0]} rotation={[-armSwing, 0, 0]}>
          <Cylinder args={[0.036, 0.032, 0.30, 7]} position={[0, -0.15, 0]}>
            {mat("#E8192C")}
          </Cylinder>
          <Joint pos={[0, -0.30, 0]} r={0.042} color="#ccc" />
          <group position={[0, -0.30, 0]} rotation={[armSwing * 0.5, 0, 0]}>
            <Cylinder args={[0.030, 0.025, 0.26, 7]} position={[0, -0.13, 0]}>
              {mat("#d4a88a")}
            </Cylinder>
          </group>
        </group>

        {/* HIP JOINT (bottom of torso) */}
        <Joint pos={[-0.10, -0.56, 0]} r={0.058} color="#9C1120" />
        <Joint pos={[ 0.10, -0.56, 0]} r={0.058} color="#9C1120" />
      </group>

      {/* HIPS / PELVIS origin */}
      <group position={[0, 0.92, 0]}>

        {/* LEFT LEG */}
        <group position={[-0.10, 0, 0]}>
          {/* Thigh — rotates on hip flex */}
          <group rotation={[hipFlex, 0, 0.04]}>
            <Cylinder args={[0.072, 0.062, 0.42, 8]} position={[0, -0.21, 0]}>
              {mat("#c0392b")}
            </Cylinder>
            <Joint pos={[0, -0.42, 0]} r={0.062} color="#888" />
            {/* Shin — rotates from knee */}
            <group position={[0, -0.42, 0]} rotation={[-kneeFlex, 0, 0]}>
              <Cylinder args={[0.058, 0.046, 0.40, 8]} position={[0, -0.20, 0]}>
                {mat("#9C1120")}
              </Cylinder>
              <Joint pos={[0, -0.40, 0]} r={0.048} color="#666" />
              {/* Foot */}
              <group position={[0, -0.40, 0]} rotation={[-ankleAngle, 0, 0]}>
                <Cylinder args={[0.040, 0.035, 0.08, 7]} position={[0, -0.04, 0]}>
                  {mat("#555")}
                </Cylinder>
                <Cylinder args={[0.025, 0.025, 0.18, 7]}
                  position={[0, -0.075, 0.09]}
                  rotation={[Math.PI / 2, 0, 0]}>
                  {mat("#333")}
                </Cylinder>
              </group>
            </group>
          </group>
        </group>

        {/* RIGHT LEG (mirror) */}
        <group position={[0.10, 0, 0]}>
          <group rotation={[hipFlex, 0, -0.04]}>
            <Cylinder args={[0.072, 0.062, 0.42, 8]} position={[0, -0.21, 0]}>
              {mat("#c0392b")}
            </Cylinder>
            <Joint pos={[0, -0.42, 0]} r={0.062} color="#888" />
            <group position={[0, -0.42, 0]} rotation={[-kneeFlex, 0, 0]}>
              <Cylinder args={[0.058, 0.046, 0.40, 8]} position={[0, -0.20, 0]}>
                {mat("#9C1120")}
              </Cylinder>
              <Joint pos={[0, -0.40, 0]} r={0.048} color="#666" />
              <group position={[0, -0.40, 0]} rotation={[-ankleAngle, 0, 0]}>
                <Cylinder args={[0.040, 0.035, 0.08, 7]} position={[0, -0.04, 0]}>
                  {mat("#555")}
                </Cylinder>
                <Cylinder args={[0.025, 0.025, 0.18, 7]}
                  position={[0, -0.075, 0.09]}
                  rotation={[Math.PI / 2, 0, 0]}>
                  {mat("#333")}
                </Cylinder>
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* Shadow disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.88, 0]}>
        <circleGeometry args={[0.38, 32]} />
        <meshBasicMaterial color="#E8192C" transparent opacity={0.07} />
      </mesh>
    </group>
  );
}

function SquatScene({ phase }) {
  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 6, 4]} intensity={1.4} castShadow />
      <pointLight position={[-3, 4, -2]} intensity={0.5} color="#E8192C" />
      <pointLight position={[3, 2, 3]}   intensity={0.3} color="#fff" />
      <SquatFigure phase={phase} />
      <OrbitControls enablePan={false} minDistance={2.2} maxDistance={5.5} autoRotate autoRotateSpeed={0.8} />
      <gridHelper args={[4, 20, "#1e1e24", "#19191f"]} position={[0, -0.88, 0]} />
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
          <Canvas camera={{ position: [0, 0.4, 3.5], fov: 50 }} style={{ background: "var(--bg)" }}>
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
  // Voice: default ON (respects profile setting if available)
  const [voiceEnabled, setVoiceEnabled] = useState(
    userProfile?.soundFeedback !== false
  );

  // ── KAI SENSE — Web Bluetooth ──────────────────
  // BLE UUIDs — must match Arduino code exactly
  const BLE_SERVICE     = "12345678-1234-1234-1234-123456789abc";
  const BLE_CHAR_ACCEL  = "12345678-1234-1234-1234-123456789001";
  const BLE_CHAR_GYRO   = "12345678-1234-1234-1234-123456789002";

  const [sensorData,   setSensorData]   = useState(null);
  const [sensorOnline, setSensorOnline] = useState(false);
  const [hipLean,      setHipLean]      = useState(0);
  const [bleConnecting,setBleConnecting]= useState(false);
  const bleDeviceRef   = useRef(null);

  // Parse 3× int16 from BLE DataView → {x, y, z}
  const parseXYZ = (dataView) => ({
    x: dataView.getInt16(0, true),
    y: dataView.getInt16(2, true),
    z: dataView.getInt16(4, true),
  });

  // Compute hip lean from accel (device worn on lower back/hip)
  const computeHipLean = (accel) => {
    const { x, y, z } = accel;
    return Math.round(Math.atan2(x, Math.sqrt(y * y + z * z)) * (180 / Math.PI));
  };

  const connectBLE = async () => {
    if (!navigator.bluetooth) {
      alert("Web Bluetooth not supported in this browser.\nUse Chrome on Android or desktop Chrome.");
      return;
    }
    setBleConnecting(true);
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: "KAI_SENSE" }],
        optionalServices: [BLE_SERVICE],
      });
      bleDeviceRef.current = device;

      device.addEventListener("gattserverdisconnected", () => {
        setSensorOnline(false);
        setSensorData(null);
      });

      const server  = await device.gatt.connect();
      const service = await server.getPrimaryService(BLE_SERVICE);

      // Subscribe to accelerometer notifications
      const accelChar = await service.getCharacteristic(BLE_CHAR_ACCEL);
      await accelChar.startNotifications();
      accelChar.addEventListener("characteristicvaluechanged", (e) => {
        const accel = parseXYZ(e.target.value);
        setSensorData((prev) => ({ ...prev, accel }));
        setHipLean(computeHipLean(accel));
      });

      // Subscribe to gyro notifications
      const gyroChar = await service.getCharacteristic(BLE_CHAR_GYRO);
      await gyroChar.startNotifications();
      gyroChar.addEventListener("characteristicvaluechanged", (e) => {
        const gyro = parseXYZ(e.target.value);
        setSensorData((prev) => ({ ...prev, gyro }));
      });

      setSensorOnline(true);
      speak("KAI SENSE connected.", false);
    } catch (e) {
      if (e.name !== "NotFoundError") {
        console.error("BLE error:", e);
      }
    } finally {
      setBleConnecting(false);
    }
  };

  const disconnectBLE = () => {
    bleDeviceRef.current?.gatt?.disconnect();
    setSensorOnline(false);
    setSensorData(null);
  };

  // Cleanup on unmount
  useEffect(() => () => disconnectBLE(), []);

  // TTS engine
  const { speak, stop: stopTTS, unlock: unlockTTS } = useTTS(voiceEnabled);
  // Keep a ref to speak so handleRep always calls the latest version
  const speakRef = useRef(speak);
  useEffect(() => { speakRef.current = speak; }, [speak]);

  // Track last spoken cue to avoid repeating same issue every rep
  const lastFormCueRef  = useRef("");
  const lastFormCueTime = useRef(0);

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const timerRef  = useRef(null);
  const repsRef   = useRef(0);
  const setsRef   = useRef(0);
  // Keep a ref to isRunning so pose callbacks never stale-close over it
  // (avoids MediaPipe restarting every time start/pause is toggled)
  const isRunningRef = useRef(false);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

  // Sync refs
  useEffect(() => { repsRef.current = reps; }, [reps]);
  useEffect(() => { setsRef.current = sets; }, [sets]);

  // Timer
  useEffect(() => {
    if (isRunning) timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    else           clearInterval(timerRef.current);
    return ()    => clearInterval(timerRef.current);
  }, [isRunning]);

  // Rep callback — per-joint analysis + optimised voice feedback
  const handleRep = useCallback((count, kneeAngle, landmarks) => {
    setReps(count);
    const isNewSet = count % 5 === 0;
    if (isNewSet) setSets((s) => s + 1);

    const score = Math.min(99, Math.max(55, Math.round(100 - Math.abs(kneeAngle - 90) * 0.3)));
    setFormScore(score);
    setSquatPhase(0);

    // ── Per-joint scores ──────────────────────
    let joints = { hipDepth: 0, kneeTrack: 0, backAngle: 0, barPath: 0 };
    if (landmarks) {
      const lm = landmarks;
      const angle3 = (A, B, C) => {
        const ab = { x: lm[A].x - lm[B].x, y: lm[A].y - lm[B].y };
        const cb = { x: lm[C].x - lm[B].x, y: lm[C].y - lm[B].y };
        const dot = ab.x * cb.x + ab.y * cb.y;
        const mag = Math.sqrt(ab.x**2 + ab.y**2) * Math.sqrt(cb.x**2 + cb.y**2);
        return (Math.acos(Math.max(-1, Math.min(1, dot / (mag || 1))))) * (180 / Math.PI);
      };
      // ── Correct joint calculations ────────────
      // MediaPipe landmark indices:
      // 11/12 = shoulders, 23/24 = hips, 25/26 = knees, 27/28 = ankles

      // HIP DEPTH — measured from deepest frame of squat
      // landmarks are from bottom of squat, so knee angle should be ~85-100° for good depth
      // 85° or less = perfect (99), 100° = good (87), 120° = shallow (55), 140°+ = bad (30)
      const leftKneeAngle  = angle3(23, 25, 27);
      const rightKneeAngle = angle3(24, 26, 28);
      const avgKneeAngle   = (leftKneeAngle + rightKneeAngle) / 2;
      const hipDepthScore  = Math.min(99, Math.max(30,
        Math.round(99 - Math.max(0, avgKneeAngle - 82) * 2.0)
      ));

      // KNEE TRACKING — knees should stay over toes (knee x ≈ ankle x)
      // Measure horizontal deviation between knee and ankle in normalised coords
      const leftKneeDev  = Math.abs(lm[25].x - lm[27].x);
      const rightKneeDev = Math.abs(lm[26].x - lm[28].x);
      const avgDev       = (leftKneeDev + rightKneeDev) / 2;
      const kneeScore    = Math.min(99, Math.max(30, Math.round(99 - avgDev * 280)));

      // BACK ANGLE — torso should stay upright
      // Use shoulder→hip vertical: angle between (shoulder-hip) vector and straight up
      // Good upright posture: vector points nearly straight up = small angle from vertical
      const leftTorsoX  = lm[11].x - lm[23].x;
      const leftTorsoY  = lm[11].y - lm[23].y; // negative = shoulder above hip (correct)
      const rightTorsoX = lm[12].x - lm[24].x;
      const rightTorsoY = lm[12].y - lm[24].y;
      // Angle from vertical (0 = perfectly upright)
      const leftLean  = Math.abs(Math.atan2(leftTorsoX,  -leftTorsoY)  * (180 / Math.PI));
      const rightLean = Math.abs(Math.atan2(rightTorsoX, -rightTorsoY) * (180 / Math.PI));
      const avgLean   = (leftLean + rightLean) / 2;
      // 0° lean = 99, 20° = ~79, 40°+ = ~55
      const backScore  = Math.min(99, Math.max(30, Math.round(99 - avgLean * 1.1)));

      // BAR PATH — shoulder symmetry (left/right height difference)
      const shoulderTilt = Math.abs(lm[11].y - lm[12].y);
      const barScore     = Math.min(99, Math.max(30, Math.round(99 - shoulderTilt * 500)));

      joints = {
        hipDepth:  hipDepthScore,
        kneeTrack: kneeScore,
        backAngle: backScore,
        barPath:   barScore,
      };
      setJointScores(joints);
    }

    // ── Optimised visual feedback message ─────
    // Priority: worst joint first, then overall score, then encouragement
    const issues = [
      { joint: "hipDepth",  score: joints.hipDepth,  label: "Hip Depth",  icon: "🟡" },
      { joint: "kneeTrack", score: joints.kneeTrack, label: "Knee Track", icon: "🟡" },
      { joint: "backAngle", score: joints.backAngle, label: "Back Angle", icon: "🟡" },
      { joint: "barPath",   score: joints.barPath,   label: "Bar Path",   icon: "🟡" },
    ].filter((j) => j.score < 80 && j.score > 0)
     .sort((a, b) => a.score - b.score); // worst first

    let visualMsg;
    let voiceMsg = null;
    const now = Date.now();

    if (issues.length === 0 || score >= 85) {
      // Perfect rep
      visualMsg = `✅ Rep ${count} — great form!`;
      if (count % 3 === 0) voiceMsg = VOICE_CUES.overallGood();
    } else {
      // Has issues — show worst one
      const worst = issues[0];
      const cueMap = {
        hipDepth:  VOICE_CUES.hipDepth,
        kneeTrack: VOICE_CUES.kneeTrack,
        backAngle: VOICE_CUES.backAngle,
        barPath:   VOICE_CUES.barPath,
      };
      const rawCue = cueMap[worst.joint]?.(worst.score);
      visualMsg = `⚠ ${worst.label}: ${worst.score}% — ${rawCue || "needs work"}`;

      // Voice: only speak if different from last cue OR >6 seconds passed
      const isDifferent = rawCue !== lastFormCueRef.current;
      const isStale     = now - lastFormCueTime.current > 6000;
      if (rawCue && (isDifferent || isStale)) {
        voiceMsg = rawCue;
        lastFormCueRef.current  = rawCue;
        lastFormCueTime.current = now;
      }
    }

    // Rep milestone voice (always speak, highest priority)
    const milestone = VOICE_CUES.repMilestone(count);
    if (milestone) {
      speakRef.current(milestone, true);
    } else if (isNewSet) {
      speakRef.current(VOICE_CUES.setComplete(count / 5), true);
    } else if (voiceMsg) {
      speakRef.current(voiceMsg, issues.length > 0 && issues[0].score < 65);
    } else if (count % 8 === 0) {
      speakRef.current(VOICE_CUES.encourage());
    }

    // Update visual log
    setFeedback((prev) => [
      { id: Date.now(), msg: visualMsg, score, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 7),
    ]);
  }, []); // empty deps — uses refs only

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

  // Pose result handler — uses isRunningRef so this callback NEVER changes
  // and MediaPipe never restarts when start/pause is toggled
  const handlePoseResult = useCallback((results) => {
    if (results.error) {
      setCamError(results.error);
      return;
    }
    if (!isRunningRef.current) return;
    if (results.poseLandmarks) {
      const lm = results.poseLandmarks;
      const hipY  = (lm[23]?.y + lm[24]?.y) / 2;
      const kneeY = (lm[25]?.y + lm[26]?.y) / 2;
      const phase = Math.max(0, Math.min(1, (kneeY - hipY) / 0.3));
      setSquatPhase(phase);
    }
  }, []); // ← empty deps: this function never changes reference

  const { processLandmarks, reset: resetCounter } = useSquatCounter(handleRep);

  // Combine pose result with squat counting — stable reference, never recreated
  const handlePoseFull = useCallback((results) => {
    handlePoseResult(results);
    if (results.poseLandmarks && isRunningRef.current) {
      processLandmarks(results.poseLandmarks);
    }
  }, [handlePoseResult, processLandmarks]); // no isRunning dep → stable

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
    unlockTTS();
    // Small delay so unlock utterance finishes before real speech
    setTimeout(() => speak("Session started. Begin squatting.", false), 300);
    setIsRunning(true);
  };

  const handlePause = () => { setIsRunning(false); stopTTS(); };

  const handleReset = () => {
    setIsRunning(false); setCamActive(false); stopTTS(); resetCounter();
    setReps(0); setSets(0); setElapsed(0);
    setFormScore(0); setSquatPhase(0);
    setJointScores({ hipDepth: 0, kneeTrack: 0, backAngle: 0, barPath: 0 });
    setFeedback([]); setCamError("");
    lastFormCueRef.current = "";
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
            { id: "product", label: "📦 KAI SENSE + CORE",   desc: sensorOnline ? "🟢 Connected · MPU6050 live" : "ESP32-CAM · MPU6050 (tap to connect)" },
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
          {/* Voice toggle — always visible, never affects MediaPipe */}
          <motion.button whileTap={{ scale: 0.92 }}
            onClick={() => setVoiceEnabled((v) => !v)}
            title={voiceEnabled ? "Voice feedback ON — click to mute" : "Voice feedback OFF — click to enable"}
            style={{ width: 36, height: 36, background: voiceEnabled ? "rgba(34,197,94,0.1)" : "var(--surface2)", border: `1px solid ${voiceEnabled ? "rgba(34,197,94,0.4)" : "var(--border)"}`, borderRadius: "var(--radius-sm)", color: voiceEnabled ? "var(--success)" : "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, transition: "all 0.2s", flexShrink: 0 }}>
            {voiceEnabled ? "🔊" : "🔇"}
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: 2, color: "var(--text-dim)" }}>AI FORM FEEDBACK</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {/* Live voice status badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 20, background: voiceEnabled ? "rgba(34,197,94,0.1)" : "var(--surface3)", border: `1px solid ${voiceEnabled ? "rgba(34,197,94,0.3)" : "var(--border)"}` }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: voiceEnabled ? "var(--success)" : "var(--text-muted)", animation: voiceEnabled && isRunning ? "pulse 2s infinite" : "none" }} />
                  <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: voiceEnabled ? "var(--success)" : "var(--text-muted)", letterSpacing: 0.5 }}>
                    {voiceEnabled ? "VOICE ON" : "VOICE OFF"}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 70 }}>
              <AnimatePresence>
                {feedback.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)", lineHeight: 1.6 }}>
                    {mode === "laptop"
                      ? `Start camera and begin squatting — AI analyses your form and ${voiceEnabled ? "speaks corrections aloud" : "shows them here"}.`
                      : "Start a session to receive form feedback."}
                  </div>
                ) : feedback.map((f) => {
                  const isGood = f.msg.startsWith("✅");
                  const isBad  = f.msg.startsWith("⚠");
                  return (
                    <motion.div key={f.id}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: isGood ? "rgba(34,197,94,0.05)" : isBad ? "rgba(232,25,44,0.05)" : "var(--surface2)", borderRadius: "var(--radius-sm)", border: `1px solid ${isGood ? "rgba(34,197,94,0.2)" : isBad ? "var(--border-red)" : "var(--border)"}`, fontSize: 12 }}>
                      <span style={{ flex: 1, color: isGood ? "var(--success)" : isBad ? "var(--text)" : "var(--text-dim)" }}>{f.msg}</span>
                      {f.score > 0 && (
                        <span style={{ fontSize: 10, fontFamily: "var(--font-display)", color: f.score >= 85 ? "var(--success)" : f.score >= 70 ? "var(--warning)" : "var(--red)", flexShrink: 0, letterSpacing: 0.5 }}>
                          {f.score}
                        </span>
                      )}
                      <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>{f.time}</span>
                    </motion.div>
                  );
                })}
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
              {/* Hip lean from KAI SENSE accelerometer */}
              {mode === "product" && sensorOnline && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
                    <span>Hip Lean <span style={{ fontSize: 8, color: "var(--text-muted)" }}>KAI SENSE</span></span>
                    <span style={{ color: Math.abs(hipLean) <= 8 ? "var(--success)" : Math.abs(hipLean) <= 15 ? "var(--warning)" : "var(--red)" }}>
                      {hipLean > 0 ? "+" : ""}{hipLean}°
                    </span>
                  </div>
                  <div className="progress-track">
                    <div style={{ height: "100%", width: `${Math.min(100, Math.abs(hipLean) * 3)}%`, background: Math.abs(hipLean) <= 8 ? "var(--success)" : Math.abs(hipLean) <= 15 ? "var(--warning)" : "var(--red)", borderRadius: 2, transition: "all 0.3s" }} />
                  </div>
                </div>
              )}
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
              <Canvas camera={{ position: [0, 0.4, 3.2], fov: 50 }} style={{ background: "var(--bg)" }}>
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
                style={{ background: "var(--surface)", border: `1px solid ${sensorOnline ? "rgba(34,197,94,0.3)" : "var(--border)"}`, borderRadius: "var(--radius-lg)", padding: 16, overflow: "hidden" }}>

                {/* Header + status */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: 2, color: "var(--text-dim)" }}>KAI SENSE</div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>MPU6050 · Bluetooth LE</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: sensorOnline ? "var(--success)" : "var(--text-muted)", animation: sensorOnline ? "ping 2s infinite" : "none" }} />
                      <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: sensorOnline ? "var(--success)" : "var(--text-muted)" }}>
                        {bleConnecting ? "PAIRING…" : sensorOnline ? "CONNECTED" : "NOT CONNECTED"}
                      </span>
                    </div>
                    {sensorOnline ? (
                      <motion.button whileTap={{ scale: 0.96 }} onClick={disconnectBLE}
                        style={{ padding: "4px 10px", background: "transparent", border: "1px solid var(--border-red)", borderRadius: "var(--radius-sm)", color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: 9, cursor: "pointer", letterSpacing: 0.5 }}>
                        DISCONNECT
                      </motion.button>
                    ) : (
                      <motion.button whileTap={{ scale: 0.96 }} onClick={connectBLE} disabled={bleConnecting}
                        style={{ padding: "5px 12px", background: bleConnecting ? "var(--surface3)" : "var(--red)", border: "none", borderRadius: "var(--radius-sm)", color: "#fff", fontFamily: "var(--font-mono)", fontSize: 9, cursor: bleConnecting ? "not-allowed" : "pointer", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 5 }}>
                        {bleConnecting ? <><div className="spinner" style={{ width: 10, height: 10 }} /> PAIRING</> : "⚡ CONNECT"}
                      </motion.button>
                    )}
                  </div>
                </div>

                {!sensorOnline ? (
                  <div style={{ padding: "10px 12px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", lineHeight: 1.7 }}>
                    1. Power on KAI SENSE device<br />
                    2. Strap it to your lower back / hip<br />
                    3. Tap <span style={{ color: "var(--red)" }}>⚡ CONNECT</span> above to pair via Bluetooth<br />
                    <span style={{ fontSize: 9, color: "var(--text-muted)" }}>Requires Chrome browser · Bluetooth must be on</span>
                  </div>
                ) : (
                  <>
                    {/* Hip lean bar */}
                    <div style={{ marginBottom: 12, padding: "10px 12px", background: "var(--surface2)", borderRadius: "var(--radius-md)", border: `1px solid ${Math.abs(hipLean) > 15 ? "var(--border-red)" : "var(--border)"}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                        <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-dim)", letterSpacing: 0.5 }}>HIP LEAN</span>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: 20, color: Math.abs(hipLean) > 15 ? "var(--red)" : Math.abs(hipLean) > 8 ? "var(--warning)" : "var(--success)", letterSpacing: 1 }}>
                          {hipLean > 0 ? "+" : ""}{hipLean}°
                        </span>
                      </div>
                      <div style={{ position: "relative", height: 6, background: "var(--surface3)", borderRadius: 3 }}>
                        <div style={{ position: "absolute", left: "50%", top: 0, height: "100%", width: 2, background: "var(--border-md)" }} />
                        <motion.div animate={{ left: hipLean < 0 ? `${50 + Math.max(-50, hipLean * 1.5)}%` : "50%", right: hipLean > 0 ? `${50 - Math.min(50, hipLean * 1.5)}%` : "50%" }}
                          transition={{ duration: 0.1 }}
                          style={{ position: "absolute", height: "100%", borderRadius: 3, background: Math.abs(hipLean) > 15 ? "var(--red)" : Math.abs(hipLean) > 8 ? "var(--warning)" : "var(--success)" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3, fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        <span>← LEFT</span><span>NEUTRAL</span><span>RIGHT →</span>
                      </div>
                      {Math.abs(hipLean) > 15 && isRunning && (
                        <div style={{ marginTop: 6, fontSize: 10, color: "var(--red)", fontFamily: "var(--font-mono)" }}>⚠ Hip tilt — keep hips level</div>
                      )}
                    </div>

                    {/* Raw sensor values */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                      {[
                        { label: "AX", val: sensorData?.accel?.x ?? 0, color: "var(--red)"     },
                        { label: "AY", val: sensorData?.accel?.y ?? 0, color: "var(--warning)"  },
                        { label: "AZ", val: sensorData?.accel?.z ?? 0, color: "var(--success)"  },
                        { label: "GX", val: sensorData?.gyro?.x  ?? 0, color: "var(--info)"     },
                        { label: "GY", val: sensorData?.gyro?.y  ?? 0, color: "var(--info)"     },
                        { label: "GZ", val: sensorData?.gyro?.z  ?? 0, color: "var(--info)"     },
                      ].map((s) => (
                        <div key={s.label} style={{ padding: "6px 8px", background: "var(--surface2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", textAlign: "center" }}>
                          <div style={{ fontSize: 8, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: 2 }}>{s.label}</div>
                          <div style={{ fontFamily: "var(--font-display)", fontSize: 12, color: s.color }}>{s.val.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
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