import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Sidebar from "../components/Sidebar";
import BackToDashboard from "../components/BackToDashboard";
import { color, layout, globalStyles } from "../theme";

const PLANS = [
  { id: "trial", name: "Free", monthlyPrice: 0, yearlyPrice: 0, popular: false, free: true,
    features: ["FAQ + AI chat widget", "Up to $1/mo AI usage", "500 conversations/mo", "1 team member"] },
  { id: "starter", name: "Starter", monthlyPrice: 25, yearlyPrice: 250, popular: false,
    features: ["FAQ + AI chat widget", "Live agent handoff", "Knowledge base", "Full branding customization", "Lead capture", "Up to $10/mo AI usage", "1 team member"] },
  { id: "basic", name: "Growth", monthlyPrice: 60, yearlyPrice: 650, popular: true,
    features: ["Everything in Starter", "Analytics dashboard", "Team management + transfer", "Up to $25/mo AI usage", "5 team members"] },
  { id: "pro", name: "Pro", monthlyPrice: 199, yearlyPrice: 2000, popular: false,
    features: ["Everything in Growth", "Up to $80/mo AI usage", "10,000 conversations/mo", "10 team members", "Priority support", "Dedicated onboarding"] }
];

function yearlySavingsPct(p) {
  return Math.round(((p.monthlyPrice * 12 - p.yearlyPrice) / (p.monthlyPrice * 12)) * 100);
}

