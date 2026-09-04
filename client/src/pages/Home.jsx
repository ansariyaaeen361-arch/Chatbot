import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import api from "../api/axios";
import { color, layout, globalStyles } from "../theme";

export default function Home() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [business, setBusiness] = useState(null);
  const [trend, setTrend] = useState(null);
  const [trendRange, setTrendRange] = useState(7);

  useEffect(() => {
    api.get("/analytics/home").then((res) => setSummary(res.data)).catch(() => {});
    api.get("/business/me").then((res) => setBusiness(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setTrend(null);
    api.get(`/analytics/home-trend?days=${trendRange}`).then((res) => setTrend(res.data.points)).catch(() => {});
  }, [trendRange]);

  const setupIncomplete = business && (!business.faqs || business.faqs.length === 0);
  const firstName = (user?.name || "").split(" ")[0];

  return (
    <div style={layout.shell} className="forge-shell">
      <style>{globalStyles}</style>
      <Sidebar />

      <main style={s.mainFlex} className="forge-main">
        <div style={s.fixedTop}>
        <header style={s.header}>
          <div style={s.eyebrow}>Home</div>
          <h1 style={s.title}>{greeting()}{firstName ? `, ${firstName}` : ""}</h1>
          <p style={s.subtitle}>Here's what's happening with {business?.name || "your widget"} today.</p>
        </header>

        {setupIncomplete && (
          <Link to="/dashboard" className="forge-card" style={s.setupCard}>
            <div>
              <div style={s.setupCardTitle}>Finish setting up your widget</div>
              <div style={s.setupCardDesc}>Add a few FAQs so your AI assistant can start answering visitors correctly.</div>
            </div>
            <span style={s.setupCardArrow}>→</span>
          </Link>
        )}

        {summary && (
          <div style={s.statsGrid} className="forge-stats-grid">
            <StatCard label="Conversations today" value={summary.conversationsToday} delta={summary.conversationsDelta} />
            <StatCard label="Leads captured today" value={summary.leadsToday} delta={summary.leadsDelta} highlight />
            <StatCard label="Live chats today" value={summary.chatsToday} delta={summary.chatsDelta} />
            <StatCard label="Messages handled today" value={summary.messagesToday} />
          </div>
        )}
        </div>

        {!summary ? (
          <div style={s.loadingText}>Loading…</div>
        ) : (
          <>
            <div style={s.homeRow} className="forge-home-row">
              <div className="forge-card" style={s.chartCard}>
                <div style={s.activityHeader}>
                  <h2 style={s.activityTitle}>Trend</h2>
                  <div style={s.chartControls}>
                    <div style={s.chartLegend}>
                      <span style={s.legendDot(color.accent)} /> Conversations
                      <span style={{ ...s.legendDot(color.success), marginLeft: 14 }} /> Leads
                    </div>
                    <div style={s.rangeToggle}>
                      {[[7, "7d"], [30, "30d"], [90, "90d"]].map(([val, label]) => (
                        <button
                          key={val}
                          type="button"
                          className="forge-ghost"
                          style={{ ...s.rangeBtn, ...(trendRange === val ? s.rangeBtnActive : {}) }}
                          onClick={() => setTrendRange(val)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {!trend ? (
                  <div style={s.emptyState}>Loading chart…</div>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="convGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color.accent} stopOpacity={0.28} />
                          <stop offset="95%" stopColor={color.accent} stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color.success} stopOpacity={0.28} />
                          <stop offset="95%" stopColor={color.success} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={color.borderSoft} vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11.5, fill: color.inkFaint }} axisLine={{ stroke: color.borderSoft }} tickLine={false} interval={trendRange > 7  ? Math.ceil(trendRange / 8) : 0} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11.5, fill: color.inkFaint }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip
                        contentStyle={{ borderRadius: 10, border: `1px solid ${color.border}`, fontSize: 12.5, boxShadow: "0 8px 24px rgba(21,22,42,.1)" }}
                        labelStyle={{ fontWeight: 700, color: color.ink, marginBottom: 4 }}
                      />
                      <Area type="monotone" dataKey="conversations" name="Conversations" stroke={color.accent} strokeWidth={2.2} fill="url(#convGradient)" />
                      <Area type="monotone" dataKey="leads" name="Leads" stroke={color.success} strokeWidth={2.2} fill="url(#leadsGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="forge-card" style={s.activityCard}>
                <div style={s.activityHeader}>
                  <h2 style={s.activityTitle}>Recent leads</h2>
                  <Link to="/analytics" style={s.viewAllLink}>View all →</Link>
                </div>
                {summary.recentLeads.length === 0 ? (
                  <div style={s.emptyState}>No leads captured yet. Once visitors leave their details in the chat widget, they'll show up here.</div>
                ) : (
                  <div style={s.activityList} className="forge-thin-scroll">
                    {summary.recentLeads.map((lead) => (
                      <div key={lead._id} style={s.activityRow}>
                        <div style={s.activityAvatar}>{(lead.name || lead.email || "?").charAt(0).toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={s.activityName}>{lead.name || "Unnamed visitor"}</div>
                          <div style={s.activityEmail}>{lead.email || "No email provided"}</div>
                        </div>
                        <div style={s.activityTime}>{timeAgo(lead.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {checklistItems(business, trend).some((i) => !i.done) && (
              <div className="forge-card" style={s.checklistCard}>
                <h2 style={s.activityTitle}>Finish setting up</h2>
                <div style={s.checklistGrid} className="forge-stats-grid">
                  {checklistItems(business, trend).map((item) => (
                    <Link key={item.label} to={item.link} style={s.checklistItem}>
                      <span style={{ ...s.checklistDot, ...(item.done ? s.checklistDotDone : {}) }}>{item.done ? "✓" : ""}</span>
                      <span style={{ ...s.checklistLabel, ...(item.done ? s.checklistLabelDone : {}) }}>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function checklistItems(business, trend) {
  if (!business) return [];
  const hasAnyConversations = (trend || []).some((p) => p.conversations > 0);
  return [
    { label: "Business profile", done: !!(business.name && business.description), link: "/dashboard?section=profile" },
    { label: "Branding & logo", done: !!business.logoUrl, link: "/dashboard?section=branding" },
    { label: "FAQs", done: (business.faqs || []).some((f) => f.question && f.answer), link: "/dashboard?section=faqs" },
    { label: "Knowledge base", done: (business.knowledgeBase || []).length > 0, link: "/dashboard?section=knowledge" },
    { label: "Install widget", done: hasAnyConversations, link: "/dashboard?section=embed" },
  ];
}

function StatCard({ label, value, delta, highlight }) {
  return (
    <div className="forge-card" style={{ ...s.statCard, ...(highlight ? s.statCardHighlight : {}) }}>
      <div style={{ ...s.statValue, ...(highlight ? s.statValueHighlight : {}) }}>{value}</div>
      <div style={s.statLabel}>{label}</div>
      {typeof delta === "number" && (
        <div style={{ ...s.statDelta, color: delta > 0 ? color.successText : delta < 0 ? color.danger : color.inkFaint }}>
          {delta > 0 ? "▲" : delta < 0 ? "▼" : "–"} {Math.abs(delta)}% vs yesterday
        </div>
      )}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const s = {
  mainFlex: { flex: 1, height: "100%", overflow: "hidden", display: "flex", flexDirection: "column", padding: "18px 32px 14px", maxWidth: 1180, margin: "0 auto", width: "100%", boxSizing: "border-box" },
  fixedTop: { flex: "0 0 auto" },

  header: { marginBottom: 12 },
  eyebrow: { fontSize: 11.5, letterSpacing: "0.1em", textTransform: "uppercase", color: color.accentDeep, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" },
  title: { fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", margin: "6px 0 4px", fontFamily: "'Space Grotesk', sans-serif" },
  subtitle: { fontSize: 13.5, color: color.inkSoft, margin: 0 },
  loadingText: { fontSize: 13.5, color: color.inkFaint, padding: "40px 0" },

  setupCard: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: color.accentSoft, border: `1px solid ${color.accent}33`, borderRadius: 14, padding: "12px 18px", marginBottom: 12, textDecoration: "none", color: color.ink },
  setupCardTitle: { fontSize: 14, fontWeight: 700, color: color.accentDeep },
  setupCardDesc: { fontSize: 12, color: color.inkSoft, marginTop: 3 },
  setupCardArrow: { fontSize: 18, color: color.accentDeep, flex: "0 0 auto" },

  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 12 },
  statCard: { background: color.surface, border: `1px solid ${color.border}`, borderRadius: 14, padding: 14 },
  statCardHighlight: { background: color.accentSoft, border: `1px solid ${color.accent}33` },
  statValue: { fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: color.ink },
  statValueHighlight: { color: color.accentDeep },
  statLabel: { fontSize: 12, color: color.inkSoft, marginTop: 2 },
  statDelta: { fontSize: 10.5, fontWeight: 600, marginTop: 6 },

  homeRow: { flex: "1 1 auto", minHeight: 180, display: "flex", gap: 16, marginBottom: 12 },
  chartCard: { flex: "1 1 60%", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", background: color.surface, border: `1px solid ${color.border}`, borderRadius: 14, padding: 16, overflow: "hidden" },
  chartControls: { display: "flex", alignItems: "center", gap: 14 },
  chartLegend: { fontSize: 11.5, color: color.inkSoft, display: "flex", alignItems: "center" },
  rangeToggle: { display: "flex", gap: 2, background: color.borderSoft, borderRadius: 100, padding: 2 },
  rangeBtn: { border: "none", background: "none", padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600, color: color.inkSoft, cursor: "pointer" },
  rangeBtnActive: { background: color.surface, color: color.accentDeep, boxShadow: "0 1px 2px rgba(21,22,42,.08)" },
  legendDot: (c) => ({ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: c, marginRight: 5 }),
  activityCard: { flex: "1 1 40%", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", background: color.surface, border: `1px solid ${color.border}`, borderRadius: 14, padding: 16, overflow: "hidden" },
  activityHeader: { flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  activityTitle: { fontSize: 14.5, fontWeight: 700, margin: 0, fontFamily: "'Space Grotesk', sans-serif" },
  viewAllLink: { fontSize: 12.5, color: color.accentDeep, textDecoration: "none", fontWeight: 600 },
  emptyState: { fontSize: 13, color: color.inkFaint, padding: "20px 0", textAlign: "center" },
  activityList: { flex: "1 1 auto", minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 },
  activityRow: { display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `1px solid ${color.borderSoft}` },
  activityAvatar: { width: 32, height: 32, borderRadius: "50%", background: color.accentSoft, color: color.accentDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700, flex: "0 0 auto" },
  activityName: { fontSize: 13, fontWeight: 600, color: color.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  activityEmail: { fontSize: 11.5, color: color.inkFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  activityTime: { fontSize: 11, color: color.inkFaint, flex: "0 0 auto" },

  checklistCard: { flex: "0 0 auto", background: color.surface, border: `1px solid ${color.border}`, borderRadius: 14, padding: 14 },
  checklistGrid: { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8, marginTop: 8 },
  checklistItem: { display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: color.surfaceSunken, border: `1px solid ${color.borderSoft}`, textDecoration: "none" },
  checklistDot: { width: 18, height: 18, borderRadius: "50%", border: `1.5px solid ${color.border}`, flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff" },
  checklistDotDone: { background: color.success, borderColor: color.success },
  checklistLabel: { fontSize: 12.5, fontWeight: 600, color: color.ink },
  checklistLabelDone: { color: color.inkSoft, textDecoration: "line-through" },
};
