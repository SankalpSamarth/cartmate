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
const POLLING_INTERVAL_MS = 3_000;

type RequestStatus = "none" | "pending" | "approved" | "declined" | "withdrawn";
type StatusMap = Record<string, { status: RequestStatus; requestId: string }>;

function getInitialStatusMap(): StatusMap {
  const stored = getAllRequests();
  const initial: StatusMap = {};
  for (const [orderId, request] of Object.entries(stored)) {
    initial[orderId] = { status: request.status, requestId: request.id };
  }
  return initial;
}

/** Tracks the current device's outgoing join requests. */
export function useMyRequests() {
  // Map of orderId → { status, requestId }
  const [statusMap, setStatusMap] = useState<StatusMap>(getInitialStatusMap);

  useEffect(() => {
    // Polling — check if pending requests have been approved or declined
    const pollPending = async () => {
      const currentStored = getAllRequests();
      if (document.visibilityState !== "visible") return;
      await Promise.all(Object.entries(currentStored).map(async ([orderId, req]) => {
        if (req.status !== "pending") return;
        try {
          const res = await fetch(`/api/requests?orderId=${encodeURIComponent(orderId)}`, { cache: "no-store" });
          if (!res.ok) return;
          const reqs: JoinRequest[] = await res.json();
          const myReq = reqs.find((r) => r.id === req.id);
          if (!myReq) return;

          if (myReq.status === "approved") {
            markRequestApproved(orderId);
            setStatusMap((prev) => ({ ...prev, [orderId]: { status: "approved", requestId: req.id } }));
          } else if (myReq.status === "declined") {
            markRequestDeclined(orderId);
            setStatusMap((prev) => ({ ...prev, [orderId]: { status: "declined", requestId: req.id } }));
          }
        } catch {}
      }));
    };

    // Sync immediately on page load, then keep the visible tab fresh. This is
    // important when a push notification opens or focuses CartMate.
    void pollPending();
    const pollingId = setInterval(() => void pollPending(), POLLING_INTERVAL_MS);
    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") void pollPending();
    };
    window.addEventListener("focus", syncWhenVisible);
    window.addEventListener("pageshow", syncWhenVisible);
    document.addEventListener("visibilitychange", syncWhenVisible);

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
        window.removeEventListener("focus", syncWhenVisible);
        window.removeEventListener("pageshow", syncWhenVisible);
        document.removeEventListener("visibilitychange", syncWhenVisible);
      };
    }
    return () => {
      clearInterval(pollingId);
      window.removeEventListener("focus", syncWhenVisible);
      window.removeEventListener("pageshow", syncWhenVisible);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
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

      const saved: JoinRequest | null = await createJoinRequest(payload);
      if (!saved) return null;

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

      setStatusMap((prev) => ({ ...prev, [order.id]: { status: "pending", requestId: saved.id } }));
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
