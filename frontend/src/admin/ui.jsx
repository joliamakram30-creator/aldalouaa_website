import { X } from "lucide-react";

export function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="admin-page-header adm-page-header">
      <div>
        {eyebrow && <span className="admin-page-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Alert({ type = "error", children, onClose }) {
  if (!children) return null;
  return (
    <div className={`admin-alert ${type === "error" ? "admin-alert-error" : "admin-alert-success"}`}>
      <span>{children}</span>
      {onClose && (
        <button type="button" className="adm-alert-close" onClick={onClose} aria-label="close">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="admin-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`admin-modal ${wide ? "adm-modal-wide" : ""}`} role="dialog" aria-modal="true">
        <div className="admin-modal-header">
          <h2>{title}</h2>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="close">
            <X size={20} />
          </button>
        </div>
        <div className="adm-modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Loading() {
  return (
    <div className="admin-loading">
      <div className="admin-spinner" />
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <div className="admin-form-group">
      {label && <label>{label}</label>}
      {children}
      {hint && <small className="adm-hint">{hint}</small>}
    </div>
  );
}

export function Pill({ kind = "", children }) {
  return <span className={`status-pill ${kind}`}>{children}</span>;
}
