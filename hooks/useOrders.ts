"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { fetchActiveOrders } from "@/lib/api";
import type { Order } from "@/lib/types";

const POLLING_INTERVAL_MS = 15_000;
const BC_CHANNEL = "cartmate-orders";

type BCMessage =
  | { type: "INSERT"; order: Order }
  | { type: "DELETE"; id: string };

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);

  const loadOrders = useCallback(async () => {
    const data = await fetchActiveOrders();
    if (data) {
      setOrders(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Initial fetch
    const initialLoadId = setTimeout(loadOrders, 0);

    // BroadcastChannel — instant sync within same browser session
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel(BC_CHANNEL);
      bcRef.current = bc;
      bc.onmessage = (event: MessageEvent<BCMessage>) => {
        const msg = event.data;
        if (msg.type === "INSERT") {
          setOrders((prev) =>
            prev.find((o) => o.id === msg.order.id) ? prev : [msg.order, ...prev]
          );
        } else if (msg.type === "DELETE") {
          setOrders((prev) => prev.filter((o) => o.id !== msg.id));
        }
      };
    }

    // Polling — bridges cross-window (incognito / other devices) sync
    pollingRef.current = setInterval(() => {
      // Don't waste API calls if the user isn't even looking at the tab
      if (document.visibilityState === "visible") {
        loadOrders();
      }
    }, POLLING_INTERVAL_MS);

    return () => {
      bcRef.current?.close();
      clearTimeout(initialLoadId);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [loadOrders]);

  const removeOrder = useCallback((id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
    bcRef.current?.postMessage({ type: "DELETE", id } satisfies BCMessage);
  }, []);

  const addOrder = useCallback((order: Order) => {
    setOrders((prev) =>
      prev.find((o) => o.id === order.id) ? prev : [order, ...prev]
    );
    bcRef.current?.postMessage({ type: "INSERT", order } satisfies BCMessage);
  }, []);

  const now = new Date();
  const activeOrders = orders.filter((o) => new Date(o.expires_at) > now);

  return {
    orders: activeOrders,
    loading,
    realtimeConnected: true, // polling always works
    removeOrder,
    addOrder,
    refresh: loadOrders,
  };
}
