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
        <div style={s.tabs}>
          <button style={tab === 'waiting' ? s.tabActive : s.tab} onClick={() => setTab('waiting')}>Waiting ({waiting.length})</button>
          <button style={tab === 'active' ? s.tabActive : s.tab} onClick={() => setTab('active')}>Active ({active.length})</button>
          <button style={tab === 'closed' ? s.tabActive : s.tab} onClick={() => setTab('closed')}>Closed ({closed.length})</button>
        </div>
        <div style={s.list}>
          {list.length === 0 && <div style={s.empty}>Nothing here.</div>}
          {list.map(chat => (
            <div key={chat._id} style={selectedChat?._id === chat._id ? { ...s.item, ...s.itemActive } : s.item} onClick={() => openChat(chat)}>
              <div style={s.itemName}>{chat.visitorName}</div>
              <div style={s.itemContact}>{chat.visitorEmail || chat.visitorPhone || 'no contact'}</div>
              {isAdmin && chat.assignedToName && <div style={s.itemAgent}>Agent: {chat.assignedToName}</div>}
              {tab === 'waiting' && (
                <button style={s.acceptBtn} onClick={(e) => { e.stopPropagation(); acceptChat(chat._id); }}>
                  Accept chat
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={s.chatPanel}>
        {!selectedChat && <div style={s.noChat}>Select a chat to view</div>}
        {selectedChat && (
          <>
            <div style={s.chatHead}>
              <div>
                <div style={s.chatHeadName}>{selectedChat.visitorName}</div>
                <div style={s.chatHeadContact}>{selectedChat.visitorEmail || selectedChat.visitorPhone}</div>
              </div>
              {selectedChat.status === 'active' && (
                <div style={{ display: 'flex', gap: 8 }}>
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
                  {m.sender !== 'system' && <div style={s.msgLabel}>{m.sender === 'rep' ? (m.repName || 'You') : 'Visitor'}</div>}
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

  listPanel: { width: 320, flex: '0 0 auto', borderRight: `1px solid ${color.border}`, background: color.surface, display: 'flex', flexDirection: 'column' },
  tabs: { display: 'flex', borderBottom: `1px solid ${color.border}` },
  tab: { flex: 1, padding: 12, border: 'none', background: color.surface, color: color.inkSoft, cursor: 'pointer', fontSize: 12.5, fontWeight: 600 },
  tabActive: { flex: 1, padding: 12, border: 'none', background: color.accent, color: '#fff', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 },
  list: { flex: 1, overflowY: 'auto' },
  empty: { padding: 16, fontSize: 12.5, color: color.inkFaint },
  item: { padding: 12, borderBottom: `1px solid ${color.borderSoft}`, cursor: 'pointer' },
  itemActive: { background: color.accentSoft },
  itemName: { fontWeight: 600, fontSize: 13.5, color: color.ink },
  itemContact: { fontSize: 12, color: color.inkSoft },
  itemAgent: { fontSize: 11, color: color.inkFaint, marginTop: 2 },
  acceptBtn: { marginTop: 6, width: '100%', background: color.accent, color: '#fff', border: 'none', padding: 7, borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600 },

  chatPanel: { flex: 1, display: 'flex', flexDirection: 'column', background: color.bg },
  noChat: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color.inkFaint, fontSize: 13.5 },
  chatHead: { padding: 14, borderBottom: `1px solid ${color.border}`, background: color.surface, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  chatHeadName: { fontWeight: 600, fontSize: 14, color: color.ink },
  chatHeadContact: { fontSize: 12, color: color.inkSoft },
  transferSelect: { width: 150 },
  closeBtn: { background: color.borderSoft, border: 'none', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: color.ink },

  chatBody: { flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 },
  msgRow: { display: 'flex', flexDirection: 'column', maxWidth: '68%' },
  msgLabel: { fontSize: 10.5, color: color.inkFaint, marginBottom: 3 },
  msgBubRep: { padding: '10px 14px', borderRadius: 12, fontSize: 13.5, background: color.accent, color: '#fff' },
  msgBubVisitor: { padding: '10px 14px', borderRadius: 12, fontSize: 13.5, background: color.surface, color: color.ink, border: `1px solid ${color.border}` },
  msgBubSystem: { padding: '10px 14px', borderRadius: 12, fontSize: 13.5, background: color.borderSoft, color: color.inkSoft },

  inputRow: { borderTop: `1px solid ${color.border}`, padding: 14, background: color.surface, display: 'flex', gap: 10 },
  input: { flex: 1 },
  sendBtn: { padding: '0 22px', fontWeight: 600, borderRadius: 9, minHeight: 40 },
};