export default function Billing() {
  const [status, setStatus] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [msg, setMsg] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [promoCode, setPromoCode] = useState("");
  const [promoMsg, setPromoMsg] = useState("");
  const [promoError, setPromoError] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    loadStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get("canceled")) setMsg("Checkout was canceled. Nothing was changed.");
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

  async function redeemPromo(e) {
    e.preventDefault();
    if (!promoCode.trim()) return;
    setRedeeming(true);
    setPromoMsg("");
    setPromoError("");
    try {
      const res = await api.post("/billing/redeem-promo", { code: promoCode.trim() });
      setPromoMsg(`Promo applied — you're now on the ${res.data.plan} plan.`);
      setPromoCode("");
      loadStatus();
    } catch (err) {
      setPromoError(err.response?.data?.error || "Could not apply that promo code");
    } finally {
      setRedeeming(false);
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
        <main style={layout.main(1100)} className="forge-main">
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

      <main style={layout.main(1100)} className="forge-main">
        <BackToDashboard />
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
            const isCurrent = status.plan === p.id && (p.free || status.planStatus === "active");
            const price = billingCycle === "yearly" ? p.yearlyPrice : p.monthlyPrice;
            const period = p.free ? "" : billingCycle === "yearly" ? "/year" : "/month";
            return (
              <div
                key={p.id}
                id={`plan-${p.id}`}
                className="forge-card"
                style={{ ...s.planCard, ...(p.popular ? s.planCardPopular : {}), ...(isCurrent ? s.planCardCurrent : {}) }}
              >
                {p.popular && <div style={s.popularBadge}>Most popular</div>}
                {isCurrent && <div style={s.activeBadge}>Active</div>}
                <div style={s.planName}>{p.name}</div>
                <div style={s.planPrice}>${price}<span style={s.planPeriod}>{period}</span></div>
                {!p.free && billingCycle === "yearly" && (
                  <div style={s.savingsText}>Save {yearlySavingsPct(p)}% vs monthly</div>
                )}
                <ul style={s.featureList}>
                  {p.features.map((f, i) => (
                    <li key={i} style={s.featureItem}>
                      <CheckIcon /> {f}
                    </li>
                  ))}
                </ul>
                <div style={s.planCardSpacer} />
                {isCurrent ? (
                  <button style={s.currentBtn} disabled>Current plan</button>
                ) : p.free ? (
                  <button style={s.downgradeBtn} onClick={cancelPlan}>Free</button>
                ) : (
                  <button
                    className="forge-btn-primary"
                    style={p.popular ? s.primaryBtnPopular : s.primaryBtn}
                    onClick={() => subscribe(p.id)}
                    disabled={loadingPlan === p.id}
                  >
                    {loadingPlan === p.id ? "Redirecting…" : "Subscribe"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div style={s.promoCard}>
          <div style={s.promoLabel}>Have a promo code?</div>
          <form style={s.promoRow} onSubmit={redeemPromo}>
            <input
              className="forge-input"
              style={s.promoInput}
              placeholder="Enter code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
            />
            <button className="forge-btn-primary" style={s.promoBtn} type="submit" disabled={redeeming || !promoCode.trim()}>
              {redeeming ? "Applying…" : "Apply"}
            </button>
          </form>
          {promoMsg && <div style={s.promoSuccess}>{promoMsg}</div>}
          {promoError && <div style={s.promoErrorText}>{promoError}</div>}
        </div>

        <div style={s.usageCard}>
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

  plansGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18, marginBottom: 16, marginTop: 20, alignItems: "stretch" },
  planCard: { position: "relative", background: color.surface, border: `1px solid ${color.border}`, borderRadius: 16, padding: "26px 24px 24px", display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" },
  planCardPopular: { border: `2px solid ${color.accent}`, boxShadow: "0 8px 24px rgba(91,91,214,.12)" },
  planCardCurrent: { border: `2px solid ${color.successText}`, boxShadow: "0 8px 24px rgba(30,150,90,.10)" },
  planCardSpacer: { flex: "1 1 auto" },
  popularBadge: { position: "absolute", top: -12, left: 24, background: color.accent, color: "#fff", fontSize: 10.5, fontWeight: 700, padding: "4px 12px", borderRadius: 999, letterSpacing: "0.03em" },
  activeBadge: { position: "absolute", top: -12, right: 24, background: color.successText, color: "#fff", fontSize: 10.5, fontWeight: 700, padding: "4px 12px", borderRadius: 999, letterSpacing: "0.03em" },
  planName: { fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: color.inkSoft },
  planPrice: { fontSize: 32, fontWeight: 700, margin: "8px 0 18px", fontFamily: "'Space Grotesk', sans-serif", color: color.ink },
  planPeriod: { fontSize: 13, fontWeight: 400, color: color.inkSoft },
  savingsText: { fontSize: 11.5, color: color.successText, fontWeight: 600, marginTop: -14, marginBottom: 14 },

  cycleToggle: { display: "inline-flex", background: color.borderSoft, borderRadius: 100, padding: 4, gap: 4, marginTop: 20, marginBottom: 8 },
  cycleBtn: { border: "none", background: "none", padding: "8px 16px", borderRadius: 100, fontSize: 13, fontWeight: 600, color: color.inkSoft, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 },
  cycleBtnActive: { background: color.surface, color: color.ink, boxShadow: "0 1px 4px rgba(26,27,46,.08)" },
  saveBadge: { fontSize: 10, fontWeight: 700, color: color.successText, background: color.successSoft, padding: "2px 7px", borderRadius: 999 },
  featureList: { listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 10 },
  featureItem: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: color.ink },
  checkIcon: { color: color.accent, flex: "0 0 auto" },

  primaryBtn: { width: "100%", background: color.ink, color: "#fff", border: "none", padding: "12px", borderRadius: 100, fontWeight: 600, fontSize: 13.5, cursor: "pointer" },
  primaryBtnPopular: { width: "100%", background: color.accent, color: "#fff", border: "none", padding: "12px", borderRadius: 100, fontWeight: 600, fontSize: 13.5, cursor: "pointer" },
  currentBtn: { width: "100%", background: color.borderSoft, color: color.inkSoft, border: "none", padding: "12px", borderRadius: 100, fontWeight: 600, fontSize: 13.5 },
  downgradeBtn: { width: "100%", background: "none", color: color.inkSoft, border: `1px solid ${color.border}`, padding: "12px", borderRadius: 100, fontWeight: 600, fontSize: 13.5, cursor: "pointer", boxSizing: "border-box" },

  promoCard: { padding: 20, marginBottom: 16 },
  promoLabel: { fontSize: 12.5, fontWeight: 600, color: color.inkSoft, marginBottom: 10 },
  promoRow: { display: "flex", gap: 10 },
  promoInput: { flex: 1, maxWidth: 260, boxSizing: "border-box", padding: "10px 14px", border: `1px solid ${color.border}`, borderRadius: 100, fontSize: 13.5, fontFamily: "inherit", background: "#FBFBFD" },
  promoBtn: { background: color.ink, color: "#fff", border: "none", padding: "10px 22px", borderRadius: 100, fontWeight: 600, fontSize: 13.5, cursor: "pointer" },
  promoSuccess: { fontSize: 12.5, color: color.successText, fontWeight: 600, marginTop: 10 },
  promoErrorText: { fontSize: 12.5, color: color.danger, fontWeight: 600, marginTop: 10 },

  usageCard: { padding: 22 },
  usageLabel: { fontSize: 12.5, fontWeight: 600, color: color.inkSoft, marginBottom: 10 },
  usageBarTrack: { height: 10, background: color.borderSoft, borderRadius: 999, overflow: "hidden" },
  usageBarFill: { height: "100%", background: color.accent, borderRadius: 999, transition: "width .3s" },
  usageText: { fontSize: 12, color: color.inkFaint, marginTop: 8 },

  loadingRow: { display: "flex", gap: 6, marginTop: 100, justifyContent: "center" },
  loadingDot: { width: 8, height: 8, borderRadius: "50%", background: color.accent, display: "inline-block" },
  loadingText: { color: color.inkSoft, fontSize: 13.5, textAlign: "center", marginTop: 10 },
};