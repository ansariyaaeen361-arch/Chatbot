import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Start() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const plan = params.get("plan") || "basic";

  useEffect(() => {
    if (user) {
      navigate(`/billing?plan=${plan}`);
    } else {
      navigate(`/signup?plan=${plan}`);
    }
  }, [user]);

  return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>Redirecting…</div>;
}