"use client";

import { useEffect, useRef, useCallback } from "react";
import type { JoinRequest } from "@/lib/types";

interface RequestsSheetProps {
  isOpen: boolean;
  requests: JoinRequest[];
  onClose: () => void;
  onApprove: (request: JoinRequest) => void;
}

export function RequestsSheet({ isOpen, requests, onClose, onApprove }: RequestsSheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => { if (e.target === overlayRef.current) onClose(); },
    [onClose]
  );

  const pending = requests.filter((r) => r.status === "pending");
  const approved = requests.filter((r) => r.status === "approved");

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
              <h2 className="modal-title">Join Requests</h2>
              <p className="modal-subtitle">
                {requests.length === 0
                  ? "No requests yet"
                  : `${pending.length} pending · ${approved.length} approved`}
              </p>
            </div>
            <button onClick={onClose} className="modal-close" aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {requests.length === 0 ? (
            <div className="requests-empty">
              <svg className="requests-empty__icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <p>Waiting for people to send requests</p>
            </div>
          ) : (
            <div className="requests-list">
              {pending.length > 0 && (
                <>
                  <p className="requests-section-label">Pending</p>
                  {pending.map((req) => (
                    <RequestRow key={req.id} req={req} onApprove={onApprove} />
                  ))}
                </>
              )}
              {approved.length > 0 && (
                <>
                  <p className="requests-section-label">Approved</p>
                  {approved.map((req) => (
                    <RequestRow key={req.id} req={req} onApprove={onApprove} />
                  ))}
                </>
              )}
            </div>
          )}

          <p className="modal-hint">
            You can approve multiple people. They&apos;ll each see your WhatsApp number after approval.
          </p>
        </div>
      </div>
    </div>
  );
}

function RequestRow({
  req,
  onApprove,
}: {
  req: JoinRequest;
  onApprove: (r: JoinRequest) => void;
}) {
  const approved = req.status === "approved";
  return (
    <div className={`request-row ${approved ? "request-row--approved" : ""}`}>
      <div className="request-row__info">
        <span className="request-row__name">
          {req.requester_name || "Anonymous"}
        </span>
        <span className="request-row__note">{req.note}</span>
      </div>
      {approved ? (
        <span className="request-row__approved-badge">Approved</span>
      ) : (
        <button
          onClick={() => onApprove(req)}
          className="btn btn--approve"
        >
          Approve
        </button>
      )}
    </div>
  );
}
