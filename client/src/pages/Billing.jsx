import { useState, useEffect } from "react";
import api from "../api/axios";

const PLANS = [
  { id: "basic", name: "Basic", price: "$29", period: "/month", features: ["AI + FAQ chat widget", "Lead capture", "Up to $20/mo AI usage", "1 team member"] },
  { id: "pro", name: "Pro", price: "$79", period: "/month", features: ["Everything in Basic", "Live agent handoff", "Team management + transfer", "Up to $100/mo AI usage", "Analytics dashboard"] }
];

export default function Billing() {
  const [status, setStatus] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [msg, setMsg] = useState("");

useEffect(() => {
    loadStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get("canceled")) setMsg("Checkout was canceled — no changes made.");
    if (params.get("success")) setMsg("Subscription updated successfully.");

    const preselectedPlan = params.get("plan");
    if (preselectedPlan) {
      setTimeout(() => {
        document.getElementById(`plan-${preselectedPlan}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, []);

  function loadStatus() {
    api.get("/billing/status").then((res) => setStatus(res.data));
  }

  async function subscribe(planId) {
    setLoadingPlan(planId);
    try {
      const res = await api.post("/billing/subscribe", { plan: planId });
      window.location.href = res.data.approveUrl;
    } catch (err) {
      setMsg(err.response?.data?.error || "Could not start checkout");
      setLoadingPlan(null);
    }
  }

  async function cancelPlan() {
    if (!confirm("Cancel your subscription? Your plan will revert to trial.")) return;
    try {
      await api.post("/billing/cancel");
      setMsg("Subscription canceled.");
      loadStatus();
    } catch (err) {
      setMsg(err.response?.data?.error || "Could not cancel subscription");
    }
  }

  if (!status) return <div style={s.loadingWrap}>Loading billing info…</div>;

  return (
    <div style={s.shell}>
      <div style={s.wrap}>
        <a href="/dashboard" style={s.backLink}>← Back to dashboard</a>

        <header style={s.header}>
          <div style={s.eyebrow}>Workspace</div>
          <h1 style={s.title}>Billing</h1>
          <p style={s.subtitle}>
            Current plan: <strong style={{ textTransform: "capitalize" }}>{status.plan}</strong>
            {" "}— <span style={{ ...s.statusBadge, ...(status.planStatus === "active" ? s.statusActive : s.statusInactive) }}>{status.planStatus}</span>
          </p>
        </header>

        {msg && <div style={s.toast}>{msg}</div>}

        <div style={s.plansGrid}>
          {PLANS.map((p) => (
            <div key={p.id} id={`plan-${p.id}`} style={{ ...s.planCard, ...(status.plan === p.id ? s.planCardActive : {}) }}>
              <div style={s.planName}>{p.name}</div>
              <div style={s.planPrice}>{p.price}<span style={s.planPeriod}>{p.period}</span></div>
              <ul style={s.featureList}>
                {p.features.map((f, i) => <li key={i} style={s.featureItem}>✓ {f}</li>)}
              </ul>
              {status.plan === p.id && status.planStatus === "active" ? (
                <button style={s.currentBtn} disabled>Current plan</button>
              ) : (
                <button style={s.primaryBtn} onClick={() => subscribe(p.id)} disabled={loadingPlan === p.id}>
                  {loadingPlan === p.id ? "Redirecting to PayPal…" : `Subscribe with PayPal`}
                </button>
              )}
            </div>
          ))}
        </div>

        {status.planStatus === "active" && (
          <button style={s.cancelLink} onClick={cancelPlan}>Cancel subscription</button>
        )}

        <div style={s.usageCard}>
          <div style={s.usageLabel}>AI usage this month</div>
          <div style={s.usageBarTrack}>
            <div style={{ ...s.usageBarFill, width: `${Math.min(100, (status.monthlySpendUsed / status.monthlySpendCap) * 100)}%` }} />
          </div>
          <div style={s.usageText}>${status.monthlySpendUsed.toFixed(2)} of ${status.monthlySpendCap} used</div>
        </div>
      </div>
    </div>
  );
}

const color = {
  bg: "#F6F5F2", surface: "#FFFFFF", border: "#E3DED4", borderSoft: "#EEEAE2",
  ink: "#1C1B19", inkSoft: "#6E685F", inkFaint: "#9B9488",
  accent: "#1F4B3F", accentSoft: "#E8EFEC", danger: "#B3261E",
};

const s = {
  shell: { minHeight: "100vh", background: color.bg, fontFamily: "'Segoe UI', ui-sans-serif, system-ui, sans-serif", color: color.ink, padding: "36px 24px" },
  wrap: { maxWidth: 680, margin: "0 auto" },
  backLink: { fontSize: 12.5, color: color.inkSoft, textDecoration: "none" },
  header: { margin: "16px 0 20px" },
  eyebrow: { fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: color.inkFaint, fontWeight: 600, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em" },
  subtitle: { fontSize: 13.5, color: color.inkSoft, margin: 0 },
  statusBadge: { fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999, textTransform: "capitalize" },
  statusActive: { background: color.accentSoft, color: color.accent },
  statusInactive: { background: color.borderSoft, color: color.inkSoft },
  toast: { background: color.accentSoft, color: color.accent, padding: "10px 14px", borderRadius: 9, fontSize: 12.5, marginBottom: 18 },

  plansGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 },
  planCard: { background: color.surface, border: `1px solid ${color.border}`, borderRadius: 14, padding: 22 },
  planCardActive: { border: `2px solid ${color.accent}` },
  planName: { fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: color.inkSoft },
  planPrice: { fontSize: 28, fontWeight: 700, margin: "6px 0 14px" },
  planPeriod: { fontSize: 13, fontWeight: 400, color: color.inkSoft },
  featureList: { listStyle: "none", padding: 0, margin: "0 0 18px", display: "flex", flexDirection: "column", gap: 8 },
  featureItem: { fontSize: 13, color: color.inkSoft },
  primaryBtn: { width: "100%", background: color.accent, color: "#fff", border: "none", padding: "11px", borderRadius: 9, fontWeight: 600, fontSize: 13.5, cursor: "pointer" },
  currentBtn: { width: "100%", background: color.borderSoft, color: color.inkSoft, border: "none", padding: "11px", borderRadius: 9, fontWeight: 600, fontSize: 13.5 },
  cancelLink: { background: "none", border: "none", color: color.danger, fontSize: 12.5, textDecoration: "underline", cursor: "pointer", marginBottom: 24 },

  usageCard: { background: color.surface, border: `1px solid ${color.border}`, borderRadius: 14, padding: 20 },
  usageLabel: { fontSize: 12.5, fontWeight: 600, color: color.inkSoft, marginBottom: 8 },
  usageBarTrack: { height: 10, background: color.borderSoft, borderRadius: 999, overflow: "hidden" },
  usageBarFill: { height: "100%", background: color.accent },
  usageText: { fontSize: 12, color: color.inkFaint, marginTop: 6 },

  loadingWrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: color.bg, color: color.inkSoft },
};