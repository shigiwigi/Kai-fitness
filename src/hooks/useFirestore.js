// ═══════════════════════════════════════════════
//   KAI FITNESS — useFirestore.js
//   All Firestore hooks: meals · weight · workouts
//   Place in: src/hooks/useFirestore.js
// ═══════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

// ─── Helper: today's date string YYYY-MM-DD ──────
export function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// ─── Helper: timestamp → readable ────────────────
export function fmtTimestamp(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ════════════════════════════════════════════════
//  MEALS
// ════════════════════════════════════════════════

/**
 * useMeals — real-time listener for today's meals
 * Path: users/{uid}/meals/{mealId}
 */
export function useMeals(uid) {
  const [meals,   setMeals]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!uid) return;

    const today = todayStr();
    const start = Timestamp.fromDate(new Date(today + "T00:00:00"));
    const end   = Timestamp.fromDate(new Date(today + "T23:59:59"));

    const q = query(
      collection(db, "users", uid, "meals"),
      where("createdAt", ">=", start),
      where("createdAt", "<=", end),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          time: fmtTimestamp(d.data().createdAt),
        }));
        setMeals(docs);
        setLoading(false);
      },
      (err) => {
        console.error("useMeals:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [uid]);

  // ── Add meal ──
  const addMeal = useCallback(
    async (food, qty = 1) => {
      if (!uid) return;
      const mealType = (() => {
        const h = new Date().getHours();
        if (h < 11) return "breakfast";
        if (h < 15) return "lunch";
        if (h < 18) return "snack";
        return "dinner";
      })();
      await addDoc(collection(db, "users", uid, "meals"), {
        name:      food.name,
        brand:     food.brand    || "Custom",
        cal:       Math.round((food.cal     || 0) * qty),
        protein:   Math.round((food.protein || 0) * qty),
        carbs:     Math.round((food.carbs   || 0) * qty),
        fat:       Math.round((food.fat     || 0) * qty),
        fiber:     Math.round((food.fiber   || 0) * qty),
        serving:   food.serving  || "",
        qty,
        mealType,
        barcode:   food.barcode  || null,
        createdAt: serverTimestamp(),
      });
    },
    [uid]
  );

  // ── Delete meal ──
  const deleteMeal = useCallback(
    async (mealId) => {
      if (!uid) return;
      await deleteDoc(doc(db, "users", uid, "meals", mealId));
    },
    [uid]
  );

  return { meals, loading, error, addMeal, deleteMeal };
}

// ════════════════════════════════════════════════
//  WEIGHT LOG
// ════════════════════════════════════════════════

/**
 * useWeightLog — loads all weight entries, sorted asc
 * Path: users/{uid}/weightLog/{entryId}
 */
export function useWeightLog(uid) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "users", uid, "weightLog"),
      orderBy("date", "asc"),
      limit(90) // last 90 entries max
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({
          id:     d.id,
          ...d.data(),
          // Recharts needs plain string date
          dateStr: d.data().date,
        }));
        setEntries(docs);
        setLoading(false);
      },
      (err) => {
        console.error("useWeightLog:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [uid]);

  // ── Add weight entry ──
  const addEntry = useCallback(
    async ({ weight, note = "" }) => {
      if (!uid) return;
      const today = todayStr();
      // Use today's date as document ID so one entry per day
      await setDoc(
        doc(db, "users", uid, "weightLog", today),
        {
          weight:    parseFloat(weight),
          note,
          date:      today,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    },
    [uid]
  );

  return { entries, loading, error, addEntry };
}

// ════════════════════════════════════════════════
//  WORKOUTS
// ════════════════════════════════════════════════

/**
 * useWorkouts — logs completed workout sessions
 * Path: users/{uid}/workouts/{sessionId}
 */
export function useWorkouts(uid) {
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "users", uid, "workouts"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return unsub;
  }, [uid]);

  // ── Save completed session ──
  const saveSession = useCallback(
    async ({ reps, sets, duration, formScore, mode }) => {
      if (!uid) return;
      await addDoc(collection(db, "users", uid, "workouts"), {
        reps,
        sets,
        duration,  // seconds
        formScore,
        mode,      // "product" | "laptop"
        type:      "squat",
        createdAt: serverTimestamp(),
      });
    },
    [uid]
  );

  return { sessions, loading, saveSession };
}

// ════════════════════════════════════════════════
//  PROGRESS PHOTOS  (base64 stored in Firestore)
// ════════════════════════════════════════════════

/**
 * useProgressPhotos — stores base64 photos in Firestore
 * (free alternative to Firebase Storage)
 * Path: users/{uid}/progressPhotos/{photoId}
 */
export function useProgressPhotos(uid) {
  const [photos,  setPhotos]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "users", uid, "progressPhotos"),
      orderBy("createdAt", "asc"),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      setPhotos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return unsub;
  }, [uid]);

  // ── Add photo (base64) ──
  const addPhoto = useCallback(
    async ({ base64, weight, note = "" }) => {
      if (!uid) return;
      const today = todayStr();
      await addDoc(collection(db, "users", uid, "progressPhotos"), {
        base64,       // data:image/jpeg;base64,...
        weight:       parseFloat(weight) || 0,
        note,
        date:         today,
        createdAt:    serverTimestamp(),
      });
    },
    [uid]
  );

  // ── Delete photo ──
  const deletePhoto = useCallback(
    async (photoId) => {
      if (!uid) return;
      await deleteDoc(doc(db, "users", uid, "progressPhotos", photoId));
    },
    [uid]
  );

  return { photos, loading, addPhoto, deletePhoto };
}

// ════════════════════════════════════════════════
//  DASHBOARD SUMMARY  (last 7 days stats)
// ════════════════════════════════════════════════

export function useDashboardStats(uid) {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    // Get last 7 days of workouts
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const tsStart = Timestamp.fromDate(sevenDaysAgo);

    const wq = query(
      collection(db, "users", uid, "workouts"),
      where("createdAt", ">=", tsStart),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(wq, async (snap) => {
      const workouts = snap.docs.map((d) => d.data());

      // Also get today's meals for calorie total
      const today = todayStr();
      const mStart = Timestamp.fromDate(new Date(today + "T00:00:00"));
      const mEnd   = Timestamp.fromDate(new Date(today + "T23:59:59"));
      const mq     = query(
        collection(db, "users", uid, "meals"),
        where("createdAt", ">=", mStart),
        where("createdAt", "<=", mEnd)
      );
      const mSnap  = await getDocs(mq);
      const meals  = mSnap.docs.map((d) => d.data());

      const todayCal     = meals.reduce((a, m) => a + (m.cal || 0), 0);
      const todayProtein = meals.reduce((a, m) => a + (m.protein || 0), 0);
      const todayCarbs   = meals.reduce((a, m) => a + (m.carbs || 0), 0);
      const todayFat     = meals.reduce((a, m) => a + (m.fat || 0), 0);
      const weekWorkouts = workouts.length;
      const weekReps     = workouts.reduce((a, w) => a + (w.reps || 0), 0);
      const lastWorkout  = workouts[0] || null;
      const avgFormScore = workouts.length
        ? Math.round(workouts.reduce((a, w) => a + (w.formScore || 0), 0) / workouts.length)
        : null;

      setStats({
        todayCal, todayProtein, todayCarbs, todayFat,
        weekWorkouts, weekReps, lastWorkout, avgFormScore,
      });
      setLoading(false);
    });

    return unsub;
  }, [uid]);

  return { stats, loading };
}