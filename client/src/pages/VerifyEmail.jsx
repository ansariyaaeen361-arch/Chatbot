import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../api/axios";

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
      <style>{`@keyframes vSpin { to { transform: rotate(360deg); } }`}</style>
      <div style={s.card}>
        {status === "verifying" && (
          <>
            <div style={s.spinner} />
            <h2 style={s.title}>Verifying your email…</h2>
            <p style={s.desc}>Please wait a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{ ...s.badge, background: "#E4EDE6", color: "#2B5C3A" }}>✓</div>
            <h2 style={s.title}>Email verified</h2>
            <p style={s.desc}>Your email has been confirmed. You can now use all features.</p>
            <Link to="/login" style={s.btn}>Go to login</Link>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ ...s.badge, background: "#F6E4E2", color: "#B3453B" }}>!</div>
            <h2 style={s.title}>Verification failed</h2>
            <p style={s.desc}>{message}</p>
            <Link to="/login" style={s.btnGhost}>Back to login</Link>
          </>
        )}
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
  btn: { display: "inline-block", background: "#2F5D8A", color: "#fff", padding: "10px 22px", borderRadius: 9, fontWeight: 600, fontSize: 13.5, textDecoration: "none" },
  btnGhost: { display: "inline-block", background: "#EDEAE5", color: "#1A1918", padding: "10px 22px", borderRadius: 9, fontWeight: 600, fontSize: 13.5, textDecoration: "none" },
  spinner: { width: 34, height: 34, border: "3px solid #DBDFDC", borderTopColor: "#2F5D8A", borderRadius: "50%", margin: "0 auto 16px", animation: "vSpin .8s linear infinite" },
};