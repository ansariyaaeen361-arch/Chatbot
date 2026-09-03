import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import BackToDashboard from "../components/BackToDashboard";
import api from "../api/axios";
import { color, layout, globalStyles } from "../theme";

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [topQuestions, setTopQuestions] = useState([]);
  const [leads, setLeads] = useState([]);
  const [missedFaqs, setMissedFaqs] = useState([]);
  const [agentStats, setAgentStats] = useState([]);
  const [promotingIndex, setPromotingIndex] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [expandedLeadId, setExpandedLeadId] = useState(null);
  const [leadConversations, setLeadConversations] = useState({});
  const [loadingConversation, setLoadingConversation] = useState(null);

  useEffect(() => {
    api.get("/analytics/overview").then((res) => setOverview(res.data)).catch((err) => {
      if (err.response?.status === 403) setBlocked(true);
    });
    api.get("/analytics/top-questions").then((res) => setTopQuestions(res.data)).catch(() => {});
    api.get("/analytics/leads").then((res) => setLeads(res.data)).catch(() => {});
    api.get("/analytics/missed-faqs").then((res) => setMissedFaqs(res.data)).catch(() => {});
    api.get("/analytics/agent-stats").then((res) => setAgentStats(res.data)).catch(() => {});
  }, []);

  const toggleLeadConversation = async (leadId) => {
    if (expandedLeadId === leadId) {
      setExpandedLeadId(null);
      return;
    }
    setExpandedLeadId(leadId);
    if (leadConversations[leadId]) return;
    setLoadingConversation(leadId);
    try {
      const res = await api.get(`/analytics/leads/${leadId}/conversation`);
      setLeadConversations((prev) => ({ ...prev, [leadId]: res.data }));
    } catch {
      setLeadConversations((prev) => ({ ...prev, [leadId]: { messages: [], note: "Could not load this conversation." } }));
    } finally {
      setLoadingConversation(null);
    }
  };

  const promoteToFaq = async (item, index) => {
    setPromotingIndex(index);
    try {
      await api.post("/business/faqs/promote", { question: item.question, answer: item.suggestedAnswer });
      setMissedFaqs((prev) => prev.filter((_, i) => i !== index));
    } finally {
      setPromotingIndex(null);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get("/analytics/leads/export", { responseType: "blob" });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "leads.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (blocked) {
    return (
      <div style={s.shell} className="forge-shell">
        <style>{globalStyles}</style>
        <Sidebar />
        <main style={layout.main(760)} className="forge-main">
          <BackToDashboard />
          <header style={s.header}>
            <div style={s.eyebrow}>Insights</div>
            <h1 style={s.title}>Analytics</h1>
          </header>
          <div className="forge-card" style={s.card}>
            <h2 style={s.cardTitle}>Analytics dashboard</h2>
            <p style={s.cardDesc}>Analytics is available on Growth and Pro plans.</p>
            <Link to="/billing" className="forge-btn-primary" style={s.primaryBtn}>Upgrade your plan →</Link>
          </div>
        </main>
      </div>
    );
  }

  if (!overview) {
    return (
      <div style={s.shell} className="forge-shell">
        <style>{globalStyles}</style>
        <Sidebar />
        <main style={layout.main(760)} className="forge-main">
          <div style={s.loadingText}>Loading analytics…</div>
        </main>
      </div>
    );
  }

  return (
    <div style={s.shell} className="forge-shell">
      <style>{globalStyles}</style>
      <Sidebar />

      <main style={layout.main(760)} className="forge-main">
        <BackToDashboard />
        <header style={s.header}>
          <div style={s.eyebrow}>Insights</div>
          <h1 style={s.title}>Analytics</h1>
          <p style={s.subtitle}>Last {overview.periodDays} days of activity.</p>
        </header>

        {/* ---- Stat cards ---- */}
        <div style={s.statsGrid}>
          <StatCard label="Total messages" value={overview.totalMessages} />
          <StatCard label="Answered by FAQ" value={overview.faqCount} sub={`${overview.faqRate}% of all messages`} highlight />
          <StatCard label="Answered by AI" value={overview.aiCount} />
          <StatCard label="Leads captured" value={overview.leadCount} />
          <StatCard label="Conversion rate" value={`${overview.conversionRate}%`} sub={`${overview.leadCount} of ${overview.conversationCount} conversations`} />
          <StatCard label="Live chats started" value={overview.liveChatCount} />
          <StatCard
            label="Avg. response time"
            value={formatResponseTime(overview.avgResponseSeconds)}
            sub={overview.respondedChatsCount > 0 ? `Based on ${overview.respondedChatsCount} chats` : "No data yet"}
          />
        </div>

        {/* ---- Top questions ---- */}
        <div className="forge-card" style={s.card}>
          <h2 style={s.cardTitle}>Most asked questions</h2>
          {topQuestions.length === 0 && <p style={s.cardDesc}>No questions yet.</p>}
          <div style={s.questionList}>
            {topQuestions.map((q, i) => (
              <div key={i} style={s.questionRow}>
                <span style={s.questionText}>{q.question}</span>
                <span style={s.questionCount}>{q.count}×</span>
              </div>
            ))}
          </div>
        </div>

        {/* ---- Missed FAQ suggestions ---- */}
        {missedFaqs.length > 0 && (
          <div className="forge-card" style={s.card}>
            <h2 style={s.cardTitle}>Missed FAQ suggestions</h2>
            <p style={s.cardDesc}>Questions the AI keeps answering that aren't in your FAQs yet. Add them for an instant, free reply next time.</p>
            <div style={s.missedList}>
              {missedFaqs.map((item, i) => (
                <div key={i} style={s.missedRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.missedQuestion}>{item.question}</div>
                    <div style={s.missedAnswer}>{item.suggestedAnswer}</div>
                    <div style={s.missedCount}>Asked {item.count}× in the last 30 days</div>
                  </div>
                  <button
                    className="forge-btn-primary"
                    style={{ ...s.primaryBtn, ...s.missedAddBtn }}
                    onClick={() => promoteToFaq(item, i)}
                    disabled={promotingIndex === i}
                  >
                    {promotingIndex === i ? "Adding…" : "+ Add as FAQ"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- Team performance ---- */}
        {agentStats.length > 0 && (
          <div className="forge-card" style={s.card}>
            <h2 style={s.cardTitle}>Team performance</h2>
            <p style={s.cardDesc}>Live chats handled by each teammate in the last 30 days.</p>
            <div style={s.agentList}>
              {agentStats.map((a) => (
                <div key={a.agentId} style={s.agentRow}>
                  <div style={s.agentAvatar}>{a.agentName.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.agentName}>{a.agentName}</div>
                    <div style={s.agentSub}>{a.chatsHandled} chats · {a.resolvedCount} resolved</div>
                  </div>
                  <div style={s.agentResponseTime}>{formatResponseTime(a.avgResponseSeconds)}<span style={s.agentResponseLabel}>avg. response</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- Leads ---- */}
        <div className="forge-card" style={s.card}>
          <div style={s.leadsHeader}>
            <h2 style={s.cardTitle}>Leads ({leads.length})</h2>
            <button className="forge-ghost" style={s.ghostBtn} onClick={exportCsv} disabled={exporting}>
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          </div>
          <div style={s.leadsList}>
            {leads.map((l) => {
              const isOpen = expandedLeadId === l._id;
              const convo = leadConversations[l._id];
              return (
                <div key={l._id}>
                  <button className="forge-ghost" style={s.leadRow} onClick={() => toggleLeadConversation(l._id)}>
                    <div style={s.leadAvatar}>{l.name.charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={s.leadName}>{l.name}</div>
                      <div style={s.leadContact}>{l.email || l.phone || "—"}</div>
                    </div>
                    <div style={s.leadDate}>{new Date(l.createdAt).toLocaleDateString()}</div>
                    <span style={{ ...s.leadChevron, transform: isOpen ? "rotate(180deg)" : "none" }}>⌄</span>
                  </button>

                  {isOpen && (
                    <div style={s.leadConvoBox}>
                      {loadingConversation === l._id && <div style={s.leadConvoNote}>Loading…</div>}
                      {convo && convo.messages.length === 0 && (
                        <div style={s.leadConvoNote}>{convo.note || "No conversation linked to this lead yet."}</div>
                      )}
                      {convo && convo.messages.map((m, i) => (
                        <div key={i} style={m.role === "visitor" ? s.leadMsgVisitor : s.leadMsgBot}>
                          <span style={s.leadMsgRole}>{m.role === "visitor" ? l.name : "Bot"}</span>
                          {m.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {leads.length === 0 && <p style={s.cardDesc}>No leads captured yet.</p>}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, sub, highlight }) {
  return (
    <div style={{ ...s.statCard, ...(highlight ? s.statCardHighlight : {}) }}>
      <div style={{ ...s.statValue, ...(highlight ? s.statValueHighlight : {}) }}>{value}</div>
      <div style={s.statLabel}>{label}</div>
      {sub && <div style={{ ...s.statSub, ...(highlight ? {} : { color: color.inkFaint }) }}>{sub}</div>}
    </div>
  );
}

function formatResponseTime(seconds) {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  return `${hours}h`;
}

const s = {
  shell: layout.shell,
  header: { margin: "0 0 24px" },
  eyebrow: { fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: color.inkFaint, fontWeight: 600, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" },
  title: { fontSize: 25, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em", fontFamily: "'Space Grotesk', sans-serif" },
  subtitle: { fontSize: 13.5, color: color.inkSoft, margin: 0 },

  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 },
  statCard: { background: color.surface, border: `1px solid ${color.border}`, borderRadius: 12, padding: 16 },
  statCardHighlight: { background: color.accentSoft, border: `1px solid ${color.accent}33` },
  statValue: { fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: color.ink },
  statValueHighlight: { color: color.accentDeep },
  statLabel: { fontSize: 12, color: color.inkSoft, marginTop: 2 },
  statSub: { fontSize: 10.5, color: color.accentDeep, marginTop: 4, fontWeight: 600 },

  card: { background: color.surface, border: `1px solid ${color.border}`, borderRadius: 14, padding: 22, marginBottom: 18 },
  cardTitle: { fontSize: 15.5, fontWeight: 700, margin: "0 0 4px", fontFamily: "'Space Grotesk', sans-serif" },
  cardDesc: { fontSize: 12.5, color: color.inkSoft, margin: "0 0 14px" },
  primaryBtn: { background: color.accent, color: "#fff", border: "none", padding: "11px 22px", borderRadius: 100, fontWeight: 600, fontSize: 13.5, cursor: "pointer", display: "inline-block", textDecoration: "none" },

  questionList: { display: "flex", flexDirection: "column", gap: 8 },
  questionRow: { display: "flex", justifyContent: "space-between", padding: "8px 10px", background: "#FBFBFD", borderRadius: 8, fontSize: 13 },
  questionText: { color: color.ink },
  questionCount: { color: color.inkFaint, fontWeight: 600 },

  missedList: { display: "flex", flexDirection: "column", gap: 10 },
  missedRow: { display: "flex", alignItems: "flex-start", gap: 14, padding: 12, background: "#FBFBFD", border: `1px solid ${color.borderSoft}`, borderRadius: 10 },
  missedQuestion: { fontSize: 13.5, fontWeight: 600, color: color.ink, marginBottom: 3 },
  missedAnswer: { fontSize: 12, color: color.inkSoft, lineHeight: 1.5, marginBottom: 5 },
  missedCount: { fontSize: 10.5, color: color.inkFaint, fontFamily: "'JetBrains Mono', monospace" },
  missedAddBtn: { flex: "0 0 auto", padding: "8px 14px", fontSize: 12.5, whiteSpace: "nowrap" },

  agentList: { display: "flex", flexDirection: "column", gap: 4, marginTop: 10 },
  agentRow: { display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", borderBottom: `1px solid ${color.borderSoft}` },
  agentAvatar: { width: 32, height: 32, borderRadius: "50%", background: color.accentSoft, color: color.accentDeep, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12.5, flex: "0 0 auto" },
  agentName: { fontSize: 13, fontWeight: 600 },
  agentSub: { fontSize: 11.5, color: color.inkSoft },
  agentResponseTime: { fontSize: 14, fontWeight: 700, color: color.ink, textAlign: "right" },
  agentResponseLabel: { display: "block", fontSize: 9.5, fontWeight: 500, color: color.inkFaint },

  leadsHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  ghostBtn: { background: color.borderSoft, border: "none", padding: "7px 14px", borderRadius: 100, cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: color.ink },
  leadsList: { display: "flex", flexDirection: "column", gap: 4, marginTop: 10 },
  leadRow: { display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", borderBottom: `1px solid ${color.borderSoft}`, width: "100%", background: "none", border: "none", borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: color.borderSoft, cursor: "pointer", fontFamily: "inherit" },
  leadAvatar: { width: 32, height: 32, borderRadius: "50%", background: color.accentSoft, color: color.accentDeep, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12.5, flex: "0 0 auto" },
  leadName: { fontSize: 13, fontWeight: 600 },
  leadContact: { fontSize: 11.5, color: color.inkSoft },
  leadDate: { fontSize: 11, color: color.inkFaint },
  leadChevron: { color: color.inkFaint, fontSize: 14, flex: "0 0 auto", transition: "transform .15s ease" },

  leadConvoBox: { display: "flex", flexDirection: "column", gap: 8, padding: "12px 12px 14px 48px", background: "#FBFBFD", borderBottom: `1px solid ${color.borderSoft}` },
  leadConvoNote: { fontSize: 12, color: color.inkFaint, fontStyle: "italic" },
  leadMsgVisitor: { alignSelf: "flex-start", maxWidth: "85%", background: "#fff", border: `1px solid ${color.borderSoft}`, borderRadius: "4px 10px 10px 10px", padding: "8px 11px", fontSize: 12.5, lineHeight: 1.5 },
  leadMsgBot: { alignSelf: "flex-end", maxWidth: "85%", background: color.accentSoft, borderRadius: "10px 4px 10px 10px", padding: "8px 11px", fontSize: 12.5, lineHeight: 1.5, color: color.accentDeep },
  leadMsgRole: { display: "block", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", opacity: 0.6, marginBottom: 2 },

  loadingText: { color: color.inkSoft, fontSize: 13.5, padding: "40px 0" },
};