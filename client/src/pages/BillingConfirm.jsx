import { useEffect, useState } from "react";
import api from "../api/axios";

export default function BillingConfirm() {
  const [status, setStatus] = useState("confirming");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subscriptionId = params.get("subscription_id");
    const plan = params.get("plan");

    if (!subscriptionId) {
      setStatus("error");
      return;
    }

    api.post("/billing/confirm", { subscriptionId, plan })
      .then(() => {
        window.location.href = "/billing?success=true";
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      {status === "confirming" && <p>Confirming your subscription…</p>}
      {status === "error" && (
        <div style={{ textAlign: "center" }}>
          <p>Something went wrong confirming your subscription.</p>
          <a href="/billing">← Back to billing</a>
        </div>
      )}
    </div>
  );
}