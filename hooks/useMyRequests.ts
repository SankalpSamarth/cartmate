"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getAllRequests,
  saveMyRequest,
  markRequestApproved,
  markRequestDeclined,
  removeMyRequest,
  LocalRequest,
} from "@/lib/requests";
import { createJoinRequest, withdrawJoinRequest } from "@/lib/api";
import { getDeviceId } from "@/lib/device";
import type { Order, JoinRequest } from "@/lib/types";

const BC_CHANNEL = "cartmate-requests";

type RequestStatus = "none" | "pending" | "approved" | "declined" | "withdrawn";

/** Tracks the current device's outgoing join requests. */
export function useMyRequests() {
  // Map of orderId → { status, requestId }
  const [statusMap, setStatusMap] = useState<Record<string, { status: RequestStatus; requestId: string }>>({});

  useEffect(() => {
    // Hydrate from localStorage
    const stored = getAllRequests();
    const initial: Record<string, { status: RequestStatus; requestId: string }> = {};
    for (const [orderId, req] of Object.entries(stored)) {
      initial[orderId] = { status: req.status, requestId: req.id };
    }
    setStatusMap(initial);

    // Polling — check if pending requests have been approved or declined
    const pollPending = async () => {
      const currentStored = getAllRequests();
      if (document.visibilityState !== "visible") return;
      for (const [orderId, req] of Object.entries(currentStored)) {
        if (req.status !== "pending") continue;
        try {
          const res = await fetch(`/api/requests?orderId=${orderId}`, { cache: "no-store" });
          if (!res.ok) continue;
          const reqs: JoinRequest[] = await res.json();
          const myReq = reqs.find((r) => r.id === req.id);
          if (!myReq) continue;

          if (myReq.status === "approved") {
            markRequestApproved(orderId);
            setStatusMap((prev) => ({ ...prev, [orderId]: { status: "approved", requestId: req.id } }));
          } else if (myReq.status === "declined") {
            markRequestDeclined(orderId);
            setStatusMap((prev) => ({ ...prev, [orderId]: { status: "declined", requestId: req.id } }));
          }
        } catch {}
      }
    };
    const pollingId = setInterval(pollPending, 15_000);

    // Listen for approval notifications from the poster's tab
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel(BC_CHANNEL);
      bc.onmessage = (e) => {
        if (e.data?.type === "REQUEST_APPROVED") {
          const { orderId } = e.data as { type: string; orderId: string };
          markRequestApproved(orderId);
          setStatusMap((prev) => {
            const existing = prev[orderId];
            return { ...prev, [orderId]: { status: "approved", requestId: existing?.requestId ?? "" } };
          });
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

      // Broadcast to the poster's tab (same-session sync)
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel(BC_CHANNEL);
        bc.postMessage({ type: "JOIN_REQUEST", request: saved });
        bc.close();
      }

      setStatusMap((prev) => ({ ...prev, [order.id]: { status: "pending", requestId: saved!.id } }));
      return saved;
    },
    []
  );

  const withdrawRequest = useCallback(async (orderId: string) => {
    const entry = statusMap[orderId];
    if (!entry || entry.status !== "pending") return;

    await withdrawJoinRequest(entry.requestId);
    removeMyRequest(orderId);
    setStatusMap((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
  }, [statusMap]);

  const getStatus = useCallback(
    (orderId: string): RequestStatus => statusMap[orderId]?.status ?? "none",
    [statusMap]
  );

  return { getStatus, sendRequest, withdrawRequest };
}
