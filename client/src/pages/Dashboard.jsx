import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

export default function Dashboard() {
  const { user, businessId, logout } = useAuth();
  const [business, setBusiness] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get("/business/me").then((res) => setBusiness(res.data));
  }, []);

  const updateField = (field, value) => {
    setBusiness((prev) => ({ ...prev, [field]: value }));
  };

  const analyzeWebsite = async () => {
    if (!websiteUrl) { alert("Please enter your website URL"); return; }
    setAnalyzing(true);
    try {
      const res = await api.post("/onboarding/analyze", { url: websiteUrl });
      setBusiness((prev) => ({
        ...prev,
        name: res.data.name || prev.name,
        description: res.data.description || prev.description,
        services: res.data.services || prev.services,
        targetCustomer: res.data.targetCustomer || prev.targetCustomer,
        tone: res.data.tone || prev.tone,
        website: websiteUrl,
      }));
      flashMsg("Auto-filled from your website — review below and save.");
    } catch (err) {
      alert(err.response?.data?.error || "Could not analyze that website");
    } finally {
      setAnalyzing(false);
    }
  };

  const flashMsg = (text, ms = 3500) => {
    setSavedMsg(text);
    setTimeout(() => setSavedMsg(""), ms);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const payload = {
        name: business.name,
        website: business.website,
        description: business.description,
        services: business.services,
        targetCustomer: business.targetCustomer,
        tone: business.tone,
        brandColor: business.brandColor,
        ctaLinks: business.ctaLinks,
      };
      const res = await api.put("/business/me", payload);
      setBusiness(res.data);
      flashMsg("Profile saved.");
    } catch (err) {
      flashMsg("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("logo", file);
    const res = await api.post("/business/logo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setBusiness((prev) => ({ ...prev, logoUrl: res.data.logoUrl }));
  };

  const addService = () => updateField("services", [...business.services, ""]);
  const updateService = (i, val) => {
    const copy = [...business.services];
    copy[i] = val;
    updateField("services", copy);
  };
  const removeService = (i) =>
    updateField("services", business.services.filter((_, idx) => idx !== i));

  const addCta = () => updateField("ctaLinks", [...business.ctaLinks, { label: "", url: "" }]);
  const updateCta = (i, field, val) => {
    const copy = [...business.ctaLinks];
    copy[i][field] = val;
    updateField("ctaLinks", copy);
  };
  const removeCta = (i) =>
    updateField("ctaLinks", business.ctaLinks.filter((_, idx) => idx !== i));

  const saveFaqs = async () => {
    setSaving(true);
    const res = await api.put("/business/faqs", { faqs: business.faqs });
    setBusiness((prev) => ({ ...prev, faqs: res.data.faqs }));
    setSaving(false);
    flashMsg("FAQs saved.");
  };
  const addFaq = () => updateField("faqs", [...business.faqs, { question: "", answer: "" }]);
  const updateFaq = (i, field, val) => {
    const copy = [...business.faqs];
    copy[i][field] = val;
    updateField("faqs", copy);
  };
  const removeFaq = (i) =>
    updateField("faqs", business.faqs.filter((_, idx) => idx !== i));

  const embedCode = `<script src="http://localhost:5000/widget.js" data-business="${businessId}"></script>`;

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!business) {
    return (
      <div style={s.loadingWrap}>
        <style>{fontImport}</style>
        <div style={s.loadingCard}>
          <div style={s.loadingRow}>
            <span className="forge-dot" style={{ ...s.loadingDot, animationDelay: "0s" }} />
            <span className="forge-dot" style={{ ...s.loadingDot, animationDelay: ".2s" }} />
            <span className="forge-dot" style={{ ...s.loadingDot, animationDelay: ".4s" }} />
          </div>
          <div style={s.loadingText}>Loading your workspace…</div>
        </div>
      </div>
    );
  }

  const initial = (business.name || "?").charAt(0).toUpperCase();
  const completeness = computeCompleteness(business);
  const stage = stageLabel(completeness);

  return (
    <div style={s.shell} className="forge-shell">
      <style>{globalStyles}</style>

      {/* ---------- Sidebar ---------- */}
      <aside style={s.sidebar} className="forge-sidebar">
        <div style={s.brandRow}>
          <div style={{ ...s.brandMark, background: business.brandColor || "#1B1A18" }}>
            {business.logoUrl
              ? <img src={`http://localhost:5000${business.logoUrl}`} alt={business.name} style={s.brandMarkImg} />
              : initial}
          </div>
          <div>
            <div style={s.brandName}>{business.name || "Your business"}</div>
            <div style={s.brandPlan}>{(business.plan || "trial").toUpperCase()} PLAN</div>
          </div>
        </div>

        <nav style={s.nav}>
          <div style={s.navGroupLabel}>Setup</div>
          <a href="#quickstart" className="forge-nav" style={s.navItem}><span style={s.navIndex}>01</span>Quick start</a>
          <a href="#profile" className="forge-nav" style={s.navItem}><span style={s.navIndex}>02</span>Business profile</a>
          <a href="#branding" className="forge-nav" style={s.navItem}><span style={s.navIndex}>03</span>Branding</a>
          <a href="#faqs" className="forge-nav" style={s.navItem}><span style={s.navIndex}>04</span>FAQs</a>
          <a href="#embed" className="forge-nav" style={s.navItem}><span style={s.navIndex}>05</span>Install widget</a>

          <div style={s.navDivider} />
          <div style={s.navGroupLabel}>Workspace</div>
          <a href="/livechat" className="forge-nav" style={s.navItem}>Live chat inbox →</a>
          <a href="/team" className="forge-nav" style={s.navItem}>Team</a>
          <a href="/analytics" className="forge-nav" style={s.navItem}>Analytics</a>
          <a href="/billing" className="forge-nav" style={s.navItem}>Billing</a>
        </nav>

        <div style={s.sidebarFooter}>
  <div style={s.userRow}>
    <div style={s.userAvatar}>{(user?.name || "U").charAt(0).toUpperCase()}</div>
    <div style={{ flex: 1 }}>
      <div style={s.userName}>{user?.name}</div>
      <div style={s.userRole}>{user?.role}</div>
    </div>
    <a href="/account" style={s.settingsIcon} className="forge-ghost" title="Account settings">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.8"/>
      </svg>
    </a>
  </div>
  <button className="forge-ghost" style={s.signOutBtn} onClick={logout}>Sign out</button>
</div>
      </aside>

      {/* ---------- Main content ---------- */}
      <main style={s.main} className="forge-main">
        <header style={s.pageHeader}>
          <div>
            <div style={s.eyebrow}>Workspace settings</div>
            <h1 style={s.pageTitle}>Set up your AI assistant</h1>
          </div>
          {savedMsg && <div style={s.toast}>✓ {savedMsg}</div>}
        </header>

        {/* ---- Readiness meter (signature element) ---- */}
        <div style={s.forgeMeter}>
          <div style={s.forgeMeterTop}>
            <span style={s.forgeMeterLabel}>Assistant readiness</span>
            <span style={s.forgeMeterPct}>{completeness}% · {stage}</span>
          </div>
          <div style={s.forgeMeterTrack}>
            <div className="forge-meter-mask" style={{ ...s.forgeMeterMask, left: `${completeness}%` }} />
            <div
              className="forge-meter-marker"
              style={{
                ...s.forgeMeterMarker,
                left: `calc(${completeness}% - 5px)`,
                borderColor: completeness >= 100 ? color.temperBlue : color.temperGold,
              }}
            />
          </div>
        </div>

        {/* ---- Quick start ---- */}
        <section id="quickstart" style={s.section}>
          <SectionCard
            step="01"
            title="Quick start from your website"
            desc="Drop in your homepage URL and we'll draft your business description, services, and tone for you."
          >
            <div style={s.inlineRow}>
              <input
                className="forge-input"
                style={s.input}
                placeholder="https://yourbusiness.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
              <button className="forge-btn-primary" style={s.primaryBtn} onClick={analyzeWebsite} disabled={analyzing}>
                {analyzing ? "Reading your site…" : "Auto-fill"}
              </button>
            </div>
          </SectionCard>
        </section>

        {/* ---- Business profile ---- */}
        <section id="profile" style={s.section}>
          <SectionCard step="02" title="Business profile" desc="This is what your AI assistant knows about you.">
            <Field label="Business name">
              <input className="forge-input" style={s.input} value={business.name} onChange={(e) => updateField("name", e.target.value)} />
            </Field>

            <Field label="Website">
              <input className="forge-input" style={s.input} value={business.website} onChange={(e) => updateField("website", e.target.value)} placeholder="https://yourbusiness.com" />
            </Field>

            <Field label="What does your business do?">
              <textarea className="forge-input" style={{ ...s.input, height: 84, resize: "vertical" }} value={business.description} onChange={(e) => updateField("description", e.target.value)} />
            </Field>

            <div style={s.twoCol}>
              <Field label="Target customer">
                <input className="forge-input" style={s.input} value={business.targetCustomer} onChange={(e) => updateField("targetCustomer", e.target.value)} />
              </Field>
              <Field label="Tone of voice">
                <select className="forge-input" style={s.input} value={business.tone} onChange={(e) => updateField("tone", e.target.value)}>
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="casual">Casual</option>
                </select>
              </Field>
            </div>

            <Field label="Services">
              <div style={s.chipList}>
                {business.services.map((svc, i) => (
                  <div key={i} style={s.chipRow}>
                    <input className="forge-input" style={s.chipInput} value={svc} onChange={(e) => updateService(i, e.target.value)} placeholder="e.g. Website design" />
                    <button className="forge-chip-remove" style={s.chipRemove} onClick={() => removeService(i)}>✕</button>
                  </div>
                ))}
              </div>
              <button className="forge-ghost" style={s.ghostBtn} onClick={addService}>+ Add service</button>
            </Field>
          </SectionCard>
        </section>

        {/* ---- Branding ---- */}
        <section id="branding" style={s.section}>
          <SectionCard step="03" title="Branding" desc="Make the widget look like it belongs on your site.">
            <div style={s.twoCol}>
              <Field label="Logo">
                <div style={s.logoUploadRow}>
                  <div style={s.logoPreviewBox}>
                    {business.logoUrl
                      ? <img src={`http://localhost:5000${business.logoUrl}`} alt="Logo preview" style={s.logoPreviewImg} />
                      : <span style={s.logoPlaceholder}>{initial}</span>}
                  </div>
                  <label className="forge-ghost" style={s.uploadBtn}>
                    Upload image
                    <input type="file" accept="image/*" onChange={uploadLogo} style={{ display: "none" }} />
                  </label>
                </div>
              </Field>
              <Field label="Brand color">
                <div style={s.colorRow}>
                  <input type="color" value={business.brandColor} onChange={(e) => updateField("brandColor", e.target.value)} style={s.colorSwatch} />
                  <span style={s.colorHex}>{business.brandColor}</span>
                </div>
              </Field>
            </div>

            <Field label="Call-to-action links">
              <div style={s.ctaList}>
                {business.ctaLinks.map((c, i) => (
                  <div key={i} style={s.ctaRow}>
                    <input className="forge-input" style={{ ...s.input, flex: "0 0 140px" }} placeholder="Label" value={c.label} onChange={(e) => updateCta(i, "label", e.target.value)} />
                    <input className="forge-input" style={s.input} placeholder="https://…" value={c.url} onChange={(e) => updateCta(i, "url", e.target.value)} />
                    <button className="forge-chip-remove" style={s.chipRemove} onClick={() => removeCta(i)}>✕</button>
                  </div>
                ))}
              </div>
              <button className="forge-ghost" style={s.ghostBtn} onClick={addCta}>+ Add link</button>
            </Field>
          </SectionCard>
        </section>

        <div style={s.stickyBar}>
          <button className="forge-btn-primary-lg" style={s.primaryBtnLg} onClick={saveProfile} disabled={saving}>
            {saving ? "Saving…" : "Save profile & branding"}
          </button>
        </div>

        {/* ---- FAQs ---- */}
        <section id="faqs" style={s.section}>
          <SectionCard
            step="04"
            title="FAQs"
            desc="Matched instantly with no AI cost. Anything outside these falls back to the AI assistant."
          >
            {business.faqs.map((f, i) => (
              <div key={i} className="forge-card" style={s.faqCard}>
                <input className="forge-input" style={s.input} placeholder="Question" value={f.question} onChange={(e) => updateFaq(i, "question", e.target.value)} />
                <textarea className="forge-input" style={{ ...s.input, height: 56, marginTop: 8, resize: "vertical" }} placeholder="Answer" value={f.answer} onChange={(e) => updateFaq(i, "answer", e.target.value)} />
                <button style={s.faqRemove} onClick={() => removeFaq(i)}>Remove FAQ</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <button className="forge-ghost" style={s.ghostBtn} onClick={addFaq}>+ Add FAQ</button>
              <button className="forge-btn-primary" style={s.primaryBtn} onClick={saveFaqs}>Save FAQs</button>
            </div>
          </SectionCard>
        </section>

        {/* ---- Embed ---- */}
        <section id="embed" style={s.section}>
          <SectionCard step="05" title="Install on your website" desc="Paste this once, right before the closing </body> tag.">
            <div style={s.codeBoxWrap}>
              <div style={s.codeBoxTag}>WIDGET · EMBED</div>
              <div style={s.codeBox}>
                <code style={s.codeText}>{embedCode}</code>
              </div>
            </div>
            <button className="forge-ghost" style={s.ghostBtn} onClick={copyEmbed}>{copied ? "Copied ✓" : "Copy code"}</button>
          </SectionCard>
        </section>
      </main>
    </div>
  );
}

function SectionCard({ step, title, desc, children }) {
  return (
    <div className="forge-card" style={s.card}>
      <div style={s.cardAccentBar} />
      <div style={s.cardHead}>
        <div style={s.cardStepTag}>{step} / 05</div>
        <h2 style={s.cardTitle}>{title}</h2>
        {desc && <p style={s.cardDesc}>{desc}</p>}
      </div>
      <div style={{ marginTop: 16 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={s.field}>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  );
}

/* ---------------- Readiness logic ---------------- */
function computeCompleteness(business) {
  const checks = [
    !!business.name,
    !!business.website,
    !!business.description,
    !!business.targetCustomer,
    (business.services || []).some((x) => x && x.trim()),
    !!business.logoUrl,
    (business.ctaLinks || []).some((c) => c.label && c.url),
    (business.faqs || []).some((f) => f.question && f.answer),
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

function stageLabel(pct) {
  if (pct >= 100) return "fully forged";
  if (pct >= 70) return "tempering";
  if (pct >= 35) return "heating";
  return "raw stock";
}

/* ---------------- Design tokens ----------------
   Palette grounded in metallurgy/tempering — the app's own name.
   iron = deep warm-black workbench, ash = cool steel-gray surface,
   temperGold/temperBlue = the two heat-tint colors steel passes through
   as it's worked, used only for the readiness meter and key actions. */
const color = {
  iron: "#15140F",
  ironLine: "rgba(255,255,255,.08)",
  bg: "#EDEFEE",
  surface: "#FFFFFF",
  border: "#DBDFDC",
  borderSoft: "#E8EAE7",
  ink: "#1A1918",
  inkSoft: "#686C67",
  inkFaint: "#9BA09A",
  temperBlue: "#2F5D8A",
  temperBlueDeep: "#22456A",
  temperGold: "#C99A3B",
  danger: "#B3453B",
};

const fontImport = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap');`;

const globalStyles = `
${fontImport}

.forge-nav { transition: background .15s ease, color .15s ease, padding-left .15s ease; }
.forge-nav:hover { background: rgba(255,255,255,.06); color: #fff; padding-left: 14px; }
.forge-nav:focus-visible { outline: 2px solid ${color.temperGold}; outline-offset: 2px; }

.forge-btn-primary, .forge-btn-primary-lg { transition: transform .12s ease, box-shadow .12s ease, background .15s ease; }
.forge-btn-primary:hover, .forge-btn-primary-lg:hover { box-shadow: 0 6px 16px rgba(47,93,138,.32); transform: translateY(-1px); }
.forge-btn-primary:active, .forge-btn-primary-lg:active { transform: translateY(0) scale(.98); }

.forge-card { transition: box-shadow .2s ease, border-color .2s ease; }
.forge-card:hover { border-color: #C7CFC9; box-shadow: 0 3px 14px rgba(20,25,22,.05); }

.forge-input { transition: border-color .15s ease, box-shadow .15s ease; }
.forge-input:focus { outline: none; border-color: ${color.temperBlue}; box-shadow: 0 0 0 3px rgba(47,93,138,.13); }

.forge-ghost { transition: background .15s ease; }
.forge-ghost:hover { background: #DEE3DE; }

.forge-chip-remove { transition: background .15s ease; }
.forge-chip-remove:hover { background: #E9D3D0; }

.forge-meter-mask { transition: left .6s cubic-bezier(.4,0,.2,1); }
.forge-meter-marker { transition: left .6s cubic-bezier(.4,0,.2,1); }

@keyframes forgeDot {
  0%, 100% { opacity: .35; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); }
}
.forge-dot { animation: forgeDot 1.1s ease-in-out infinite; }

@media (max-width: 900px) {
  .forge-shell { flex-direction: column; }
  .forge-sidebar { width: 100% !important; flex-direction: row !important; flex-wrap: wrap; align-items: center; }
  .forge-main { padding: 24px 20px 80px !important; }
}

@media (prefers-reduced-motion: reduce) {
  .forge-nav, .forge-btn-primary, .forge-btn-primary-lg, .forge-card,
  .forge-input, .forge-ghost, .forge-chip-remove, .forge-meter-mask,
  .forge-meter-marker, .forge-dot { transition: none !important; animation: none !important; }
}
`;

const s = {
  shell: { display: "flex", minHeight: "100vh", background: color.bg, fontFamily: "'Inter', 'Segoe UI', sans-serif", color: color.ink },

  /* Sidebar */
  sidebar: { width: 250, flex: "0 0 auto", background: color.iron, color: "#EDEAE3", display: "flex", flexDirection: "column", padding: "24px 18px", boxSizing: "border-box" },
  brandRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 28 },
  brandMark: { width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "#fff", fontSize: 15, flex: "0 0 auto", overflow: "hidden", boxShadow: "inset 0 0 0 2px rgba(255,255,255,.18), 0 2px 6px rgba(0,0,0,.35)" },
  brandMarkImg: { width: "100%", height: "100%", objectFit: "cover" },
  brandName: { fontWeight: 600, fontSize: 14, letterSpacing: "-0.01em", fontFamily: "'Space Grotesk', sans-serif" },
  brandPlan: { fontSize: 10, letterSpacing: "0.08em", color: color.temperGold, marginTop: 3, fontFamily: "'JetBrains Mono', monospace" },

  nav: { display: "flex", flexDirection: "column", gap: 2, flex: 1 },
  navGroupLabel: { fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6E7369", fontWeight: 600, margin: "14px 10px 4px", fontFamily: "'JetBrains Mono', monospace" },
  navItem: { color: "#C7CDC7", textDecoration: "none", fontSize: 13.5, padding: "9px 10px", borderRadius: 8, display: "flex", alignItems: "center", gap: 9 },
  navIndex: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: color.temperGold, opacity: 0.85 },
  navDivider: { height: 1, background: color.ironLine, margin: "10px 6px" },

  sidebarFooter: { borderTop: `1px solid ${color.ironLine}`, paddingTop: 16, marginTop: 16 },
  userRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 },
  userAvatar: { width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700 },
  userName: { fontSize: 12.5, fontWeight: 600 },
  userRole: { fontSize: 10.5, color: "#9AA79E", textTransform: "capitalize" },
  settingsIcon: { width: 26, height: 26, borderRadius: 7, background: "rgba(255,255,255,.06)", color: "#C7CDC7", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" },
  signOutBtn: { width: "100%", background: "rgba(255,255,255,.06)", color: "#EDEAE3", border: "1px solid rgba(255,255,255,.14)", padding: "8px", borderRadius: 8, cursor: "pointer", fontSize: 12.5 },

  /* Main */
  main: { flex: 1, padding: "36px 48px 100px", maxWidth: 780, margin: "0 auto", width: "100%", boxSizing: "border-box" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  eyebrow: { fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: color.inkFaint, fontWeight: 600, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" },
  pageTitle: { fontSize: 25, fontWeight: 700, letterSpacing: "-0.02em", margin: 0, fontFamily: "'Space Grotesk', sans-serif" },
  toast: { background: "#E4EDE6", color: "#2B5C3A", padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, alignSelf: "center" },

  /* Readiness meter — signature element */
  forgeMeter: { background: color.surface, border: `1px solid ${color.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 24 },
  forgeMeterTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 },
  forgeMeterLabel: { fontSize: 12.5, fontWeight: 600, color: color.ink },
  forgeMeterPct: { fontSize: 11.5, fontFamily: "'JetBrains Mono', monospace", color: color.inkSoft, textTransform: "lowercase" },
  forgeMeterTrack: { position: "relative", height: 8, borderRadius: 999, overflow: "hidden", background: `linear-gradient(90deg, ${color.temperGold}, ${color.temperBlue})` },
  forgeMeterMask: { position: "absolute", top: 0, right: 0, bottom: 0, background: color.borderSoft },
  forgeMeterMarker: { position: "absolute", top: -1, width: 10, height: 10, borderRadius: "50%", background: "#fff", border: "2px solid", boxShadow: "0 1px 3px rgba(0,0,0,.25)" },

  section: { marginBottom: 22 },
  card: { position: "relative", background: color.surface, border: `1px solid ${color.border}`, borderRadius: 14, padding: "24px 24px 24px 28px", boxShadow: "0 1px 2px rgba(0,0,0,.02)", overflow: "hidden" },
  cardAccentBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg, ${color.temperGold}, ${color.temperBlue})` },
  cardHead: {},
  cardStepTag: { fontSize: 10.5, letterSpacing: "0.1em", color: color.temperBlueDeep, fontWeight: 700, marginBottom: 7, fontFamily: "'JetBrains Mono', monospace" },
  cardTitle: { fontSize: 17.5, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.01em", fontFamily: "'Space Grotesk', sans-serif" },
  cardDesc: { fontSize: 13, color: color.inkSoft, margin: 0, lineHeight: 1.5 },

  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 12, color: color.inkSoft, fontWeight: 600, marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1px solid ${color.border}`, borderRadius: 9, fontSize: 13.5, fontFamily: "inherit", background: "#FBFBFA", color: color.ink },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  inlineRow: { display: "flex", gap: 10 },

  chipList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 },
  chipRow: { display: "flex", gap: 8 },
  chipInput: { flex: 1, padding: "9px 11px", border: `1px solid ${color.border}`, borderRadius: 8, fontSize: 13.5, fontFamily: "inherit", background: "#FBFBFA" },
  chipRemove: { background: color.borderSoft, border: "none", borderRadius: 8, cursor: "pointer", padding: "0 12px", color: color.danger, fontSize: 13 },

  logoUploadRow: { display: "flex", alignItems: "center", gap: 14 },
  logoPreviewBox: { width: 56, height: 56, borderRadius: 10, border: `1px solid ${color.border}`, background: "#FBFBFA", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flex: "0 0 auto" },
  logoPreviewImg: { width: "100%", height: "100%", objectFit: "cover" },
  logoPlaceholder: { fontSize: 20, fontWeight: 700, color: color.inkFaint, fontFamily: "'Space Grotesk', sans-serif" },
  uploadBtn: { background: color.borderSoft, padding: "9px 14px", borderRadius: 8, fontSize: 12.5, cursor: "pointer", fontWeight: 600 },

  colorRow: { display: "flex", alignItems: "center", gap: 10 },
  colorSwatch: { width: 44, height: 40, border: `1px solid ${color.border}`, borderRadius: 8, cursor: "pointer", padding: 2, background: "#fff" },
  colorHex: { fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: color.inkSoft },

  ctaList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 },
  ctaRow: { display: "flex", gap: 8 },

  faqCard: { border: `1px solid ${color.borderSoft}`, borderRadius: 10, padding: 14, marginBottom: 12, background: "#FBFBFA" },
  faqRemove: { marginTop: 8, background: "none", border: "none", color: color.danger, fontSize: 12, cursor: "pointer", padding: 0, textDecoration: "underline" },

  primaryBtn: { background: color.temperBlue, color: "#fff", border: "none", padding: "10px 18px", borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" },
  primaryBtnLg: { background: color.iron, color: "#fff", border: "none", padding: "12px 26px", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer" },
  ghostBtn: { background: color.borderSoft, border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: color.ink },
  stickyBar: { display: "flex", justifyContent: "flex-end", marginBottom: 30 },

  codeBoxWrap: { marginBottom: 12 },
  codeBoxTag: { fontSize: 10, letterSpacing: "0.1em", color: color.inkFaint, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 },
  codeBox: { background: "#171614", borderRadius: 10, padding: 16, overflowX: "auto" },
  codeText: { color: "#9FCB8F", fontSize: 12.5, fontFamily: "'JetBrains Mono', monospace", whiteSpace: "pre" },

  loadingWrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: color.bg, fontFamily: "'Inter', sans-serif" },
  loadingCard: { textAlign: "center" },
  loadingRow: { display: "flex", gap: 6, justifyContent: "center", marginBottom: 10 },
  loadingDot: { width: 8, height: 8, borderRadius: "50%", background: color.temperGold, display: "inline-block" },
  loadingText: { color: color.inkSoft, fontSize: 13.5 },
};