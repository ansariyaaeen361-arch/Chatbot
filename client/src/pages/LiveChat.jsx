import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const API_ROOT = 'http://localhost:5000';

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
    <div style={styles.wrap}>
      <div style={styles.sidebar}>
        <div style={styles.tabs}>
          <button style={tab === 'waiting' ? styles.tabActive : styles.tab} onClick={() => setTab('waiting')}>Waiting ({waiting.length})</button>
          <button style={tab === 'active' ? styles.tabActive : styles.tab} onClick={() => setTab('active')}>Active ({active.length})</button>
          <button style={tab === 'closed' ? styles.tabActive : styles.tab} onClick={() => setTab('closed')}>Closed ({closed.length})</button>
        </div>
        <div style={styles.list}>
          {list.length === 0 && <div style={styles.empty}>Nothing here.</div>}
          {list.map(chat => (
            <div key={chat._id} style={styles.item} onClick={() => openChat(chat)}>
              <div style={styles.itemName}>{chat.visitorName}</div>
              <div style={styles.itemContact}>{chat.visitorEmail || chat.visitorPhone || 'no contact'}</div>
              {isAdmin && chat.assignedToName && <div style={styles.itemAgent}>Agent: {chat.assignedToName}</div>}
              {tab === 'waiting' && (
                <button style={styles.acceptBtn} onClick={(e) => { e.stopPropagation(); acceptChat(chat._id); }}>
                  Accept chat
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={styles.chatPanel}>
        {!selectedChat && <div style={styles.noChat}>Select a chat to view</div>}
        {selectedChat && (
          <>
            <div style={styles.chatHead}>
              <div>
                <div style={{ fontWeight: 600 }}>{selectedChat.visitorName}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{selectedChat.visitorEmail || selectedChat.visitorPhone}</div>
              </div>
              {selectedChat.status === 'active' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <select onChange={(e) => {
                    const [id, name] = e.target.value.split('|');
                    if (id) transferChat(id, name);
                  }} defaultValue="">
                    <option value="">Transfer to...</option>
                    {team.filter(t => t._id !== user.id).map(t => (
                      <option key={t._id} value={`${t._id}|${t.name}`}>{t.name}</option>
                    ))}
                  </select>
                  <button onClick={closeChat} style={styles.closeBtn}>Close chat</button>
                </div>
              )}
            </div>
            <div style={styles.chatBody} ref={bodyRef}>
              {messages.map((m, i) => (
                <div key={i} style={{ ...styles.msgRow, alignSelf: m.sender === 'rep' ? 'flex-end' : 'flex-start' }}>
                  {m.sender !== 'system' && <div style={styles.msgLabel}>{m.sender === 'rep' ? (m.repName || 'You') : 'Visitor'}</div>}
                  <div style={{
                    ...styles.msgBub,
                    background: m.sender === 'rep' ? '#1B1A18' : (m.sender === 'system' ? '#F2F2F2' : '#fff'),
                    color: m.sender === 'rep' ? '#fff' : (m.sender === 'system' ? '#666' : '#1B1A18'),
                    border: m.sender === 'visitor' ? '1px solid #E7E2D8' : 'none'
                  }}>{m.text}</div>
                </div>
              ))}
            </div>
            {selectedChat.status === 'active' && (
              <div style={styles.inputRow}>
                <input style={styles.input} value={msgInput} onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendReply()} placeholder="Type your reply…" />
                <button style={styles.sendBtn} onClick={sendReply}>Send</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrap: { display: 'flex', height: 'calc(100vh - 0px)', fontFamily: 'sans-serif' },
  sidebar: { width: 320, borderRight: '1px solid #E7E2D8', background: '#fff', display: 'flex', flexDirection: 'column' },
  tabs: { display: 'flex', borderBottom: '1px solid #E7E2D8' },
  tab: { flex: 1, padding: 12, border: 'none', background: '#fff', cursor: 'pointer', fontSize: 12.5 },
  tabActive: { flex: 1, padding: 12, border: 'none', background: '#1B1A18', color: '#fff', cursor: 'pointer', fontSize: 12.5 },
  list: { flex: 1, overflowY: 'auto' },
  empty: { padding: 16, fontSize: 12.5, color: '#999' },
  item: { padding: 12, borderBottom: '1px solid #F0EEE8', cursor: 'pointer' },
  itemName: { fontWeight: 600, fontSize: 13.5 },
  itemContact: { fontSize: 12, color: '#666' },
  itemAgent: { fontSize: 11, color: '#999', marginTop: 2 },
  acceptBtn: { marginTop: 6, width: '100%', background: '#1B1A18', color: '#fff', border: 'none', padding: 6, borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  chatPanel: { flex: 1, display: 'flex', flexDirection: 'column', background: '#FBFAF7' },
  noChat: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' },
  chatHead: { padding: 14, borderBottom: '1px solid #E7E2D8', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { background: '#F2F2F2', border: 'none', padding: '6px 12px', borderRadius: 7, cursor: 'pointer' },
  chatBody: { flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 },
  msgRow: { display: 'flex', flexDirection: 'column', maxWidth: '70%' },
  msgLabel: { fontSize: 10.5, color: '#999', marginBottom: 2 },
  msgBub: { padding: '9px 13px', borderRadius: 12, fontSize: 14 },
  inputRow: { borderTop: '1px solid #E7E2D8', padding: 12, background: '#fff', display: 'flex', gap: 8 },
  input: { flex: 1, padding: 10, border: '1px solid #E7E2D8', borderRadius: 9, fontSize: 14 },
  sendBtn: { background: '#1B1A18', color: '#fff', border: 'none', padding: '0 18px', borderRadius: 9, cursor: 'pointer', fontWeight: 600 }
};