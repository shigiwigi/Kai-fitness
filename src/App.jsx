// ═══════════════════════════════════════════════
//   KAI FITNESS — App.jsx
//   Place at: src/App.jsx
// ═══════════════════════════════════════════════

import {
  BrowserRouter, Routes, Route, Navigate,
  useLocation,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar   from "./components/Sidebar";
import Topbar    from "./components/Topbar";
import Dashboard from "./pages/Dashboard";
import Workout   from "./pages/Workout";
import Nutrition from "./pages/Nutrition";
import Progress  from "./pages/Progress";
import Profile   from "./pages/Profile";
import Settings  from "./pages/Settings";
import Login     from "./pages/Login";

// ─── Page meta ───────────────────────────────────
export const PAGE_META = {
  "/":          { title: "DASHBOARD",  subtitle: "KINETIC AI FITNESS · OVERVIEW"      },
  "/workout":   { title: "WORKOUT",    subtitle: "KINETIC AI FITNESS · TRAINING HUB"  },
  "/nutrition": { title: "NUTRITION",  subtitle: "KINETIC AI FITNESS · FUEL TRACKER"  },
  "/progress":  { title: "PROGRESS",   subtitle: "KINETIC AI FITNESS · MEDIA VAULT"   },
  "/profile":   { title: "PROFILE",    subtitle: "KINETIC AI FITNESS · YOUR ACCOUNT"  },
  "/settings":  { title: "SETTINGS",   subtitle: "KINETIC AI FITNESS · CONFIGURATION" },
};

// ─── Page transition ─────────────────────────────
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.16, ease: [0.4, 0, 0.2, 1] } },
};

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        <Routes location={location}>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/workout"   element={<Workout   />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/progress"  element={<Progress  />} />
          <Route path="/profile"   element={<Profile   />} />
          <Route path="/settings"  element={<Settings  />} />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Full-screen loader ───────────────────────────
function SplashLoader() {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 20, zIndex: 9999,
    }}>
      <motion.div
        animate={{ boxShadow: ["0 0 0 0 rgba(232,25,44,0)", "0 0 24px 8px rgba(232,25,44,0.3)", "0 0 0 0 rgba(232,25,44,0)"] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <svg width="56" height="56" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="#E8192C"/>
          <line x1="9" y1="8" x2="9" y2="24" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="9" y1="16" x2="22" y2="8" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="9" y1="16" x2="22" y2="24" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </motion.div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 4, color: "var(--text-dim)" }}>
        K<span style={{ color: "var(--red)" }}>AI</span> FITNESS
      </div>
      <div className="spinner" />
    </div>
  );
}

// ─── Protected layout ────────────────────────────
function AppLayout() {
  const { currentUser, authLoading } = useAuth();

  if (authLoading) return <SplashLoader />;
  if (!currentUser) return <Navigate to="/login" replace />;

  return (
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      {/* Sidebar renders both desktop nav + mobile bottom nav.
          CSS media queries handle which one is visible. */}
      <Sidebar />

      {/* Main content area — marginLeft comes from CSS var,
          which is 0 on mobile (sidebar hidden) */}
      <div style={{
        marginLeft: "var(--sidebar-w)",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        overflow: "hidden",
        /* Smooth transition when sidebar width changes */
        transition: "margin-left 0.28s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <Topbar />
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          <AnimatedRoutes />
        </div>
      </div>
    </div>
  );
}

// ─── Login guard ─────────────────────────────────
function LoginPage() {
  const { currentUser, authLoading } = useAuth();
  if (authLoading) return <SplashLoader />;
  if (currentUser) return <Navigate to="/" replace />;
  return <Login />;
}

// ─── Root ─────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*"     element={<AppLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}