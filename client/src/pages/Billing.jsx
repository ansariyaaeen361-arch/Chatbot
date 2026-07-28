import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Sidebar from "../components/Sidebar";
import { color, layout, globalStyles } from "../theme";

const PLANS = [
  { id: "starter", name: "Starter", monthlyPrice: 25, yearlyPrice: 250, popular: false,
    features: ["FAQ + AI chat widget", "Knowledge base", "Full branding customization", "Lead capture", "Up to $20/mo AI usage", "1 team member"] },
  { id: "basic", name: "Growth", monthlyPrice: 60, yearlyPrice: 650, popular: true,
    features: ["Everything in Starter", "Live agent handoff", "Analytics dashboard", "Team management + transfer", "Up to $20/mo AI usage", "5 team members"] },
  { id: "pro", name: "Pro", monthlyPrice: 199, yearlyPrice: 2000, popular: false,
    features: ["Everything in Growth", "Up to $100/mo AI usage", "10 team members"] }
];

function yearlySavingsPct(p) {
  return Math.round(((p.monthlyPrice * 12 - p.yearlyPrice) / (p.monthlyPrice * 12)) * 100);
}

export default function Billing() {
  const [status, setStatus] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [msg, setMsg] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");

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
      const res = await api.post("/billing/subscribe", { plan: planId, billingCycle });
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

  if (!status) {
    return (
      <div style={layout.shell} className="forge-shell">
        <style>{globalStyles}</style>
        <Sidebar />
        <main style={layout.main(900)} className="forge-main">
          <div style={s.loadingRow}>
            <span className="forge-dot" style={{ ...s.loadingDot, animationDelay: "0s" }} />
            <span className="forge-dot" style={{ ...s.loadingDot, animationDelay: ".2s" }} />
            <span className="forge-dot" style={{ ...s.loadingDot, animationDelay: ".4s" }} />
          </div>
          <div style={s.loadingText}>Loading billing info…</div>
        </main>
      </div>
    );
  }

  const usagePct = Math.min(100, (status.monthlySpendUsed / status.monthlySpendCap) * 100);

  return (
    <div style={layout.shell} className="forge-shell">
      <style>{globalStyles}</style>
      <Sidebar />

      <main style={layout.main(900)} className="forge-main">
        <header style={s.header}>
          <div style={s.eyebrow}>Workspace</div>
          <h1 style={s.title}>Billing</h1>
          <p style={s.subtitle}>
            Current plan: <strong style={{ textTransform: "capitalize" }}>{status.plan}</strong>
            {" "}<span style={{ ...s.statusBadge, ...(status.planStatus === "active" ? s.statusActive : s.statusInactive) }}>{status.planStatus}</span>
          </p>
        </header>

        {msg && <div style={s.toast}>{msg}</div>}

        <div style={s.cycleToggle}>
          <button
            className="forge-ghost"
            style={{ ...s.cycleBtn, ...(billingCycle === "monthly" ? s.cycleBtnActive : {}) }}
            onClick={() => setBillingCycle("monthly")}
          >
            Monthly
          </button>
          <button
            className="forge-ghost"
            style={{ ...s.cycleBtn, ...(billingCycle === "yearly" ? s.cycleBtnActive : {}) }}
            onClick={() => setBillingCycle("yearly")}
          >
            Yearly <span style={s.saveBadge}>Save up to 17%</span>
          </button>
        </div>

        <div style={s.plansGrid}>
          {PLANS.map((p) => {
            const isCurrent = status.plan === p.id && status.planStatus === "active";
            const price = billingCycle === "yearly" ? p.yearlyPrice : p.monthlyPrice;
            const period = billingCycle === "yearly" ? "/year" : "/month";
            return (
              <div
                key={p.id}
                id={`plan-${p.id}`}
                className="forge-card"
                style={{ ...s.planCard, ...(p.popular ? s.planCardPopular : {}) }}
              >
                {p.popular && <div style={s.popularBadge}>Most popular</div>}
                <div style={s.planName}>{p.name}</div>
                <div style={s.planPrice}>${price}<span style={s.planPeriod}>{period}</span></div>
                {billingCycle === "yearly" && (
                  <div style={s.savingsText}>Save {yearlySavingsPct(p)}% vs monthly</div>
                )}
                <ul style={s.featureList}>
                  {p.features.map((f, i) => (
                    <li key={i} style={s.featureItem}>
                      <CheckIcon /> {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <button style={s.currentBtn} disabled>Current plan</button>
                ) : (
                  <button
                    className="forge-btn-primary"
                    style={p.popular ? s.primaryBtnPopular : s.primaryBtn}
                    onClick={() => subscribe(p.id)}
                    disabled={loadingPlan === p.id}
                  >
                    {loadingPlan === p.id ? "Redirecting to Stripe…" : "Subscribe with Stripe"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {status.planStatus === "active" && (
          <button style={s.cancelLink} onClick={cancelPlan}>Cancel subscription</button>
        )}

        <div className="forge-card" style={s.usageCard}>
          <div style={s.usageLabel}>AI usage this month</div>
          <div style={s.usageBarTrack}>
            <div style={{ ...s.usageBarFill, width: `${usagePct}%` }} />
          </div>
          <div style={s.usageText}>${status.monthlySpendUsed.toFixed(2)} of ${status.monthlySpendCap} used</div>
        </div>
      </main>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" style={s.checkIcon}>
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const s = {
  header: { margin: "0 0 18px" },
  eyebrow: { fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: color.inkFaint, fontWeight: 600, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" },
  title: { fontSize: 25, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em", fontFamily: "'Space Grotesk', sans-serif" },
  subtitle: { fontSize: 13.5, color: color.inkSoft, margin: 0 },
  statusBadge: { fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999, textTransform: "capitalize" },
  statusActive: { background: color.successSoft, color: color.successText },
  statusInactive: { background: color.borderSoft, color: color.inkSoft },
  toast: { background: color.successSoft, color: color.successText, padding: "10px 14px", borderRadius: 9, fontSize: 12.5, marginBottom: 18, fontWeight: 600 },

  plansGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, marginBottom: 16, marginTop: 20 },
  planCard: { position: "relative", background: color.surface, border: `1px solid ${color.border}`, borderRadius: 16, padding: "26px 24px 24px" },
  planCardPopular: { border: `2px solid ${color.accent}`, boxShadow: "0 8px 24px rgba(91,91,214,.12)" },
  popularBadge: { position: "absolute", top: -12, left: 24, background: color.accent, color: "#fff", fontSize: 10.5, fontWeight: 700, padding: "4px 12px", borderRadius: 999, letterSpacing: "0.03em" },
  planName: { fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: color.inkSoft },
  planPrice: { fontSize: 32, fontWeight: 700, margin: "8px 0 18px", fontFamily: "'Space Grotesk', sans-serif", color: color.ink },
  planPeriod: { fontSize: 13, fontWeight: 400, color: color.inkSoft },
  savingsText: { fontSize: 11.5, color: color.successText, fontWeight: 600, marginTop: -14, marginBottom: 14 },

  cycleToggle: { display: "inline-flex", background: color.borderSoft, borderRadius: 10, padding: 4, gap: 4, marginTop: 20, marginBottom: 8 },
  cycleBtn: { border: "none", background: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: color.inkSoft, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 },
  cycleBtnActive: { background: color.surface, color: color.ink, boxShadow: "0 1px 4px rgba(26,27,46,.08)" },
  saveBadge: { fontSize: 10, fontWeight: 700, color: color.successText, background: color.successSoft, padding: "2px 7px", borderRadius: 999 },
  featureList: { listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 10 },
  featureItem: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: color.ink },
  checkIcon: { color: color.accent, flex: "0 0 auto" },

  primaryBtn: { width: "100%", background: color.ink, color: "#fff", border: "none", padding: "12px", borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: "pointer" },
  primaryBtnPopular: { width: "100%", background: color.accent, color: "#fff", border: "none", padding: "12px", borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: "pointer" },
  currentBtn: { width: "100%", background: color.borderSoft, color: color.inkSoft, border: "none", padding: "12px", borderRadius: 10, fontWeight: 600, fontSize: 13.5 },
  cancelLink: { background: "none", border: "none", color: color.danger, fontSize: 12.5, textDecoration: "underline", cursor: "pointer", marginBottom: 24 },

  usageCard: { padding: 22 },
  usageLabel: { fontSize: 12.5, fontWeight: 600, color: color.inkSoft, marginBottom: 10 },
  usageBarTrack: { height: 10, background: color.borderSoft, borderRadius: 999, overflow: "hidden" },
  usageBarFill: { height: "100%", background: color.accent, borderRadius: 999, transition: "width .3s" },
  usageText: { fontSize: 12, color: color.inkFaint, marginTop: 8 },

  loadingRow: { display: "flex", gap: 6, marginTop: 100, justifyContent: "center" },
  loadingDot: { width: 8, height: 8, borderRadius: "50%", background: color.accent, display: "inline-block" },
  loadingText: { color: color.inkSoft, fontSize: 13.5, textAlign: "center", marginTop: 10 },
};