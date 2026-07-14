import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axios";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
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
        <div style={s.card}>
          <div style={{ ...s.badge, background: "#E4EDE6", color: "#2B5C3A" }}>✓</div>
          <h2 style={s.title}>Password reset</h2>
          <p style={s.desc}>Redirecting you to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <h2 style={s.title}>Set a new password</h2>
        <p style={s.desc}>Choose a new password for your account.</p>

        <form onSubmit={submit} style={{ textAlign: "left" }}>
          <label style={s.label}>New password</label>
          <input
            type="password"
            style={s.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />

          <label style={s.label}>Confirm password</label>
          <input
            type="password"
            style={s.input}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter password"
          />

          {error && <p style={s.error}>{error}</p>}

          <button type="submit" style={s.btnFull} disabled={status === "saving"}>
            {status === "saving" ? "Saving…" : "Reset password"}
          </button>
        </form>

        <Link to="/login" style={s.backLink}>Back to login</Link>
      </div>
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#EDEFEE", fontFamily: "'Inter', 'Segoe UI', sans-serif", padding: 20 },
  card: { background: "#fff", border: "1px solid #DBDFDC", borderRadius: 14, padding: "36px 32px", maxWidth: 380, width: "100%", textAlign: "center", boxShadow: "0 2px 10px rgba(0,0,0,.04)" },
  badge: { width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, margin: "0 auto 14px" },
  title: { fontSize: 19, fontWeight: 700, margin: "0 0 8px", color: "#1A1918", textAlign: "center" },
  desc: { fontSize: 13.5, color: "#686C67", lineHeight: 1.5, margin: "0 0 20px", textAlign: "center" },
  label: { display: "block", fontSize: 12, color: "#686C67", fontWeight: 600, marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #DBDFDC", borderRadius: 9, fontSize: 13.5, fontFamily: "inherit", background: "#FBFBFA", marginBottom: 14 },
  error: { color: "#B3453B", fontSize: 12.5, margin: "-6px 0 14px" },
  btnFull: { width: "100%", background: "#2F5D8A", color: "#fff", border: "none", padding: "11px", borderRadius: 9, fontWeight: 600, fontSize: 14, cursor: "pointer" },
  backLink: { display: "inline-block", marginTop: 16, fontSize: 12.5, color: "#686C67", textDecoration: "none" },
};  