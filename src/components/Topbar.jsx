// ═══════════════════════════════════════════════
//   KAI FITNESS — Topbar.jsx
//   Route-aware title · Live clock · Notifications
// ═══════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PAGE_META } from "../App";

// ─── Mock notifications ──────────────────────────
const NOTIFICATIONS = [
  {
    id: 1,
    type: "workout",
    icon: "🏋️",
    title: "Workout Reminder",
    message: "Squat session scheduled in 30 minutes.",
    time: "5m ago",
    unread: true,
  },
  {
    id: 2,
    type: "nutrition",
    icon: "🔥",
    title: "Calorie Goal",
    message: "You're 560 kcal away from your daily goal.",
    time: "1h ago",
    unread: true,
  },
  {
    id: 3,
    type: "device",
    icon: "📡",
    title: "Box A Connected",
    message: "ESP32-CAM is online and streaming.",
    time: "2h ago",
    unread: false,
  },
  {
    id: 4,
    type: "progress",
    icon: "📉",
    title: "Weight Update",
    message: "You're down 0.4 kg this week. Keep going!",
    time: "Yesterday",
    unread: false,
  },
];

// ─── Live Clock ──────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const date = time.toLocaleDateString("en-GB", {
    weekday: "short",
    day:     "2-digit",
    month:   "short",
    year:    "numeric",
  }).toUpperCase();

  const clock = time.toLocaleTimeString("en-GB", {
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--text-dim)",
        letterSpacing: 1,
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        padding: "5px 12px",
        borderRadius: "var(--radius-sm)",
        display: "flex",
        gap: 10,
        alignItems: "center",
      }}
    >
      <span>{date}</span>
      <span
        style={{
          color: "var(--text)",
          fontWeight: 600,
          borderLeft: "1px solid var(--border)",
          paddingLeft: 10,
        }}
      >
        {clock}
      </span>
    </div>
  );
}

