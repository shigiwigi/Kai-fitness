// ═══════════════════════════════════════════════
//   KAI FITNESS — AuthContext.jsx
//   Place at: src/context/AuthContext.jsx
// ═══════════════════════════════════════════════

import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);

// ─── Default profile shape ────────────────────────
export const DEFAULT_PROFILE = {
  name:          "",
  email:         "",
  age:           0,
  height:        0,
  weight:        0,
  goalWeight:    78,
  gender:        "male",
  activityLevel: "moderate",
  fitnessGoal:   "cut",
  units:         "metric",
  calorieGoal:   2400,
  proteinGoal:   160,
  carbGoal:      280,
  fatGoal:       70,
  notifications: true,
  soundFeedback: true,
  repCountBeep:  true,
  autoStartCam:  false,
  restTimer:     true,
  defaultCam:    "laptop",
  boxAIP:        "192.168.1.42",
  streamPort:    "81",
  boxBPort:      "8080",
  ultrasonicOn:  true,
  autoDetect:    true,
};

// ─── BMR / TDEE helpers ───────────────────────────
export function calcBMR({ age, weight, height, gender }) {
  const w = parseFloat(weight) || 0;
  const h = parseFloat(height) || 0;
  const a = parseFloat(age)    || 0;
  if (gender === "male") return Math.round(10 * w + 6.25 * h - 5 * a + 5);
  return Math.round(10 * w + 6.25 * h - 5 * a - 161);
}

const ACTIVITY_MULT = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725,
};

export function calcTDEE(profile) {
  return Math.round(calcBMR(profile) * (ACTIVITY_MULT[profile.activityLevel] ?? 1.55));
}

export function calcCalorieGoal(profile) {
  const tdee = calcTDEE(profile);
  if (profile.fitnessGoal === "cut")  return tdee - 500;
  if (profile.fitnessGoal === "bulk") return tdee + 300;
  return tdee;
}

// ─── Provider ─────────────────────────────────────
export function AuthProvider({ children }) {
  const [currentUser,    setCurrentUser]    = useState(null);
  const [userProfile,    setUserProfile]    = useState(null);
  const [authLoading,    setAuthLoading]    = useState(true);

  // Listen to Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await loadProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const loadProfile = async (uid) => {
    try {
      const snap = await getDoc(doc(db, "users", uid, "profile", "data"));
      setUserProfile(snap.exists() ? { ...DEFAULT_PROFILE, ...snap.data() } : null);
    } catch (e) {
      console.error("loadProfile:", e);
    }
  };

  // Login
  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  // Signup — creates auth user + Firestore profile
  const signup = async (email, password, profileData) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid  = cred.user.uid;
    const profile = {
      ...DEFAULT_PROFILE,
      ...profileData,
      email,
      calorieGoal: calcCalorieGoal(profileData),
      createdAt:   serverTimestamp(),
      updatedAt:   serverTimestamp(),
    };
    await setDoc(doc(db, "users", uid, "profile", "data"), profile);
    setUserProfile(profile);
    return cred.user;
  };

  // Update profile fields
  const updateProfile = async (updates) => {
    if (!currentUser) return;
    const payload = { ...updates, updatedAt: serverTimestamp() };
    await updateDoc(doc(db, "users", currentUser.uid, "profile", "data"), payload);
    setUserProfile((p) => ({ ...p, ...payload }));
  };

  // Logout
  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
    setCurrentUser(null);
  };

  // Change password
  const changePassword = async (currentPwd, newPwd) => {
    const cred = EmailAuthProvider.credential(currentUser.email, currentPwd);
    await reauthenticateWithCredential(currentUser, cred);
    await updatePassword(currentUser, newPwd);
  };

  return (
    <AuthContext.Provider value={{
      currentUser, userProfile, authLoading,
      login, signup, logout, updateProfile, changePassword, loadProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}