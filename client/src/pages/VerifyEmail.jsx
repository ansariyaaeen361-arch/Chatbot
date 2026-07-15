import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../api/axios";
import { color, globalStyles } from "../theme";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token found in the link.");
      return;
    }
    api
      .post("/auth/verify-email", { token })
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.error || "This verification link is invalid or has expired.");
      });
  }, [token]);

  return (
    <div style={s.wrap}>
      <style>{globalStyles}</style>
      <div style={s.glowTop} />
      <div style={s.glowBottom} />

      <div className="forge-card" style={s.card}>
        {status !== "verifying" && (
          <div style={s.logoRow}>
            <div style={s.logoMark}>M</div>
            <div style={s.logoWordmark}>MentalForge <span style={s.logoWordmarkAccent}>AI</span></div>
          </div>
        )}

        {status === "verifying" && (
          <>
            <div style={s.loadingRow}>
              <span className="forge-dot" style={{ ...s.loadingDot, animationDelay: "0s" }} />
              <span className="forge-dot" style={{ ...s.loadingDot, animationDelay: ".2s" }} />
              <span className="forge-dot" style={{ ...s.loadingDot, animationDelay: ".4s" }} />
            </div>
            <h2 style={s.title}>Verifying your email…</h2>
            <p style={s.desc}>Please wait a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div style={s.badgeSuccess}>
              <CheckIcon />
            </div>
            <h2 style={s.title}>Email verified</h2>
            <p style={s.desc}>Your email has been confirmed. You can now use all features.</p>
            <Link to="/login" className="forge-btn-primary" style={s.btn}>Go to login</Link>
          </>
        )}

        {status === "error" && (
          <>
            <div style={s.badgeError}>
              <AlertIcon />
            </div>
            <h2 style={s.title}>Verification failed</h2>
            <p style={s.desc}>{message}</p>
            <Link to="/login" className="forge-ghost" style={s.btnGhost}>Back to login</Link>
          </>
        )}
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 9v4M12 17h.01M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.7 3.86a2 2 0 00-3.4 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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

  loadingRow: { display: "flex", gap: 6, justifyContent: "center", marginBottom: 16 },
  loadingDot: { width: 9, height: 9, borderRadius: "50%", background: color.accent, display: "inline-block" },

  badgeSuccess: { width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", background: color.successSoft, color: color.successText },
  badgeError: { width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", background: color.dangerSoft, color: color.danger },

  title: { fontSize: 19, fontWeight: 700, margin: "0 0 8px", color: color.ink, fontFamily: "'Space Grotesk', sans-serif" },
  desc: { fontSize: 13.5, color: color.inkSoft, lineHeight: 1.5, margin: "0 0 20px" },
  btn: { display: "inline-block", padding: "10px 22px", borderRadius: 9, fontWeight: 600, fontSize: 13.5, textDecoration: "none" },
  btnGhost: { display: "inline-block", background: color.borderSoft, color: color.ink, padding: "10px 22px", borderRadius: 9, fontWeight: 600, fontSize: 13.5, textDecoration: "none" },
};