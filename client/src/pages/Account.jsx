import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

export default function Account() {
  const { user, setUser } = useAuth();
  const [account, setAccount] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordErr, setPasswordErr] = useState("");

  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  useEffect(() => {
    api.get("/account/me").then((res) => {
      setAccount(res.data);
      setName(res.data.name);
      setEmail(res.data.email);
    });
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileErr(""); setProfileMsg("");
    setSavingProfile(true);
    try {
      const res = await api.put("/account/me", { name, email });
      setAccount(res.data.user);
      setProfileMsg(
        res.data.user.email !== account.email
          ? "Saved. Please re-verify your new email address."
          : "Account details saved."
      );
    } catch (err) {
      setProfileErr(err.response?.data?.error || "Could not save changes");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPasswordErr(""); setPasswordMsg("");

    if (newPassword !== confirmPassword) {
      setPasswordErr("New passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      await api.put("/account/password", { currentPassword, newPassword });
      setPasswordMsg("Password updated.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      setPasswordErr(err.response?.data?.error || "Could not update password");
    } finally {
      setSavingPassword(false);
    }
  };

  const resendVerification = async () => {
    setResending(true);
    setResendMsg("");
    try {
      const res = await api.post("/auth/resend-verification");
      setResendMsg(res.data.alreadyVerified ? "Your email is already verified." : "Verification email sent — check your inbox.");
    } catch (err) {
      setResendMsg(err.response?.data?.error || "Could not send verification email");
    } finally {
      setResending(false);
    }
  };

  if (!account) {
    return (
      <div style={s.loadingWrap}>
        <style>{fontImport}</style>
        <div style={s.loadingText}>Loading account…</div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <style>{globalStyles}</style>
      <div style={s.wrap}>
        <a href="/dashboard" style={s.backLink}>← Back to dashboard</a>

        <header style={s.header}>
          <div style={s.eyebrow}>Workspace</div>
          <h1 style={s.title}>Account settings</h1>
          <p style={s.subtitle}>Manage your name, email, and password.</p>
        </header>

        {!account.isVerified && (
          <div style={s.verifyBanner}>
            <div>
              <strong style={{ fontWeight: 600 }}>Your email isn't verified yet.</strong>
              <div style={{ fontSize: 12.5, marginTop: 2, opacity: 0.85 }}>Check your inbox, or resend the link below.</div>
            </div>
            <button className="forge-ghost" style={s.resendBtn} onClick={resendVerification} disabled={resending}>
              {resending ? "Sending…" : "Resend email"}
            </button>
          </div>
        )}
        {resendMsg && <div style={s.toast}>{resendMsg}</div>}

        {/* ---- Profile card ---- */}
        <div className="forge-card" style={s.card}>
          <div style={s.cardAccentBar} />
          <h2 style={s.cardTitle}>Profile</h2>
          <p style={s.cardDesc}>Your name and login email.</p>

          <form onSubmit={saveProfile} style={{ marginTop: 16 }}>
            {profileErr && <div style={s.errorBox}>{profileErr}</div>}
            {profileMsg && <div style={s.successBox}>{profileMsg}</div>}

            <Field label="Full name">
              <input className="forge-input" style={s.input} value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Email">
              <input className="forge-input" style={s.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>

            <button className="forge-btn-primary" style={s.primaryBtn} type="submit" disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save profile"}
            </button>
          </form>
        </div>

        {/* ---- Password card ---- */}
        <div className="forge-card" style={{ ...s.card, marginTop: 20 }}>
          <div style={s.cardAccentBar} />
          <h2 style={s.cardTitle}>Password</h2>
          <p style={s.cardDesc}>Choose a new password — at least 6 characters.</p>

          <form onSubmit={savePassword} style={{ marginTop: 16 }}>
            {passwordErr && <div style={s.errorBox}>{passwordErr}</div>}
            {passwordMsg && <div style={s.successBox}>{passwordMsg}</div>}

            <Field label="Current password">
              <input className="forge-input" style={s.input} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </Field>
            <div style={s.twoCol}>
              <Field label="New password">
                <input className="forge-input" style={s.input} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
              </Field>
              <Field label="Confirm new password">
                <input className="forge-input" style={s.input} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
              </Field>
            </div>

            <button className="forge-btn-primary" style={s.primaryBtn} type="submit" disabled={savingPassword}>
              {savingPassword ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  );
}

/* ---------------- Design tokens (matches Dashboard.jsx "Forge" theme) ---------------- */
const color = {
  iron: "#15140F",
  bg: "#EDEFEE",
  surface: "#FFFFFF",
  border: "#DBDFDC",
  borderSoft: "#E8EAE7",
  ink: "#1A1918",
  inkSoft: "#686C67",
  inkFaint: "#9BA09A",
  temperBlue: "#2F5D8A",
  temperGold: "#C99A3B",
  danger: "#B3453B",
  dangerSoft: "#F3E1DF",
  successSoft: "#E4EDE6",
  successText: "#2B5C3A",
};

const fontImport = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap');`;

const globalStyles = `
${fontImport}
.forge-card { transition: box-shadow .2s ease, border-color .2s ease; }
.forge-card:hover { border-color: #C7CFC9; box-shadow: 0 3px 14px rgba(20,25,22,.05); }
.forge-input { transition: border-color .15s ease, box-shadow .15s ease; }
.forge-input:focus { outline: none; border-color: ${color.temperBlue}; box-shadow: 0 0 0 3px rgba(47,93,138,.13); }
.forge-btn-primary { transition: transform .12s ease, box-shadow .12s ease, background .15s ease; }
.forge-btn-primary:hover { box-shadow: 0 6px 16px rgba(47,93,138,.32); transform: translateY(-1px); }
.forge-btn-primary:active { transform: translateY(0) scale(.98); }
.forge-ghost { transition: background .15s ease; }
.forge-ghost:hover { background: #DEE3DE; }
@media (prefers-reduced-motion: reduce) {
  .forge-card, .forge-input, .forge-btn-primary, .forge-ghost { transition: none !important; }
}
`;

const s = {
  page: { minHeight: "100vh", background: color.bg, fontFamily: "'Inter', 'Segoe UI', sans-serif", color: color.ink, padding: "36px 24px" },
  wrap: { maxWidth: 640, margin: "0 auto" },
  backLink: { fontSize: 12.5, color: color.inkSoft, textDecoration: "none" },
  header: { margin: "16px 0 20px" },
  eyebrow: { fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: color.inkFaint, fontWeight: 600, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" },
  title: { fontSize: 24, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em", fontFamily: "'Space Grotesk', sans-serif" },
  subtitle: { fontSize: 13.5, color: color.inkSoft, margin: 0 },

  verifyBanner: { display: "flex", justifyContent: "space-between", alignItems: "center", background: color.iron, color: "#EDEAE3", padding: "14px 18px", borderRadius: 12, marginBottom: 14 },
  resendBtn: { background: "rgba(255,255,255,.1)", color: "#fff", border: "1px solid rgba(255,255,255,.18)", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" },
  toast: { background: color.successSoft, color: color.successText, padding: "9px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, marginBottom: 14 },

  card: { position: "relative", background: color.surface, border: `1px solid ${color.border}`, borderRadius: 14, padding: "24px 24px 24px 28px", overflow: "hidden" },
  cardAccentBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg, ${color.temperGold}, ${color.temperBlue})` },
  cardTitle: { fontSize: 17, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.01em", fontFamily: "'Space Grotesk', sans-serif" },
  cardDesc: { fontSize: 13, color: color.inkSoft, margin: 0 },

  label: { display: "block", fontSize: 12, color: color.inkSoft, fontWeight: 600, marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1px solid ${color.border}`, borderRadius: 9, fontSize: 13.5, fontFamily: "inherit", background: "#FBFBFA", color: color.ink },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },

  primaryBtn: { background: color.temperBlue, color: "#fff", border: "none", padding: "10px 20px", borderRadius: 9, fontWeight: 600, fontSize: 13.5, cursor: "pointer" },

  errorBox: { background: color.dangerSoft, color: color.danger, padding: "9px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 14 },
  successBox: { background: color.successSoft, color: color.successText, padding: "9px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 14 },

  loadingWrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: color.bg, fontFamily: "'Inter', sans-serif" },
  loadingText: { color: color.inkSoft, fontSize: 13.5 },
};