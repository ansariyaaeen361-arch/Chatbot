import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Sidebar from "../components/Sidebar";
import BackToDashboard from "../components/BackToDashboard";
import api from "../api/axios";
import { color, layout, globalStyles } from "../theme";

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [messageTrend, setMessageTrend] = useState(null);
  const [topQuestions, setTopQuestions] = useState([]);
  const [leads, setLeads] = useState([]);
  const [leadSearch, setLeadSearch] = useState("");
  const [missedFaqs, setMissedFaqs] = useState([]);
  const [agentStats, setAgentStats] = useState([]);
  const [promotingIndex, setPromotingIndex] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [openQuestions, setOpenQuestions] = useState(() => new Set());
  const [expandedLeadId, setExpandedLeadId] = useState(null);
  const [leadConversations, setLeadConversations] = useState({});
  const [loadingConversation, setLoadingConversation] = useState(null);

  useEffect(() => {
    api.get("/analytics/overview").then((res) => setOverview(res.data)).catch((err) => {
      if (err.response?.status === 403) setBlocked(true);
    });
    api.get("/analytics/message-trend").then((res) => setMessageTrend(res.data.points)).catch(() => {});
    api.get("/analytics/top-questions").then((res) => setTopQuestions(res.data)).catch(() => {});
    api.get("/analytics/leads").then((res) => setLeads(res.data)).catch(() => {});
    api.get("/analytics/missed-faqs").then((res) => setMissedFaqs(res.data)).catch(() => {});
    api.get("/analytics/agent-stats").then((res) => setAgentStats(res.data)).catch(() => {});
  }, []);

  const filteredLeads = useMemo(() => {
    const q = leadSearch.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      (l.name || "").toLowerCase().includes(q) ||
      (l.email || "").toLowerCase().includes(q) ||
      (l.phone || "").toLowerCase().includes(q)
    );
  }, [leads, leadSearch]);

  const toggleQuestion = (i) => {
    setOpenQuestions((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

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
        <main style={layout.main(1180)} className="forge-main">
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
        <main style={layout.main(1180)} className="forge-main">
          <div style={s.loadingText}>Loading analytics…</div>
        </main>
      </div>
    );
  }

  return (
    <div style={s.shell} className="forge-shell">
      <style>{globalStyles}</style>
      <Sidebar />

      <main style={s.mainFlex} className="forge-main">
        <div style={s.fixedTop}>
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

        {/* ---- Charts: message trend + FAQ/AI split ---- */}
        <div style={s.chartRow} className="forge-home-row">
          <div className="forge-card" style={s.trendCard}>
            <h2 style={s.cardTitle}>Messages — last 30 days</h2>
            {!messageTrend ? (
              <p style={s.cardDesc}>Loading chart…</p>
            ) : (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={messageTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap={2}>
                  <CartesianGrid stroke={color.borderSoft} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: color.inkFaint }} axisLine={{ stroke: color.borderSoft }} tickLine={false} interval={4} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11.5, fill: color.inkFaint }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${color.border}`, fontSize: 12.5, boxShadow: "0 8px 24px rgba(21,22,42,.1)" }} labelStyle={{ fontWeight: 700, color: color.ink, marginBottom: 4 }} />
                  <Bar dataKey="faq" name="FAQ" stackId="msg" fill={color.accent} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="ai" name="AI" stackId="msg" fill={color.accentLight} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="forge-card" style={s.donutCard}>
            <h2 style={s.cardTitle}>FAQ vs AI</h2>
            {overview.totalMessages === 0 ? (
              <p style={s.cardDesc}>No messages yet.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={110}>
                  <PieChart>
                    <Pie
                      data={[{ name: "FAQ", value: overview.faqCount }, { name: "AI", value: overview.aiCount }]}
                      dataKey="value"
                      innerRadius={30}
                      outerRadius={48}
                      paddingAngle={3}
                      stroke="none"
                    >
                      <Cell fill={color.accent} />
                      <Cell fill={color.accentLight} />
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${color.border}`, fontSize: 12.5 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={s.donutLegend}>
                  <div style={s.donutLegendRow}><span style={s.legendDot(color.accent)} /> FAQ <b style={{ marginLeft: "auto" }}>{overview.faqRate}%</b></div>
                  <div style={s.donutLegendRow}><span style={s.legendDot(color.accentLight)} /> AI <b style={{ marginLeft: "auto" }}>{100 - overview.faqRate}%</b></div>
                </div>
              </>
            )}
          </div>
        </div>
        </div>

        {/* ---- Most asked questions / Leads / Missed FAQ / Team performance — fills remaining space, each cell scrolls internally ---- */}
        <div style={{ ...s.dataGrid, gridTemplateRows: (missedFaqs.length > 0 || agentStats.length > 0) ? "1fr 1fr" : "1fr" }} className="forge-data-grid">
          <div className="forge-card" style={s.gridCard}>
            <h2 style={s.cardTitle}>Most asked questions</h2>
            {topQuestions.length === 0 && <p style={s.cardDesc}>No questions yet.</p>}
            <div style={s.gridCardList} className="forge-scroll-list">
              {topQuestions.map((q, i) => {
                const isOpen = openQuestions.has(i);
                const isLong = q.question.length > 120;
                return (
                  <div key={i} style={s.questionRow}>
                    <div style={s.questionRowTop}>
                      <span style={{ ...s.questionText, ...(isOpen ? {} : s.questionTextClamped) }}>{q.question}</span>
                      <span style={s.questionCount}>{q.count}×</span>
                    </div>
                    {isLong && (
                      <button type="button" className="forge-ghost" style={s.questionToggle} onClick={() => toggleQuestion(i)}>
                        {isOpen ? "Show less" : "Read more"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="forge-card" style={s.gridCard}>
            <div style={s.leadsHeader}>
              <h2 style={s.cardTitle}>Leads ({filteredLeads.length}{leadSearch ? ` of ${leads.length}` : ""})</h2>
              <div style={s.leadsHeaderRight}>
                {leads.length > 5 && (
                  <input
                    className="forge-input"
                    style={s.leadSearchInput}
                    placeholder="Search leads…"
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                  />
                )}
                <button className="forge-ghost" style={s.ghostBtn} onClick={exportCsv} disabled={exporting}>
                  {exporting ? "Exporting…" : "Export CSV"}
                </button>
              </div>
            </div>
            <div style={s.gridCardList} className="forge-scroll-list">
              {filteredLeads.length === 0 && leads.length > 0 && <p style={s.cardDesc}>No leads match "{leadSearch}".</p>}
              {filteredLeads.map((l) => {
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

          {missedFaqs.length > 0 && (
            <div className="forge-card" style={s.gridCard}>
              <h2 style={s.cardTitle}>Missed FAQ suggestions</h2>
              <p style={s.cardDesc}>Questions the AI keeps answering that aren't in your FAQs yet.</p>
              <div style={s.gridCardList} className="forge-scroll-list">
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

          {agentStats.length > 0 && (
            <div className="forge-card" style={s.gridCard}>
              <h2 style={s.cardTitle}>Team performance</h2>
              <p style={s.cardDesc}>Live chats handled by each teammate in the last 30 days.</p>
              <div style={s.gridCardList} className="forge-scroll-list">
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
  header: { margin: "0 0 12px" },
  eyebrow: { fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: color.inkFaint, fontWeight: 600, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" },
  title: { fontSize: 25, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em", fontFamily: "'Space Grotesk', sans-serif" },
  subtitle: { fontSize: 13.5, color: color.inkSoft, margin: 0 },

  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 12 },
  statCard: { background: color.surface, border: `1px solid ${color.border}`, borderRadius: 12, padding: 12 },
  statCardHighlight: { background: color.accentSoft, border: `1px solid ${color.accent}33` },
  statValue: { fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: color.ink },
  statValueHighlight: { color: color.accentDeep },
  statLabel: { fontSize: 11.5, color: color.inkSoft, marginTop: 2 },
  statSub: { fontSize: 10, color: color.accentDeep, marginTop: 3, fontWeight: 600 },

  mainFlex: { flex: 1, height: "100%", overflow: "hidden", display: "flex", flexDirection: "column", padding: "18px 32px 14px", maxWidth: 1180, margin: "0 auto", width: "100%", boxSizing: "border-box" },
  fixedTop: { flex: "0 0 auto" },
  dataGrid: { flex: "1 1 auto", minHeight: 190, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, paddingBottom: 2 },
  gridCard: { minHeight: 0, display: "flex", flexDirection: "column", background: color.surface, border: `1px solid ${color.border}`, borderRadius: 14, padding: 16 },
  gridCardList: { flex: "1 1 auto", minHeight: 0, overflowY: "auto", paddingRight: 4, display: "flex", flexDirection: "column", gap: 8 },

  card: { background: color.surface, border: `1px solid ${color.border}`, borderRadius: 14, padding: 22, marginBottom: 18 },
  cardTitle: { fontSize: 15.5, fontWeight: 700, margin: "0 0 4px", fontFamily: "'Space Grotesk', sans-serif" },
  cardDesc: { fontSize: 12.5, color: color.inkSoft, margin: "0 0 14px" },

  chartRow: { display: "flex", gap: 16, alignItems: "stretch", marginBottom: 12 },
  trendCard: { flex: "1 1 65%", minWidth: 0, background: color.surface, border: `1px solid ${color.border}`, borderRadius: 14, padding: 16 },
  donutCard: { flex: "1 1 35%", minWidth: 0, background: color.surface, border: `1px solid ${color.border}`, borderRadius: 14, padding: 16 },
  donutLegend: { display: "flex", flexDirection: "column", gap: 6, marginTop: 8 },
  donutLegendRow: { display: "flex", alignItems: "center", fontSize: 12.5, color: color.inkSoft },
  legendDot: (c) => ({ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: c, marginRight: 7 }),
  primaryBtn: { background: color.accent, color: "#fff", border: "none", padding: "11px 22px", borderRadius: 100, fontWeight: 600, fontSize: 13.5, cursor: "pointer", display: "inline-block", textDecoration: "none" },

  questionList: { display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflowY: "auto", paddingRight: 4 },
  questionRow: { padding: "9px 10px", background: "#FBFBFD", borderRadius: 8 },
  questionRowTop: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" },
  questionText: { color: color.ink, fontSize: 13, lineHeight: 1.5, flex: 1, minWidth: 0 },
  questionTextClamped: { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  questionCount: { color: color.inkFaint, fontWeight: 600, fontSize: 12, flex: "0 0 auto" },
  questionToggle: { display: "block", marginTop: 4, background: "none", border: "none", padding: 0, color: color.accentDeep, fontSize: 11.5, fontWeight: 600, cursor: "pointer" },

  missedList: { display: "flex", flexDirection: "column", gap: 10, maxHeight: 340, overflowY: "auto", paddingRight: 4 },
  missedRow: { display: "flex", alignItems: "flex-start", gap: 14, padding: 12, background: "#FBFBFD", border: `1px solid ${color.borderSoft}`, borderRadius: 10 },
  missedQuestion: { fontSize: 13.5, fontWeight: 600, color: color.ink, marginBottom: 3 },
  missedAnswer: { fontSize: 12, color: color.inkSoft, lineHeight: 1.5, marginBottom: 5 },
  missedCount: { fontSize: 10.5, color: color.inkFaint, fontFamily: "'JetBrains Mono', monospace" },
  missedAddBtn: { flex: "0 0 auto", padding: "8px 14px", fontSize: 12.5, whiteSpace: "nowrap" },

  agentList: { display: "flex", flexDirection: "column", gap: 4, marginTop: 10, maxHeight: 340, overflowY: "auto", paddingRight: 4 },
  agentRow: { display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", borderBottom: `1px solid ${color.borderSoft}` },
  agentAvatar: { width: 32, height: 32, borderRadius: "50%", background: color.accentSoft, color: color.accentDeep, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12.5, flex: "0 0 auto" },
  agentName: { fontSize: 13, fontWeight: 600 },
  agentSub: { fontSize: 11.5, color: color.inkSoft },
  agentResponseTime: { fontSize: 14, fontWeight: 700, color: color.ink, textAlign: "right" },
  agentResponseLabel: { display: "block", fontSize: 9.5, fontWeight: 500, color: color.inkFaint },

  leadsHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 12, flexWrap: "wrap" },
  leadsHeaderRight: { display: "flex", alignItems: "center", gap: 8 },
  leadSearchInput: { padding: "7px 12px", borderRadius: 100, fontSize: 12.5, width: 180, border: `1px solid ${color.border}`, background: "#FBFBFD" },
  ghostBtn: { background: color.borderSoft, border: "none", padding: "7px 14px", borderRadius: 100, cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: color.ink, whiteSpace: "nowrap" },
  leadsList: { display: "flex", flexDirection: "column", gap: 4, marginTop: 10, maxHeight: 520, overflowY: "auto", paddingRight: 4 },
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