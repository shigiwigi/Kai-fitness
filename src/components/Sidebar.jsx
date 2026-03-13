// ═══════════════════════════════════════════════
//   KAI FITNESS — Sidebar.jsx
//   Desktop: collapsible side nav (hover to expand)
//   Mobile:  bottom tab bar (≤767px)
// ═══════════════════════════════════════════════

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// ─── Nav items ──────────────────────────────────
const NAV_ITEMS = [
  {
    id: "home",
    path: "/",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: "workout",
    path: "/workout",
    label: "Workout",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
        <path d="M6.5 6.5h11M6.5 17.5h11M3 12h18M8 8.5V6a1 1 0 00-1-1H5a1 1 0 00-1 1v12a1 1 0 001 1h2a1 1 0 001-1v-2.5M16 8.5V6a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2.5"/>
      </svg>
    ),
  },
  {
    id: "nutrition",
    path: "/nutrition",
    label: "Nutrition",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
        <path d="M18 8h1a4 4 0 010 8h-1"/>
        <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/>
        <line x1="6" y1="1" x2="6" y2="4"/>
        <line x1="10" y1="1" x2="10" y2="4"/>
        <line x1="14" y1="1" x2="14" y2="4"/>
      </svg>
    ),
  },
  {
    id: "progress",
    path: "/progress",
    label: "Progress",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    id: "profile",
    path: "/profile",
    label: "Profile",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

const BOTTOM_ITEMS = [
  {
    id: "settings",
    path: "/profile",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
      </svg>
    ),
  },
];

// ─── Desktop Sidebar ─────────────────────────────
function DesktopSidebar() {
  const [expanded, setExpanded] = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <motion.nav
      className="sidebar-desktop"
      onHoverStart={() => setExpanded(true)}
      onHoverEnd={() => setExpanded(false)}
      animate={{ width: expanded ? 220 : 72 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: "fixed",
        left: 0, top: 0, bottom: 0,
        zIndex: 100,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Logo ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "20px 18px",
          borderBottom: "1px solid var(--border)",
          minHeight: 72,
          cursor: "pointer",
        }}
        onClick={() => navigate("/")}
      >
        <motion.div
          animate={{
            boxShadow: expanded
              ? "0 0 18px 4px rgba(232,25,44,0.3)"
              : "0 0 0 0 rgba(232,25,44,0)",
          }}
          transition={{ duration: 0.4 }}
          style={{
            width: 36, height: 36, flexShrink: 0,
            background: "var(--red)",
            clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-display)", fontSize: 14, color: "#fff", letterSpacing: 1,
          }}
        >K</motion.div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              style={{
                fontFamily: "var(--font-display)", fontSize: 22,
                letterSpacing: 4, whiteSpace: "nowrap", lineHeight: 1,
              }}
            >
              K<span style={{ color: "var(--red)" }}>AI</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Main Nav ── */}
      <nav style={{ flex: 1, padding: "12px 0", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            active={isActive(item.path)}
            expanded={expanded}
            onClick={() => navigate(item.path)}
          />
        ))}
      </nav>

      <div style={{ height: 1, background: "var(--border)", margin: "0 16px" }} />

      <div style={{ padding: "12px 0 20px" }}>
        {BOTTOM_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            active={isActive(item.path)}
            expanded={expanded}
            onClick={() => navigate(item.path)}
          />
        ))}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              padding: "0 18px 16px",
              fontFamily: "var(--font-mono)", fontSize: 10,
              color: "var(--text-muted)", letterSpacing: 1, whiteSpace: "nowrap",
            }}
          >
            KAI v1.0.0 · KINETIC AI
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

// ─── Mobile Bottom Nav ───────────────────────────
function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <nav className="mobile-bottom-nav">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.path);
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: active ? "var(--red)" : "var(--text-muted)",
              padding: "6px 0",
              position: "relative",
              transition: "color 0.2s",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {/* Active top bar */}
            {active && (
              <motion.div
                layoutId="mobile-nav-indicator"
                style={{
                  position: "absolute",
                  top: 0, left: "20%", right: "20%",
                  height: 2,
                  background: "var(--red)",
                  borderRadius: "0 0 2px 2px",
                }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              />
            )}

            {/* Icon with subtle scale on active */}
            <motion.div
              animate={{ scale: active ? 1.1 : 1 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {/* Render icon at 22px for touch */}
              <div style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {item.icon}
              </div>
            </motion.div>

            <span style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: 0.5,
              fontWeight: active ? 600 : 400,
              lineHeight: 1,
            }}>
              {item.label.toUpperCase()}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ─── Individual Desktop Nav Item ─────────────────
function NavItem({ item, active, expanded, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "10px 18px",
        cursor: "pointer", position: "relative",
        color: active ? "var(--text)" : "var(--text-dim)",
        background: active ? "rgba(232,25,44,0.06)" : "transparent",
        transition: "background 0.2s, color 0.2s",
        whiteSpace: "nowrap", overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "rgba(255,255,255,0.03)";
          e.currentTarget.style.color = "var(--text)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--text-dim)";
        }
      }}
    >
      <motion.div
        animate={{ scaleY: active ? 1 : 0 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: 3, background: "var(--red)",
          transformOrigin: "center", borderRadius: "0 2px 2px 0",
        }}
      />

      {active && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            position: "absolute", left: 14,
            width: 28, height: 28,
            borderRadius: "50%",
            background: "var(--red-glow)",
            zIndex: 0,
          }}
        />
      )}

      <div style={{ position: "relative", zIndex: 1, flexShrink: 0, display: "flex" }}>
        {item.icon}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.18 }}
            style={{
              fontFamily: "var(--font-body)", fontSize: 13,
              fontWeight: active ? 600 : 400, letterSpacing: 0.3,
              position: "relative", zIndex: 1,
            }}
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {expanded && active && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              marginLeft: "auto", width: 6, height: 6,
              borderRadius: "50%", background: "var(--red)",
              flexShrink: 0, position: "relative", zIndex: 1,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Exported default — renders both, CSS hides the right one ─
export default function Sidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileBottomNav />
    </>
  );
}