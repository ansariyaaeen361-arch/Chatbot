import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { color, globalStyles } from "../theme";

export default function VerifyEmailPending() {
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [message, setMessage] = useState("");

  const resend = async () => {
    setStatus("sending");
    setMessage("");
    try {
      await api.post("/auth/resend-verification");
      setStatus("sent");
      setMessage("Verification email sent again. Please check your inbox.");
    } catch (err) {
      setStatus("error");
      setMessage(err.response?.data?.error || "Could not resend. Please try again.");
    }
  };

  return (
    <div style={s.wrap}>
      <style>{globalStyles}</style>
      <div style={s.glowTop} />
      <div style={s.glowBottom} />

      <div className="forge-card" style={s.card}>
        <div style={s.logoRow}>
          <div style={s.logoMark}>M</div>
          <div style={s.logoWordmark}>MentalForge <span style={s.logoWordmarkAccent}>AI</span></div>
        </div>

        <div style={s.badge}>
          <MailIcon />
        </div>
        <h2 style={s.title}>Verify your email</h2>
        <p style={s.desc}>
          We've sent a verification link to your email address.
          Please check your inbox and click the link to activate your account.
        </p>

        {message && (
          <p style={{ ...s.statusMsg, color: status === "error" ? color.danger : color.successText }}>
            {message}
          </p>
        )}

        <button className="forge-btn-primary" style={s.btnFull} onClick={resend} disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Resend verification email"}
        </button>

        <Link to="/login" style={s.backLink}>Back to login</Link>
      </div>
    </div>
  );
}

function MailIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M2.5 6.5L12 13l9.5-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const s = {
  wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: color.bg, fontFamily: "'Inter', 'Segoe UI', sans-serif", position: "relative", overflow: "hidden", padding: 20 },
  glowTop: { position: "absolute", top: -160, left: "50%", transform: "translateX(-50%)", width: 480, height: 480, borderRadius: "50%", background: `radial-gradient(circle, ${color.accent}22, transparent 70%)`, pointerEvents: "none" },
  glowBottom: { position: "absolute", bottom: -200, right: -120, width: 420, height: 420, borderRadius: "50%", background: `radial-gradient(circle, ${color.accentDeep}18, transparent 70%)`, pointerEvents: "none" },

  card: { position: "relative", background: color.surface, border: `1px solid ${color.border}`, borderRadius: 18, padding: "36px 32px", maxWidth: 380, width: "100%", textAlign: "center", boxShadow: "0 24px 60px -24px rgba(26,27,46,.18)" },

  logoRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 22 },
  logoMark: { width: 36, height: 36, borderRadius: 10, background: color.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, fontFamily: "'Space Grotesk', sans-serif", flex: "0 0 auto" },
  logoWordmark: { fontSize: 15.5, fontWeight: 700, color: color.ink, letterSpacing: "-0.01em", fontFamily: "'Space Grotesk', sans-serif" },
  logoWordmarkAccent: { color: color.accent },

  badge: { width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", background: color.accentSoft, color: color.accentDeep },
  title: { fontSize: 19, fontWeight: 700, margin: "0 0 8px", color: color.ink, fontFamily: "'Space Grotesk', sans-serif" },
  desc: { fontSize: 13.5, color: color.inkSoft, lineHeight: 1.5, margin: "0 0 20px" },
  statusMsg: { fontSize: 13, lineHeight: 1.5, margin: "-8px 0 20px", fontWeight: 600 },
  btnFull: { width: "100%", padding: "11px", borderRadius: 9, fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer" },
  backLink: { display: "inline-block", marginTop: 16, fontSize: 12.5, color: color.inkSoft, textDecoration: "none" },
};