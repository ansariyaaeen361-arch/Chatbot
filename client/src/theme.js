export const color = {
  sidebar: "#1B1830",
  sidebarLine: "rgba(255,255,255,.08)",
  bg: "#F6F7FB",
  surface: "#FFFFFF",
  border: "#E6E7EE",
  borderSoft: "#EEEFF4",
  ink: "#1A1B2E",
  inkSoft: "#5C5F73",
  inkFaint: "#9498A8",
  accent: "#5B5BD6",
  accentDeep: "#4A47C0",
  accentSoft: "#EEEEFB",
  accentLight: "#A6A6EE",
  success: "#0E9F6E",
  successSoft: "#E7F4EC",
  successText: "#0A6B49",
  danger: "#DC5B54",
  dangerSoft: "#FAE7E6",
};

export const layout = {
  shell: {
    display: "flex",
    minHeight: "100vh",
    background: color.bg,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    color: color.ink,
  },
  main: (maxWidth = 780) => ({
    flex: 1,
    padding: "36px 48px 100px",
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
  .forge-main { padding: 24px 20px 80px !important; }
}

@media (prefers-reduced-motion: reduce) {
  .forge-nav, .forge-btn-primary, .forge-btn-primary-lg, .forge-card,
  .forge-input, .forge-ghost, .forge-chip-remove, .forge-dot { transition: none !important; animation: none !important; }
}
`;