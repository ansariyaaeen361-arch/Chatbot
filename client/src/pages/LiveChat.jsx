import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import { color, globalStyles } from '../theme';

const API_ROOT = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');

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

  async function acceptChat(chatId) {
    try {
      const res = await api.post(`/livechat/${chatId}/accept`);
      loadAll();
      openChat(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to accept chat');
    }
  }

  async function sendReply() {
    const text = msgInput.trim();
    if (!text || !selectedChat) return;
    setMsgInput('');
    await api.post(`/livechat/${selectedChat._id}/message`, {
      sender: 'rep', text, repName: user.name
    });
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

  return (
    <div style={s.wrap} className="forge-shell">
      <style>{globalStyles}</style>
      <Sidebar />

      <div style={s.listPanel}>
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

      <div style={s.chatPanel}>
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
              {messages.map((m, i) => (
                <div key={i} style={{ ...s.msgRow, alignSelf: m.sender === 'rep' ? 'flex-end' : 'flex-start' }}>
                  {m.sender !== 'system' && <div style={{ ...s.msgLabel, textAlign: m.sender === 'rep' ? 'right' : 'left' }}>{m.sender === 'rep' ? (m.repName || 'You') : 'Visitor'}</div>}
                  <div style={
                    m.sender === 'rep' ? s.msgBubRep :
                    m.sender === 'system' ? s.msgBubSystem :
                    s.msgBubVisitor
                  }>{m.text}</div>
                </div>
              ))}
            </div>
            {selectedChat.status === 'active' && (
              <div style={s.inputRow}>
                <input className="forge-input" style={s.input} value={msgInput} onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendReply()} placeholder="Type your reply…" />
                <button className="forge-btn-primary" style={s.sendBtn} onClick={sendReply}>Send</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  wrap: { display: 'flex', height: '100vh', fontFamily: "'Inter', 'Segoe UI', sans-serif", background: color.bg, color: color.ink },

  listPanel: { width: 340, flex: '0 0 auto', borderRight: `1px solid ${color.border}`, background: color.surface, display: 'flex', flexDirection: 'column' },
  tabsWrap: { padding: 14, borderBottom: `1px solid ${color.border}` },
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

  chatPanel: { flex: 1, display: 'flex', flexDirection: 'column', background: color.bg },
  noChat: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color.inkFaint, fontSize: 13.5, padding: '0 40px', textAlign: 'center' },
  chatHead: { padding: '16px 22px', borderBottom: `1px solid ${color.border}`, background: color.surface, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  chatHeadAvatar: { width: 38, height: 38, borderRadius: '50%', background: color.accentSoft, color: color.accentDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flex: '0 0 auto', fontFamily: "'Space Grotesk', sans-serif" },
  chatHeadName: { fontWeight: 700, fontSize: 15, color: color.ink, fontFamily: "'Space Grotesk', sans-serif" },
  chatHeadContact: { fontSize: 12, color: color.inkSoft, marginTop: 1 },
  transferSelect: { width: 170, boxSizing: 'border-box', padding: '9px 12px', border: `1px solid ${color.border}`, borderRadius: 9, fontSize: 12.5, fontFamily: 'inherit', background: '#FBFBFD', color: color.ink, cursor: 'pointer' },
  closeBtn: { background: color.borderSoft, border: 'none', padding: '9px 16px', borderRadius: 9, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: color.danger },

  chatBody: { flex: 1, overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 14, background: color.bg },
  msgRow: { display: 'flex', flexDirection: 'column', maxWidth: '65%' },
  msgLabel: { fontSize: 10.5, color: color.inkFaint, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.02em' },
  msgBubRep: { padding: '11px 15px', borderRadius: 14, borderTopRightRadius: 4, fontSize: 13.5, lineHeight: 1.5, background: color.accent, color: '#fff', boxShadow: '0 2px 8px rgba(91,91,214,.20)' },
  msgBubVisitor: { padding: '11px 15px', borderRadius: 14, borderTopLeftRadius: 4, fontSize: 13.5, lineHeight: 1.5, background: color.surface, color: color.ink, border: `1px solid ${color.border}`, boxShadow: '0 1px 3px rgba(26,27,46,.04)' },
  msgBubSystem: { padding: '9px 14px', borderRadius: 10, fontSize: 12, background: color.borderSoft, color: color.inkSoft },

  inputRow: { borderTop: `1px solid ${color.border}`, padding: 16, background: color.surface, display: 'flex', gap: 10 },
  input: { flex: 1, boxSizing: 'border-box', height: 42, padding: '0 14px', border: `1px solid ${color.border}`, borderRadius: 10, fontSize: 13.5, fontFamily: 'inherit', background: '#FBFBFD', color: color.ink },
  sendBtn: { boxSizing: 'border-box', height: 42, padding: '0 24px', fontWeight: 600, borderRadius: 10, fontSize: 13.5, background: color.accent, color: '#fff', border: 'none', cursor: 'pointer' },
};