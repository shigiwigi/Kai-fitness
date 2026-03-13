/**
 * db.js — All Firestore + Realtime DB operations for Kai Fitness
 *
 * FREE TIER ONLY:
 *  - Firestore: profiles, workouts, nutrition logs, progress entries
 *  - Realtime DB: live workout session (reps, pose data) — ephemeral
 *  - NO Firebase Storage (costs money) — photos stored as base64 in Firestore (< 1MB)
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { ref, set, onValue, off, push, remove } from "firebase/database";
import { db, rtdb } from "./firebase";

// ─── USERS / PROFILE ────────────────────────────────────────────────────────

export const createUserProfile = async (uid, data) => {
  await setDoc(doc(db, "users", uid), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const updateUserProfile = async (uid, data) => {
  await updateDoc(doc(db, "users", uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

// ─── WORKOUTS ────────────────────────────────────────────────────────────────

/** Save a completed workout session */
export const saveWorkout = async (uid, workout) => {
  const ref = collection(db, "users", uid, "workouts");
  return await addDoc(ref, {
    ...workout,
    createdAt: serverTimestamp(),
  });
};

/** Get recent workouts */
export const getWorkouts = async (uid, limitCount = 20) => {
  const q = query(
    collection(db, "users", uid, "workouts"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/** Real-time listener for workouts */
export const subscribeWorkouts = (uid, callback) => {
  const q = query(
    collection(db, "users", uid, "workouts"),
    orderBy("createdAt", "desc"),
    limit(30)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const deleteWorkout = async (uid, workoutId) => {
  await deleteDoc(doc(db, "users", uid, "workouts", workoutId));
};

// ─── LIVE WORKOUT SESSION (Realtime DB) ──────────────────────────────────────
// Used during active camera workout — lightweight, ephemeral, free

export const startLiveSession = async (uid, exerciseType) => {
  const sessionRef = ref(rtdb, `liveSessions/${uid}`);
  await set(sessionRef, {
    exercise: exerciseType,
    reps: 0,
    sets: 0,
    startTime: Date.now(),
    active: true,
    lastPose: null,
  });
};

export const updateLiveReps = async (uid, reps, sets, poseLabel) => {
  const sessionRef = ref(rtdb, `liveSessions/${uid}`);
  await set(sessionRef, { reps, sets, lastPose: poseLabel, updatedAt: Date.now() });
};

export const endLiveSession = async (uid) => {
  const sessionRef = ref(rtdb, `liveSessions/${uid}`);
  await remove(sessionRef);
};

export const subscribeLiveSession = (uid, callback) => {
  const sessionRef = ref(rtdb, `liveSessions/${uid}`);
  onValue(sessionRef, (snap) => callback(snap.val()));
  return () => off(sessionRef);
};

// ─── NUTRITION ───────────────────────────────────────────────────────────────

export const logMeal = async (uid, meal) => {
  return await addDoc(collection(db, "users", uid, "nutrition"), {
    ...meal,
    loggedAt: serverTimestamp(),
  });
};

export const getNutritionByDate = async (uid, dateStr) => {
  const q = query(
    collection(db, "users", uid, "nutrition"),
    where("date", "==", dateStr)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const subscribeNutrition = (uid, dateStr, callback) => {
  const q = query(
    collection(db, "users", uid, "nutrition"),
    where("date", "==", dateStr),
    orderBy("loggedAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const deleteMeal = async (uid, mealId) => {
  await deleteDoc(doc(db, "users", uid, "nutrition", mealId));
};

// ─── PROGRESS / WEIGHT ───────────────────────────────────────────────────────

export const logWeight = async (uid, weightKg, notes = "") => {
  const dateStr = new Date().toISOString().split("T")[0];
  await setDoc(doc(db, "users", uid, "progress", dateStr), {
    weightKg,
    notes,
    date: dateStr,
    loggedAt: serverTimestamp(),
  });
};

export const getProgressHistory = async (uid, days = 30) => {
  const q = query(
    collection(db, "users", uid, "progress"),
    orderBy("date", "desc"),
    limit(days)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();
};

export const subscribeProgress = (uid, callback) => {
  const q = query(
    collection(db, "users", uid, "progress"),
    orderBy("date", "desc"),
    limit(90)
  );
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();
    callback(data);
  });
};

// ─── PROGRESS PHOTOS (base64, free, Firestore) ───────────────────────────────
// NOTE: Keep photos under 800KB compressed — Firestore doc limit is 1MB

export const saveProgressPhoto = async (uid, base64Image, dateStr, label = "") => {
  const docRef = doc(db, "users", uid, "photos", dateStr);
  await setDoc(docRef, {
    image: base64Image,
    date: dateStr,
    label,
    uploadedAt: serverTimestamp(),
  });
};

export const getProgressPhotos = async (uid, limitCount = 10) => {
  const q = query(
    collection(db, "users", uid, "photos"),
    orderBy("date", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ─── DASHBOARD STATS (aggregated) ───────────────────────────────────────────

export const getDashboardStats = async (uid) => {
  const [workouts, progressSnap, nutritionToday] = await Promise.all([
    getWorkouts(uid, 7),
    getDoc(doc(db, "users", uid, "progress", new Date().toISOString().split("T")[0])),
    getNutritionByDate(uid, new Date().toISOString().split("T")[0]),
  ]);

  const totalCaloriesToday = nutritionToday.reduce(
    (sum, m) => sum + (m.calories || 0),
    0
  );
  const totalWorkoutsThisWeek = workouts.length;
  const currentWeight = progressSnap.exists() ? progressSnap.data().weightKg : null;

  return {
    totalCaloriesToday,
    totalWorkoutsThisWeek,
    currentWeight,
    recentWorkouts: workouts.slice(0, 5),
  };
};