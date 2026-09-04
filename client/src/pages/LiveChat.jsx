import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import BackToDashboard from '../components/BackToDashboard';
import { color, globalStyles } from '../theme';

const API_ROOT = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');

const PREDEFINED_MESSAGES = [
  { id: 'welcome', label: "Welcome", icon: WaveIcon, text: "Hello! Welcome to support. How can I assist you today?" },
  { id: 'account', label: "Account Info", icon: ContactIcon, text: "Could you please share your account email or order ID so I can look into this for you?" },
  { id: 'hold', label: "Please Wait", icon: ClockIcon, text: "Please give me a moment while I review your details and investigate this." },
  { id: 'pricing', label: "Pricing & Plans", icon: PricingIcon, text: "You can view all our subscription plans and pricing details directly on our billing page." },
  { id: 'tech', label: "Tech Escalation", icon: TechIcon, text: "I am escalating this ticket to our technical support team for further investigation." },
  { id: 'feature', label: "Feature Request", icon: StarIcon, text: "Thank you for the suggestion! I've logged this feature request for our product team." },
  { id: 'refund', label: "Refund / Billing", icon: ShieldCheckIcon, text: "Our billing team will review your request and process it within 1-2 business days." },
  { id: 'docs', label: "Help Guides / Docs", icon: BookOpenIcon, text: "You can find detailed step-by-step guides and FAQs in our online help documentation." },
  { id: 'followup', label: "Anything Else?", icon: QuestionIcon, text: "Is there anything else I can help you with today?" },
  { id: 'closing', label: "Thank You", icon: CheckCircleIcon, text: "Thank you for contacting our support team! Have a great day ahead." },
];

