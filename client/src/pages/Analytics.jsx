import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [topQuestions, setTopQuestions] = useState([]);
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    api.get("/analytics/overview").then((res) => setOverview(res.data));
    api.get("/analytics/top-questions").then((res) => setTopQuestions(res.data));
    api.get("/analytics/leads").then((res) => setLeads(res.data));
  }, []);

  const exportCsv = () => {
    const token = localStorage.getItem("token");
    fetch("http://localhost:5000/api/analytics/leads/export", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "leads.csv";
        a.click();
      });
  };

  if (!overview) return <div style={s.loadingWrap}><div>Loading analytics…</div></div>;

  return (
    <div style={s.shell}>
      <div style={s.wrap}>
        <a href="/dashboard" style={s.backLink}>← Back to dashboard</a>

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
          <StatCard label="Live chats started" value={overview.liveChatCount} />
          <StatCard
            label="Avg. response time"
            value={formatResponseTime(overview.avgResponseSeconds)}
            sub={overview.respondedChatsCount > 0 ? `Based on ${overview.respondedChatsCount} chats` : "No data yet"}
          />
        </div>

        {/* ---- FAQ vs AI bar ---- */}
        {/* <div style={s.card}>
          <h2 style={s.cardTitle}>FAQ vs AI usage</h2>
          <p style={s.cardDesc}>Every FAQ match is a message answered for free — no AI cost.</p>
          <div style={s.barTrack}>
            <div style={{ ...s.barFill, width: `${overview.faqRate}%` }} />
          </div>
          <div style={s.barLegend}>
            <span><span style={s.dotFaq}></span> FAQ — {overview.faqRate}%</span>
            <span><span style={s.dotAi}></span> AI — {100 - overview.faqRate}%</span>
          </div>
        </div> */}

        {/* ---- Top questions ---- */}
        <div style={s.card}>
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

        {/* ---- Leads ---- */}
        <div style={s.card}>
          <div style={s.leadsHeader}>
            <h2 style={s.cardTitle}>Leads ({leads.length})</h2>
            <button style={s.ghostBtn} onClick={exportCsv}>Export CSV</button>
          </div>
          <div style={s.leadsList}>
            {leads.map((l) => (
              <div key={l._id} style={s.leadRow}>
                <div style={s.leadAvatar}>{l.name.charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={s.leadName}>{l.name}</div>
                  <div style={s.leadContact}>{l.email || l.phone || "—"}</div>
                </div>
                <div style={s.leadDate}>{new Date(l.createdAt).toLocaleDateString()}</div>
              </div>
            ))}
            {leads.length === 0 && <p style={s.cardDesc}>No leads captured yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, highlight }) {
  return (
    <div style={{ ...s.statCard, ...(highlight ? s.statCardHighlight : {}) }}>
      <div style={s.statValue}>{value}</div>
      <div style={s.statLabel}>{label}</div>
      {sub && <div style={s.statSub}>{sub}</div>}
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

const color = {
  bg: "#F6F5F2",
  surface: "#FFFFFF",
  border: "#E3DED4",
  borderSoft: "#EEEAE2",
  ink: "#1C1B19",
  inkSoft: "#6E685F",
  inkFaint: "#9B9488",
  accent: "#1F4B3F",
  accentSoft: "#E8EFEC",
  aiColor: "#8A5A1F",
  aiSoft: "#F3E9DA",
};

const s = {
  shell: { minHeight: "100vh", background: color.bg, fontFamily: "'Segoe UI', ui-sans-serif, system-ui, sans-serif", color: color.ink, padding: "36px 24px" },
  wrap: { maxWidth: 720, margin: "0 auto" },
  backLink: { fontSize: 12.5, color: color.inkSoft, textDecoration: "none" },
  header: { margin: "16px 0 24px" },
  eyebrow: { fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: color.inkFaint, fontWeight: 600, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em" },
  subtitle: { fontSize: 13.5, color: color.inkSoft, margin: 0 },

  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 },
  statCard: { background: color.surface, border: `1px solid ${color.border}`, borderRadius: 12, padding: 16 },
  statCardHighlight: { background: color.accentSoft, border: `1px solid ${color.accent}22` },
  statValue: { fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" },
  statLabel: { fontSize: 12, color: color.inkSoft, marginTop: 2 },
  statSub: { fontSize: 10.5, color: color.accent, marginTop: 4, fontWeight: 600 },

  card: { background: color.surface, border: `1px solid ${color.border}`, borderRadius: 14, padding: 22, marginBottom: 18 },
  cardTitle: { fontSize: 15.5, fontWeight: 700, margin: "0 0 4px" },
  cardDesc: { fontSize: 12.5, color: color.inkSoft, margin: "0 0 14px" },

  barTrack: { height: 12, background: color.aiSoft, borderRadius: 999, overflow: "hidden", marginBottom: 10 },
  barFill: { height: "100%", background: color.accent, borderRadius: 999, transition: "width .3s" },
  barLegend: { display: "flex", gap: 20, fontSize: 12, color: color.inkSoft },
  dotFaq: { display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color.accent, marginRight: 6 },
  dotAi: { display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color.aiColor, marginRight: 6 },

  questionList: { display: "flex", flexDirection: "column", gap: 8 },
  questionRow: { display: "flex", justifyContent: "space-between", padding: "8px 10px", background: "#FCFBF9", borderRadius: 8, fontSize: 13 },
  questionText: { color: color.ink },
  questionCount: { color: color.inkFaint, fontWeight: 600 },

  leadsHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  ghostBtn: { background: color.borderSoft, border: "none", padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600 },
  leadsList: { display: "flex", flexDirection: "column", gap: 4, marginTop: 10 },
  leadRow: { display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", borderBottom: `1px solid ${color.borderSoft}` },
  leadAvatar: { width: 32, height: 32, borderRadius: "50%", background: color.accentSoft, color: color.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12.5, flex: "0 0 auto" },
  leadName: { fontSize: 13, fontWeight: 600 },
  leadContact: { fontSize: 11.5, color: color.inkSoft },
  leadDate: { fontSize: 11, color: color.inkFaint },

  loadingWrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: color.bg, color: color.inkSoft },
};