"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { JoinRequest, Order } from "@/lib/types";

interface RequestsSheetProps {
  isOpen: boolean;
  requests: JoinRequest[];
  order: Order | null;
  onClose: () => void;
  onApprove: (request: JoinRequest) => Promise<boolean>;
}

export function RequestsSheet({ isOpen, requests, order, onClose, onApprove }: RequestsSheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => { if (e.target === overlayRef.current) onClose(); },
    [onClose]
  );

  const handleApprove = useCallback(async (request: JoinRequest) => {
    if (approvingId) return;
    setApprovalError(false);
    setApprovingId(request.id);
    try {
      const approved = await onApprove(request);
      if (!approved) setApprovalError(true);
    } finally {
      setApprovingId(null);
    }
  }, [approvingId, onApprove]);

  const pending = requests.filter((r) => r.status === "pending");
  const approved = requests.filter((r) => r.status === "approved");
  const declined = requests.filter((r) => r.status === "declined");
  const maxSpots = order?.max_spots ?? 1;
  const spotsLeft = Math.max(0, maxSpots - approved.length);
  const isFull = approved.length >= maxSpots;

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
                  : isFull
                  ? `${maxSpots}/${maxSpots} spots filled`
                  : `${approved.length}/${maxSpots} approved · ${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
              </p>
            </div>
            <button onClick={onClose} className="modal-close" aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {isFull && (
            <div className="requests-full-banner">
              All spots filled — remaining requests were automatically declined.
            </div>
          )}

          {approvalError && (
            <p className="form-error" role="alert">
              Couldn&apos;t approve this request. Check your connection and try again.
            </p>
          )}

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
              {approved.length > 0 && (
                <>
                  <p className="requests-section-label">Approved</p>
                  {approved.map((req) => (
                    <RequestRow key={req.id} req={req} onApprove={handleApprove} canApprove={false} approving={false} />
                  ))}
                </>
              )}
              {pending.length > 0 && (
                <>
                  <p className="requests-section-label">Pending</p>
                  {pending.map((req) => (
                    <RequestRow key={req.id} req={req} onApprove={handleApprove} canApprove={!isFull} approving={approvingId === req.id} />
                  ))}
                </>
              )}
              {declined.length > 0 && (
                <>
                  <p className="requests-section-label requests-section-label--muted">Not selected</p>
                  {declined.map((req) => (
                    <RequestRow key={req.id} req={req} onApprove={handleApprove} canApprove={false} approving={false} />
                  ))}
                </>
              )}
            </div>
          )}

          {!isFull && (
            <p className="modal-hint">
              You can approve up to {maxSpots} person{maxSpots === 1 ? "" : "s"}. Others will be automatically declined.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function RequestRow({
  req,
  onApprove,
  canApprove,
  approving,
}: {
  req: JoinRequest;
  onApprove: (r: JoinRequest) => Promise<void>;
  canApprove: boolean;
  approving: boolean;
}) {
  const isApproved = req.status === "approved";
  const isDeclined = req.status === "declined";

  return (
    <div className={`request-row ${isApproved ? "request-row--approved" : ""} ${isDeclined ? "request-row--declined" : ""}`}>
      <div className="request-row__info">
        <span className="request-row__name">
          {req.requester_name || "Anonymous"}
        </span>
        <span className="request-row__note">{req.note}</span>
      </div>
      {isApproved ? (
        <span className="request-row__approved-badge">Approved</span>
      ) : isDeclined ? (
        <span className="request-row__declined-badge">Not selected</span>
      ) : canApprove ? (
        <button
          onClick={() => onApprove(req)}
          className="btn btn--approve"
          disabled={approving}
        >
          {approving ? "Approving…" : "Approve"}
        </button>
      ) : (
        <span className="request-row__pending-badge">Pending</span>
      )}
    </div>
  );
}
