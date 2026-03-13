// ═══════════════════════════════════════════════
//   KAI FITNESS — App.jsx
//   Main router + layout shell + page transitions
// ═══════════════════════════════════════════════

import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

// Layout
import Sidebar from "./components/Sidebar";
import Topbar  from "./components/Topbar";

// Pages
import Dashboard  from "./pages/Dashboard";
import Workout    from "./pages/Workout";
import Nutrition  from "./pages/Nutrition";
import Progress   from "./pages/Progress";
import Profile    from "./pages/Profile";
import Login      from "./pages/Login";

// ─── Page transition variants ───────────────────
const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] },
  },
};

// ─── Animated route wrapper ─────────────────────
function PageTransition({ children }) {
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
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Page meta map (for Topbar) ─────────────────
export const PAGE_META = {
  "/":          { title: "DASHBOARD",  subtitle: "KINETIC AI FITNESS · OVERVIEW" },
  "/workout":   { title: "WORKOUT",    subtitle: "KINETIC AI FITNESS · TRAINING HUB" },
  "/nutrition": { title: "NUTRITION",  subtitle: "KINETIC AI FITNESS · FUEL TRACKER" },
  "/progress":  { title: "PROGRESS",   subtitle: "KINETIC AI FITNESS · MEDIA VAULT" },
  "/profile":   { title: "PROFILE",    subtitle: "KINETIC AI FITNESS · SETTINGS" },
};

// ─── Protected layout (sidebar + topbar + page) ──
function AppLayout() {
  const [isLoggedIn] = useState(true); // swap for real auth later

  if (!isLoggedIn) return <Navigate to="/login" replace />;

  return (
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      <Sidebar />

      {/* Main column */}
      <div
        style={{
          marginLeft: "var(--sidebar-w)",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          overflow: "hidden",
        }}
      >
        <Topbar />

        {/* Scrollable page area */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          <PageTransition>
            <Routes>
              <Route path="/"          element={<Dashboard />} />
              <Route path="/workout"   element={<Workout />} />
              <Route path="/nutrition" element={<Nutrition />} />
              <Route path="/progress"  element={<Progress />} />
              <Route path="/profile"   element={<Profile />} />
              {/* Catch-all → home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </PageTransition>
        </div>
      </div>
    </div>
  );
}

// ─── Root ────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected — everything else */}
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  );
}