export default function LiveChat() {
  const { user, businessId } = useAuth();
  const [tab, setTab] = useState('waiting');
  const [waiting, setWaiting] = useState([]);
  const [active, setActive] = useState([]);
  const [closed, setClosed] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const [team, setTeam] = useState([]);
  const socketRef = useRef(null);
  const bodyRef = useRef(null);
  const beepIntervalRef = useRef(null);
  const typingTimerRef = useRef(null);

  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  useEffect(() => {
    api.get('/business/team').then(res => setTeam(res.data));
    loadAll();

    socketRef.current = io(API_ROOT);
    socketRef.current.emit('join_business', businessId);
    socketRef.current.on('refresh', loadAll);

    return () => socketRef.current.disconnect();
  }, []);

  useEffect(() => {
    if (waiting.length > 0) {
      if (!beepIntervalRef.current) {
        playBeep();
        beepIntervalRef.current = setInterval(playBeep, 2000);
      }
    } else {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
  }, [waiting]);

  function playBeep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      [700, 900].forEach((freq, i) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = freq;
        osc.connect(gain); gain.connect(ctx.destination);
        const start = ctx.currentTime + i * 0.13;
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(0.2, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.13);
        osc.start(start); osc.stop(start + 0.15);
      });
    } catch (e) {}
  }

  function loadAll() {
    api.get(`/livechat/business/${businessId}?status=waiting`).then(res => setWaiting(res.data));
    api.get(`/livechat/business/${businessId}?status=active`).then(res => setActive(res.data));
    api.get(`/livechat/business/${businessId}?status=closed`).then(res => setClosed(res.data));
  }

  function openChat(chat) {
    setSelectedChat(chat);
    api.get(`/livechat/${chat._id}/messages`).then(res => setMessages(res.data));

    socketRef.current.emit('join_chat', chat._id);
    socketRef.current.off('new_message');
    socketRef.current.on('new_message', (m) => {
      setMessages(prev => [...prev, m]);
    });
  }

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages]);

  // ─── Date/Time Helpers ──────────────────────────────────────────────────────
  function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatDateDivider(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  }

  function isSameDay(ts1, ts2) {
    if (!ts1 || !ts2) return false;
    const a = new Date(ts1), b = new Date(ts2);
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  async function acceptChat(chatId) {
    try {
      const res = await api.post(`/livechat/${chatId}/accept`);
      loadAll();
      openChat(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to accept chat');
    }
  }

  async function sendReply(customText) {
    const text = (typeof customText === 'string' ? customText : msgInput).trim();
    if (!text || !selectedChat) return;
    if (typeof customText !== 'string') setMsgInput('');
    // Clear typing timer when message is sent
    clearTimeout(typingTimerRef.current);
    await api.post(`/livechat/${selectedChat._id}/message`, {
      sender: 'rep', text, repName: user.name
    });
  }

  function handleMsgInputChange(val) {
    setMsgInput(val);
    if (!selectedChat || !socketRef.current) return;
    // Emit agent_typing with debounce — only once per burst of keystrokes
    clearTimeout(typingTimerRef.current);
    socketRef.current.emit('agent_typing', selectedChat._id);
    typingTimerRef.current = setTimeout(() => {}, 3000);
  }

  async function closeChat() {
    if (!confirm('Close this chat?')) return;
    await api.post(`/livechat/${selectedChat._id}/close`);
    setSelectedChat(null);
    loadAll();
  }

  async function transferChat(newUserId, newUserName) {
    await api.post(`/livechat/${selectedChat._id}/transfer`, { newUserId, newUserName });
    loadAll();
  }

  const list = tab === 'waiting' ? waiting : tab === 'active' ? active : closed;

  // Hover time tooltip style (injected via <style> tag)
  const hoverTimeCSS = `
    .mf-msg-wrap { position: relative; }
    .mf-msg-time { display: none; position: absolute; bottom: -20px; font-size: 10.5px; color: #9A9AB0;
      white-space: nowrap; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.02em; pointer-events: none; }
    .mf-msg-wrap:hover .mf-msg-time { display: block; }
  `;

  return (
    <div style={s.wrap} className="forge-shell">
      <style>{globalStyles}</style>
      <style>{hoverTimeCSS}</style>
      <Sidebar />

      <div style={s.listPanel} className="forge-livechat-list">
        <div style={{ padding: '12px 14px 0' }}>
          <BackToDashboard />
        </div>
        <div style={s.tabsWrap}>
          <div style={s.tabs}>
            <button style={{ ...s.tab, ...(tab === 'waiting' ? s.tabActive : {}) }} onClick={() => setTab('waiting')}>Waiting ({waiting.length})</button>
            <button style={{ ...s.tab, ...(tab === 'active' ? s.tabActive : {}) }} onClick={() => setTab('active')}>Active ({active.length})</button>
            <button style={{ ...s.tab, ...(tab === 'closed' ? s.tabActive : {}) }} onClick={() => setTab('closed')}>Closed ({closed.length})</button>
          </div>
        </div>
        <div style={s.list}>
          {list.length === 0 && <div style={s.empty}>Nothing here.</div>}
          {list.map(chat => (
            <div
              key={chat._id}
              className="forge-ghost"
              style={selectedChat?._id === chat._id ? { ...s.item, ...s.itemActive } : s.item}
              onClick={() => openChat(chat)}
            >
              <div style={s.itemAvatar}>{(chat.visitorName || '?').charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.itemName}>{chat.visitorName}</div>
                <div style={s.itemContact}>{chat.visitorEmail || chat.visitorPhone || 'No contact info'}</div>
                {isAdmin && chat.assignedToName && <div style={s.itemAgent}>Agent: {chat.assignedToName}</div>}
                {tab === 'waiting' && (
                  <button className="forge-btn-primary" style={s.acceptBtn} onClick={(e) => { e.stopPropagation(); acceptChat(chat._id); }}>
                    Accept chat
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={s.chatPanel} className="forge-livechat-chat">
        {!selectedChat && <div style={s.noChat}>Select a chat from the list to view the conversation</div>}
        {selectedChat && (
          <>
            <div style={s.chatHead}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={s.chatHeadAvatar}>{(selectedChat.visitorName || '?').charAt(0).toUpperCase()}</div>
                <div>
                  <div style={s.chatHeadName}>{selectedChat.visitorName}</div>
                  <div style={s.chatHeadContact}>{selectedChat.visitorEmail || selectedChat.visitorPhone}</div>
                </div>
              </div>
              {selectedChat.status === 'active' && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <select className="forge-input" style={s.transferSelect} onChange={(e) => {
                    const [id, name] = e.target.value.split('|');
                    if (id) transferChat(id, name);
                  }} defaultValue="">
                    <option value="">Transfer to…</option>
                    {team.filter(t => t._id !== user.id).map(t => (
                      <option key={t._id} value={`${t._id}|${t.name}`}>{t.name}</option>
                    ))}
                  </select>
                  <button className="forge-ghost" onClick={closeChat} style={s.closeBtn}>Close chat</button>
                </div>
              )}
            </div>
            <div style={s.chatBody} ref={bodyRef}>
              {messages.map((m, i) => {
                const ts = m.timestamp || m.createdAt;
                const prevTs = i > 0 ? (messages[i - 1].timestamp || messages[i - 1].createdAt) : null;
                const showDivider = !isSameDay(ts, prevTs);
                const timeLabel = formatTime(ts);
                const isRep = m.sender === 'rep';
                const isSystem = m.sender === 'system';
                return (
                  <>
                    {showDivider && ts && (
                      <div key={`div-${i}`} style={s.dateDivider}>
                        <span style={s.dateDividerLine} />
                        <span style={s.dateDividerText}>{formatDateDivider(ts)}</span>
                        <span style={s.dateDividerLine} />
                      </div>
                    )}
                    <div key={i} style={{ ...s.msgRow, alignSelf: isRep ? 'flex-end' : 'flex-start' }}>
                      {!isSystem && <div style={{ ...s.msgLabel, textAlign: isRep ? 'right' : 'left' }}>{isRep ? (m.repName || 'You') : 'Visitor'}</div>}
                      <div style={{ position: 'relative' }} className="mf-msg-wrap">
                        <div style={
                          isRep ? s.msgBubRep :
                          isSystem ? s.msgBubSystem :
                          s.msgBubVisitor
                        }>{m.text}</div>
                        {timeLabel && (
                          <div className="mf-msg-time" style={{ ...s.msgTime, [isRep ? 'right' : 'left']: 0 }}>
                            {timeLabel}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })}
            </div>
            {selectedChat.status === 'active' && (
              <>
                <div style={s.quickRepliesSection}>
                  <div style={s.quickRepliesHeader}>
                    <div style={s.quickRepliesTitleGroup}>
                      <ZapIcon />
                      <span style={s.quickRepliesLabel}>QUICK REPLIES ({PREDEFINED_MESSAGES.length} TEMPLATES - CLICK TO SEND)</span>
                    </div>
                  </div>
                  <div className="forge-quick-scroll" style={s.quickRepliesList}>
                    {PREDEFINED_MESSAGES.map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className="forge-quick-chip"
                          style={s.quickChip}
                          onClick={() => sendReply(item.text)}
                          title={`Click to send: "${item.text}"`}
                        >
                          <IconComponent />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={s.inputRow}>
                  <input className="forge-input" style={s.input} value={msgInput} onChange={e => handleMsgInputChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendReply()} placeholder="Type your reply…" />
                  <button className="forge-btn-primary" style={s.sendBtn} onClick={() => sendReply()}>Send</button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function WaveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
      <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6" />
      <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
      <path d="M18 8a2 2 0 0 1 2 2v4a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.83l1.17 1.17V6" />
    </svg>
  );
}

function ContactIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M15 8h2" />
      <path d="M15 12h2" />
      <path d="M7 16c0-1.5 1.5-2.5 3-2.5s3 1 3 2.5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PricingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function TechIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function BookOpenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

const s = {
  wrap: { display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', 'Segoe UI', sans-serif", background: color.bg, color: color.ink },

  listPanel: { width: 340, flex: '0 0 auto', height: '100%', borderRight: `1px solid ${color.border}`, background: color.surface, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  tabsWrap: { padding: 14, borderBottom: `1px solid ${color.border}`, flexShrink: 0 },
  tabs: { display: 'flex', background: color.bg, borderRadius: 10, padding: 4, gap: 4 },
  tab: { flex: 1, border: 'none', background: 'none', padding: '9px 8px', borderRadius: 8, color: color.inkSoft, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", transition: 'background .15s ease, color .15s ease' },
  tabActive: { background: color.surface, color: color.ink, boxShadow: '0 1px 4px rgba(26,27,46,.10)' },
  list: { flex: 1, overflowY: 'auto' },
  empty: { padding: 24, fontSize: 12.5, color: color.inkFaint, textAlign: 'center' },
  item: { padding: '14px 16px', borderBottom: `1px solid ${color.borderSoft}`, cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start' },
  itemActive: { background: color.accentSoft },
  itemAvatar: { width: 36, height: 36, borderRadius: '50%', background: color.accentSoft, color: color.accentDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13.5, flex: '0 0 auto', fontFamily: "'Space Grotesk', sans-serif" },
  itemName: { fontWeight: 600, fontSize: 13.5, color: color.ink, fontFamily: "'Space Grotesk', sans-serif" },
  itemContact: { fontSize: 12, color: color.inkSoft, marginTop: 1 },
  itemAgent: { fontSize: 11, color: color.inkFaint, marginTop: 3 },
  acceptBtn: { marginTop: 8, width: '100%', background: color.accent, color: '#fff', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 },

  chatPanel: { flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', background: color.bg, overflow: 'hidden' },
  noChat: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color.inkFaint, fontSize: 13.5, padding: '0 40px', textAlign: 'center' },
  chatHead: { padding: '16px 22px', borderBottom: `1px solid ${color.border}`, background: color.surface, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 },
  chatHeadAvatar: { width: 38, height: 38, borderRadius: '50%', background: color.accentSoft, color: color.accentDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flex: '0 0 auto', fontFamily: "'Space Grotesk', sans-serif" },
  chatHeadName: { fontWeight: 700, fontSize: 15, color: color.ink, fontFamily: "'Space Grotesk', sans-serif" },
  chatHeadContact: { fontSize: 12, color: color.inkSoft, marginTop: 1 },
  transferSelect: { width: 170, boxSizing: 'border-box', padding: '9px 12px', border: `1px solid ${color.border}`, borderRadius: 9, fontSize: 12.5, fontFamily: 'inherit', background: '#FBFBFD', color: color.ink, cursor: 'pointer' },
  closeBtn: { background: color.borderSoft, border: 'none', padding: '9px 16px', borderRadius: 9, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: color.danger },

  chatBody: { flex: 1, minHeight: 0, overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 14, background: color.bg },
  msgRow: { display: 'flex', flexDirection: 'column', maxWidth: '65%' },
  msgLabel: { fontSize: 10.5, color: color.inkFaint, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.02em' },
  msgBubRep: { padding: '11px 15px', borderRadius: 14, borderTopRightRadius: 4, fontSize: 13.5, lineHeight: 1.5, background: color.accent, color: '#fff', boxShadow: '0 2px 8px rgba(91,91,214,.20)' },
  msgBubVisitor: { padding: '11px 15px', borderRadius: 14, borderTopLeftRadius: 4, fontSize: 13.5, lineHeight: 1.5, background: color.surface, color: color.ink, border: `1px solid ${color.border}`, boxShadow: '0 1px 3px rgba(26,27,46,.04)' },
  msgBubSystem: { padding: '9px 14px', borderRadius: 10, fontSize: 12, background: color.borderSoft, color: color.inkSoft },

  dateDivider: { display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0 2px', width: '100%' },
  dateDividerLine: { flex: 1, height: 1, background: color.border },
  dateDividerText: { fontSize: 11, color: color.inkFaint, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap', letterSpacing: '0.03em', padding: '0 4px' },
  msgTime: { position: 'absolute', bottom: -20, fontSize: 10.5, color: '#9A9AB0', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.02em' },

  quickRepliesSection: { borderTop: `1px solid ${color.border}`, padding: '8px 18px 6px', background: color.surface, display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 },
  quickRepliesHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  quickRepliesTitleGroup: { display: 'flex', alignItems: 'center', gap: 6, color: color.accentDeep },
  quickRepliesLabel: { fontSize: 10.5, fontWeight: 700, color: color.accentDeep, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em' },
  quickRepliesList: { display: 'flex', gap: 8, overflowX: 'auto', overflowY: 'hidden', paddingBottom: 6, whiteSpace: 'nowrap' },
  quickChip: { display: 'inline-flex', alignItems: 'center', gap: 6, background: color.accentSoft, color: color.accentDeep, border: `1px solid ${color.accentLight}AA`, borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif", flexShrink: 0 },

  inputRow: { borderTop: `1px solid ${color.border}`, padding: 16, background: color.surface, display: 'flex', gap: 10, flexShrink: 0 },
  input: { flex: 1, boxSizing: 'border-box', height: 42, padding: '0 14px', border: `1px solid ${color.border}`, borderRadius: 10, fontSize: 13.5, fontFamily: 'inherit', background: '#FBFBFD', color: color.ink },
  sendBtn: { boxSizing: 'border-box', height: 42, padding: '0 24px', fontWeight: 600, borderRadius: 10, fontSize: 13.5, background: color.accent, color: '#fff', border: 'none', cursor: 'pointer' },
};