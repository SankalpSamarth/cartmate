"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PLATFORMS, HOSTELS, DURATIONS, PLATFORM_COLORS } from "@/lib/constants";
import { createOrder } from "@/lib/api";
import { getDeviceId, StoredPost } from "@/lib/device";
import type { Order } from "@/lib/types";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (order: Order, stored: StoredPost) => void;
}

const INITIAL_STATE = {
  platform: "" as string,
  hostel: "" as string,
  floor: "",
  note: "",
  whatsapp: "",
  duration: 15 as 10 | 15 | 20,
  spots: 1 as 1 | 2,
};

export function CreatePostModal({ isOpen, onClose, onCreated }: CreatePostModalProps) {
  const [form, setForm] = useState(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setForm(INITIAL_STATE);
      setErrors({});
    }
  }, [isOpen]);

  // Close on backdrop click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.platform) e.platform = "Pick a platform";
    if (!form.hostel) e.hostel = "Pick your hostel";
    if (!form.note.trim()) e.note = "Add a short note";
    if (form.note.length > 150) e.note = "Keep it under 150 characters";
    if (!/^\d{10}$/.test(form.whatsapp)) e.whatsapp = "Enter a valid 10-digit number";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);

    const deviceId = getDeviceId();
    const expiresAt = new Date(Date.now() + form.duration * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const payload = {
      platform: form.platform,
      hostel: form.hostel,
      floor: form.floor.trim() || null,
      note: form.note.trim(),
      whatsapp_number: form.whatsapp.trim(),
      device_id: deviceId,
      expires_at: expiresAt,
      max_spots: form.spots,
    };

    let order = await createOrder(payload);

    // Demo mode fallback: if Supabase isn't configured, synthesize a local order.
    // BroadcastChannel in useOrders will still broadcast it to other open tabs.
    if (!order) {
      order = {
        id: crypto.randomUUID(),
        created_at: now,
        ...payload,
      };
    }

    setSubmitting(false);

    const stored: StoredPost = {
      id: order.id,
      device_id: deviceId,
      expires_at: order.expires_at,
      platform: order.platform,
      hostel: order.hostel,
    };

    onCreated(order, stored);
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
        {/* Handle */}
        <div className="modal-handle" />

        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title">Post an Order</h2>
            <button onClick={onClose} className="modal-close" aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Platform */}
          <div className="form-group">
            <label className="form-label">Platform</label>
            <div className="chip-group">
              {PLATFORMS.map((p) => {
                const colors = PLATFORM_COLORS[p];
                const selected = form.platform === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, platform: p }))}
                    className={`chip chip--platform ${selected ? "chip--selected" : ""}`}
                    style={selected ? {
                      background: colors.bg,
                      color: colors.text,
                      borderColor: colors.border,
                    } : {}}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            {errors.platform && <span className="form-error">{errors.platform}</span>}
          </div>

          {/* Hostel */}
          <div className="form-group">
            <label className="form-label">Hostel</label>
            <div className="chip-group chip-group--wrap">
              {HOSTELS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, hostel: h }))}
                  className={`chip ${form.hostel === h ? "chip--selected chip--selected-accent" : ""}`}
                >
                  {h}
                </button>
              ))}
            </div>
            {errors.hostel && <span className="form-error">{errors.hostel}</span>}
          </div>

          {/* Floor */}
          <div className="form-group">
            <label className="form-label">
              Floor <span className="form-label__optional">(optional)</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 3rd, Ground, Terrace"
              value={form.floor}
              onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
              maxLength={20}
            />
          </div>

          {/* Note */}
          <div className="form-group">
            <label className="form-label">
              What do you need?
              <span className={`char-count ${form.note.length > 130 ? "char-count--warn" : ""}`}>
                {form.note.length}/150
              </span>
            </label>
            <textarea
              className="form-input form-textarea"
              placeholder="e.g. need toothpaste + snacks, ~₹80 more to skip fee"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              maxLength={150}
              rows={3}
            />
            {errors.note && <span className="form-error">{errors.note}</span>}
          </div>

          {/* WhatsApp */}
          <div className="form-group">
            <label className="form-label">WhatsApp Number</label>
            <div className="input-with-prefix">
              <span className="input-prefix">+91</span>
              <input
                type="tel"
                className="form-input form-input--prefixed"
                placeholder="9876543210"
                value={form.whatsapp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setForm((f) => ({ ...f, whatsapp: val }));
                }}
                maxLength={10}
                inputMode="tel"
              />
            </div>
            {errors.whatsapp && <span className="form-error">{errors.whatsapp}</span>}
          </div>

          {/* Spots */}
          <div className="form-group">
            <label className="form-label">How many can join?</label>
            <div className="chip-group">
              {([1, 2] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, spots: s }))}
                  className={`chip ${form.spots === s ? "chip--selected chip--selected-accent" : ""}`}
                >
                  {s === 1 ? "1 person" : "2 people"}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="form-group">
            <label className="form-label">Expires in</label>
            <div className="chip-group">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, duration: d }))}
                  className={`chip ${form.duration === d ? "chip--selected chip--selected-accent" : ""}`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          {errors.submit && (
            <div className="form-error form-error--block">{errors.submit}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn btn--submit"
          >
            {submitting ? (
              <span className="btn__spinner" />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4 20-7z" />
                </svg>
                Post Order
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