// ─── Notification Panel ──────────────────────────
function NotifPanel({ onClose }) {
  const [notifs, setNotifs] = useState(NOTIFICATIONS);

  const markAll = () =>
    setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })));

  const dismiss = (id) =>
    setNotifs((prev) => prev.filter((n) => n.id !== id));

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,   scale: 1 }}
      exit={{    opacity: 0, y: -10, scale: 0.97 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position:     "absolute",
        top:          "calc(100% + 10px)",
        right:        0,
        width:        340,
        background:   "var(--surface)",
        border:       "1px solid var(--border-md)",
        borderRadius: "var(--radius-lg)",
        boxShadow:    "var(--shadow-lg)",
        zIndex:       600,
        overflow:     "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "14px 16px",
          borderBottom:   "1px solid var(--border)",
        }}
      >
        <div
          style={{
            fontFamily:   "var(--font-display)",
            fontSize:     16,
            letterSpacing: 2,
            color:        "var(--text-dim)",
          }}
        >
          NOTIFICATIONS
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={markAll}
            style={{
              background:   "transparent",
              border:       "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color:        "var(--text-dim)",
              fontSize:     11,
              padding:      "3px 8px",
              cursor:       "pointer",
              fontFamily:   "var(--font-mono)",
              letterSpacing: 0.5,
              transition:   "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-red)";
              e.currentTarget.style.color = "var(--red)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-dim)";
            }}
          >
            MARK ALL READ
          </button>
          <button
            onClick={onClose}
            style={{
              background:   "transparent",
              border:       "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color:        "var(--text-dim)",
              fontSize:     16,
              width:        26,
              height:       26,
              cursor:       "pointer",
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              lineHeight:   1,
              transition:   "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-red)";
              e.currentTarget.style.color = "var(--red)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-dim)";
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ maxHeight: 360, overflowY: "auto" }}>
        <AnimatePresence>
          {notifs.length === 0 ? (
            <div
              style={{
                padding:   "32px 16px",
                textAlign: "center",
                color:     "var(--text-muted)",
                fontSize:  13,
              }}
            >
              No notifications
            </div>
          ) : (
            notifs.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  display:     "flex",
                  gap:         12,
                  padding:     "12px 16px",
                  borderBottom: "1px solid var(--border)",
                  background:  n.unread ? "rgba(232,25,44,0.03)" : "transparent",
                  position:    "relative",
                  cursor:      "pointer",
                  transition:  "background 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface2)")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = n.unread
                    ? "rgba(232,25,44,0.03)"
                    : "transparent")
                }
              >
                {/* Unread dot */}
                {n.unread && (
                  <div
                    style={{
                      position:     "absolute",
                      top:          14,
                      left:         6,
                      width:        5,
                      height:       5,
                      borderRadius: "50%",
                      background:   "var(--red)",
                    }}
                  />
                )}

                {/* Icon */}
                <div
                  style={{
                    width:        36,
                    height:       36,
                    borderRadius: "var(--radius-sm)",
                    background:   "var(--surface3)",
                    border:       "1px solid var(--border)",
                    display:      "flex",
                    alignItems:   "center",
                    justifyContent: "center",
                    fontSize:     16,
                    flexShrink:   0,
                  }}
                >
                  {n.icon}
                </div>

                {/* Body */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize:    13,
                      fontWeight:  n.unread ? 600 : 400,
                      color:       n.unread ? "var(--text)" : "var(--text-dim)",
                      marginBottom: 3,
                    }}
                  >
                    {n.title}
                  </div>
                  <div
                    style={{
                      fontSize:     11,
                      color:        "var(--text-dim)",
                      whiteSpace:   "nowrap",
                      overflow:     "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {n.message}
                  </div>
                  <div
                    style={{
                      fontSize:    10,
                      color:       "var(--text-muted)",
                      marginTop:   4,
                      fontFamily:  "var(--font-mono)",
                    }}
                  >
                    {n.time}
                  </div>
                </div>

                {/* Dismiss */}
                <button
                  onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                  style={{
                    background:   "transparent",
                    border:       "none",
                    color:        "var(--text-muted)",
                    cursor:       "pointer",
                    fontSize:     16,
                    lineHeight:   1,
                    padding:      "2px 4px",
                    borderRadius: 4,
                    transition:   "color 0.15s",
                    alignSelf:    "flex-start",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--red)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                >
                  ×
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div
        style={{
          padding:        "10px 16px",
          borderTop:      "1px solid var(--border)",
          textAlign:      "center",
          fontSize:       11,
          color:          "var(--red)",
          cursor:         "pointer",
          fontFamily:     "var(--font-mono)",
          letterSpacing:  0.5,
          transition:     "background 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--red-glow-sm)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        VIEW ALL ACTIVITY
      </div>
    </motion.div>
  );
}

// ─── Avatar Menu ─────────────────────────────────
function AvatarMenu({ onClose }) {
  const navigate = useNavigate();

  const items = [
    { label: "View Profile",   action: () => { navigate("/profile"); onClose(); } },
    { label: "Settings",       action: () => { navigate("/profile"); onClose(); } },
    { label: "Hardware Config",action: () => { navigate("/profile"); onClose(); } },
    { label: "Sign Out",       action: () => { navigate("/login");   onClose(); }, danger: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,   scale: 1 }}
      exit={{    opacity: 0, y: -10, scale: 0.97 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position:     "absolute",
        top:          "calc(100% + 10px)",
        right:        0,
        width:        200,
        background:   "var(--surface)",
        border:       "1px solid var(--border-md)",
        borderRadius: "var(--radius-lg)",
        boxShadow:    "var(--shadow-lg)",
        zIndex:       600,
        overflow:     "hidden",
      }}
    >
      {/* User info */}
      <div
        style={{
          padding:      "14px 16px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600 }}>Alex Kinetic</div>
        <div
          style={{
            fontSize:   11,
            color:      "var(--text-dim)",
            marginTop:  3,
            fontFamily: "var(--font-mono)",
          }}
        >
          alex@kaifitness.io
        </div>
      </div>

      {/* Menu items */}
      <div style={{ padding: "6px 0" }}>
        {items.map((item) => (
          <div
            key={item.label}
            onClick={item.action}
            style={{
              padding:    "9px 16px",
              fontSize:   13,
              cursor:     "pointer",
              color:      item.danger ? "var(--red)" : "var(--text-dim)",
              transition: "all 0.15s",
              fontWeight: item.danger ? 500 : 400,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = item.danger
                ? "rgba(232,25,44,0.06)"
                : "var(--surface2)";
              e.currentTarget.style.color = item.danger ? "var(--red)" : "var(--text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = item.danger ? "var(--red)" : "var(--text-dim)";
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Topbar ──────────────────────────────────────
export default function Topbar() {
  const location              = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const notifRef  = useRef(null);
  const avatarRef = useRef(null);

  const meta = PAGE_META[location.pathname] ?? {
    title:    "KAI FITNESS",
    subtitle: "KINETIC AI FITNESS",
  };

  const unreadCount = NOTIFICATIONS.filter((n) => n.unread).length;

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e) {
      if (notifRef.current  && !notifRef.current.contains(e.target))  setNotifOpen(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setAvatarOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setNotifOpen(false);
    setAvatarOpen(false);
  }, [location.pathname]);

  return (
    <div
      style={{
        height:       "var(--topbar-h)",
        background:   "var(--surface)",
        borderBottom: "1px solid var(--border)",
        display:      "flex",
        alignItems:   "center",
        padding:      "0 32px",
        position:     "sticky",
        top:          0,
        zIndex:       50,
        gap:          16,
      }}
    >
      {/* ── Page Title (animates on route change) ── */}
      <div style={{ flex: 1 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{    opacity: 0, y:  8 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            <div
              style={{
                fontFamily:    "var(--font-display)",
                fontSize:      28,
                letterSpacing: 3,
                lineHeight:    1,
              }}
            >
              {meta.title}
            </div>
            <div
              style={{
                fontSize:    11,
                color:       "var(--text-dim)",
                marginTop:   3,
                letterSpacing: 0.5,
                fontFamily:  "var(--font-mono)",
              }}
            >
              {meta.subtitle}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Right Controls ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

        {/* Live Clock */}
        <LiveClock />

        {/* Notification Bell */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => { setNotifOpen((p) => !p); setAvatarOpen(false); }}
            style={{
              width:        36,
              height:       36,
              background:   notifOpen ? "var(--surface3)" : "var(--surface2)",
              border:       `1px solid ${notifOpen ? "var(--border-red)" : "var(--border)"}`,
              borderRadius: "var(--radius-sm)",
              cursor:       "pointer",
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              position:     "relative",
              color:        notifOpen ? "var(--red)" : "var(--text-dim)",
              transition:   "all 0.2s",
            }}
          >
            {/* Bell icon */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>

            {/* Unread badge */}
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                  position:     "absolute",
                  top:          5,
                  right:        5,
                  width:        8,
                  height:       8,
                  background:   "var(--red)",
                  borderRadius: "50%",
                  border:       "1.5px solid var(--surface)",
                  animation:    "pulse 2s ease-in-out infinite",
                }}
              />
            )}
          </motion.button>

          <AnimatePresence>
            {notifOpen && <NotifPanel onClose={() => setNotifOpen(false)} />}
          </AnimatePresence>
        </div>

        {/* Avatar */}
        <div ref={avatarRef} style={{ position: "relative" }}>
          <motion.div
            whileTap={{ scale: 0.92 }}
            onClick={() => { setAvatarOpen((p) => !p); setNotifOpen(false); }}
            style={{
              width:        36,
              height:       36,
              background:   "linear-gradient(135deg, var(--red-dim), var(--red))",
              borderRadius: "50%",
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              fontWeight:   600,
              fontSize:     13,
              cursor:       "pointer",
              border:       `2px solid ${avatarOpen ? "var(--red)" : "var(--border)"}`,
              transition:   "border-color 0.2s",
              userSelect:   "none",
            }}
          >
            AK
          </motion.div>

          <AnimatePresence>
            {avatarOpen && <AvatarMenu onClose={() => setAvatarOpen(false)} />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}