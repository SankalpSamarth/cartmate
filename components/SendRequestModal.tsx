"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Order } from "@/lib/types";

interface SendRequestModalProps {
  order: Order | null;
  onClose: () => void;
  onSend: (order: Order, name: string | null, note: string) => void;
}

export function SendRequestModal({ order, onClose, onSend }: SendRequestModalProps) {
  const isOpen = order !== null;
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState("");
  const [sending, setSending] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) { setName(""); setNote(""); setNoteError(""); }
  }, [isOpen]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => { if (e.target === overlayRef.current) onClose(); },
    [onClose]
  );

  const handleSend = async () => {
    if (!order) return;
    if (!note.trim()) { setNoteError("Tell them what you want to order"); return; }
    if (note.length > 150) { setNoteError("Keep it under 150 characters"); return; }
    setSending(true);
    await onSend(order, name.trim() || null, note.trim());
    setSending(false);
    onClose();
  };

  return (
    <div
      ref={overlayRef}
      className={`modal-overlay ${isOpen ? "modal-overlay--open" : ""}`}
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
    >
      <div className={`modal-sheet ${isOpen ? "modal-sheet--open" : ""}`}>
        <div className="modal-handle" />
        <div className="modal-content">
          <div className="modal-header">
            <div>
              <h2 className="modal-title">Ask to join</h2>
              {order && (
                <p className="modal-subtitle">
                  {order.platform} · {order.hostel}
                </p>
              )}
            </div>
            <button onClick={onClose} className="modal-close" aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">
              Your name <span className="form-label__optional">(optional)</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Rahul, HB4"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              What do you want?
              <span className={`char-count ${note.length > 130 ? "char-count--warn" : ""}`}>
                {note.length}/150
              </span>
            </label>
            <textarea
              className="form-input form-textarea"
              placeholder="e.g. chips + cold drink, about ₹60"
              value={note}
              onChange={(e) => { setNote(e.target.value); setNoteError(""); }}
              maxLength={150}
              rows={3}
              autoFocus
            />
            {noteError && <span className="form-error">{noteError}</span>}
          </div>

          <p className="modal-hint">
            The poster reviews requests and picks who joins. If they approve you, their WhatsApp number will be revealed to you.
          </p>

          <button onClick={handleSend} disabled={sending} className="btn btn--submit">
            {sending ? <span className="btn__spinner" /> : "Send Request"}
          </button>
        </div>
      </div>
    </div>
  );
}
