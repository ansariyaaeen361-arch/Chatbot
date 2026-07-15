(function () {
  var scriptTag = document.currentScript;
  var businessId = scriptTag.getAttribute('data-business');
  if (!businessId) { console.error('Chat widget: data-business attribute missing'); return; }

  var API_ROOT = "https://api.mentalforge.ai";
  var API_BASE = API_ROOT + "/api";

  if (window.__mfWidgetLoaded) return; window.__mfWidgetLoaded = true;

  var STORAGE_KEY = "mf_widget_state_" + businessId;

  var widgetHost = document.createElement('div');
  widgetHost.id = 'mf-widget-host';
  document.body.appendChild(widgetHost);
  var shadowRoot = widgetHost.attachShadow ? widgetHost.attachShadow({ mode: 'open' }) : widgetHost;

  var config = { name: "Chat", logoUrl: "", brandColor: "#1B1A18", ctaLinks: [], launcherType: "default", launcherMediaUrl: "" };
  var busy = false;
  var socket = null;
  var currentAgentInitial = "R";
  var seenMsgIds = {};

  var state = loadState();

  var BOT_ICON_SVG = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none"><path d="M12 2v3M8 21h8M9 8h6a3 3 0 013 3v3a3 3 0 01-3 3H9a3 3 0 01-3-3v-3a3 3 0 013-3z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.5" cy="12.5" r=".8" fill="currentColor"/><circle cx="14.5" cy="12.5" r=".8" fill="currentColor"/></svg>';
  var HUMAN_ICON_SVG = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none"><path d="M4 13a8 8 0 0116 0v4a2 2 0 01-2 2h-1a1 1 0 01-1-1v-5a1 1 0 011-1h3M4 13v4a2 2 0 002 2h1a1 1 0 001-1v-5a1 1 0 00-1-1H4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var CLOSE_ICON_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>';
  var DEFAULT_LAUNCH_SVG = '<svg viewBox="0 0 24 24" fill="none" width="26" height="26"><path d="M4 5h16v11H8l-4 4V5z" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg>';

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { leadCaptured: false, visitor: { name: "", email: "", phone: "" }, messages: [], liveMode: false, chatId: null };
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
    var css =
      '.mf2-launch{position:fixed;' + side + ':22px;bottom:22px;z-index:2147483000;width:60px;height:60px;border:none;border-radius:50%;' +
      'background:' + config.brandColor + ';color:#fff;cursor:pointer;box-shadow:0 10px 30px -8px rgba(0,0,0,.4);display:grid;place-items:center;' +
      'overflow:hidden;padding:0;transition:transform .15s ease, box-shadow .15s ease;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;}' +
      '.mf2-launch:hover{transform:translateY(-2px);box-shadow:0 14px 34px -8px rgba(0,0,0,.45);}' +
      '.mf2-launch-media{width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;}' +
      '.mf2-dot{position:absolute;top:6px;right:6px;width:13px;height:13px;border-radius:50%;background:#E4571E;border:2px solid #fff;display:none;}' +
      '.mf2-dot.show{display:block;}' +
      '.mf2-panel{position:fixed;' + side + ':22px;bottom:94px;z-index:2147483000;width:380px;max-width:calc(100vw - 32px);height:580px;' +
      'max-height:calc(100vh - 130px);background:#fff;border:1px solid #E7E2D8;border-radius:18px;overflow:hidden;display:flex;' +
      'flex-direction:column;box-shadow:0 24px 60px -20px rgba(0,0,0,.35);opacity:0;transform:translateY(14px) scale(.97);pointer-events:none;' +
      'transition:opacity .16s ease, transform .16s ease;box-sizing:border-box;' +
      'font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1B1A18;}' +
      '.mf2-panel.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}' +
      '.mf2-panel *{box-sizing:border-box;}' +
      '.mf2-head{background:' + config.brandColor + ';color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px;flex:0 0 auto;}' +
      '.mf2-head img{width:28px;height:28px;border-radius:50%;object-fit:cover;background:#fff;}' +
      '.mf2-title{font-weight:600;font-size:15px;}' +
      '.mf2-x{background:none;border:none;color:#fff;cursor:pointer;opacity:.85;display:flex;align-items:center;justify-content:center;padding:6px;border-radius:8px;transition:background .12s ease,opacity .12s ease;}' +
      '.mf2-x:hover{opacity:1;background:rgba(255,255,255,.15);}' +
      '.mf2-menu-btn{margin-left:auto;background:none;border:none;color:#fff;cursor:pointer;padding:6px;opacity:.85;display:grid;place-items:center;border-radius:8px;transition:background .12s ease,opacity .12s ease;}' +
      '.mf2-menu-btn:hover{opacity:1;background:rgba(255,255,255,.15);}' +
      '.mf2-menu-panel{position:absolute;inset:0;background:#fff;z-index:5;display:none;flex-direction:column;}' +
      '.mf2-menu-panel.open{display:flex;}' +
      '.mf2-menu-head{background:' + config.brandColor + ';color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px;flex:0 0 auto;}' +
      '.mf2-menu-back{background:none;border:none;color:#fff;cursor:pointer;font-size:18px;padding:4px;}' +
      '.mf2-menu-title{font-weight:600;font-size:15px;}' +
      '.mf2-menu-body{padding:10px;display:flex;flex-direction:column;gap:6px;}' +
      '.mf2-menu-item{display:flex;align-items:center;gap:12px;padding:13px 12px;border:none;background:none;text-align:left;border-radius:10px;cursor:pointer;font-size:14px;color:#1B1A18;font-family:inherit;width:100%;}' +
      '.mf2-menu-item:hover{background:#F2F2F2;}' +
      '.mf2-menu-item.danger{color:#B8410F;}' +
      '.mf2-menu-item svg{width:18px;height:18px;flex:0 0 auto;}' +
      '.mf2-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:#FBFAF7;}' +
      '.mf2-row{display:flex;gap:8px;max-width:88%;align-items:flex-end;}' +
      '.mf2-row.user{align-self:flex-end;flex-direction:row-reverse;}' +
      '.mf2-av{width:24px;height:24px;border-radius:7px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;background:#EFEFEF;color:#6E6A63;}' +
      '.mf2-av.rep{background:' + config.brandColor + ';color:#fff;}' +
      '.mf2-bub{padding:10px 13px;border-radius:12px;font-size:14px;line-height:1.5;white-space:pre-wrap;}' +
      '.mf2-bub.bot{background:#fff;border:1px solid #E7E2D8;border-top-left-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,.03);}' +
      '.mf2-bub.user{background:' + config.brandColor + ';color:#fff;border-top-right-radius:4px;}' +
      '.mf2-bub.rep{background:#fff;border:1px solid ' + config.brandColor + ';border-top-left-radius:4px;}' +
      '.mf2-bub.system{background:#F2F2F2;color:#6E6A63;font-size:12px;border-radius:9px;}' +
      '.mf2-cta{margin-top:8px;display:inline-block;text-decoration:none;background:' + config.brandColor + ';color:#fff;' +
      'font-size:13px;font-weight:600;padding:8px 13px;border-radius:9px;}' +
      '.mf2-foot{border-top:1px solid #E7E2D8;padding:10px 12px;background:#fff;flex:0 0 auto;}' +
      '.mf2-inrow{display:flex;gap:8px;}' +
      '.mf2-input{flex:1;resize:none;border:1px solid #E7E2D8;border-radius:11px;padding:10px 12px;font-size:14px;font-family:inherit;outline:none;max-height:100px;transition:border-color .15s ease;}' +
      '.mf2-input:focus{border-color:#B9B4A8;}' +
      '.mf2-send{width:40px;height:40px;border:none;border-radius:11px;background:' + config.brandColor + ';color:#fff;cursor:pointer;display:grid;place-items:center;transition:opacity .12s ease;}' +
      '.mf2-send:hover{opacity:.9;}' +
      '.mf2-human-row{text-align:right;margin-top:6px;}' +
      '.mf2-human{background:none;border:none;color:#6E6A63;cursor:pointer;font-size:11.5px;font-family:inherit;padding:0;display:inline-flex;align-items:center;gap:5px;}' +
      '.mf2-human span{text-decoration:underline;}' +
      '.mf2-human:hover{color:#1B1A18;}' +
      '.mf2-lead{background:#fff;border:1px solid #E7E2D8;border-radius:12px;padding:13px;font-size:13.5px;width:100%;}' +
      '.mf2-lead input{width:100%;box-sizing:border-box;border:1px solid #E7E2D8;border-radius:8px;padding:8px 10px;font-size:13.5px;margin-bottom:8px;font-family:inherit;transition:border-color .15s ease;}' +
      '.mf2-lead input:focus{outline:none;border-color:#B9B4A8;}' +
      '.mf2-lead button{width:100%;border:none;background:' + config.brandColor + ';color:#fff;font-weight:600;padding:9px;border-radius:8px;cursor:pointer;transition:opacity .12s ease;}' +
      '.mf2-lead button:hover{opacity:.9;}' +
      '.mf2-skip{display:block;text-align:center;margin-top:6px;font-size:11.5px;color:#999;cursor:pointer;text-decoration:underline;}' +
      '.mf2-err{color:#B8410F;font-size:12px;margin:-3px 0 8px;}' +
      '.mf2-branding{display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 10px;border-top:1px solid #EFEFEF;background:#FBFBFB;font-size:11px;color:#9A9A9A;text-decoration:none;flex:0 0 auto;font-family:inherit;}' +
      '.mf2-branding:hover{color:#6E6A63;}' +
      '.mf2-branding-mark{width:14px;height:14px;border-radius:4px;background:#5B5BD6;color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex:0 0 auto;}';

    var style = document.createElement("style");
    style.textContent = css;
    shadowRoot.appendChild(style);
  }

  var body, input, sendBtn, panel, dot, humanBtn, menuBtn, menuPanel, menuBack, downloadBtn, leaveBtn;

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
        '<div class="mf2-title">' + escapeHtml(config.name) + '</div>' +
        '<button class="mf2-menu-btn" id="mf2MenuBtn" aria-label="More options"><svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>' +
        '<button class="mf2-x" aria-label="Close">' + CLOSE_ICON_SVG + '</button>' +
      '</div>' +
      '<div class="mf2-body" id="mf2Body"></div>' +
      '<div class="mf2-menu-panel" id="mf2MenuPanel">' +
        '<div class="mf2-menu-head"><button class="mf2-menu-back" id="mf2MenuBack" aria-label="Back">&larr;</button><div class="mf2-menu-title">Options</div></div>' +
        '<div class="mf2-menu-body">' +
          '<button class="mf2-menu-item" id="mf2DownloadBtn"><svg viewBox="0 0 24 24" fill="none"><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Download conversation</button>' +
          '<button class="mf2-menu-item danger" id="mf2LeaveBtn"><svg viewBox="0 0 24 24" fill="none"><path d="M9 6L5 12l4 6M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Leave this chat</button>' +
        '</div>' +
      '</div>' +
      '<div class="mf2-foot">' +
        '<div class="mf2-inrow">' +
          '<textarea class="mf2-input" id="mf2Input" rows="1" placeholder="Type a message…" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false"></textarea>' +
          '<button class="mf2-send" id="mf2Send"><svg viewBox="0 0 20 20" fill="none" width="18" height="18"><path d="M3 10l14-6-6 14-2-6-6-2z" fill="currentColor"/></svg></button>' +
        '</div>' +
        '<div class="mf2-human-row"><button class="mf2-human" id="mf2Human">' + HUMAN_ICON_SVG + '<span>Talk to a Representative →</span></button></div>' +
      '</div>' +
      '<a class="mf2-branding" href="https://mentalforge.ai" target="_blank" rel="noopener">' +
        '<span class="mf2-branding-mark">M</span>Powered by MentalForge AI' +
      '</a>';

    shadowRoot.appendChild(launch);
    shadowRoot.appendChild(panel);

    body = panel.querySelector('#mf2Body');
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
    launch.addEventListener('click', function () {
      panel.classList.toggle('open');
      clearDot();
      if (!opened) { opened = true; resumeOrStart(); }
    });
    panel.querySelector('.mf2-x').addEventListener('click', function () { panel.classList.remove('open'); });
    sendBtn.addEventListener('click', function () { send(); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    humanBtn.addEventListener('click', function () { startLiveChat(); });
    menuBtn.addEventListener('click', function () { menuPanel.classList.add('open'); });
    menuBack.addEventListener('click', function () { menuPanel.classList.remove('open'); });
    downloadBtn.addEventListener('click', downloadConversation);
    leaveBtn.addEventListener('click', leaveChat);
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

  function addBubble(role, text, ctaUrl, ctaLabel, silent) {
    var cls = role === 'user' ? 'user' : (role === 'rep' ? 'rep' : (role === 'system' ? 'system' : 'bot'));
    var row = document.createElement('div');
    row.className = 'mf2-row' + (role === 'user' ? ' user' : '');

    if (role !== 'system') {
      var av = document.createElement('div');
      av.className = 'mf2-av' + (role === 'rep' ? ' rep' : '');
      if (role === 'user') {
        av.textContent = 'You';
      } else if (role === 'rep') {
        av.textContent = currentAgentInitial;
      } else {
        av.innerHTML = BOT_ICON_SVG;
      }
      row.appendChild(av);
    }

    var col = document.createElement('div');
    var bub = document.createElement('div');
    bub.className = 'mf2-bub ' + cls;
    bub.textContent = text;
    col.appendChild(bub);

    if (ctaUrl) {
      var a = document.createElement('a');
      a.className = 'mf2-cta'; a.href = ctaUrl; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = ctaLabel || 'Learn more';
      col.appendChild(document.createElement('br'));
      col.appendChild(a);
    }
    row.appendChild(col);
    body.appendChild(row);
    scrollDown();
    if (!silent && (role === 'assistant' || role === 'rep')) showDot();
  }
  function addSystem(text) { addBubble('system', text, null, null, true); }

  // ---------- lead capture ----------
  var pendingLivePurpose = false;

  function showLeadForm(purpose) {
    pendingLivePurpose = purpose === 'live';
    var row = document.createElement('div'); row.className = 'mf2-row';
    var card = document.createElement('div'); card.className = 'mf2-lead';
    card.innerHTML =
      '<div style="font-weight:600;margin-bottom:6px;">Hi! Who am I speaking with?</div>' +
      (pendingLivePurpose ? '<div style="font-size:12px;color:#6E6A63;margin-bottom:8px;">So our team can follow up with you directly.</div>' : '') +
      '<input type="text" id="mf2Name" placeholder="Your name" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false">' +
      '<input type="text" id="mf2Contact" placeholder="Email or phone" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false">' +
      '<div class="mf2-err" id="mf2Err" style="display:none;"></div>' +
      '<button id="mf2LeadBtn">Continue</button>' +
      (pendingLivePurpose ? '' : '<span class="mf2-skip" id="mf2Skip">Skip for now</span>');
    row.appendChild(card); body.appendChild(row); scrollDown();

    card.querySelector('#mf2LeadBtn').addEventListener('click', function () {
      var name = card.querySelector('#mf2Name').value.trim();
      var contact = card.querySelector('#mf2Contact').value.trim();
      var errBox = card.querySelector('#mf2Err');
      errBox.style.display = 'none';
      if (!name) { errBox.textContent = 'Please enter your name.'; errBox.style.display = 'block'; return; }
      if (pendingLivePurpose && !contact) { errBox.textContent = 'Please enter your email or phone.'; errBox.style.display = 'block'; return; }

      var email = contact.indexOf('@') > -1 ? contact : '';
      var phone = contact.indexOf('@') === -1 ? contact : '';

      fetch(API_BASE + "/public/lead/" + businessId, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, phone: phone })
      }).catch(function () {}).finally(function () {
        state.leadCaptured = true;
        state.visitor = { name: name, email: email, phone: phone };
        saveState();
        row.remove();
        if (pendingLivePurpose) { actuallyStartLiveChat(); } else { startChat(); }
      });
    });

    var skipBtn = card.querySelector('#mf2Skip');
    if (skipBtn) {
      skipBtn.addEventListener('click', function () {
        state.leadCaptured = true; saveState(); row.remove(); startChat();
      });
    }
  }

  function resumeOrStart() {
    if (state.messages.length > 0) {
      state.messages.forEach(function (m) { addBubble(m.role, m.content, null, null, true); });
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
    addBubble('user', content, null, null, true);
    state.messages.push({ role: 'user', content: content });
    saveState();
    input.value = ''; input.style.height = 'auto';

    try {
      var res = await fetch(API_BASE + "/chat/" + businessId, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: state.messages.filter(function (m) { return m.role === 'user' || m.role === 'assistant'; }) })
      });
      var data = await res.json();
      var reply = data.reply || "Sorry, something went wrong. Please try again.";
      var cta = (config.ctaLinks && config.ctaLinks[0]) ? config.ctaLinks[0] : null;
      addBubble('assistant', reply, cta ? cta.url : null, cta ? cta.label : null);
      state.messages.push({ role: 'assistant', content: reply });
      saveState();
    } catch (e) {
      addBubble('assistant', "Sorry, something went wrong. Please try again.");
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
    state = { leadCaptured: false, visitor: { name: "", email: "", phone: "" }, messages: [], liveMode: false, chatId: null };
    seenMsgIds = {};
    socket = null;
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
      body: JSON.stringify(state.visitor)
    }).then(function (r) { return r.json(); })
      .then(function (data) {
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
        if (m.sender === 'system') {
          addSystem(m.text);
          state.messages.push({ role: 'system', content: m.text });
          if (m.repName) currentAgentInitial = m.repName.charAt(0).toUpperCase();
          saveState();
          return;
        }
        if (m.repName) currentAgentInitial = m.repName.charAt(0).toUpperCase();
        var role = m.sender === 'rep' ? 'rep' : 'user';
        addBubble(role, m.text, null, null, role === 'user');
        state.messages.push({ role: role, content: m.text });
        saveState();
      });

      socket.off('chat_updated');
      socket.on('chat_updated', function (chat) {
        if (chat.status === 'closed' && state.liveMode) {
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
    fetch(API_BASE + "/livechat/" + state.chatId + "/message", {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: 'visitor', text: content })
    });
  }
})();