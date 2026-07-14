import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

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
    <div style={s.shell}>
      <div style={s.wrap}>
        <a href="/dashboard" style={s.backLink}>← Back to dashboard</a>

        <header style={s.header}>
          <div style={s.eyebrow}>Workspace</div>
          <h1 style={s.title}>Team</h1>
          <p style={s.subtitle}>Add the people who'll pick up live chats and manage this workspace.</p>
        </header>

        {isAdmin && businessPlan === "trial" && (
          <div style={s.card}>
            <h2 style={s.cardTitle}>Add a team member</h2>
            <p style={s.cardDesc}>Team members are available on Basic and Pro plans.</p>
            <a href="/billing" style={s.primaryBtn}>Upgrade your plan →</a>
          </div>
        )}

        {isAdmin && businessPlan && businessPlan !== "trial" && (
          <div style={s.card}>
            <h2 style={s.cardTitle}>Add a team member</h2>
            <p style={s.cardDesc}>Share these login details with them directly — they'll sign in with this email and password.</p>
          
            <form onSubmit={handleInvite}>
              {error && <div style={s.error}>{error}</div>}
              {msg && <div style={s.success}>{msg}</div>}

              <div style={s.row}>
                <Field label="Full name">
                  <input style={s.input} value={name} onChange={(e) => setName(e.target.value)} required />
                </Field>
                <Field label="Role">
                  <select style={s.input} value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="agent">Agent — handles own chats</option>
                    <option value="admin">Admin — sees everything</option>
                  </select>
                </Field>
              </div>

              <div style={s.row}>
                <Field label="Email">
                  <input style={s.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </Field>
                <Field label="Temporary password">
                  <input style={s.input} type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </Field>
              </div>

              <button style={s.primaryBtn} type="submit" disabled={inviting}>
                {inviting ? "Adding…" : "Add team member"}
              </button>
            </form>
          </div>
        )}

        <div style={{ ...s.card, marginTop: 20 }}>
          <h2 style={s.cardTitle}>Current team ({team.length})</h2>
          <div style={s.teamList}>
            {team.map((t) => (
              <div key={t._id} style={s.teamRow}>
                <div style={s.teamAvatar}>{t.name.charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={s.teamName}>{t.name}</div>
                  <div style={s.teamEmail}>{t.email}</div>
                </div>
                <span style={{ ...s.roleBadge, ...(t.role === "owner" ? s.roleBadgeOwner : t.role === "admin" ? s.roleBadgeAdmin : s.roleBadgeAgent) }}>
                  {t.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
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

const color = {
  bg: "#F6F5F2",
  surface: "#FFFFFF",
  border: "#E3DED4",
  borderSoft: "#EEEAE2",
  ink: "#1C1B19",
  inkSoft: "#6E685F",
  inkFaint: "#9B9488",
  accent: "#1F4B3F",
  accentSoft: "#E8EFEC",
  danger: "#B3261E",
  dangerSoft: "#F7E8E6",
};

const s = {
  shell: { minHeight: "100vh", background: color.bg, fontFamily: "'Segoe UI', ui-sans-serif, system-ui, sans-serif", color: color.ink, padding: "36px 24px" },
  wrap: { maxWidth: 640, margin: "0 auto" },
  backLink: { fontSize: 12.5, color: color.inkSoft, textDecoration: "none" },
  header: { margin: "16px 0 24px" },
  eyebrow: { fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: color.inkFaint, fontWeight: 600, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em" },
  subtitle: { fontSize: 13.5, color: color.inkSoft, margin: 0 },

  card: { background: color.surface, border: `1px solid ${color.border}`, borderRadius: 14, padding: 24 },
  cardTitle: { fontSize: 16, fontWeight: 700, margin: "0 0 4px" },
  cardDesc: { fontSize: 12.5, color: color.inkSoft, margin: "0 0 16px" },

  row: { display: "flex", gap: 14 },
  label: { display: "block", fontSize: 12, color: color.inkSoft, fontWeight: 600, marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1px solid ${color.border}`, borderRadius: 9, fontSize: 13.5, fontFamily: "inherit", background: "#FCFBF9" },

  primaryBtn: { background: color.accent, color: "#fff", border: "none", padding: "11px 22px", borderRadius: 9, fontWeight: 600, fontSize: 13.5, cursor: "pointer", marginTop: 4, display: "inline-block", textDecoration: "none" },

  error: { background: color.dangerSoft, color: color.danger, padding: "9px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 14 },
  success: { background: color.accentSoft, color: color.accent, padding: "9px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 14 },

  teamList: { display: "flex", flexDirection: "column", gap: 10 },
  teamRow: { display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", borderBottom: `1px solid ${color.borderSoft}` },
  teamAvatar: { width: 34, height: 34, borderRadius: "50%", background: color.accentSoft, color: color.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13.5, flex: "0 0 auto" },
  teamName: { fontSize: 13.5, fontWeight: 600 },
  teamEmail: { fontSize: 12, color: color.inkSoft },
  roleBadge: { fontSize: 10.5, fontWeight: 700, padding: "4px 10px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.04em" },
  roleBadgeOwner: { background: "#EFE6D8", color: "#8A5A1F" },
  roleBadgeAdmin: { background: color.accentSoft, color: color.accent },
  roleBadgeAgent: { background: color.borderSoft, color: color.inkSoft },
};