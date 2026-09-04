import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { color } from "../theme";
import ConfirmDialog from "./ConfirmDialog";

const API_ORIGIN = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

const RAIL_LINKS = [
  { path: "/home", label: "Home", icon: "home" },
  { path: "/livechat", label: "Inbox", icon: "chat" },
  { path: "/analytics", label: "Analytics", icon: "chart", roles: ["owner", "admin"] },
  { path: "/dashboard", label: "Setup", icon: "setup" },
  { path: "/team", label: "Team", icon: "users", roles: ["owner", "admin"] },
];

const RAIL_BOTTOM_LINKS = [
  { path: "/billing", label: "Billing", icon: "card", roles: ["owner", "admin"] },
];

export default function Sidebar({ setupSections, activeSection, onSectionClick }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [business, setBusiness] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(() => localStorage.getItem("mf_setup_panel_collapsed") === "1");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const togglePanelCollapsed = () => {
    setPanelCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("mf_setup_panel_collapsed", next ? "1" : "0");
      return next;
    });
  };

  useEffect(() => {
    api.get("/business/me").then((res) => setBusiness(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLogoError(false);
  }, [business?.logoUrl]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const initial = (business?.name || "?").charAt(0).toUpperCase();
  const visibleLinks = RAIL_LINKS.filter((link) => !link.roles || link.roles.includes(user?.role));
  const visibleBottomLinks = RAIL_BOTTOM_LINKS.filter((link) => !link.roles || link.roles.includes(user?.role));

  return (
    <aside className="forge-sidebar">
      {/* Desktop icon rail */}
      <nav className="forge-rail">
        <Link to="/home" className="forge-rail-brand" style={{ background: business?.brandColor || color.accent }} title={business?.name || "Home"}>
          {business?.logoUrl && !logoError
            ? <img src={`${API_ORIGIN}${business.logoUrl}`} alt="" onError={() => setLogoError(true)} />
            : initial}
        </Link>

        <div className="forge-rail-list">
          {visibleLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={"forge-rail-item" + (location.pathname === link.path ? " forge-rail-active" : "")}
            >
              <NavIcon name={link.icon} />
              <span className="forge-rail-tooltip">{link.label}</span>
            </Link>
          ))}
        </div>

        <div className="forge-rail-spacer" />

        <div className="forge-rail-list">
          {visibleBottomLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={"forge-rail-item" + (location.pathname === link.path ? " forge-rail-active" : "")}
            >
              <NavIcon name={link.icon} />
              <span className="forge-rail-tooltip">{link.label}</span>
            </Link>
          ))}
          <div className="forge-rail-divider" />
          <Link to="/account" className={"forge-rail-item" + (location.pathname === "/account" ? " forge-rail-active" : "")}>
            <NavIcon name="gear" />
            <span className="forge-rail-tooltip">Account</span>
          </Link>
          <button className="forge-rail-item" onClick={() => setShowLogoutConfirm(true)}>
            <NavIcon name="logout" />
            <span className="forge-rail-tooltip">Sign out</span>
          </button>
        </div>
      </nav>

      {/* Desktop secondary panel — setup page section list only */}
      {setupSections && panelCollapsed && (
        <button
          type="button"
          className="forge-panel-expand"
          onClick={togglePanelCollapsed}
          title="Expand setup menu"
          aria-label="Expand setup menu"
        >
          <ChevronDoubleIcon dir="right" />
        </button>
      )}
      {setupSections && !panelCollapsed && (
        <div className="forge-setup-panel">
          <div style={s.panelHead}>
            <div style={s.panelLabel}>Setup</div>
            <button
              type="button"
              className="forge-panel-collapse-btn"
              onClick={togglePanelCollapsed}
              title="Collapse setup menu"
              aria-label="Collapse setup menu"
            >
              <ChevronDoubleIcon dir="left" />
            </button>
          </div>
          <nav style={s.setupNav}>
            {setupSections.map((section) => {
              const id = section[0];
              const idx = section[1];
              const label = section[2];
              const isActive = activeSection === id;
              return (
                <button
                  key={id}
                  type="button"
                  className={"forge-nav" + (isActive ? " forge-nav-active" : "")}
                  style={isActive ? { ...s.navItem, ...s.navItemActive } : s.navItem}
                  onClick={() => onSectionClick && onSectionClick(id)}
                >
                  <span style={isActive ? { ...s.navIndex, ...s.navIndexActive } : s.navIndex}>{idx}</span>
                  {label}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Mobile top bar */}
      <div className="forge-mobile-bar">
        <Link to="/home" style={s.brandRow}>
          <div style={{ ...s.brandMark, background: business?.brandColor || color.accent }}>
            {business?.logoUrl && !logoError
              ? <img src={`${API_ORIGIN}${business.logoUrl}`} alt="" style={s.brandMarkImg} onError={() => setLogoError(true)} />
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

      {/* Mobile dropdown panel */}
      <div className={"forge-mobile-panel" + (mobileOpen ? " forge-mobile-panel-open" : "")}>
        <nav style={s.nav}>
          {[...visibleLinks, ...visibleBottomLinks].map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={"forge-nav" + (location.pathname === link.path ? " forge-nav-active" : "")}
              style={location.pathname === link.path ? { ...s.navItem, ...s.navItemActive } : s.navItem}
            >
              <NavIcon name={link.icon} />
              {link.label}
            </Link>
          ))}

          {setupSections && (
            <>
              <div style={s.navDivider} />
              <div style={s.navGroupLabel}>Setup</div>
              {setupSections.map((section) => {
                const id = section[0];
                const idx = section[1];
                const label = section[2];
                const isActive = activeSection === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={"forge-nav" + (isActive ? " forge-nav-active" : "")}
                    style={isActive ? { ...s.navItem, ...s.navItemActive } : s.navItem}
                    onClick={() => { onSectionClick && onSectionClick(id); setMobileOpen(false); }}
                  >
                    <span style={isActive ? { ...s.navIndex, ...s.navIndexActive } : s.navIndex}>{idx}</span>
                    {label}
                  </button>
                );
              })}
            </>
          )}
        </nav>

        <div style={s.sidebarFooter}>
          <div style={s.userRow}>
            <div style={s.userAvatar}>{(user?.name || "U").charAt(0).toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={s.userName}>{user?.name}</div>
              <div style={s.userRole}>{user?.role}</div>
            </div>
            <Link to="/account" style={s.settingsIcon} className="forge-ghost" title="Account settings">
              <NavIcon name="gear" size={16} />
            </Link>
          </div>
          <button className="forge-ghost" style={s.signOutBtn} onClick={() => setShowLogoutConfirm(true)}>Sign out</button>
        </div>
      </div>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Sign out?"
        message="You'll need to sign in again to access your dashboard."
        confirmLabel="Sign out"
        danger
        onConfirm={logout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </aside>
  );
}

function ChevronDoubleIcon({ dir = "left" }) {
  const d = dir === "left" ? "M11 17l-5-5 5-5M18 17l-5-5 5-5" : "M13 17l5-5-5-5M6 17l5-5-5-5";
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d={d} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

function NavIcon({ name, size = 18 }) {
  const common = { stroke: "currentColor", strokeWidth: 1.8, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    home: (
      <g {...common}>
        <path d="M3 11.5L12 4l9 7.5" />
        <path d="M5.5 9.5V20h13V9.5" />
      </g>
    ),
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
    setup: (
      <g {...common}>
        <path d="M4 6h16M4 12h16M4 18h16" />
        <circle cx="9" cy="6" r="1.7" fill="currentColor" stroke="none" />
        <circle cx="15" cy="12" r="1.7" fill="currentColor" stroke="none" />
        <circle cx="7" cy="18" r="1.7" fill="currentColor" stroke="none" />
      </g>
    ),
    gear: (
      <g {...common}>
        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </g>
    ),
    logout: (
      <g {...common}>
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
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
  hamburgerBtn: { display: "none", background: "rgba(255,255,255,.08)", border: "none", color: "#fff", width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "0 0 auto" },
  brandRow: { display: "flex", alignItems: "center", gap: 10, textDecoration: "none" },
  brandMark: { width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "#fff", fontSize: 14, flex: "0 0 auto", overflow: "hidden", boxShadow: "inset 0 0 0 2px rgba(255,255,255,.18)" },
  brandMarkImg: { width: "100%", height: "100%", objectFit: "cover" },
  brandName: { fontWeight: 600, fontSize: 13.5, letterSpacing: "-0.01em", fontFamily: "'Space Grotesk', sans-serif", color: "#fff" },
  brandPlan: { fontSize: 9.5, letterSpacing: "0.08em", color: color.accentLight, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" },
  panelHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  panelLabel: { fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#787C93", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" },
  setupNav: { display: "flex", flexDirection: "column", gap: 2 },
  nav: { display: "flex", flexDirection: "column", gap: 2, flex: 1, paddingTop: 8 },
  navGroupLabel: { fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#787C93", fontWeight: 600, margin: "14px 10px 4px", fontFamily: "'JetBrains Mono', monospace" },
  navItem: { color: "#C6C7D6", textDecoration: "none", fontSize: 13.5, padding: "9px 11px", borderRadius: 9, display: "flex", alignItems: "center", gap: 9, background: "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer", font: "inherit" },
  navItemActive: { background: "rgba(166,166,238,.14)", color: "#fff", fontWeight: 600 },
  navIndex: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: color.accentLight, opacity: 0.85 },
  navIndexActive: { opacity: 1 },
  navDivider: { height: 1, background: color.sidebarLine, margin: "10px 6px" },
  sidebarFooter: { borderTop: `1px solid ${color.sidebarLine}`, paddingTop: 16, marginTop: 16 },
  userRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 },
  userAvatar: { width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700 },
  userName: { fontSize: 12.5, fontWeight: 600 },
  userRole: { fontSize: 10.5, color: "#9EA0B4", textTransform: "capitalize" },
  settingsIcon: { width: 26, height: 26, borderRadius: 7, background: "rgba(255,255,255,.06)", color: "#C6C7D6", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" },
  signOutBtn: { width: "100%", background: "rgba(255,255,255,.06)", color: "#E7E7F0", border: "1px solid rgba(255,255,255,.14)", padding: "8px", borderRadius: 100, cursor: "pointer", fontSize: 12.5 },
};
