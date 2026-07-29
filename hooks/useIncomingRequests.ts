"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchRequestsForOrder, approveJoinRequest } from "@/lib/api";
import type { JoinRequest } from "@/lib/types";

const POLLING_INTERVAL_MS = 3_000;
const BC_CHANNEL = "cartmate-requests";

/**
 * Manages incoming join requests for the poster's active order.
 * Works via Supabase Realtime when configured, or BroadcastChannel in demo mode.
 */
export function useIncomingRequests(orderId: string | null) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);

  useEffect(() => {
    if (!orderId) { setRequests([]); return; }

    // ── Demo mode: BroadcastChannel + Polling ─────────────
    let pollingId: ReturnType<typeof setInterval>;

    const poll = () => {
      fetchRequestsForOrder(orderId).then(setRequests);
    };

    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel(BC_CHANNEL);
      bc.onmessage = (e) => {
        if (
          e.data?.type === "JOIN_REQUEST" &&
          (e.data.request as JoinRequest).order_id === orderId
        ) {
          const req = e.data.request as JoinRequest;
          setRequests((prev) =>
            prev.find((r) => r.id === req.id) ? prev : [...prev, req]
          );
        }
      };
      
      // Start polling for cross-window (e.g. Incognito) sync
      poll();
      pollingId = setInterval(poll, POLLING_INTERVAL_MS);

      return () => {
        bc.close();
        clearInterval(pollingId);
      };
    } else {
      poll();
      pollingId = setInterval(poll, POLLING_INTERVAL_MS);
      return () => clearInterval(pollingId);
    }
  }, [orderId]);

  /** Approve a join request — updates Supabase and broadcasts to requester's tab. */
  const approve = useCallback(async (request: JoinRequest) => {
    // Update Supabase if available
    await approveJoinRequest(request.id);

    // Update local state optimistically
    setRequests((prev) =>
      prev.map((r) => (r.id === request.id ? { ...r, status: "approved" } : r))
    );

    // Broadcast approval so the requester's tab can reveal the WhatsApp button
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel(BC_CHANNEL);
      bc.postMessage({
        type: "REQUEST_APPROVED",
        requestId: request.id,
        orderId: request.order_id,
        requesterDeviceId: request.requester_device_id,
      });
      bc.close();
    }
  }, []);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return { requests, approve, pendingCount };
}
