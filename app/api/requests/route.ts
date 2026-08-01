import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { getRedis } from "@/lib/redis";
import type { JoinRequest, Order } from "@/lib/types";

const globalAny = global as any;
if (!globalAny._mockRequests) globalAny._mockRequests = [];

const REQUEST_KEY = (id: string) => `cartmate:request:${id}`;
const ORDER_REQUESTS_KEY = (orderId: string) => `cartmate:requests:order:${orderId}`;
const ORDER_KEY = (id: string) => `cartmate:order:${id}`;

async function getRequestsForOrder(redis: NonNullable<ReturnType<typeof getRedis>>, orderId: string): Promise<JoinRequest[]> {
  const ids = await redis.lrange(ORDER_REQUESTS_KEY(orderId), 0, -1);
  if (!ids.length) return [];
  const pipeline = redis.pipeline();
  for (const id of ids) pipeline.get(REQUEST_KEY(id as string));
  const results = await pipeline.exec();
  return results
    .filter(Boolean)
    .map((r) => (typeof r === "string" ? JSON.parse(r) : r) as JoinRequest);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

  const redis = getRedis();
  if (redis) {
    try {
      const requests = await getRequestsForOrder(redis, orderId);
      return NextResponse.json(requests);
    } catch (err) {
      console.error("[CartMate] Redis GET /api/requests failed:", err);
      return NextResponse.json({ error: String((err as any).message || err) }, { status: 500 });
    }
  }

  // In-memory fallback
  const requests = (globalAny._mockRequests as JoinRequest[]).filter(
    (r) => r.order_id === orderId
  );
  return NextResponse.json(requests);
}

export async function POST(req: Request) {
  const data = await req.json();

  if (!data.order_id || !data.requester_device_id || !data.note) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (data.note.length > 150) {
    return NextResponse.json({ error: "Note too long" }, { status: 400 });
  }

  const redis = getRedis();

  if (redis) {
    try {
      // ── Rule 1: no duplicate request for same order ─────
      const existingForOrder = await getRequestsForOrder(redis, data.order_id);
      const duplicate = existingForOrder.find(
        (r) => r.requester_device_id === data.requester_device_id && r.status !== "withdrawn"
      );
      if (duplicate) {
        return NextResponse.json({ error: "You already sent a request for this order" }, { status: 409 });
      }

      // ── Rule 2: one pending request at a time across ALL orders ─────
      // We look through all request keys for this device.
      // Efficient: we store a device→pending index set.
      const DEVICE_PENDING_KEY = `cartmate:device:pending:${data.requester_device_id}`;
      const pendingOrderIds = await redis.smembers(DEVICE_PENDING_KEY) as string[];
      // Check each to see if still pending
      for (const pendingOrderId of pendingOrderIds) {
        if (pendingOrderId === data.order_id) continue; // same order, already caught above
        const orderRequests = await getRequestsForOrder(redis, pendingOrderId);
        const stillPending = orderRequests.find(
          (r) => r.requester_device_id === data.requester_device_id && r.status === "pending"
        );
        if (stillPending) {
          return NextResponse.json(
            { error: "You already have a pending request on another order. Withdraw it first." },
            { status: 409 }
          );
        } else {
          // Stale entry in the pending index — clean it up
          await redis.srem(DEVICE_PENDING_KEY, pendingOrderId);
        }
      }

      const newRequest: JoinRequest = {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        status: "pending",
      };

      await redis.set(REQUEST_KEY(newRequest.id), JSON.stringify(newRequest), { ex: 60 * 60 * 24 });
      await redis.lpush(ORDER_REQUESTS_KEY(data.order_id), newRequest.id);
      await redis.expire(ORDER_REQUESTS_KEY(data.order_id), 60 * 60 * 24);
      // Track this device has a pending request
      await redis.sadd(DEVICE_PENDING_KEY, data.order_id);
      await redis.expire(DEVICE_PENDING_KEY, 60 * 60 * 24);

      return NextResponse.json(newRequest);
    } catch (err) {
      console.error("[CartMate] Redis POST /api/requests failed:", err);
      return NextResponse.json({ error: String((err as any).message || err) }, { status: 500 });
    }
  } else {
    const newRequest: JoinRequest = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      status: "pending",
    };
    (globalAny._mockRequests as JoinRequest[]).push(newRequest);
    return NextResponse.json(newRequest);
  }
}

export async function PATCH(req: Request) {
  const data = await req.json();
  const { id, action } = data; // action: "approve" | "withdraw"
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get<string>(REQUEST_KEY(id));
      if (!raw) return NextResponse.json({ error: "Request not found" }, { status: 404 });
      const existing: JoinRequest = typeof raw === "string" ? JSON.parse(raw) : raw;

      // ── Withdraw ─────────────────────────────────────────
      if (action === "withdraw") {
        const updated: JoinRequest = { ...existing, status: "withdrawn" };
        await redis.set(REQUEST_KEY(id), JSON.stringify(updated), { ex: 60 * 60 * 24 });
        // Remove from device pending index
        const DEVICE_PENDING_KEY = `cartmate:device:pending:${existing.requester_device_id}`;
        await redis.srem(DEVICE_PENDING_KEY, existing.order_id);
        return NextResponse.json(updated);
      }

      // ── Approve ──────────────────────────────────────────
      const updated: JoinRequest = { ...existing, status: "approved" };
      await redis.set(REQUEST_KEY(id), JSON.stringify(updated), { ex: 60 * 60 * 24 });

      // Remove from device pending index (now approved, not pending)
      const DEVICE_PENDING_KEY = `cartmate:device:pending:${existing.requester_device_id}`;
      await redis.srem(DEVICE_PENDING_KEY, existing.order_id);

      // ── Auto-decline if spots full ───────────────────────
      const orderRaw = await redis.get<string>(ORDER_KEY(existing.order_id));
      if (orderRaw) {
        const order: Order = typeof orderRaw === "string" ? JSON.parse(orderRaw) : orderRaw;
        const allRequests = await getRequestsForOrder(redis, existing.order_id);
        const approvedCount = allRequests.filter((r) => r.status === "approved").length;

        if (approvedCount >= order.max_spots) {
          // Auto-decline all still-pending requests for this order
          const toDecline = allRequests.filter((r) => r.status === "pending");
          for (const req of toDecline) {
            const declinedReq: JoinRequest = { ...req, status: "declined" };
            await redis.set(REQUEST_KEY(req.id), JSON.stringify(declinedReq), { ex: 60 * 60 * 24 });
            // Also free up the device's pending slot
            const devKey = `cartmate:device:pending:${req.requester_device_id}`;
            await redis.srem(devKey, req.order_id);
          }
        }
      }

      return NextResponse.json(updated);
    } catch (err) {
      console.error("[CartMate] Redis PATCH /api/requests failed:", err);
      return NextResponse.json({ error: String((err as any).message || err) }, { status: 500 });
    }
  }

  // In-memory fallback
  const req_ = (globalAny._mockRequests as JoinRequest[]).find((r) => r.id === id);
  if (req_) {
    req_.status = action === "withdraw" ? "withdrawn" : "approved";
  }
  return NextResponse.json({ success: true });
}
