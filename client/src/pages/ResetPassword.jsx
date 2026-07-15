import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { color, globalStyles } from "../theme";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | saving | success
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) { setError("No reset token found in the link."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setStatus("saving");
    try {
      await api.post("/auth/reset-password", { token, newPassword: password });
      setStatus("success");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setStatus("idle");
      setError(err.response?.data?.error || "This reset link is invalid or has expired.");
    }
  };

  if (status === "success") {
    return (
      <div style={s.wrap}>
        <style>{globalStyles}</style>
        <div style={s.glowTop} />
        <div style={s.glowBottom} />
        <div className="forge-card" style={s.card}>
          <div style={s.badgeSuccess}>
            <CheckIcon />
          </div>
          <h2 style={s.title}>Password reset</h2>
          <p style={s.desc}>Redirecting you to login…</p>
        </div>
      </div>
    );
  }

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

        <h2 style={s.title}>Set a new password</h2>
        <p style={s.desc}>Choose a new password for your account.</p>

        <form onSubmit={submit} style={{ textAlign: "left" }}>
          <label style={s.label}>New password</label>
          <div style={s.passwordWrap}>
            <input
              type={showPassword ? "text" : "password"}
              className="forge-input"
              style={{ ...s.input, paddingRight: 40 }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
            <button
              type="button"
              style={s.eyeBtn}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          <label style={s.label}>Confirm password</label>
          <input
            type={showPassword ? "text" : "password"}
            className="forge-input"
            style={s.input}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter password"
          />

          {error && <p style={s.error}>{error}</p>}

          <button className="forge-btn-primary" type="submit" style={s.btnFull} disabled={status === "saving"}>
            {status === "saving" ? "Saving…" : "Reset password"}
          </button>
        </form>

        <Link to="/login" style={s.backLink}>Back to login</Link>
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a20.4 20.4 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 7 11 7a20.36 20.36 0 01-3.22 4.4M14.12 14.12a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 1l22 22" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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

  badgeSuccess: { width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", background: color.successSoft, color: color.successText },
  title: { fontSize: 19, fontWeight: 700, margin: "0 0 8px", color: color.ink, textAlign: "center", fontFamily: "'Space Grotesk', sans-serif" },
  desc: { fontSize: 13.5, color: color.inkSoft, lineHeight: 1.5, margin: "0 0 20px", textAlign: "center" },
  label: { display: "block", fontSize: 12, color: color.inkSoft, fontWeight: 600, marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1px solid ${color.border}`, borderRadius: 9, fontSize: 13.5, fontFamily: "inherit", background: "#FBFBFD", marginBottom: 14, color: color.ink },

  passwordWrap: { position: "relative" },
  eyeBtn: { position: "absolute", right: 4, top: 8, width: 32, height: 32, border: "none", background: "none", color: color.inkFaint, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: 6 },

  error: { color: color.danger, fontSize: 12.5, margin: "-6px 0 14px" },
  btnFull: { width: "100%", padding: "11px", borderRadius: 9, fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer" },
  backLink: { display: "inline-block", marginTop: 16, fontSize: 12.5, color: color.inkSoft, textDecoration: "none" },
};