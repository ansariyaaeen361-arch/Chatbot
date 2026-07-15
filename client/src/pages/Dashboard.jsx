import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

const API_ORIGIN = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

const SECTION_IDS = ["quickstart", "profile", "branding", "faqs", "embed"];

export default function Dashboard() {
  const { user, businessId, logout } = useAuth();
  const [business, setBusiness] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState("quickstart");

  useEffect(() => {
    api.get("/business/me").then((res) => setBusiness(res.data));
  }, []);

  useEffect(() => {
    if (!business) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-15% 0px -75% 0px", threshold: 0 }
    );
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [business]);

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

  const embedCode = `<script src="${API_ORIGIN}/widget.js" data-business="${businessId}"></script>`;

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
  const servicesCount = (business.services || []).filter((x) => x && x.trim()).length;
  const faqsCount = (business.faqs || []).filter((f) => f.question && f.answer).length;
  const ctaCount = (business.ctaLinks || []).filter((c) => c.label && c.url).length;

  return (
    <div style={s.shell} className="forge-shell">
      <style>{globalStyles}</style>

      {/* ---------- Sidebar ---------- */}
      <aside style={s.sidebar} className="forge-sidebar">
        <div style={s.brandRow}>
          <div style={{ ...s.brandMark, background: business.brandColor || color.accent }}>
            {business.logoUrl
              ? <img src={`${API_ORIGIN}${business.logoUrl}`} alt={business.name} style={s.brandMarkImg} />
              : initial}
          </div>
          <div>
            <div style={s.brandName}>{business.name || "Your business"}</div>
            <div style={s.brandPlan}>{(business.plan || "trial").toUpperCase()} PLAN</div>
          </div>
        </div>

        <nav style={s.nav}>
          <div style={s.navGroupLabel}>Setup</div>
          {[
            ["quickstart", "01", "Quick start"],
            ["profile", "02", "Business profile"],
            ["branding", "03", "Branding"],
            ["faqs", "04", "FAQs"],
            ["embed", "05", "Install widget"],
          ].map(([id, idx, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="forge-nav"
              style={{ ...s.navItem, ...(activeSection === id ? s.navItemActive : {}) }}
              onClick={() => setActiveSection(id)}
            >
              <span style={{ ...s.navIndex, ...(activeSection === id ? s.navIndexActive : {}) }}>{idx}</span>
              {label}
            </a>
          ))}

          <div style={s.navDivider} />
          <div style={s.navGroupLabel}>Workspace</div>
          <a href="/livechat" className="forge-nav" style={s.navItem}><NavIcon name="chat" />Live chat inbox</a>
          <a href="/team" className="forge-nav" style={s.navItem}><NavIcon name="users" />Team</a>
          <a href="/analytics" className="forge-nav" style={s.navItem}><NavIcon name="chart" />Analytics</a>
          <a href="/billing" className="forge-nav" style={s.navItem}><NavIcon name="card" />Billing</a>
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
            <p style={s.pageSubtitle}>Everything your chatbot knows and shows, in one place.</p>
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
                borderColor: completeness >= 100 ? color.success : color.accent,
              }}
            />
          </div>

          <div style={s.overviewChips}>
            <StatChip icon="briefcase" label="Services" value={servicesCount} />
            <StatChip icon="help" label="FAQs" value={faqsCount} />
            <StatChip icon="link" label="CTA links" value={ctaCount} />
            <StatChip icon="image" label="Logo" value={business.logoUrl ? "Uploaded" : "Missing"} muted={!business.logoUrl} />
          </div>
        </div>

        {/* ---- Quick start ---- */}
        <section id="quickstart" style={s.section}>
          <SectionCard
            step="01"
            icon="bolt"
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
          <SectionCard step="02" icon="briefcase" title="Business profile" desc="This is what your AI assistant knows about you.">
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
          <SectionCard step="03" icon="palette" title="Branding" desc="Make the widget look like it belongs on your site.">
            <div style={s.twoCol}>
              <Field label="Logo">
                <div style={s.logoUploadRow}>
                  <div style={s.logoPreviewBox}>
                    {business.logoUrl
                      ? <img src={`${API_ORIGIN}${business.logoUrl}`} alt="Logo preview" style={s.logoPreviewImg} />
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
            icon="help"
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
          <SectionCard step="05" icon="code" title="Install on your website" desc="Paste this once, right before the closing </body> tag.">
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

function SectionCard({ step, icon, title, desc, children }) {
  return (
    <div className="forge-card" style={s.card}>
      <div style={s.cardAccentBar} />
      <div style={s.cardHead}>
        <div style={s.cardHeadTop}>
          {icon && (
            <div style={s.cardIconBadge}>
              <NavIcon name={icon} size={16} />
            </div>
          )}
          <div style={s.cardStepTag}>{step} / 05</div>
        </div>
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

function StatChip({ icon, label, value, muted }) {
  return (
    <div style={s.statChip}>
      <div style={{ ...s.statChipIcon, ...(muted ? s.statChipIconMuted : {}) }}>
        <NavIcon name={icon} size={14} />
      </div>
      <div>
        <div style={{ ...s.statChipValue, ...(muted ? s.statChipValueMuted : {}) }}>{value}</div>
        <div style={s.statChipLabel}>{label}</div>
      </div>
    </div>
  );
}

/* ---------------- Icons ----------------
   Small inline stroke-icon set so the sidebar/cards don't depend on an icon
   library just for a handful of glyphs. */
function NavIcon({ name, size = 15 }) {
  const common = { stroke: "currentColor", strokeWidth: 1.8, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    chat: <path {...common} d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />,
    users: (
      <g {...common}>
        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 00-3-3.87M15 3.13a4 4 0 010 7.75" />
      </g>
    ),
    chart: (
      <g {...common}>
        <path d="M3 3v18h18" />
        <path d="M7 15l4-4 3 3 5-6" />
      </g>
    ),
    card: (
      <g {...common}>
        <rect x="1.5" y="5" width="21" height="14" rx="2.5" />
        <path d="M1.5 10h21" />
      </g>
    ),
    bolt: <path {...common} d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />,
    briefcase: (
      <g {...common}>
        <rect x="2" y="7" width="20" height="14" rx="2.5" />
        <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
      </g>
    ),
    palette: (
      <g {...common}>
        <path d="M12 2a10 10 0 100 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4a3.6 3.6 0 003.6-3.6C21 6.6 17 2 12 2z" />
        <circle cx="7" cy="11" r="1" fill="currentColor" stroke="none" />
        <circle cx="10" cy="7" r="1" fill="currentColor" stroke="none" />
        <circle cx="15" cy="7" r="1" fill="currentColor" stroke="none" />
      </g>
    ),
    help: (
      <g {...common}>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.5 9a2.5 2.5 0 114 2c-.7.6-1.5 1.1-1.5 2.3" />
        <circle cx="12" cy="17" r=".6" fill="currentColor" stroke="none" />
      </g>
    ),
    code: (
      <g {...common}>
        <path d="M9 18l-6-6 6-6" />
        <path d="M15 6l6 6-6 6" />
      </g>
    ),
    link: (
      <g {...common}>
        <path d="M10 13a5 5 0 007.5.5l2-2a5 5 0 00-7-7l-1.2 1.1" />
        <path d="M14 11a5 5 0 00-7.5-.5l-2 2a5 5 0 007 7l1.1-1.1" />
      </g>
    ),
    image: (
      <g {...common}>
        <rect x="2" y="3" width="20" height="18" rx="2.5" />
        <circle cx="8.5" cy="9.5" r="1.7" />
        <path d="M21 16l-5.5-5.5a2 2 0 00-2.8 0L4 19" />
      </g>
    ),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flex: "0 0 auto" }}>
      {icons[name] || null}
    </svg>
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
  if (pct >= 100) return "all set";
  if (pct >= 70) return "almost there";
  if (pct >= 35) return "in progress";
  return "just started";
}

/* ---------------- Design tokens ----------------
   Modern indigo palette. sidebar = deep indigo-charcoal workspace rail,
   bg = cool near-white page, accent (indigo) = primary actions, focus
   rings, and the readiness meter. Neutrals stay soft and quiet so the
   indigo is the only saturated color on screen. */
const color = {
  sidebar: "#1B1830",
  sidebarLine: "rgba(255,255,255,.08)",
  bg: "#F6F7FB",
  surface: "#FFFFFF",
  border: "#E6E7EE",
  borderSoft: "#EEEFF4",
  ink: "#1A1B2E",
  inkSoft: "#5C5F73",
  inkFaint: "#9498A8",
  accent: "#5B5BD6",
  accentDeep: "#4A47C0",
  accentSoft: "#EEEEFB",
  accentLight: "#A6A6EE",
  success: "#0E9F6E",
  danger: "#DC5B54",
};

const fontImport = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap');`;

const globalStyles = `
${fontImport}

.forge-nav { transition: background .15s ease, color .15s ease, padding-left .15s ease; }
.forge-nav:hover { background: rgba(255,255,255,.06); color: #fff; padding-left: 14px; }
.forge-nav:focus-visible { outline: 2px solid ${color.accent}; outline-offset: 2px; }

.forge-btn-primary, .forge-btn-primary-lg { transition: transform .12s ease, box-shadow .12s ease, background .15s ease; }
.forge-btn-primary:hover, .forge-btn-primary-lg:hover { box-shadow: 0 6px 16px rgba(91,91,214,.30); transform: translateY(-1px); }
.forge-btn-primary:active, .forge-btn-primary-lg:active { transform: translateY(0) scale(.98); }

.forge-card { transition: box-shadow .2s ease, border-color .2s ease; }
.forge-card:hover { border-color: #D6D7E4; box-shadow: 0 3px 14px rgba(26,27,46,.06); }

.forge-input { transition: border-color .15s ease, box-shadow .15s ease; }
.forge-input:focus { outline: none; border-color: ${color.accent}; box-shadow: 0 0 0 3px rgba(91,91,214,.15); }

.forge-ghost { transition: background .15s ease; }
.forge-ghost:hover { background: #E7E8F0; }

.forge-chip-remove { transition: background .15s ease; }
.forge-chip-remove:hover { background: #F6DBD9; }

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
  sidebar: { width: 250, flex: "0 0 auto", background: color.sidebar, color: "#E7E7F0", display: "flex", flexDirection: "column", padding: "24px 18px", boxSizing: "border-box" },
  brandRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 28 },
  brandMark: { width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: "#fff", fontSize: 15, flex: "0 0 auto", overflow: "hidden", boxShadow: "inset 0 0 0 2px rgba(255,255,255,.18), 0 2px 6px rgba(0,0,0,.35)" },
  brandMarkImg: { width: "100%", height: "100%", objectFit: "cover" },
  brandName: { fontWeight: 600, fontSize: 14, letterSpacing: "-0.01em", fontFamily: "'Space Grotesk', sans-serif" },
  brandPlan: { fontSize: 10, letterSpacing: "0.08em", color: color.accentLight, marginTop: 3, fontFamily: "'JetBrains Mono', monospace" },

  nav: { display: "flex", flexDirection: "column", gap: 2, flex: 1 },
  navGroupLabel: { fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#787C93", fontWeight: 600, margin: "14px 10px 4px", fontFamily: "'JetBrains Mono', monospace" },
  navItem: { color: "#C6C7D6", textDecoration: "none", fontSize: 13.5, padding: "9px 10px", borderRadius: 8, display: "flex", alignItems: "center", gap: 9 },
  navItemActive: { background: "rgba(255,255,255,.09)", color: "#fff" },
  navIndex: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: color.accentLight, opacity: 0.85 },
  navIndexActive: { opacity: 1 },
  navDivider: { height: 1, background: color.sidebarLine, margin: "10px 6px" },

  sidebarFooter: { borderTop: `1px solid ${color.sidebarLine}`, paddingTop: 16, marginTop: 16 },
  userRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 },
  userAvatar: { width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700 },
  userName: { fontSize: 12.5, fontWeight: 600 },
  userRole: { fontSize: 10.5, color: "#9EA0B4", textTransform: "capitalize" },
  settingsIcon: { width: 26, height: 26, borderRadius: 7, background: "rgba(255,255,255,.06)", color: "#C6C7D6", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" },
  signOutBtn: { width: "100%", background: "rgba(255,255,255,.06)", color: "#E7E7F0", border: "1px solid rgba(255,255,255,.14)", padding: "8px", borderRadius: 8, cursor: "pointer", fontSize: 12.5 },

  /* Main */
  main: { flex: 1, padding: "36px 48px 100px", maxWidth: 780, margin: "0 auto", width: "100%", boxSizing: "border-box" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  eyebrow: { fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: color.inkFaint, fontWeight: 600, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" },
  pageTitle: { fontSize: 25, fontWeight: 700, letterSpacing: "-0.02em", margin: 0, fontFamily: "'Space Grotesk', sans-serif" },
  pageSubtitle: { fontSize: 13, color: color.inkSoft, margin: "6px 0 0" },
  toast: { background: "#E7F4EC", color: "#0A6B49", padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, alignSelf: "center" },

  /* Readiness meter — signature element */
  forgeMeter: { background: color.surface, border: `1px solid ${color.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 24 },
  forgeMeterTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 },
  forgeMeterLabel: { fontSize: 12.5, fontWeight: 600, color: color.ink },
  forgeMeterPct: { fontSize: 11.5, fontFamily: "'JetBrains Mono', monospace", color: color.inkSoft, textTransform: "lowercase" },
  forgeMeterTrack: { position: "relative", height: 8, borderRadius: 999, overflow: "hidden", background: color.accent },
  forgeMeterMask: { position: "absolute", top: 0, right: 0, bottom: 0, background: color.borderSoft },
  forgeMeterMarker: { position: "absolute", top: -1, width: 10, height: 10, borderRadius: "50%", background: "#fff", border: "2px solid", boxShadow: "0 1px 3px rgba(0,0,0,.25)" },

  overviewChips: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${color.borderSoft}` },
  statChip: { display: "flex", alignItems: "center", gap: 10 },
  statChipIcon: { width: 30, height: 30, borderRadius: 8, background: color.accentSoft, color: color.accentDeep, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" },
  statChipIconMuted: { background: color.borderSoft, color: color.inkFaint },
  statChipValue: { fontSize: 15, fontWeight: 700, color: color.ink, letterSpacing: "-0.01em" },
  statChipValueMuted: { color: color.inkFaint, fontWeight: 600, fontSize: 13 },
  statChipLabel: { fontSize: 11, color: color.inkSoft },

  section: { marginBottom: 22 },
  card: { position: "relative", background: color.surface, border: `1px solid ${color.border}`, borderRadius: 14, padding: "24px 24px 24px 28px", boxShadow: "0 1px 2px rgba(0,0,0,.02)", overflow: "hidden" },
  cardAccentBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: color.accent },
  cardHead: {},
  cardHeadTop: { display: "flex", alignItems: "center", gap: 10, marginBottom: 7 },
  cardIconBadge: { width: 28, height: 28, borderRadius: 8, background: color.accentSoft, color: color.accentDeep, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" },
  cardStepTag: { fontSize: 10.5, letterSpacing: "0.1em", color: color.accentDeep, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" },
  cardTitle: { fontSize: 17.5, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.01em", fontFamily: "'Space Grotesk', sans-serif" },
  cardDesc: { fontSize: 13, color: color.inkSoft, margin: 0, lineHeight: 1.5 },

  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 12, color: color.inkSoft, fontWeight: 600, marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1px solid ${color.border}`, borderRadius: 9, fontSize: 13.5, fontFamily: "inherit", background: "#FBFBFD", color: color.ink },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  inlineRow: { display: "flex", gap: 10 },

  chipList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 },
  chipRow: { display: "flex", gap: 8 },
  chipInput: { flex: 1, padding: "9px 11px", border: `1px solid ${color.border}`, borderRadius: 8, fontSize: 13.5, fontFamily: "inherit", background: "#FBFBFD" },
  chipRemove: { background: color.borderSoft, border: "none", borderRadius: 8, cursor: "pointer", padding: "0 12px", color: color.danger, fontSize: 13 },

  logoUploadRow: { display: "flex", alignItems: "center", gap: 14 },
  logoPreviewBox: { width: 56, height: 56, borderRadius: 10, border: `1px solid ${color.border}`, background: "#FBFBFD", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flex: "0 0 auto" },
  logoPreviewImg: { width: "100%", height: "100%", objectFit: "cover" },
  logoPlaceholder: { fontSize: 20, fontWeight: 700, color: color.inkFaint, fontFamily: "'Space Grotesk', sans-serif" },
  uploadBtn: { background: color.borderSoft, padding: "9px 14px", borderRadius: 8, fontSize: 12.5, cursor: "pointer", fontWeight: 600 },

  colorRow: { display: "flex", alignItems: "center", gap: 10 },
  colorSwatch: { width: 44, height: 40, border: `1px solid ${color.border}`, borderRadius: 8, cursor: "pointer", padding: 2, background: "#fff" },
  colorHex: { fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: color.inkSoft },

  ctaList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 },
  ctaRow: { display: "flex", gap: 8 },

  faqCard: { border: `1px solid ${color.borderSoft}`, borderRadius: 10, padding: 14, marginBottom: 12, background: "#FBFBFD" },
  faqRemove: { marginTop: 8, background: "none", border: "none", color: color.danger, fontSize: 12, cursor: "pointer", padding: 0, textDecoration: "underline" },

  primaryBtn: { background: color.accent, color: "#fff", border: "none", padding: "10px 18px", borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" },
  primaryBtnLg: { background: color.accentDeep, color: "#fff", border: "none", padding: "12px 26px", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer" },
  ghostBtn: { background: color.borderSoft, border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: color.ink },
  stickyBar: { display: "flex", justifyContent: "flex-end", marginBottom: 30 },

  codeBoxWrap: { marginBottom: 12 },
  codeBoxTag: { fontSize: 10, letterSpacing: "0.1em", color: color.inkFaint, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 },
  codeBox: { background: "#191830", borderRadius: 10, padding: 16, overflowX: "auto" },
  codeText: { color: "#A6E0BD", fontSize: 12.5, fontFamily: "'JetBrains Mono', monospace", whiteSpace: "pre" },

  loadingWrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: color.bg, fontFamily: "'Inter', sans-serif" },
  loadingCard: { textAlign: "center" },
  loadingRow: { display: "flex", gap: 6, justifyContent: "center", marginBottom: 10 },
  loadingDot: { width: 8, height: 8, borderRadius: "50%", background: color.accent, display: "inline-block" },
  loadingText: { color: color.inkSoft, fontSize: 13.5 },
};