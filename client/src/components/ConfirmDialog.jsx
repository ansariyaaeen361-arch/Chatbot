import { color } from "../theme";

export default function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", danger, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div style={s.backdrop} onClick={onCancel}>
      <div style={s.modal} className="forge-fade-up" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 style={s.title}>{title}</h3>
        {message && <p style={s.message}>{message}</p>}
        <div style={s.actions}>
          <button type="button" className="forge-ghost" style={s.cancelBtn} onClick={onCancel}>{cancelLabel}</button>
          <button
            type="button"
            className="forge-btn-primary"
            style={{ ...s.confirmBtn, ...(danger ? s.confirmBtnDanger : {}) }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(15,16,32,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20, boxSizing: "border-box" },
  modal: { background: color.surface, borderRadius: 16, padding: 24, width: "100%", maxWidth: 340, boxShadow: "0 24px 64px -12px rgba(15,16,32,.35)" },
  title: { fontSize: 16.5, fontWeight: 700, margin: "0 0 8px", color: color.ink, fontFamily: "'Space Grotesk', sans-serif" },
  message: { fontSize: 13, color: color.inkSoft, margin: "0 0 20px", lineHeight: 1.5 },
  actions: { display: "flex", justifyContent: "flex-end", gap: 8 },
  cancelBtn: { background: color.borderSoft, border: "none", padding: "9px 18px", borderRadius: 100, cursor: "pointer", fontSize: 13, fontWeight: 600, color: color.ink },
  confirmBtn: { background: color.accent, color: "#fff", border: "none", padding: "9px 18px", borderRadius: 100, cursor: "pointer", fontSize: 13, fontWeight: 600 },
  confirmBtnDanger: { background: color.danger },
};
