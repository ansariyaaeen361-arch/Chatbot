import { useEffect, useMemo, useRef, useState } from "react";
import { color } from "../theme";

// Mirrors server/public/widget.js's shadeColor() so the preview's header gradient
// matches what visitors actually see on the live embedded widget.
function shadeColor(hex, percent) {
  hex = String(hex || "#1B1A18").replace("#", "");
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  const num = parseInt(hex, 16);
  if (isNaN(num)) return "#1B1A18";
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + percent));
  return "#" + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

// A looping demo conversation so the preview feels alive instead of a static mockup.
// Long enough that it actually has to scroll, like a real chat. Purely cosmetic — no
// API calls, no real AI involved.
function buildDemoConvo(service) {
  return [
    { role: "visitor", text: `Hey! Do you offer ${service}?` },
    { role: "bot", text: `Yes, we handle ${service} regularly. Want me to get you set up?` },
    { role: "visitor", text: "Sounds good, sign me up!" },
    { role: "bot", text: "Great, I've got your details. Someone from the team will follow up shortly." },
    { role: "visitor", text: "How long does that usually take?" },
    { role: "bot", text: "Most people hear back within a business day." },
    { role: "visitor", text: "Perfect, thank you!" },
    { role: "bot", text: "Anytime! Let us know if anything else comes up." },
  ];
}

