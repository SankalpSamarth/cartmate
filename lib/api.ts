/**
 * CartMate client-side API helpers.
 * All calls go to our own Next.js API routes (/api/*),
 * which are backed by Upstash Redis in production and
 * in-memory fallback in local dev.
 */

import type { Order, JoinRequest } from "./types";

// ─── Orders ───────────────────────────────────────────────────

export async function fetchActiveOrders(): Promise<Order[] | null> {
  try {
    const res = await fetch("/api/orders", { cache: "no-store" });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  } catch (err) {
    console.error("[CartMate] fetchActiveOrders failed:", err);
    return null; // Return null on error so we don't wipe the UI
  }
}

export async function createOrder(
  payload: Omit<Order, "id" | "created_at">
): Promise<Order | null> {
  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Failed to create order");
    }
    return await res.json();
  } catch (err) {
    console.error("[CartMate] createOrder:", err);
    return null;
  }
}

export async function deleteOrder(id: string, deviceId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/orders?id=${encodeURIComponent(id)}&deviceId=${encodeURIComponent(deviceId)}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch (err) {
    console.error("[CartMate] deleteOrder:", err);
    return false;
  }
}

// ─── Join Requests ─────────────────────────────────────────────

export async function createJoinRequest(
  payload: Omit<JoinRequest, "id" | "status" | "created_at">
): Promise<JoinRequest | null> {
  try {
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Failed to send request");
    }
    return await res.json();
  } catch (err) {
    console.error("[CartMate] createJoinRequest:", err);
    return null;
  }
}

export async function fetchRequestsForOrder(orderId: string): Promise<JoinRequest[] | null> {
  try {
    const res = await fetch(`/api/requests?orderId=${encodeURIComponent(orderId)}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  } catch (err) {
    console.error("[CartMate] fetchRequestsForOrder failed:", err);
    return null;
  }
}

export async function approveJoinRequest(requestId: string): Promise<boolean> {
  try {
    const res = await fetch("/api/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: requestId }),
    });
    return res.ok;
  } catch (err) {
    console.error("[CartMate] approveJoinRequest:", err);
    return false;
  }
}

// ─── Stats ─────────────────────────────────────────────────────

export interface Stats {
  lastHour: number;
  today: number;
}

export async function fetchStats(): Promise<Stats> {
  try {
    const res = await fetch("/api/stats", { cache: "no-store" });
    if (!res.ok) return { lastHour: 0, today: 0 };
    return await res.json();
  } catch {
    return { lastHour: 0, today: 0 };
  }
}
