"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getAllRequests,
  saveMyRequest,
  markRequestApproved,
  LocalRequest,
} from "@/lib/requests";
import { createJoinRequest } from "@/lib/api";
import { getDeviceId } from "@/lib/device";
import type { Order, JoinRequest } from "@/lib/types";

const BC_CHANNEL = "cartmate-requests";

type RequestStatus = "none" | "pending" | "approved";

/** Tracks the current device's outgoing join requests. */
export function useMyRequests() {
  // Map of orderId → status
  const [statusMap, setStatusMap] = useState<Record<string, RequestStatus>>({});

  useEffect(() => {
    // Hydrate from localStorage
    const stored = getAllRequests();
    const initial: Record<string, RequestStatus> = {};
    for (const [orderId, req] of Object.entries(stored)) {
      initial[orderId] = req.status;
    }
    setStatusMap(initial);

    // Polling for demo mode (cross-window/Incognito sync)
    const pollPending = async () => {
      const currentStored = getAllRequests();
      for (const [orderId, req] of Object.entries(currentStored)) {
        if (req.status === "pending") {
          try {
            // Fetch all requests for this order
            const res = await fetch(`/api/requests?orderId=${orderId}`);
            if (res.ok) {
              const reqs = await res.json();
              const myReq = reqs.find((r: any) => r.id === req.id);
              if (myReq && myReq.status === "approved") {
                markRequestApproved(orderId);
                setStatusMap((prev) => ({ ...prev, [orderId]: "approved" }));
              }
            }
          } catch {}
        }
      }
    };
    const pollingId = setInterval(pollPending, 3000);

    // Listen for approval notifications from the poster's tab
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel(BC_CHANNEL);
      bc.onmessage = (e) => {
        if (e.data?.type === "REQUEST_APPROVED") {
          const { orderId } = e.data as { type: string; orderId: string };
          markRequestApproved(orderId);
          setStatusMap((prev) => ({ ...prev, [orderId]: "approved" }));
        }
      };
      return () => {
        bc.close();
        clearInterval(pollingId);
      };
    }
    return () => clearInterval(pollingId);
  }, []);

  const sendRequest = useCallback(
    async (order: Order, requesterName: string | null, note: string) => {
      const deviceId = getDeviceId();

      const payload = {
        order_id: order.id,
        requester_device_id: deviceId,
        requester_name: requesterName || null,
        note,
      };

      // Try Supabase; fall back to a local record for demo mode
      let saved: JoinRequest | null = await createJoinRequest(payload);
      if (!saved) {
        saved = {
          id: crypto.randomUUID(),
          status: "pending",
          created_at: new Date().toISOString(),
          ...payload,
        };
      }

      // Persist locally
      const local: LocalRequest = {
        id: saved.id,
        order_id: order.id,
        status: "pending",
        requester_name: requesterName || null,
        note,
      };
      saveMyRequest(local);

      // Broadcast to the poster's tab (demo mode)
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel(BC_CHANNEL);
        bc.postMessage({ type: "JOIN_REQUEST", request: saved });
        bc.close();
      }

      setStatusMap((prev) => ({ ...prev, [order.id]: "pending" }));
    },
    []
  );

  const getStatus = useCallback(
    (orderId: string): RequestStatus => statusMap[orderId] ?? "none",
    [statusMap]
  );

  return { getStatus, sendRequest };
}
