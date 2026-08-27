"use client";

import { useEffect } from "react";
import type { Order } from "@/lib/types";
import { trackEvent } from "@/lib/analytics";

interface PostSuccessSheetProps {
  order: Order;
  onClose: () => void;
}

function shortHostel(hostel: string) {
  return hostel
    .replace(/^HB4\s+/i, "")
    .replace(/-WING/i, "-Wing")
    .replace(/\s*\(([^)]+)\)$/, " · $1");
}

export function PostSuccessSheet({ order, onClose }: PostSuccessSheetProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const pageUrl =
    typeof window === "undefined"
      ? "https://cartmate-ten.vercel.app/"
      : `${window.location.origin}/?hostel=${encodeURIComponent(order.hostel)}`;
  const hostel = shortHostel(order.hostel);
  const message = encodeURIComponent(
    `I'm ordering from ${order.platform} in ${hostel}. Want to split delivery fees? Join before this post closes: ${pageUrl}`
  );
  const whatsappUrl = `https://wa.me/?text=${message}`;

  return (
    <div className="modal-overlay modal-overlay--open" role="dialog" aria-modal="true">
      <div className="modal-sheet modal-sheet--open post-success-sheet">
        <div className="modal-handle" />
        <div className="modal-content">
          <p className="success-kicker">Your order is live</p>
          <h2 className="success-title">Now bring someone in.</h2>
          <p className="success-copy">
            Share it to your hostel group. Students land directly on the {hostel} board.
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--share"
            onClick={() => trackEvent("order_shared_whatsapp", { hostel: order.hostel, platform: order.platform })}
          >
            Share to WhatsApp
          </a>
          <button type="button" className="success-dismiss" onClick={onClose}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
