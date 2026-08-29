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

  const loadRequests = useCallback(async () => {
    if (!orderId) return;
    const data = await fetchRequestsForOrder(orderId);
    if (data) {
      setRequests(data);
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;

    const poll = () => loadRequests();

    // ── Demo mode: BroadcastChannel + Polling ─────────────
    let pollingId: ReturnType<typeof setInterval>;

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
  }, [orderId, loadRequests]);

  /** Approve a join request, then tell the requester to reveal WhatsApp. */
  const approve = useCallback(async (request: JoinRequest) => {
    const saved = await approveJoinRequest(request.id);
    if (!saved) return false;

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
    return true;
  }, []);

  const visibleRequests = orderId
    ? requests.filter((request) => request.order_id === orderId)
    : [];
  const pendingCount = visibleRequests.filter((r) => r.status === "pending").length;

  return { requests: visibleRequests, approve, pendingCount };
}
