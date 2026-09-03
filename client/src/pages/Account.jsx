import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import Sidebar from "../components/Sidebar";
import BackToDashboard from "../components/BackToDashboard";
import { color, layout, globalStyles } from "../theme";

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
      setResendMsg(res.data.alreadyVerified ? "Your email is already verified." : "Verification email sent. Check your inbox.");
    } catch (err) {
      setResendMsg(err.response?.data?.error || "Could not send verification email");
    } finally {
      setResending(false);
    }
  };

  if (!account) {
    return (
      <div style={layout.shell} className="forge-shell">
        <style>{globalStyles}</style>
        <Sidebar />
        <main style={layout.main(640)} className="forge-main">
          <div style={s.loadingText}>Loading account…</div>
        </main>
      </div>
    );
  }

  return (
    <div style={layout.shell} className="forge-shell">
      <style>{globalStyles}</style>
      <Sidebar />

      <main style={layout.main(640)} className="forge-main">
        <BackToDashboard />
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

        <div className="forge-card" style={{ ...s.card, marginTop: 20 }}>
          <div style={s.cardAccentBar} />
          <h2 style={s.cardTitle}>Password</h2>
          <p style={s.cardDesc}>Choose a new password (at least 6 characters).</p>

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
      </main>
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

const s = {
  header: { margin: "0 0 20px" },
  eyebrow: { fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: color.inkFaint, fontWeight: 600, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" },
  title: { fontSize: 24, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em", fontFamily: "'Space Grotesk', sans-serif" },
  subtitle: { fontSize: 13.5, color: color.inkSoft, margin: 0 },

  verifyBanner: { display: "flex", justifyContent: "space-between", alignItems: "center", background: color.sidebar, color: "#E7E7F0", padding: "14px 18px", borderRadius: 12, marginBottom: 14 },
  resendBtn: { background: "rgba(255,255,255,.1)", color: "#fff", border: "1px solid rgba(255,255,255,.18)", padding: "8px 14px", borderRadius: 100, cursor: "pointer", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" },
  toast: { background: color.successSoft, color: color.successText, padding: "9px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, marginBottom: 14 },

  card: { position: "relative", background: color.surface, border: `1px solid ${color.border}`, borderRadius: 14, padding: "24px 24px 24px 28px", overflow: "hidden" },
  cardAccentBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: color.accent },
  cardTitle: { fontSize: 17, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.01em", fontFamily: "'Space Grotesk', sans-serif" },
  cardDesc: { fontSize: 13, color: color.inkSoft, margin: 0 },

  label: { display: "block", fontSize: 12, color: color.inkSoft, fontWeight: 600, marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1px solid ${color.border}`, borderRadius: 9, fontSize: 13.5, fontFamily: "inherit", background: "#FBFBFD", color: color.ink },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },

  primaryBtn: { background: color.accent, color: "#fff", border: "none", padding: "10px 20px", borderRadius: 100, fontWeight: 600, fontSize: 13.5, cursor: "pointer" },

  errorBox: { background: color.dangerSoft, color: color.danger, padding: "9px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 14 },
  successBox: { background: color.successSoft, color: color.successText, padding: "9px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 14 },

  loadingText: { color: color.inkSoft, fontSize: 13.5, padding: "40px 0" },
};