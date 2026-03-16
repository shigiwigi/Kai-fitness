// ═══════════════════════════════════════════════
//   KAI FITNESS — src/lib/firebase.js
//   Create this file at: src/lib/firebase.js
//
//   Get your config from:
//   Firebase Console → Project Settings → Your Apps → SDK Setup
// ═══════════════════════════════════════════════

import { initializeApp }  from "firebase/app";
import { getFirestore }   from "firebase/firestore";
import { getAuth }        from "firebase/auth";
import { getDatabase }    from "firebase/database";

// ─── PASTE YOUR FIREBASE CONFIG HERE ─────────────
// Go to: https://console.firebase.google.com
// → kai-fitness project → Project Settings → General
// → Your apps → Web app → SDK setup and configuration
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
};
// ─────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);

export const db   = getFirestore(app);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);