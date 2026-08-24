import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { color } from "../theme";

// Only owner/admin actually have a Dashboard to go back to (the /dashboard route
// itself is role-gated), so this renders nothing for other roles like "agent".
export default function BackToDashboard() {
  const { user } = useAuth();
  if (!user || !["owner", "admin"].includes(user.role)) return null;

  return (
    <Link to="/dashboard" style={s.link} className="forge-ghost">
      <ArrowIcon />
      Back
    </Link>
  );
}

function ArrowIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

const s = {
  link: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: color.inkSoft, textDecoration: "none", padding: "6px 10px 6px 8px", borderRadius: 8, marginBottom: 14 },
};
