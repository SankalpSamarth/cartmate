"use client";

import { useEffect, useState, useCallback } from "react";
import type { Order } from "@/lib/types";
import { PLATFORM_COLORS } from "@/lib/constants";
import { getDeviceId } from "@/lib/device";
import { WHATSAPP_MESSAGE_TEMPLATE } from "@/lib/constants";

interface OrderCardProps {
  order: Order;
  requestStatus: "none" | "pending" | "approved";
  onDelete: (id: string) => void;
  onRequestJoin: (order: Order) => void;
}

function formatCountdown(expiresAt: string): { label: string; state: "normal" | "amber" | "urgent" } {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { label: "Expired", state: "urgent" };
  const totalSecs = Math.floor(diff / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const label = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  if (diff < 3 * 60 * 1000) return { label, state: "urgent" };
  if (diff < 10 * 60 * 1000) return { label, state: "amber" };
  return { label, state: "normal" };
}

export function OrderCard({ order, requestStatus, onDelete, onRequestJoin }: OrderCardProps) {
  const [countdown, setCountdown] = useState(() => formatCountdown(order.expires_at));
  const [isOwn] = useState(() => getDeviceId() === order.device_id);

  useEffect(() => {
    const id = setInterval(() => setCountdown(formatCountdown(order.expires_at)), 1000);
    return () => clearInterval(id);
  }, [order.expires_at]);

  const colors =
    PLATFORM_COLORS[order.platform as keyof typeof PLATFORM_COLORS] ??
    PLATFORM_COLORS[Object.keys(PLATFORM_COLORS)[0] as keyof typeof PLATFORM_COLORS];

  const waMessage = encodeURIComponent(WHATSAPP_MESSAGE_TEMPLATE(order.platform, order.hostel));
  const waUrl = `https://wa.me/${order.whatsapp_number}?text=${waMessage}`;

  const handleDelete = useCallback(async () => {
    const { deleteOrder } = await import("@/lib/api");
    const ok = await deleteOrder(order.id, getDeviceId());
    if (ok) onDelete(order.id);
  }, [order.id, onDelete]);

  const timeSince = (() => {
    const diff = Date.now() - new Date(order.created_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins === 1) return "1 min ago";
    return `${mins} mins ago`;
  })();

  return (
    <div className={`order-card ${isOwn ? "order-card--own" : ""}`}>
      {/* Header */}
      <div className="order-card__header">
        <span
          className="platform-badge"
          style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}
        >
          {order.platform}
        </span>
        <span className={`countdown-badge${countdown.state === "urgent" ? " countdown-badge--urgent" : countdown.state === "amber" ? " countdown-badge--amber" : ""}`}>
          {countdown.label}
        </span>
      </div>

      {/* Location */}
      <div className="order-card__location">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        {order.hostel}{order.floor ? ` · Floor ${order.floor}` : ""}
        <span className="order-card__time">{timeSince}</span>
      </div>

      {/* Note */}
      <p className="order-card__note">&ldquo;{order.note}&rdquo;</p>

      {/* Actions */}
      <div className="order-card__actions">
        {isOwn ? (
          <button onClick={handleDelete} className="btn btn--ghost-danger">
            Cancel my post
          </button>
        ) : requestStatus === "approved" ? (
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn btn--whatsapp">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.016 22l4.979-1.407C8.37 21.488 10.14 22 11.999 22 17.522 22 22 17.523 22 12S17.522 2 11.999 2zm0 18c-1.657 0-3.205-.472-4.513-1.287l-.323-.193-3.321.938.954-3.24-.21-.334A8 8 0 1 1 12 20z" />
            </svg>
            Join on WhatsApp
          </a>
        ) : requestStatus === "pending" ? (
          <button disabled className="btn btn--pending">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Request sent
          </button>
        ) : (
          <button onClick={() => onRequestJoin(order)} className="btn btn--request">
            I want in
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