export default function WidgetPreview({ business, apiOrigin }) {
  const brand = business.brandColor || "#1B1A18";
  const brandDeep = shadeColor(brand, -35);
  const initial = (business.name || "?").charAt(0).toUpperCase();
  const logoSrc = business.logoUrl ? `${apiOrigin}${business.logoUrl}` : null;

  const service = (business.services || []).find((x) => x && x.trim()) || "that";
  const convo = useMemo(() => buildDemoConvo(service), [service]);

  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let timer;
    if (step >= convo.length) {
      timer = setTimeout(() => { if (!cancelled) setStep(0); }, 4500);
    } else if (convo[step].role === "bot") {
      setTyping(true);
      timer = setTimeout(() => {
        if (cancelled) return;
        setTyping(false);
        setStep((v) => v + 1);
      }, 1800);
    } else {
      timer = setTimeout(() => { if (!cancelled) setStep((v) => v + 1); }, 2600);
    }
    return () => { cancelled = true; clearTimeout(timer); };
  }, [step, convo]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [step, typing]);

  return (
    <div style={s.wrap} className="forge-fade-up">
      <div style={s.head}>
        <span style={s.liveDot} className="forge-live-dot" />
        <span style={s.headLabel}>Live preview</span>
        <span style={s.headHint}>updates as you type</span>
      </div>

      <div style={s.stage}>
        <div style={s.widgetPanel}>
          <div style={{ ...s.widgetHeader, background: `linear-gradient(135deg, ${brand}, ${brandDeep})` }}>
            <div style={s.widgetAvatar}>
              {logoSrc ? <img src={logoSrc} alt="" style={s.widgetAvatarImg} /> : initial}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={s.widgetName}>{business.name || "Your business"}</div>
              <div style={s.widgetStatus}><span style={s.widgetStatusDot} />Online now</div>
            </div>
          </div>

          <div style={s.widgetBody} ref={bodyRef}>
            <div style={s.bubble}>
              {business.welcomeMessage || "Hi! How can I help you today?"}
            </div>
            {(business.ctaLinks || []).filter((c) => c.label).slice(0, 2).map((c, i) => (
              <div key={i} style={{ ...s.ctaChip, borderColor: `${brand}4d`, background: `${brand}0f`, color: brandDeep }}>
                {c.label}
              </div>
            ))}

            {convo.slice(0, step).map((m, i) =>
              m.role === "visitor" ? (
                <div key={i} className="forge-fade-up" style={{ ...s.bubble, ...s.visitorBubble, background: brand }}>
                  {m.text}
                </div>
              ) : (
                <div key={i} className="forge-fade-up" style={s.bubble}>
                  {m.text}
                </div>
              )
            )}

            {typing && (
              <div className="forge-fade-up" style={{ ...s.bubble, ...s.typingBubble }}>
                <span className="forge-dot" style={{ ...s.typingDot, animationDelay: "0s" }} />
                <span className="forge-dot" style={{ ...s.typingDot, animationDelay: ".2s" }} />
                <span className="forge-dot" style={{ ...s.typingDot, animationDelay: ".4s" }} />
              </div>
            )}
          </div>

          <div style={s.widgetInputRow}>
            <div style={s.widgetInput}>Type a message…</div>
            <div style={{ ...s.widgetSend, background: brand }} />
          </div>

          {!business.hideBranding && (
            <div style={s.widgetBadge}>
              <span style={{ ...s.widgetBadgeMark, background: color.accent }}>M</span>
              Powered by MentalForge AI
            </div>
          )}
        </div>

        <div style={{ ...s.launcherWrap, alignSelf: business.launcherPosition === "left" ? "flex-start" : "flex-end" }}>
          <span className="forge-launcher-ring" style={{ background: brand }} />
          <span className="forge-launcher-ring" style={{ background: brand, animationDelay: "1.3s" }} />
          <div style={{ ...s.launcher, background: brand }}>
            {business.launcherType === "image" && business.launcherMediaUrl ? (
              <img src={`${apiOrigin}${business.launcherMediaUrl}`} alt="" style={s.launcherMedia} />
            ) : business.launcherType === "video" && business.launcherMediaUrl ? (
              <video src={`${apiOrigin}${business.launcherMediaUrl}`} style={s.launcherMedia} muted loop autoPlay playsInline />
            ) : (
              <LauncherGlyph />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LauncherGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      <circle cx="9" cy="10" r="1" fill="#fff" stroke="none" />
      <circle cx="12" cy="10" r="1" fill="#fff" stroke="none" />
      <circle cx="15" cy="10" r="1" fill="#fff" stroke="none" />
    </svg>
  );
}

const s = {
  wrap: { position: "sticky", top: 88 },
  head: { display: "flex", alignItems: "center", gap: 7, marginBottom: 12, paddingLeft: 2 },
  liveDot: { width: 7, height: 7, borderRadius: "50%", background: color.success },
  headLabel: { fontSize: 12.5, fontWeight: 700, color: color.ink },
  headHint: { fontSize: 11, color: color.inkFaint, marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace" },

  stage: { display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 20, padding: "8px 4px" },

  widgetPanel: { width: 272, background: "#fff", borderRadius: 16, boxShadow: "0 20px 46px -14px rgba(20,20,30,.28), 0 4px 14px -6px rgba(20,20,30,.12)", overflow: "hidden", display: "flex", flexDirection: "column" },
  widgetHeader: { display: "flex", alignItems: "center", gap: 9, padding: "12px 12px", flex: "0 0 auto" },
  widgetAvatar: { width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.22)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12.5, overflow: "hidden", flex: "0 0 auto" },
  widgetAvatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  widgetName: { color: "#fff", fontWeight: 700, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  widgetStatus: { color: "rgba(255,255,255,.85)", fontSize: 10, display: "flex", alignItems: "center", gap: 4, marginTop: 2 },
  widgetStatusDot: { width: 5, height: 5, borderRadius: "50%", background: "#3FC463", display: "inline-block" },

  widgetBody: { padding: 12, display: "flex", flexDirection: "column", gap: 8, height: 260, overflowY: "auto", scrollBehavior: "smooth" },
  bubble: { background: color.surfaceSunken, border: `1px solid ${color.borderSoft}`, borderRadius: "4px 12px 12px 12px", padding: "9px 11px", fontSize: 11.5, lineHeight: 1.45, color: color.ink, maxWidth: "84%" },
  visitorBubble: { alignSelf: "flex-end", color: "#fff", border: "none", borderRadius: "12px 4px 12px 12px" },
  typingBubble: { display: "flex", gap: 4, alignItems: "center", width: "fit-content", padding: "11px 14px" },
  typingDot: { width: 5, height: 5, borderRadius: "50%", background: color.inkFaint, display: "inline-block" },
  ctaChip: { border: "1px solid", borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 600 },

  widgetInputRow: { display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderTop: `1px solid ${color.borderSoft}`, flex: "0 0 auto" },
  widgetInput: { flex: 1, fontSize: 11, color: color.inkFaint, background: color.surfaceSunken, border: `1px solid ${color.borderSoft}`, borderRadius: 999, padding: "7px 11px" },
  widgetSend: { width: 26, height: 26, borderRadius: "50%", flex: "0 0 auto" },

  widgetBadge: { display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 9.5, color: color.inkFaint, padding: "7px 12px", borderTop: `1px solid ${color.borderSoft}`, flex: "0 0 auto" },
  widgetBadgeMark: { width: 13, height: 13, borderRadius: "50%", color: "#fff", fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" },

  launcherWrap: { position: "relative", width: 52, height: 52, flex: "0 0 auto" },
  launcher: { position: "relative", zIndex: 1, width: "100%", height: "100%", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 22px -6px rgba(0,0,0,.35)", overflow: "hidden" },
  launcherMedia: { width: "100%", height: "100%", objectFit: "cover" },
};
