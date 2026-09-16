import { useState, useEffect, useRef } from "react";
import api from "../api/axios";
import { color } from "../theme";

const POLL_MS = 60000;

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [dismissingIds, setDismissingIds] = useState(() => new Set());
  const panelRef = useRef(null);
  const bellRef = useRef(null);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      if (panelRef.current?.contains(e.target) || bellRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function load() {
    api.get("/business/notifications").then((res) => setNotifications(res.data)).catch(() => {});
  }

  // Dismissing only hides the top banner — the item stays in the bell dropdown
  // (as "seen") until the underlying issue actually clears (next monthly reset).
  function dismiss(id) {
    setDismissingIds((prev) => new Set(prev).add(id));
    api.post(`/business/notifications/${id}/dismiss`).catch(() => {});
    setTimeout(() => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, dismissed: true } : n)));
      setDismissingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 180);
  }

  const bannerNotifications = notifications.filter((n) => !n.dismissed);

  return (
    <>
      {bannerNotifications.length > 0 && (
        <div className="forge-notif-banner-stack">
          {bannerNotifications.map((n) => (
            <div
              key={n.id}
              style={{
                ...s.banner,
                ...(n.level === "critical" ? s.bannerCritical : s.bannerWarning),
                opacity: dismissingIds.has(n.id) ? 0 : 1,
              }}
            >
              <BellGlyph level={n.level} />
              <div style={s.bannerText}>
                <span style={s.bannerTitle}>{n.title}</span>
                <span style={s.bannerMsg}>{n.message}</span>
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                style={s.bannerClose}
                onClick={() => dismiss(n.id)}
              >
                <CloseGlyph />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        ref={bellRef}
        type="button"
        className="forge-notif-bell"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
      >
        <BellGlyph />
        {bannerNotifications.length > 0 && <span style={s.bellBadge}>{bannerNotifications.length > 9 ? "9+" : bannerNotifications.length}</span>}
      </button>

      {open && (
        <div ref={panelRef} className="forge-notif-panel" style={s.panel}>
          <div style={s.panelHead}>Notifications</div>
          {notifications.length === 0 ? (
            <div style={s.panelEmpty}>No new notifications.</div>
          ) : (
            <div style={s.panelList}>
              {notifications.map((n) => (
                <div key={n.id} style={{ ...s.panelItem, ...(n.dismissed ? s.panelItemSeen : {}) }}>
                  <div style={{ ...s.panelDot, background: n.level === "critical" ? color.danger : "#D97706" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.panelItemTitle}>{n.title}</div>
                    <div style={s.panelItemMsg}>{n.message}</div>
                  </div>
                  {n.dismissed ? (
                    <span style={s.panelItemSeenTag}>Seen</span>
                  ) : (
                    <button type="button" style={s.panelItemClose} onClick={() => dismiss(n.id)} aria-label="Dismiss">
                      <CloseGlyph />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function BellGlyph({ level }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

const s = {
  banner: {
    position: "relative",
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "10px 60px 10px 16px",
    fontSize: 12.5,
    borderBottom: `1px solid rgba(0,0,0,.06)`,
    transition: "opacity .18s ease",
    boxSizing: "border-box",
  },
  bannerWarning: { background: "#FEF3E2", color: "#92400E" },
  bannerCritical: { background: "#FDEAEA", color: "#8A1F1F" },
  bannerText: { display: "flex", flexDirection: "column", gap: 1, minWidth: 0 },
  bannerTitle: { fontWeight: 700 },
  bannerMsg: { opacity: 0.9, lineHeight: 1.4 },
  bannerClose: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: "translateY(-50%)",
    background: "rgba(0,0,0,.06)",
    border: "none",
    borderRadius: "50%",
    width: 22,
    height: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "inherit",
    flex: "0 0 auto",
  },

  bellBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    padding: "0 4px",
    borderRadius: 8,
    background: color.danger,
    color: "#fff",
    fontSize: 9.5,
    fontWeight: 700,
    lineHeight: "16px",
    textAlign: "center",
    boxShadow: "0 0 0 2px #fff",
  },

  panel: {
    width: 320,
    maxWidth: "calc(100vw - 32px)",
    background: "#fff",
    borderRadius: 14,
    boxShadow: "0 16px 40px rgba(20,20,30,.18), 0 2px 8px rgba(20,20,30,.08)",
    border: "1px solid rgba(0,0,0,.06)",
    zIndex: 70,
    overflow: "hidden",
  },
  panelHead: { fontSize: 12.5, fontWeight: 700, padding: "12px 16px", borderBottom: "1px solid rgba(0,0,0,.06)", color: color.ink },
  panelEmpty: { padding: "20px 16px", fontSize: 12.5, color: color.inkFaint, textAlign: "center" },
  panelList: { maxHeight: 320, overflowY: "auto" },
  panelItem: { display: "flex", gap: 10, padding: "12px 16px", borderBottom: "1px solid rgba(0,0,0,.05)", alignItems: "flex-start" },
  panelItemSeen: { opacity: 0.6 },
  panelDot: { width: 8, height: 8, borderRadius: "50%", marginTop: 4, flex: "0 0 auto" },
  panelItemTitle: { fontSize: 12.5, fontWeight: 700, color: color.ink, marginBottom: 2 },
  panelItemMsg: { fontSize: 11.5, color: color.inkSoft, lineHeight: 1.4 },
  panelItemClose: { background: "none", border: "none", color: color.inkFaint, cursor: "pointer", flex: "0 0 auto", padding: 2 },
  panelItemSeenTag: { fontSize: 10, fontWeight: 600, color: color.inkFaint, flex: "0 0 auto", textTransform: "uppercase", letterSpacing: "0.04em" },
};
