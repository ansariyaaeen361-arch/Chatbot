import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { color, globalStyles } from "../theme";

export default function BillingConfirm() {
  const [status, setStatus] = useState("confirming");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subscriptionId = params.get("subscription_id");
    const plan = params.get("plan");

    if (!subscriptionId) {
      setStatus("error");
      return;
    }

    api.post("/billing/confirm", { subscriptionId, plan })
      .then(() => {
        window.location.href = "/billing?success=true";
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div style={s.page}>
      <style>{globalStyles}</style>
      <div style={s.card}>
        {status === "confirming" && (
          <>
            <div style={s.loadingRow}>
              <span className="forge-dot" style={{ ...s.loadingDot, animationDelay: "0s" }} />
              <span className="forge-dot" style={{ ...s.loadingDot, animationDelay: ".2s" }} />
              <span className="forge-dot" style={{ ...s.loadingDot, animationDelay: ".4s" }} />
            </div>
            <p style={s.text}>Confirming your subscription…</p>
            <p style={s.subtext}>This should only take a moment.</p>
          </>
        )}

        {status === "error" && (
          <>
            <div style={s.errorIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4M12 17h.01M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.7 3.86a2 2 0 00-3.4 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p style={s.text}>Something went wrong confirming your subscription.</p>
            <p style={s.subtext}>No charge was made if this failed early — check your billing page for the current status.</p>
            <Link to="/billing" className="forge-btn-primary" style={s.backBtn}>← Back to billing</Link>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: color.bg, fontFamily: "'Inter', 'Segoe UI', sans-serif", padding: 24 },
  card: { background: color.surface, border: `1px solid ${color.border}`, borderRadius: 16, padding: "40px 36px", maxWidth: 380, width: "100%", textAlign: "center" },
  loadingRow: { display: "flex", gap: 6, justifyContent: "center", marginBottom: 18 },
  loadingDot: { width: 9, height: 9, borderRadius: "50%", background: color.accent, display: "inline-block" },
  errorIcon: { width: 44, height: 44, borderRadius: "50%", background: color.dangerSoft, color: color.danger, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" },
  text: { fontSize: 15, fontWeight: 600, color: color.ink, margin: "0 0 6px", fontFamily: "'Space Grotesk', sans-serif" },
  subtext: { fontSize: 13, color: color.inkSoft, margin: 0, lineHeight: 1.5 },
  backBtn: { display: "inline-block", marginTop: 20, padding: "10px 22px", borderRadius: 9, fontWeight: 600, fontSize: 13.5, textDecoration: "none" },
};