import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { color } from "../theme";

const API_ORIGIN = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

const WORKSPACE_LINKS = [
  { path: "/livechat", label: "Live chat inbox", icon: "chat" },
  { path: "/team", label: "Team", icon: "users" },
  { path: "/analytics", label: "Analytics", icon: "chart" },
  { path: "/billing", label: "Billing", icon: "card" },
];

export default function Sidebar({ setupSections, activeSection, onSectionClick }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [business, setBusiness] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    api.get("/business/me").then((res) => setBusiness(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const initial = (business?.name || "?").charAt(0).toUpperCase();

  return (
    <aside style={s.sidebar} className="forge-sidebar">
      <div style={s.topRow}>
        <Link to="/dashboard" style={s.brandRow}>
          <div style={{ ...s.brandMark, background: business?.brandColor || color.accent }}>
            {business?.logoUrl
              ? <img src={`${API_ORIGIN}${business.logoUrl}`} alt={business.name} style={s.brandMarkImg} />
              : initial}
          </div>
          <div>
            <div style={s.brandName}>{business?.name || "Your business"}</div>
            <div style={s.brandPlan}>{(business?.plan || "trial").toUpperCase()} PLAN</div>
          </div>
        </Link>

        <button
          className="forge-hamburger"
          style={s.hamburgerBtn}
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      <div className={"forge-panel" + (mobileOpen ? " forge-panel-open" : "")} style={s.panel}>
        <nav style={s.nav}>
          {setupSections && (
            <>
              <div style={s.navGroupLabel}>Setup</div>
              {setupSections.map((section) => {
                const id = section[0];
                const idx = section[1];
                const label = section[2];
                const isActive = activeSection === id;
                return (
                  <a
                    key={id}
                    href={"#" + id}
                    className="forge-nav"
                    style={isActive ? { ...s.navItem, ...s.navItemActive } : s.navItem}
                    onClick={() => {
                      onSectionClick && onSectionClick(id);
                      setMobileOpen(false);
                    }}
                  >
                    <span style={isActive ? { ...s.navIndex, ...s.navIndexActive } : s.navIndex}>{idx}</span>
                    {label}
                  </a>
                );
              })}
              <div style={s.navDivider} />
            </>
          )}

          <div style={s.navGroupLabel}>Workspace</div>
          {WORKSPACE_LINKS.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className="forge-nav"
                style={isActive ? { ...s.navItem, ...s.navItemActive } : s.navItem}
              >
                <NavIcon name={link.icon} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div style={s.sidebarFooter}>
          <div style={s.userRow}>
            <div style={s.userAvatar}>{(user?.name || "U").charAt(0).toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={s.userName}>{user?.name}</div>
              <div style={s.userRole}>{user?.role}</div>
            </div>
            <Link to="/account" style={s.settingsIcon} className="forge-ghost" title="Account settings">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.8"/>
              </svg>
            </Link>
          </div>
          <button className="forge-ghost" style={s.signOutBtn} onClick={logout}>Sign out</button>
        </div>
      </div>
    </aside>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function NavIcon({ name, size = 15 }) {
  const common = { stroke: "currentColor", strokeWidth: 1.8, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    chat: <path {...common} d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />,
    users: (
      <g {...common}>
        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 00-3-3.87M15 3.13a4 4 0 010 7.75" />
      </g>
    ),
    chart: (
      <g {...common}>
        <path d="M3 3v18h18" />
        <path d="M7 15l4-4 3 3 5-6" />
      </g>
    ),
    card: (
      <g {...common}>
        <rect x="1.5" y="5" width="21" height="14" rx="2.5" />
        <path d="M1.5 10h21" />
      </g>
    ),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flex: "0 0 auto" }}>
      {icons[name] || null}
    </svg>
  );
}

const s = {
  sidebar: { width: 250, flex: "0 0 auto", background: color.sidebar, color: "#E7E7F0", display: "flex", flexDirection: "column", padding: "24px 18px", boxSizing: "border-box", position: "sticky", top: 0, alignSelf: "flex-start", height: "100vh", overflowY: "auto" },
  topRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  hamburgerBtn: { display: "none", background: "rgba(255,255,255,.08)", border: "none", color: "#fff", width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "0 0 auto" },
  panel: { display: "flex", flexDirection: "column", flex: 1 },
  brandRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 28, textDecoration: "none" },
  brandMark: { width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "#fff", fontSize: 15, flex: "0 0 auto", overflow: "hidden", boxShadow: "inset 0 0 0 2px rgba(255,255,255,.18), 0 2px 6px rgba(0,0,0,.35)" },
  brandMarkImg: { width: "100%", height: "100%", objectFit: "cover" },
  brandName: { fontWeight: 600, fontSize: 14, letterSpacing: "-0.01em", fontFamily: "'Space Grotesk', sans-serif", color: "#fff" },
  brandPlan: { fontSize: 10, letterSpacing: "0.08em", color: color.accentLight, marginTop: 3, fontFamily: "'JetBrains Mono', monospace" },
  nav: { display: "flex", flexDirection: "column", gap: 2, flex: 1 },
  navGroupLabel: { fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#787C93", fontWeight: 600, margin: "14px 10px 4px", fontFamily: "'JetBrains Mono', monospace" },
  navItem: { color: "#C6C7D6", textDecoration: "none", fontSize: 13.5, padding: "9px 10px", borderRadius: 8, display: "flex", alignItems: "center", gap: 9 },
  navItemActive: { background: "rgba(255,255,255,.09)", color: "#fff" },
  navIndex: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: color.accentLight, opacity: 0.85 },
  navIndexActive: { opacity: 1 },
  navDivider: { height: 1, background: color.sidebarLine, margin: "10px 6px" },
  sidebarFooter: { borderTop: `1px solid ${color.sidebarLine}`, paddingTop: 16, marginTop: 16 },
  userRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 },
  userAvatar: { width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700 },
  userName: { fontSize: 12.5, fontWeight: 600 },
  userRole: { fontSize: 10.5, color: "#9EA0B4", textTransform: "capitalize" },
  settingsIcon: { width: 26, height: 26, borderRadius: 7, background: "rgba(255,255,255,.06)", color: "#C6C7D6", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" },
  signOutBtn: { width: "100%", background: "rgba(255,255,255,.06)", color: "#E7E7F0", border: "1px solid rgba(255,255,255,.14)", padding: "8px", borderRadius: 8, cursor: "pointer", fontSize: 12.5 },
};