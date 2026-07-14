import { useState } from "react";
import api from "../api/axios";

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
      <div style={s.card}>
        <div style={{ ...s.badge, background: "#FFF4D6", color: "#8A6D00" }}>✉</div>
        <h2 style={s.title}>Verify your email</h2>
        <p style={s.desc}>
          We've sent a verification link to your email address.
          Please check your inbox and click the link to activate your account.
        </p>

        {message && <p style={{ ...s.desc, color: status === "error" ? "#B3453B" : "#2B5C3A" }}>{message}</p>}

        <button style={s.btnFull} onClick={resend} disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Resend verification email"}
        </button>

        <a href="/login" style={s.backLink}>Back to login</a>
      </div>
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#EDEFEE", fontFamily: "'Inter', 'Segoe UI', sans-serif", padding: 20 },
  card: { background: "#fff", border: "1px solid #DBDFDC", borderRadius: 14, padding: "36px 32px", maxWidth: 380, width: "100%", textAlign: "center", boxShadow: "0 2px 10px rgba(0,0,0,.04)" },
  badge: { width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, margin: "0 auto 14px" },
  title: { fontSize: 19, fontWeight: 700, margin: "0 0 8px", color: "#1A1918" },
  desc: { fontSize: 13.5, color: "#686C67", lineHeight: 1.5, margin: "0 0 20px" },
  btnFull: { width: "100%", background: "#2F5D8A", color: "#fff", border: "none", padding: "11px", borderRadius: 9, fontWeight: 600, fontSize: 14, cursor: "pointer" },
  backLink: { display: "inline-block", marginTop: 16, fontSize: 12.5, color: "#686C67", textDecoration: "none" },
};  