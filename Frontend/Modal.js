import React from "react";
import "./Modal.css";

export default function Modal({ open, title, message, children, onClose, actions, icon }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {icon ? <div className="modal-icon" aria-hidden>{icon}</div> : null}
        {title && <h3 className="modal-title">{title}</h3>}
        {message && <p className="modal-message">{message}</p>}
        {children}
        <div className="modal-actions">
          {actions ? (
            actions
          ) : (
            <button className="btn btn-primary" onClick={onClose}>OK</button>
          )}
        </div>
      </div>
    </div>
  );
}
