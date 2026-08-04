import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import Sidebar from "../components/Sidebar";
import { color, layout, globalStyles } from "../theme";

export default function Team() {
  const { user } = useAuth();
  const [team, setTeam] = useState([]);
  const [businessPlan, setBusinessPlan] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("agent");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [inviting, setInviting] = useState(false);

  const isAdmin = user?.role === "owner" || user?.role === "admin";

  useEffect(() => {
    loadTeam();
    api.get("/business/me").then((res) => setBusinessPlan(res.data.plan));
  }, []);

  function loadTeam() {
    api.get("/business/team").then((res) => setTeam(res.data));
  }

  async function handleRemove(member) {
    if (!confirm(`Remove ${member.name} from your team? They'll lose access immediately.`)) return;
    setError(""); setMsg("");
    try {
      await api.delete(`/business/team/${member._id}`);
      setMsg(`${member.name} removed.`);
      loadTeam();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to remove team member");
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    setError(""); setMsg("");
    setInviting(true);
    try {
      await api.post("/business/invite", { name, email, password, role });
      setMsg(`${name} added successfully.`);
      setName(""); setEmail(""); setPassword(""); setRole("agent");
      loadTeam();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add team member");
    } finally {
      setInviting(false);
    }
  }

  return (
    <div style={layout.shell} className="forge-shell">
      <style>{globalStyles}</style>
      <Sidebar />

      <main style={layout.main(640)} className="forge-main">
        <header style={s.header}>
          <div style={s.eyebrow}>Workspace</div>
          <h1 style={s.title}>Team</h1>
          <p style={s.subtitle}>Add the people who'll pick up live chats and manage this workspace.</p>
        </header>

        {isAdmin && ["trial", "starter"].includes(businessPlan) && (
          <div className="forge-card" style={s.card}>
            <h2 style={s.cardTitle}>Add a team member</h2>
            <p style={s.cardDesc}>Team members are available on Growth and Pro plans.</p>
            <Link to="/billing" className="forge-btn-primary" style={s.primaryBtn}>Upgrade your plan →</Link>
          </div>
        )}

        {isAdmin && businessPlan && !["trial", "starter"].includes(businessPlan) && (
          <div className="forge-card" style={s.card}>
            <h2 style={s.cardTitle}>Add a team member</h2>
            <p style={s.cardDesc}>Share these login details with them directly — they'll sign in with this email and password.</p>

            <form onSubmit={handleInvite}>
              {error && <div style={s.error}>{error}</div>}
              {msg && <div style={s.success}>{msg}</div>}

              <div style={s.row}>
                <Field label="Full name">
                  <input className="forge-input" style={s.input} value={name} onChange={(e) => setName(e.target.value)} required />
                </Field>
                <Field label="Role">
                  <select className="forge-input" style={s.input} value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="agent">Agent — handles own chats</option>
                    {user?.role === "owner" && <option value="admin">Admin — sees everything</option>}
                  </select>
                </Field>
              </div>

              <div style={s.row}>
                <Field label="Email">
                  <input className="forge-input" style={s.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </Field>
                <Field label="Temporary password">
                  <input className="forge-input" style={s.input} type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </Field>
              </div>

              <button className="forge-btn-primary" style={s.primaryBtn} type="submit" disabled={inviting}>
                {inviting ? "Adding…" : "Add team member"}
              </button>
            </form>
          </div>
        )}

        <div className="forge-card" style={{ ...s.card, marginTop: 20 }}>
          <h2 style={s.cardTitle}>Current team ({team.length})</h2>
          <div style={s.teamList}>
            {team.map((t) => {
              const isSelf = t.email === user?.email;
              return (
                <div key={t._id} style={s.teamRow}>
                  <div style={s.teamAvatar}>{t.name.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={s.teamName}>{t.name}</div>
                    <div style={s.teamEmail}>{t.email}</div>
                  </div>
                  <span style={{ ...s.roleBadge, ...(t.role === "owner" ? s.roleBadgeOwner : t.role === "admin" ? s.roleBadgeAdmin : s.roleBadgeAgent) }}>
                    {t.role}
                  </span>
                  {isAdmin && !isSelf && (
                    <button
                      className="forge-chip-remove"
                      style={s.chipRemove}
                      title={`Remove ${t.name}`}
                      onClick={() => handleRemove(t)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ flex: 1, marginBottom: 14 }}>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  );
}

const s = {
  header: { margin: "0 0 24px" },
  eyebrow: { fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: color.inkFaint, fontWeight: 600, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" },
  title: { fontSize: 25, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em", fontFamily: "'Space Grotesk', sans-serif" },
  subtitle: { fontSize: 13.5, color: color.inkSoft, margin: 0 },

  card: { background: color.surface, border: `1px solid ${color.border}`, borderRadius: 14, padding: 24 },
  cardTitle: { fontSize: 16, fontWeight: 700, margin: "0 0 4px", fontFamily: "'Space Grotesk', sans-serif" },
  cardDesc: { fontSize: 12.5, color: color.inkSoft, margin: "0 0 16px" },

  row: { display: "flex", gap: 14 },
  label: { display: "block", fontSize: 12, color: color.inkSoft, fontWeight: 600, marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1px solid ${color.border}`, borderRadius: 9, fontSize: 13.5, fontFamily: "inherit", background: "#FBFBFD" },

  primaryBtn: { background: color.accent, color: "#fff", border: "none", padding: "11px 22px", borderRadius: 9, fontWeight: 600, fontSize: 13.5, cursor: "pointer", marginTop: 4, display: "inline-block", textDecoration: "none" },

  error: { background: color.dangerSoft, color: color.danger, padding: "9px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 14 },
  success: { background: color.successSoft, color: color.successText, padding: "9px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 14 },

  teamList: { display: "flex", flexDirection: "column", gap: 10 },
  teamRow: { display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", borderBottom: `1px solid ${color.borderSoft}` },
  teamAvatar: { width: 34, height: 34, borderRadius: "50%", background: color.accentSoft, color: color.accentDeep, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13.5, flex: "0 0 auto" },
  teamName: { fontSize: 13.5, fontWeight: 600 },
  teamEmail: { fontSize: 12, color: color.inkSoft },
  roleBadge: { fontSize: 10.5, fontWeight: 700, padding: "4px 10px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.04em" },
  roleBadgeOwner: { background: "#F3E4C7", color: "#8A5A1F" },
  roleBadgeAdmin: { background: color.accentSoft, color: color.accentDeep },
  roleBadgeAgent: { background: color.borderSoft, color: color.inkSoft },
  chipRemove: { background: color.borderSoft, border: "none", borderRadius: 8, cursor: "pointer", padding: "0 12px", height: 30, color: color.danger, fontSize: 13, marginLeft: 10, flex: "0 0 auto" },
};