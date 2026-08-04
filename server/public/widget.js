(function () {
  var scriptTag = document.currentScript;
  var businessId = scriptTag.getAttribute('data-business');
  if (!businessId) { console.error('Chat widget: data-business attribute missing'); return; }

  var API_ROOT = "https://api.mentalforge.ai";
  try {
    if (scriptTag.src) API_ROOT = new URL(scriptTag.src).origin;
  } catch (e) {}
  var API_BASE = API_ROOT + "/api";

  if (window.__mfWidgetLoaded) return; window.__mfWidgetLoaded = true;

  var STORAGE_KEY = "mf_widget_state_" + businessId;

  var widgetHost = document.createElement('div');
  widgetHost.id = 'mf-widget-host';
  document.body.appendChild(widgetHost);
  var shadowRoot = widgetHost.attachShadow ? widgetHost.attachShadow({ mode: 'open' }) : widgetHost;

  var config = { name: "Chat", logoUrl: "", brandColor: "#1B1A18", ctaLinks: [], launcherType: "default", launcherMediaUrl: "", hideBranding: false };
  var busy = false;
  var socket = null;
  var seenMsgIds = {};

  var state = loadState();
  if (!state.sessionId) { state.sessionId = genSessionId(); saveState(); }

  var BOT_ICON_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"/><rect x="4" y="8" width="16" height="12" rx="4"/><circle cx="9" cy="13" r="1.2" fill="currentColor"/><circle cx="15" cy="13" r="1.2" fill="currentColor"/><path d="M9 17h6"/><path d="M2 13h2"/><path d="M20 13h2"/></svg>';
  var USER_ICON_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  var HUMAN_ICON_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>';
  var CLOSE_ICON_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  var DEFAULT_LAUNCH_SVG = '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="9" cy="10" r="1" fill="#ffffff"/><circle cx="12" cy="10" r="1" fill="#ffffff"/><circle cx="15" cy="10" r="1" fill="#ffffff"/></svg>';
  var SEND_ICON_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
  var MENU_ICON_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>';
  var DOWNLOAD_ICON_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  var LEAVE_ICON_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';

  function genSessionId() {
    return 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function shadeColor(hex, percent) {
    hex = String(hex || '#1B1A18').replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var num = parseInt(hex, 16);
    if (isNaN(num)) return '#1B1A18';
    var r = Math.min(255, Math.max(0, (num >> 16) + percent));
    var g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
    var b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { leadCaptured: false, visitor: { name: "", email: "", phone: "" }, messages: [], liveMode: false, chatId: null, sessionId: null };
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  fetch(API_BASE + "/public/config/" + businessId)
    .then(function (r) { return r.json(); })
    .then(function (data) { config = data; init(); })
    .catch(function () { init(); });

  function init() {
    injectStyles();
    buildDOM();
  }

  function injectStyles() {
    var side = config.launcherPosition === 'left' ? 'left' : 'right';
    var brand = config.brandColor;
    var brandDeep = shadeColor(brand, -35);
    var FONT = 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;';
    var css =
      '.mf2-launch{position:fixed;' + side + ':22px;bottom:22px;z-index:2147483000;width:68px;height:68px;border:none;border-radius:50%;' +
      'background:' + brand + ';color:#fff;cursor:pointer;box-shadow:0 14px 34px -6px ' + brand + '77,0 6px 16px -4px rgba(0,0,0,.25);display:grid;place-items:center;' +
      'overflow:hidden;padding:0;transition:transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s ease;' + FONT +
      'animation:mf2PopIn .35s cubic-bezier(.34,1.56,.64,1);}' +
      '.mf2-launch:hover{transform:translateY(-4px) scale(1.06);box-shadow:0 18px 40px -6px ' + brand + '90,0 8px 20px -4px rgba(0,0,0,.3);}' +
      '.mf2-launch:active{transform:translateY(-1px) scale(.97);}' +
      '.mf2-launch-media{width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;}' +
      '@keyframes mf2PopIn{0%{transform:scale(0);opacity:0;}100%{transform:scale(1);opacity:1;}}' +
      '.mf2-dot{position:absolute;top:4px;right:4px;width:15px;height:15px;border-radius:50%;background:#EF4444;border:2.5px solid #fff;display:none;box-shadow:0 2px 6px rgba(0,0,0,.25);}' +
      '.mf2-dot.show{display:block;animation:mf2Pulse 1.8s ease-in-out infinite;}' +
      '@keyframes mf2Pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.22);}}' +

      '.mf2-teaser{position:fixed;' + side + ':22px;bottom:98px;z-index:2147482999;width:290px;max-width:calc(100vw - 44px);' +
      'background:#fff;border-radius:18px;box-shadow:0 20px 46px -14px rgba(20,20,30,.28),0 4px 14px -6px rgba(20,20,30,.12);' +
      'padding:16px;opacity:0;transform:translateY(12px) scale(.95);pointer-events:none;' +
      'transition:opacity .22s ease, transform .22s ease;box-sizing:border-box;cursor:pointer;' + FONT + 'color:#15161F;}' +
      '.mf2-teaser.show{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}' +
      '.mf2-teaser:after{content:"";position:absolute;bottom:-6px;' + side + ':30px;width:14px;height:14px;background:#fff;' +
      'transform:rotate(45deg);box-shadow:3px 3px 6px -3px rgba(20,20,30,.15);}' +
      '.mf2-teaser-close{position:absolute;top:8px;right:8px;width:22px;height:22px;border-radius:50%;border:none;background:#F1F1F4;' +
      'color:#8A8B99;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;line-height:1;padding:0;transition:background .12s ease;}' +
      '.mf2-teaser-close:hover{background:#E5E5EB;color:#45465A;}' +
      '.mf2-teaser-row{display:flex;gap:10px;align-items:flex-start;padding-right:14px;}' +
      '.mf2-teaser-avatar{width:36px;height:36px;border-radius:50%;flex:0 0 auto;background:' + brand + ';color:#fff;' +
      'display:flex;align-items:center;justify-content:center;overflow:hidden;font-weight:700;font-size:13px;}' +
      '.mf2-teaser-avatar img{width:100%;height:100%;object-fit:cover;display:block;}' +
      '.mf2-teaser-name{font-weight:700;font-size:13px;margin-bottom:3px;color:#15161F;}' +
      '.mf2-teaser-text{font-size:13px;line-height:1.45;color:#4B4C5C;}' +
      '.mf2-teaser-chips{display:flex;flex-direction:column;gap:6px;margin-top:12px;}' +
      '.mf2-teaser-chip{border:1px solid ' + brand + '4d;background:' + brand + '0f;color:' + brandDeep + ';text-align:left;' +
      'padding:8px 12px;border-radius:10px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;' +
      'transition:background .12s ease,border-color .12s ease;}' +
      '.mf2-teaser-chip:hover{background:' + brand + '1f;border-color:' + brand + ';}' +

      '.mf2-typing{display:flex;gap:4px;align-items:center;padding:13px 16px;}' +
      '.mf2-typing span{width:6px;height:6px;border-radius:50%;background:#B5B6C4;display:inline-block;animation:mf2Wave 1.1s ease-in-out infinite;}' +
      '.mf2-typing span:nth-child(2){animation-delay:.15s;}' +
      '.mf2-typing span:nth-child(3){animation-delay:.3s;}' +
      '@keyframes mf2Wave{0%,60%,100%{transform:translateY(0);opacity:.5;}30%{transform:translateY(-5px);opacity:1;}}' +

      '.mf2-panel{position:fixed;' + side + ':22px;bottom:98px;z-index:2147483000;width:390px;max-width:calc(100vw - 32px);height:590px;' +
      'max-height:calc(100vh - 130px);background:#fff;border:1px solid rgba(20,20,30,.08);border-radius:22px;overflow:hidden;display:flex;' +
      'flex-direction:column;box-shadow:0 30px 70px -24px rgba(20,20,30,.35),0 8px 24px -8px rgba(20,20,30,.15);opacity:0;' +
      'transform:translateY(16px) scale(.96);pointer-events:none;' +
      'transition:opacity .18s ease, transform .18s cubic-bezier(.2,.8,.3,1);box-sizing:border-box;' +
      FONT + 'color:#15161F;}' +
      '.mf2-panel.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}' +
      '.mf2-panel *{box-sizing:border-box;}' +
      '.mf2-head{background:linear-gradient(135deg,' + brand + ',' + brandDeep + ');color:#fff;padding:16px 18px;display:flex;align-items:center;gap:12px;flex:0 0 auto;position:relative;}' +
      '.mf2-head img{width:34px;height:34px;border-radius:50%;object-fit:cover;background:#fff;flex:0 0 auto;box-shadow:0 0 0 2px rgba(255,255,255,.5);}' +
      '.mf2-head-text{min-width:0;}' +
      '.mf2-title{font-weight:700;font-size:15.5px;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.mf2-status{font-size:11.5px;opacity:.9;display:flex;align-items:center;gap:6px;margin-top:2px;}' +
      '.mf2-status-dot{width:7.5px;height:7.5px;border-radius:50%;background:#4ADE80;box-shadow:0 0 0 2px rgba(255,255,255,.35);flex:0 0 auto;position:relative;}' +
      '.mf2-status-dot:after{content:"";position:absolute;inset:-3px;border-radius:50%;background:#4ADE80;opacity:.65;animation:mf2Glow 1.8s ease-out infinite;}' +
      '@keyframes mf2Glow{0%{transform:scale(1);opacity:.65;}100%{transform:scale(2.6);opacity:0;}}' +
      '.mf2-x{background:none;border:none;color:#fff;cursor:pointer;opacity:.85;display:flex;align-items:center;justify-content:center;padding:6px;border-radius:8px;transition:background .12s ease,opacity .12s ease;flex:0 0 auto;}' +
      '.mf2-x:hover{opacity:1;background:rgba(255,255,255,.18);}' +
      '.mf2-menu-btn{margin-left:auto;background:none;border:none;color:#fff;cursor:pointer;padding:6px;opacity:.85;display:grid;place-items:center;border-radius:8px;transition:background .12s ease,opacity .12s ease;flex:0 0 auto;}' +
      '.mf2-menu-btn:hover{opacity:1;background:rgba(255,255,255,.18);}' +
      '.mf2-menu-panel{position:absolute;inset:0;background:#fff;z-index:5;display:none;flex-direction:column;}' +
      '.mf2-menu-panel.open{display:flex;}' +
      '.mf2-menu-head{background:linear-gradient(135deg,' + brand + ',' + brandDeep + ');color:#fff;padding:16px 16px;display:flex;align-items:center;gap:10px;flex:0 0 auto;}' +
      '.mf2-menu-back{background:none;border:none;color:#fff;cursor:pointer;font-size:18px;padding:4px;}' +
      '.mf2-menu-title{font-weight:700;font-size:15px;}' +
      '.mf2-menu-body{padding:10px;display:flex;flex-direction:column;gap:6px;}' +
      '.mf2-menu-item{display:flex;align-items:center;gap:12px;padding:13px 12px;border:none;background:none;text-align:left;border-radius:10px;cursor:pointer;font-size:14px;color:#15161F;font-family:inherit;width:100%;transition:background .12s ease;}' +
      '.mf2-menu-item:hover{background:#F4F4F7;}' +
      '.mf2-menu-item.danger{color:#DC2626;}' +
      '.mf2-menu-item svg{width:18px;height:18px;flex:0 0 auto;}' +
      '.mf2-body{flex:1;overflow-y:auto;padding:18px 16px;display:flex;flex-direction:column;gap:14px;background:#F7F7FA;}' +
      '.mf2-row{display:flex;gap:8px;max-width:88%;align-items:flex-end;}' +
      '.mf2-row.user{align-self:flex-end;flex-direction:row-reverse;}' +
      '.mf2-av{width:28px;height:28px;border-radius:9px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;background:#E9E9EF;color:#6B6C7E;}' +
      '.mf2-av.rep{background:' + brand + ';color:#fff;}' +
      '.mf2-bub{padding:11px 15px;border-radius:15px;font-size:14px;line-height:1.52;white-space:pre-wrap;}' +
      '.mf2-bub.bot{background:#fff;border:1px solid #EAEAF0;border-top-left-radius:4px;box-shadow:0 1px 3px rgba(20,20,30,.04);}' +
      '.mf2-bub.user{background:' + brand + ';color:#fff;border-top-right-radius:4px;box-shadow:0 2px 8px -2px ' + brand + '55;}' +
      '.mf2-bub.rep{background:#fff;border:1px solid ' + brand + ';border-top-left-radius:4px;}' +
      '.mf2-bub.system{background:#ECECF2;color:#5C5D70;font-size:12px;border-radius:10px;}' +
      '.mf2-cta{margin-top:8px;display:inline-block;text-decoration:none;background:' + brand + ';color:#fff;' +
      'font-size:13px;font-weight:600;padding:8px 14px;border-radius:10px;transition:opacity .12s ease;}' +
      '.mf2-cta:hover{opacity:.9;}' +
      '.mf2-foot{border-top:1px solid #EDEDF2;padding:12px 14px;background:#fff;flex:0 0 auto;}' +
      '.mf2-inrow{display:flex;gap:8px;align-items:center;}' +
      '.mf2-input{flex:1;resize:none;border:1px solid #E5E5EC;border-radius:12px;padding:11px 14px;font-size:14px;font-family:inherit;outline:none;max-height:100px;background:#FAFAFC;transition:border-color .15s ease, box-shadow .15s ease, background .15s ease;}' +
      '.mf2-input:focus{border-color:' + brand + ';background:#fff;box-shadow:0 0 0 3px ' + brand + '22;}' +
      '.mf2-send{width:42px;height:42px;border:none;border-radius:12px;background:' + brand + ';color:#fff;cursor:pointer;display:grid;place-items:center;transition:transform .12s ease, opacity .12s ease;flex:0 0 auto;}' +
      '.mf2-send:hover{opacity:.92;transform:translateY(-1px);}' +
      '.mf2-send:active{transform:translateY(0);}' +
      '.mf2-human-row{text-align:right;margin-top:8px;}' +
      '.mf2-human{background:none;border:none;color:#8A8B99;cursor:pointer;font-size:12px;font-family:inherit;padding:0;display:inline-flex;align-items:center;gap:6px;transition:color .12s ease;font-weight:500;}' +
      '.mf2-human span{text-decoration:underline;}' +
      '.mf2-human:hover{color:' + brand + ';}' +
      '.mf2-lead{background:#fff;border:1px solid #EAEAF0;border-radius:14px;padding:14px;font-size:13.5px;width:100%;box-shadow:0 1px 3px rgba(20,20,30,.04);}' +
      '.mf2-lead input{width:100%;box-sizing:border-box;border:1px solid #E5E5EC;border-radius:9px;padding:9px 11px;font-size:13.5px;margin-bottom:8px;font-family:inherit;background:#FAFAFC;transition:border-color .15s ease, box-shadow .15s ease;}' +
      '.mf2-lead input:focus{outline:none;border-color:' + brand + ';box-shadow:0 0 0 3px ' + brand + '22;background:#fff;}' +
      '.mf2-lead button{width:100%;border:none;background:' + brand + ';color:#fff;font-weight:600;padding:10px;border-radius:9px;cursor:pointer;transition:opacity .12s ease;}' +
      '.mf2-lead button:hover{opacity:.9;}' +
      '.mf2-err{color:#DC2626;font-size:12px;margin:-3px 0 8px;}' +

      '.mf2-gate{flex:1;display:flex;align-items:center;justify-content:center;padding:28px 24px;background:#fff;overflow-y:auto;}' +
      '.mf2-gate-card{width:100%;max-width:290px;text-align:center;}' +
      '.mf2-gate-icon{width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,' + brand + ',' + brandDeep + ');color:#fff;' +
      'display:flex;align-items:center;justify-content:center;margin:0 auto 16px;box-shadow:0 8px 20px -6px ' + brand + '55;}' +
      '.mf2-gate-title{font-weight:700;font-size:17.5px;margin-bottom:6px;color:#15161F;letter-spacing:-0.01em;}' +
      '.mf2-gate-desc{font-size:13px;color:#6B6C7E;margin-bottom:20px;line-height:1.5;}' +
      '.mf2-gate-card input{width:100%;box-sizing:border-box;border:1px solid #E5E5EC;border-radius:11px;padding:12px 14px;font-size:14px;' +
      'margin-bottom:10px;font-family:inherit;background:#FAFAFC;transition:border-color .15s ease,box-shadow .15s ease,background .15s ease;}' +
      '.mf2-gate-card input:focus{outline:none;border-color:' + brand + ';box-shadow:0 0 0 3px ' + brand + '22;background:#fff;}' +
      '.mf2-gate-card button{width:100%;border:none;background:' + brand + ';color:#fff;font-weight:700;padding:13px;border-radius:11px;' +
      'cursor:pointer;font-size:14px;transition:opacity .12s ease,transform .12s ease;margin-top:4px;}' +
      '.mf2-gate-card button:hover{opacity:.92;transform:translateY(-1px);}' +
      '.mf2-gate-err{color:#DC2626;font-size:12px;margin:8px 0 0;}' +
      '.mf2-branding{display:flex;align-items:center;justify-content:center;gap:6px;padding:9px 10px;border-top:1px solid #F0F0F4;background:#FBFBFD;font-size:11px;color:#A5A6B3;text-decoration:none;flex:0 0 auto;font-family:inherit;transition:color .12s ease;}' +
      '.mf2-branding:hover{color:#5C5D70;}' +
      '.mf2-branding-mark{width:14px;height:14px;border-radius:4px;background:#5B5BD6;color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex:0 0 auto;}' +
      // Date dividers
      '.mf2-date-div{display:flex;align-items:center;gap:8px;padding:2px 0 4px;width:100%;}' +
      '.mf2-date-line{flex:1;height:1px;background:#E8E8EF;}' +
      '.mf2-date-label{font-size:10.5px;color:#A5A6B3;white-space:nowrap;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:0.03em;}' +
      // Hover time on messages
      '.mf2-bub-wrap{position:relative;}' +
      '.mf2-bub-time{display:none;position:absolute;bottom:-18px;font-size:10px;color:#A5A6B3;white-space:nowrap;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;pointer-events:none;}' +
      '.mf2-bub-time.left{left:0;}' +
      '.mf2-bub-time.right{right:0;}' +
      '.mf2-bub-wrap:hover .mf2-bub-time{display:block;}';

    var style = document.createElement("style");
    style.textContent = css;
    shadowRoot.appendChild(style);
  }

  var body, input, sendBtn, panel, dot, humanBtn, menuBtn, menuPanel, menuBack, downloadBtn, leaveBtn, teaser, teaserTimer, gate, foot;
  var TEASER_DISMISS_KEY = "mf_teaser_dismissed_" + businessId;
  var pendingQuickReply = null;
  var typingRow = null;
  var typingTimeout = null;
  var lastBubbleDate = null; // tracks date of last rendered bubble for dividers

  // ─── Date/Time Helpers ──────────────────────────────────────────────────────
  function mfFormatTime(d) {
    if (!d) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  function mfDateLabel(d) {
    if (!d) return '';
    var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()];
  }
  function mfSameDay(a, b) {
    if (!a || !b) return false;
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function addDateDividerIfNeeded(ts) {
    var d = ts ? new Date(ts) : new Date();
    if (!mfSameDay(d, lastBubbleDate)) {
      lastBubbleDate = d;
      var div = document.createElement('div');
      div.className = 'mf2-date-div';
      var line1 = document.createElement('span'); line1.className = 'mf2-date-line';
      var label = document.createElement('span'); label.className = 'mf2-date-label'; label.textContent = mfDateLabel(d);
      var line2 = document.createElement('span'); line2.className = 'mf2-date-line';
      div.appendChild(line1); div.appendChild(label); div.appendChild(line2);
      body.appendChild(div);
    }
  }

  function buildLauncherInner() {
    if (config.launcherType === 'image' && config.launcherMediaUrl) {
      return '<img class="mf2-launch-media" src="' + API_ROOT + config.launcherMediaUrl + '" alt="">';
    }
    if (config.launcherType === 'video' && config.launcherMediaUrl) {
      return '<video class="mf2-launch-media" src="' + API_ROOT + config.launcherMediaUrl + '" autoplay muted loop playsinline></video>';
    }
    return DEFAULT_LAUNCH_SVG;
  }

  function buildDOM() {
    var launch = document.createElement('button');
    launch.className = 'mf2-launch';
    launch.setAttribute('aria-label', 'Open chat');
    launch.innerHTML = buildLauncherInner() + '<span class="mf2-dot" id="mf2Dot"></span>';

    panel = document.createElement('div');
    panel.className = 'mf2-panel';
    panel.innerHTML =
      '<div class="mf2-head">' +
        (config.logoUrl ? '<img src="' + API_ROOT + config.logoUrl + '">' : '') +
        '<div class="mf2-head-text">' +
          '<div class="mf2-title">' + escapeHtml(config.name) + '</div>' +
          '<div class="mf2-status"><span class="mf2-status-dot"></span>Online now</div>' +
        '</div>' +
        '<button class="mf2-menu-btn" id="mf2MenuBtn" aria-label="More options">' + MENU_ICON_SVG + '</button>' +
        '<button class="mf2-x" aria-label="Close">' + CLOSE_ICON_SVG + '</button>' +
      '</div>' +
      '<div class="mf2-body" id="mf2Body"></div>' +
      '<div class="mf2-gate" id="mf2Gate" style="display:none;"></div>' +
      '<div class="mf2-menu-panel" id="mf2MenuPanel">' +
        '<div class="mf2-menu-head"><button class="mf2-menu-back" id="mf2MenuBack" aria-label="Back">&larr;</button><div class="mf2-menu-title">Options</div></div>' +
        '<div class="mf2-menu-body">' +
          '<button class="mf2-menu-item" id="mf2DownloadBtn">' + DOWNLOAD_ICON_SVG + 'Download conversation</button>' +
          '<button class="mf2-menu-item danger" id="mf2LeaveBtn">' + LEAVE_ICON_SVG + 'Leave this chat</button>' +
        '</div>' +
      '</div>' +
      '<div class="mf2-foot" id="mf2Foot">' +
        '<div class="mf2-inrow">' +
          '<textarea class="mf2-input" id="mf2Input" rows="1" placeholder="Type a message…" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false"></textarea>' +
          '<button class="mf2-send" id="mf2Send">' + SEND_ICON_SVG + '</button>' +
        '</div>' +
        '<div class="mf2-human-row"><button class="mf2-human" id="mf2Human">' + HUMAN_ICON_SVG + '<span>Talk to a Representative →</span></button></div>' +
      '</div>' +
      (config.hideBranding ? '' :
        '<a class="mf2-branding" href="https://mentalforge.ai" target="_blank" rel="noopener">' +
          '<span class="mf2-branding-mark">M</span>Powered by MentalForge AI' +
        '</a>');

    var quickReplies = (config.faqs && config.faqs.length)
      ? config.faqs.map(function (f) { return f.question; }).filter(Boolean).slice(0, 3)
      : ["What can you help me with?", "Tell me about your services", "I have a question"];

    teaser = document.createElement('div');
    teaser.className = 'mf2-teaser';
    var teaserAvatar = config.logoUrl
      ? '<img src="' + API_ROOT + config.logoUrl + '" alt="">'
      : BOT_ICON_SVG.replace(/width="13" height="13"/, 'width="16" height="16"');
    teaser.innerHTML =
      '<button class="mf2-teaser-close" id="mf2TeaserClose" aria-label="Dismiss">' + CLOSE_ICON_SVG.replace(/width="18" height="18"/, 'width="11" height="11"').replace(/stroke="#fff"/, 'stroke="currentColor"') + '</button>' +
      '<div class="mf2-teaser-row">' +
        '<div class="mf2-teaser-avatar">' + teaserAvatar + '</div>' +
        '<div>' +
          '<div class="mf2-teaser-name">' + escapeHtml(config.name) + '</div>' +
          '<div class="mf2-teaser-text">' + escapeHtml(config.welcomeMessage || "Hi! How can I help you today?") + '</div>' +
        '</div>' +
      '</div>' +
      (quickReplies.length
        ? '<div class="mf2-teaser-chips" id="mf2TeaserChips">' +
            quickReplies.map(function (q, i) {
              return '<button class="mf2-teaser-chip" data-q="' + i + '">' + escapeHtml(q) + '</button>';
            }).join('') +
          '</div>'
        : '');

    shadowRoot.appendChild(launch);
    shadowRoot.appendChild(teaser);
    shadowRoot.appendChild(panel);

    body = panel.querySelector('#mf2Body');
    gate = panel.querySelector('#mf2Gate');
    foot = panel.querySelector('#mf2Foot');
    input = panel.querySelector('#mf2Input');
    sendBtn = panel.querySelector('#mf2Send');
    dot = launch.querySelector('#mf2Dot');
    humanBtn = panel.querySelector('#mf2Human');
    menuBtn = panel.querySelector('#mf2MenuBtn');
    menuPanel = panel.querySelector('#mf2MenuPanel');
    menuBack = panel.querySelector('#mf2MenuBack');
    downloadBtn = panel.querySelector('#mf2DownloadBtn');
    leaveBtn = panel.querySelector('#mf2LeaveBtn');

    var opened = false;
    function openPanel() {
      panel.classList.add('open');
      clearDot();
      dismissTeaser(true);
      if (!opened) { opened = true; resumeOrStart(); }
    }
    launch.addEventListener('click', function () {
      if (panel.classList.contains('open')) { panel.classList.remove('open'); return; }
      openPanel();
    });
    teaser.addEventListener('click', openPanel);
    teaser.querySelector('#mf2TeaserClose').addEventListener('click', function (e) {
      e.stopPropagation();
      dismissTeaser(true);
    });
    var teaserChips = teaser.querySelectorAll('.mf2-teaser-chip');
    for (var qi = 0; qi < teaserChips.length; qi++) {
      teaserChips[qi].addEventListener('click', function (e) {
        e.stopPropagation();
        pendingQuickReply = quickReplies[Number(e.currentTarget.getAttribute('data-q'))];
        dismissTeaser(true);
        openPanel();
      });
    }
    panel.querySelector('.mf2-x').addEventListener('click', function () { panel.classList.remove('open'); });
    sendBtn.addEventListener('click', function () { send(); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    humanBtn.addEventListener('click', function () { startLiveChat(); });
    menuBtn.addEventListener('click', function () { menuPanel.classList.add('open'); });
    menuBack.addEventListener('click', function () { menuPanel.classList.remove('open'); });
    downloadBtn.addEventListener('click', downloadConversation);
    leaveBtn.addEventListener('click', leaveChat);

    maybeShowTeaser();
  }

  function maybeShowTeaser() {
    if (state.messages.length > 0) return;
    var dismissed = false;
    try { dismissed = localStorage.getItem(TEASER_DISMISS_KEY) === '1'; } catch (e) {}
    if (dismissed) return;
    teaserTimer = setTimeout(function () {
      if (panel.classList.contains('open')) return;
      teaser.classList.add('show');
    }, 2500);
  }

  function dismissTeaser(permanent) {
    clearTimeout(teaserTimer);
    if (teaser) teaser.classList.remove('show');
    if (permanent) {
      try { localStorage.setItem(TEASER_DISMISS_KEY, '1'); } catch (e) {}
    }
  }

  function escapeHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function scrollDown() { body.scrollTop = body.scrollHeight; }
  function showDot() { if (!panel.classList.contains('open')) { dot.classList.add('show'); playBeep(); } }
  function clearDot() { dot.classList.remove('show'); }

  function playBeep() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      var ctx = new Ctx();
      var osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = 760;
      osc.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(); osc.stop(ctx.currentTime + 0.17);
    } catch (e) {}
  }

  function isSafeCtaUrl(url) {
    try {
      var scheme = String(url).trim().split(':')[0].toLowerCase();
      return scheme === 'http' || scheme === 'https' || scheme === 'mailto' || scheme === 'tel';
    } catch (e) {
      return false;
    }
  }

  function addBubble(role, text, ctaUrl, ctaLabel, silent, ts) {
    var cls = role === 'user' ? 'user' : (role === 'rep' ? 'rep' : (role === 'system' ? 'system' : 'bot'));
    var row = document.createElement('div');
    row.className = 'mf2-row' + (role === 'user' ? ' user' : '');

    // Inject date divider if this is a new day
    addDateDividerIfNeeded(ts);

    if (role !== 'system') {
      var av = document.createElement('div');
      av.className = 'mf2-av' + (role === 'rep' ? ' rep' : '');
      if (role === 'user') {
        av.innerHTML = USER_ICON_SVG;
      } else if (role === 'rep') {
        av.innerHTML = HUMAN_ICON_SVG;
      } else {
        av.innerHTML = BOT_ICON_SVG;
      }
      row.appendChild(av);
    }

    var col = document.createElement('div');
    var wrap = document.createElement('div');
    wrap.className = 'mf2-bub-wrap';

    var bub = document.createElement('div');
    bub.className = 'mf2-bub ' + cls;
    bub.textContent = text;
    wrap.appendChild(bub);

    // Time tooltip on hover
    var timeStr = mfFormatTime(ts ? new Date(ts) : new Date());
    if (timeStr) {
      var timeEl = document.createElement('div');
      timeEl.className = 'mf2-bub-time ' + (role === 'user' ? 'right' : 'left');
      timeEl.textContent = timeStr;
      wrap.appendChild(timeEl);
    }

    col.appendChild(wrap);

    if (ctaUrl && isSafeCtaUrl(ctaUrl)) {
      var a = document.createElement('a');
      a.className = 'mf2-cta'; a.href = ctaUrl; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = ctaLabel || 'Learn more';
      col.appendChild(document.createElement('br'));
      col.appendChild(a);
    }
    row.appendChild(col);
    body.appendChild(row);
    if (typingRow) body.appendChild(typingRow);
    scrollDown();
    if (!silent && (role === 'assistant' || role === 'rep')) showDot();
  }
  function addSystem(text, ts) { addBubble('system', text, null, null, true, ts); }

  function showTyping(isLive) {
    hideTyping();
    typingRow = document.createElement('div');
    typingRow.className = 'mf2-row';
    if (isLive) {
      typingRow.innerHTML =
        '<div class="mf2-av rep">' + HUMAN_ICON_SVG + '</div>' +
        '<div class="mf2-bub rep mf2-typing"><span></span><span></span><span></span></div>';
    } else {
      typingRow.innerHTML =
        '<div class="mf2-av">' + BOT_ICON_SVG + '</div>' +
        '<div class="mf2-bub bot mf2-typing"><span></span><span></span><span></span></div>';
    }
    body.appendChild(typingRow);
    scrollDown();
  }
  function hideTyping() {
    if (typingRow) { typingRow.remove(); typingRow = null; }
  }

  // ---------- lead capture ----------
  var pendingLivePurpose = false;

  function submitLead(name, contact, onDone) {
    var email = contact.indexOf('@') > -1 ? contact : '';
    var phone = contact.indexOf('@') === -1 ? contact : '';
    fetch(API_BASE + "/public/lead/" + businessId, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, email: email, phone: phone })
    }).catch(function () {}).finally(function () {
      state.leadCaptured = true;
      state.visitor = { name: name, email: email, phone: phone };
      saveState();
      onDone();
    });
  }

  function showLeadForm(purpose) {
    pendingLivePurpose = purpose === 'live';

    if (pendingLivePurpose) {
      var row = document.createElement('div'); row.className = 'mf2-row';
      var card = document.createElement('div'); card.className = 'mf2-lead';
      card.innerHTML =
        '<div style="font-weight:600;margin-bottom:6px;">Hi! Who am I speaking with?</div>' +
        '<div style="font-size:12px;color:#6E6A63;margin-bottom:8px;">So our team can follow up with you directly.</div>' +
        '<input type="text" id="mf2Name" placeholder="Your name" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false">' +
        '<input type="text" id="mf2Contact" placeholder="Email or phone" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false">' +
        '<div class="mf2-err" id="mf2Err" style="display:none;"></div>' +
        '<button id="mf2LeadBtn">Continue</button>';
      row.appendChild(card); body.appendChild(row); scrollDown();

      card.querySelector('#mf2LeadBtn').addEventListener('click', function () {
        var name = card.querySelector('#mf2Name').value.trim();
        var contact = card.querySelector('#mf2Contact').value.trim();
        var errBox = card.querySelector('#mf2Err');
        errBox.style.display = 'none';
        if (!name) { errBox.textContent = 'Please enter your name.'; errBox.style.display = 'block'; return; }
        if (!contact) { errBox.textContent = 'Please enter your email or phone.'; errBox.style.display = 'block'; return; }
        submitLead(name, contact, function () {
          row.remove();
          actuallyStartLiveChat();
        });
      });
      return;
    }

    // First-time visitor: block the whole chat behind a prominent, centered gate.
    body.style.display = 'none';
    foot.style.display = 'none';
    gate.style.display = 'flex';
    gate.innerHTML =
      '<div class="mf2-gate-card">' +
        '<div class="mf2-gate-icon">' + BOT_ICON_SVG.replace(/width="13" height="13"/, 'width="24" height="24"') + '</div>' +
        '<div class="mf2-gate-title">Hi! Who am I speaking with?</div>' +
        '<div class="mf2-gate-desc">Please share your details to start chatting with us.</div>' +
        '<input type="text" id="mf2Name" placeholder="Your name" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false">' +
        '<input type="text" id="mf2Contact" placeholder="Email or phone" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false">' +
        '<button id="mf2LeadBtn">Continue</button>' +
        '<div class="mf2-gate-err" id="mf2Err" style="display:none;"></div>' +
      '</div>';

    gate.querySelector('#mf2LeadBtn').addEventListener('click', function () {
      var name = gate.querySelector('#mf2Name').value.trim();
      var contact = gate.querySelector('#mf2Contact').value.trim();
      var errBox = gate.querySelector('#mf2Err');
      errBox.style.display = 'none';
      if (!name) { errBox.textContent = 'Please enter your name.'; errBox.style.display = 'block'; return; }
      submitLead(name, contact, function () {
        gate.style.display = 'none';
        gate.innerHTML = '';
        body.style.display = '';
        foot.style.display = '';
        startChat();
      });
    });
  }

  function resumeOrStart() {
    if (state.messages.length > 0) {
      state.messages.forEach(function (m) { addBubble(m.role, m.content, null, null, true, m.ts); });
      if (state.liveMode && state.chatId) connectLiveChat(state.chatId);
      return;
    }
    if (!state.leadCaptured) { showLeadForm('start'); return; }
    startChat();
  }

  function startChat() {
    var greeting = config.welcomeMessage || "Hi! How can I help you today?";
    addBubble('assistant', greeting, null, null, true);
    state.messages.push({ role: 'assistant', content: greeting });
    saveState();
    input.focus();
    if (pendingQuickReply) {
      var q = pendingQuickReply;
      pendingQuickReply = null;
      send(q);
    }
  }

  var LIVE_TRIGGER_RE = /(talk|connect|speak|chat).{0,20}(human|agent|representative|person|team member)|human agent|live agent|real person/i;

  async function send(text) {
    var content = (text !== undefined ? text : input.value).trim();
    if (!content || busy) return;

    if (state.liveMode) { sendLiveMessage(content); return; }

    if (LIVE_TRIGGER_RE.test(content)) {
      input.value = ''; input.style.height = 'auto';
      startLiveChat();
      return;
    }

    busy = true; sendBtn.disabled = true;
    var now = new Date();
    addBubble('user', content, null, null, true, now);
    state.messages.push({ role: 'user', content: content, ts: now });
    saveState();
    input.value = ''; input.style.height = 'auto';
    showTyping();

    try {
      var res = await fetch(API_BASE + "/chat/" + businessId, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: state.messages.filter(function (m) { return m.role === 'user' || m.role === 'assistant'; }),
          sessionId: state.sessionId
        })
      });
      var data = await res.json();
      hideTyping();
      var reply = data.reply || "Sorry, something went wrong. Please try again.";
      var replyTime = new Date();
      var cta = (config.ctaLinks && config.ctaLinks[0]) ? config.ctaLinks[0] : null;
      addBubble('assistant', reply, cta ? cta.url : null, cta ? cta.label : null, false, replyTime);
      state.messages.push({ role: 'assistant', content: reply, ts: replyTime });
      saveState();
    } catch (e) {
      hideTyping();
      addBubble('assistant', "Sorry, something went wrong. Please try again.", null, null, false, new Date());
    } finally {
      busy = false; sendBtn.disabled = false; input.focus();
    }
  }

  // ---------- hamburger menu actions ----------
  function downloadConversation() {
    var lines = state.messages.map(function (m) {
      var who = m.role === 'user' ? 'You' : (m.role === 'rep' ? 'Team member' : (m.role === 'system' ? 'System' : (config.name || 'Assistant')));
      return who + ': ' + m.content;
    });
    var text = lines.length ? lines.join('\n\n') : 'No conversation yet.';
    var blob = new Blob([text], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'chat-transcript-' + new Date().toISOString().slice(0, 10) + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    menuPanel.classList.remove('open');
  }

  function leaveChat() {
    if (!confirm('Leave this chat? This will clear your conversation and end any active live chat.')) return;

    if (state.liveMode && state.chatId) {
      fetch(API_BASE + "/livechat/" + state.chatId + "/leave", { method: 'POST' }).catch(function () {});
      if (socket) socket.disconnect();
    }

    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    state = { leadCaptured: false, visitor: { name: "", email: "", phone: "" }, messages: [], liveMode: false, chatId: null, sessionId: genSessionId() };
    saveState();
    seenMsgIds = {};
    socket = null;
    typingRow = null;
    body.innerHTML = '';
    menuPanel.classList.remove('open');
    humanBtn.style.display = 'inline-flex';
    humanBtn.disabled = false;
    resumeOrStart();
  }

  // ================= LIVE AGENT HANDOFF =================

  function loadSocketIO(cb) {
    if (window.io) { cb(); return; }
    var s = document.createElement('script');
    s.src = API_ROOT + "/socket.io/socket.io.js";
    s.onload = cb;
    document.head.appendChild(s);
  }

  function startLiveChat() {
    if (state.liveMode) { addSystem("You're already connected — send your message below."); return; }
    if (!state.leadCaptured) { showLeadForm('live'); return; }
    actuallyStartLiveChat();
  }

  function actuallyStartLiveChat() {
    humanBtn.disabled = true;
    fetch(API_BASE + "/livechat/create/" + businessId, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: state.visitor.name, email: state.visitor.email, phone: state.visitor.phone, sessionId: state.sessionId })
    }).then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.chatId) {
          var unavailableMsg = data.message || "Live chat isn't available right now.";
          addSystem(unavailableMsg);
          state.messages.push({ role: 'system', content: unavailableMsg });
          saveState();
          humanBtn.disabled = false;
          return;
        }
        state.liveMode = true;
        state.chatId = data.chatId;
        saveState();
        var msg = "Connecting you to a team member — hang tight, someone will join shortly.";
        addSystem(msg);
        state.messages.push({ role: 'system', content: msg });
        saveState();
        connectLiveChat(data.chatId);
      });
  }

  function connectLiveChat(chatId) {
    humanBtn.style.display = 'none';
    loadSocketIO(function () {
      if (!socket) socket = io(API_ROOT);
      socket.emit('join_chat', chatId);

      socket.off('new_message');
      socket.on('new_message', function (m) {
        var ts = m.timestamp || m.createdAt || new Date();
        if (m.sender === 'system') {
          hideTyping();
          addSystem(m.text, ts);
          state.messages.push({ role: 'system', content: m.text, ts: ts });
          saveState();
          return;
        }
        if (m.sender === 'rep') hideTyping();
        var role = m.sender === 'rep' ? 'rep' : 'user';
        addBubble(role, m.text, null, null, role === 'user', ts);
        state.messages.push({ role: role, content: m.text, ts: ts });
        saveState();
      });

      socket.off('agent_typing');
      socket.on('agent_typing', function () {
        showTyping(true);
        // Auto-hide after 4 seconds if no message arrives
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(hideTyping, 4000);
      });

      socket.off('chat_updated');
      socket.on('chat_updated', function (chat) {
        if (chat.status === 'closed' && state.liveMode) {
          hideTyping();
          var msg = "This chat has been closed. Type a message below to chat with our AI guide again.";
          addSystem(msg);
          state.messages.push({ role: 'system', content: msg });
          state.liveMode = false;
          saveState();
          humanBtn.style.display = 'inline-flex';
          humanBtn.disabled = false;
        }
      });
    });
  }

  function sendLiveMessage(content) {
    input.value = ''; input.style.height = 'auto';
    // Do NOT show typing here — typing indicator is for the AGENT, not the visitor
    fetch(API_BASE + "/livechat/" + state.chatId + "/message", {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: 'visitor', text: content })
    });
  }
})();