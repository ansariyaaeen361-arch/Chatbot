export const color = {
  sidebar: "#16142A",
  sidebarLine: "rgba(255,255,255,.08)",
  bg: "#F5F6FA",
  surface: "#FFFFFF",
  surfaceSunken: "#FBFBFD",
  border: "#E6E7EF",
  borderSoft: "#EEEFF5",
  ink: "#15162A",
  inkSoft: "#5C5F73",
  inkFaint: "#9498A8",
  accent: "#5B5BD6",
  accentDeep: "#4A47C0",
  accentSoft: "#EEEEFB",
  accentLight: "#A6A6EE",
  success: "#0E9F6E",
  successSoft: "#E7F4EC",
  successText: "#0A6B49",
  warning: "#C88A1F",
  warningSoft: "#FCF1DD",
  danger: "#DC5B54",
  dangerSoft: "#FAE7E6",
};

export const shadow = {
  sm: "0 1px 2px rgba(21,22,42,.04)",
  md: "0 2px 8px rgba(21,22,42,.06)",
  lg: "0 8px 24px rgba(21,22,42,.08)",
  xl: "0 20px 48px rgba(21,22,42,.14)",
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

export const TOPBAR_H = 64;

export const layout = {
  shell: {
    display: "flex",
    minHeight: "100vh",
    background: color.bg,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    color: color.ink,
  },
  content: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" },
  main: (maxWidth = 780) => ({
    flex: 1,
    padding: "32px 40px 100px",
    maxWidth,
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
  }),
};

export const fontImport = "@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap');";

export const globalStyles = `
${fontImport}

.forge-nav { transition: background .15s ease, color .15s ease, padding-left .15s ease; }
.forge-nav:hover { background: rgba(255,255,255,.06); color: #fff; padding-left: 14px; }
.forge-nav:focus-visible { outline: 2px solid ${color.accent}; outline-offset: 2px; }

.forge-btn-primary, .forge-btn-primary-lg { transition: transform .12s ease, box-shadow .12s ease, background .15s ease; }
.forge-btn-primary:hover, .forge-btn-primary-lg:hover { box-shadow: 0 6px 16px rgba(91,91,214,.30); transform: translateY(-1px); }
.forge-btn-primary:active, .forge-btn-primary-lg:active { transform: translateY(0) scale(.98); }

.forge-card { transition: box-shadow .2s ease, border-color .2s ease; }
.forge-card:hover { border-color: #D6D7E4; box-shadow: 0 3px 14px rgba(26,27,46,.06); }

.forge-input { transition: border-color .15s ease, box-shadow .15s ease; }
.forge-input:focus { outline: none; border-color: ${color.accent}; box-shadow: 0 0 0 3px rgba(91,91,214,.15); }

.forge-ghost { transition: background .15s ease; }
.forge-ghost:hover { background: #E7E8F0; }

.forge-chip-remove { transition: background .15s ease; }
.forge-chip-remove:hover { background: #F6DBD9; }

.forge-quick-chip { transition: background .15s ease, color .15s ease, transform .12s ease, box-shadow .15s ease; }
.forge-quick-chip:hover { background: ${color.accent} !important; color: #ffffff !important; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(91,91,214,.30); }
.forge-quick-chip:active { transform: translateY(0) scale(.97); }

.forge-quick-scroll::-webkit-scrollbar { height: 4px; }
.forge-quick-scroll::-webkit-scrollbar-track { background: ${color.bg}; border-radius: 4px; }
.forge-quick-scroll::-webkit-scrollbar-thumb { background: ${color.border}; border-radius: 4px; }
.forge-quick-scroll::-webkit-scrollbar-thumb:hover { background: ${color.accent}; }

.forge-toggle { position: relative; display: inline-block; width: 40px; height: 22px; flex: 0 0 auto; }
.forge-toggle input { position: absolute; opacity: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }
.forge-toggle-track { position: absolute; inset: 0; background: #D8D9E4; border-radius: 999px; transition: background .15s ease; pointer-events: none; }
.forge-toggle-track:before { content: ""; position: absolute; width: 16px; height: 16px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: transform .15s ease; box-shadow: 0 1px 2px rgba(0,0,0,.25); }
.forge-toggle input:checked + .forge-toggle-track { background: ${color.accent}; }
.forge-toggle input:checked + .forge-toggle-track:before { transform: translateX(18px); }
.forge-toggle input:focus-visible + .forge-toggle-track { outline: 2px solid ${color.accent}; outline-offset: 2px; }

@keyframes forgeDot {
  0%, 100% { opacity: .35; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); }
}
.forge-dot { animation: forgeDot 1.1s ease-in-out infinite; }

.forge-topbar { position: sticky; top: 0; z-index: 20; background: rgba(245,246,250,.85); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-bottom: 1px solid ${color.border}; }

.forge-logo-box { position: relative; }
.forge-logo-remove { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(15,15,26,.55); opacity: 0; transition: opacity .15s ease; border: none; cursor: pointer; color: #fff; padding: 0; }
.forge-logo-box:hover .forge-logo-remove { opacity: 1; }
.forge-logo-remove:focus-visible { opacity: 1; outline: 2px solid #fff; outline-offset: -2px; }

.forge-info { position: relative; display: inline-flex; }
.forge-info-icon { width: 19px; height: 19px; border-radius: 50%; background: ${color.borderSoft}; color: ${color.inkSoft}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; font-style: italic; font-family: Georgia, serif; cursor: help; transition: background .15s ease, color .15s ease; }
.forge-info:hover .forge-info-icon { background: ${color.accentSoft}; color: ${color.accentDeep}; }
.forge-info-bubble { position: absolute; top: calc(100% + 9px); right: -6px; width: 230px; background: ${color.ink}; color: #fff; font-size: 12px; font-weight: 400; line-height: 1.55; padding: 10px 12px; border-radius: 10px; box-shadow: 0 14px 32px rgba(15,16,32,.28); opacity: 0; transform: translateY(-6px) scale(.96); transform-origin: top right; pointer-events: none; transition: opacity .18s ease, transform .18s ease; z-index: 30; }
.forge-info-bubble:before { content: ""; position: absolute; bottom: 100%; right: 10px; border: 6px solid transparent; border-bottom-color: ${color.ink}; }
.forge-info:hover .forge-info-bubble { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }

.forge-back-to-top { transition: transform .15s ease, box-shadow .15s ease; }
.forge-back-to-top:hover { transform: translateY(-3px); box-shadow: 0 12px 28px -6px rgba(0,0,0,.5); }

.forge-nav-active { position: relative; }
.forge-nav-active::before { content: ''; position: absolute; left: -9px; top: 50%; transform: translateY(-50%); width: 3px; height: 16px; border-radius: 3px; background: ${color.accentLight}; }
.forge-nav-active:hover { padding-left: 10px !important; }

.forge-tab { transition: background .15s ease, color .15s ease, border-color .15s ease; cursor: pointer; }
.forge-tab:hover { background: ${color.borderSoft}; }

@keyframes forgeFadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.forge-fade-up { animation: forgeFadeUp .32s ease both; }

@keyframes forgePulseDot {
  0%, 100% { opacity: .45; }
  50% { opacity: 1; }
}
.forge-live-dot { animation: forgePulseDot 1.8s ease-in-out infinite; }

@keyframes forgeRingPulse {
  0% { transform: scale(.9); opacity: .4; }
  80%, 100% { transform: scale(1.7); opacity: 0; }
}
.forge-launcher-ring { position: absolute; inset: 0; border-radius: 50%; animation: forgeRingPulse 2.6s cubic-bezier(0,0,.2,1) infinite; pointer-events: none; }

.forge-two-col { display: flex; flex-wrap: wrap; gap: 16px; }
.forge-two-col > * { flex: 1 1 220px; min-width: 0; }

@media (max-width: 1400px) {
  .forge-preview-col { display: none !important; }
  .forge-main-col { max-width: 820px !important; }
}

@media (max-width: 900px) {
  .forge-shell { flex-direction: column; }
  .forge-sidebar {
    width: 100% !important;
    position: static !important;
    height: auto !important;
    overflow: visible !important;
    padding: 14px 16px !important;
  }
  .forge-hamburger { display: flex !important; }
  .forge-panel { display: none !important; margin-top: 16px; }
  .forge-panel.forge-panel-open { display: flex !important; }
  .forge-main { padding: 20px 16px 80px !important; }
  .forge-topbar-inner { padding: 12px 16px !important; }
  .forge-page-body { padding: 20px 16px 80px !important; gap: 20px !important; flex-direction: column !important; }
}

@media (prefers-reduced-motion: reduce) {
  .forge-nav, .forge-btn-primary, .forge-btn-primary-lg, .forge-card,
  .forge-input, .forge-ghost, .forge-chip-remove, .forge-dot,
  .forge-launcher-ring, .forge-info-icon, .forge-info-bubble, .forge-back-to-top { transition: none !important; animation: none !important; }
}
`;