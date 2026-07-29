import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getRedis } from "@/lib/redis";
import type { JoinRequest } from "@/lib/types";

const globalAny = global as any;
if (!globalAny._mockRequests) globalAny._mockRequests = [];

const REQUEST_KEY = (id: string) => `cartmate:request:${id}`;
const ORDER_REQUESTS_KEY = (orderId: string) => `cartmate:requests:order:${orderId}`;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

  const redis = getRedis();
  if (redis) {
    const ids = await redis.lrange(ORDER_REQUESTS_KEY(orderId), 0, -1);
    if (!ids.length) return NextResponse.json([]);
    const pipeline = redis.pipeline();
    for (const id of ids) pipeline.get(REQUEST_KEY(id as string));
    const results = await pipeline.exec();
    const requests = results
      .filter(Boolean)
      .map((r) => (typeof r === "string" ? JSON.parse(r) : r) as JoinRequest);
    return NextResponse.json(requests);
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

  // Prevent duplicate requests from same device for same order
  if (redis) {
    const existing = await (async () => {
      const ids = await redis.lrange(ORDER_REQUESTS_KEY(data.order_id), 0, -1);
      if (!ids.length) return [];
      const pipeline = redis.pipeline();
      for (const id of ids) pipeline.get(REQUEST_KEY(id as string));
      const results = await pipeline.exec();
      return (results as (JoinRequest | null)[]).filter(Boolean) as JoinRequest[];
    })();
    const duplicate = existing.find((r) => r.requester_device_id === data.requester_device_id);
    if (duplicate) {
      return NextResponse.json({ error: "You already sent a request for this order" }, { status: 409 });
    }
  }

  const newRequest: JoinRequest = {
    ...data,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    status: "pending",
  };

  if (redis) {
    // Store request, expire after 24h (orders max 20 min, this is generous)
    await redis.set(REQUEST_KEY(newRequest.id), JSON.stringify(newRequest), { ex: 60 * 60 * 24 });
    await redis.lpush(ORDER_REQUESTS_KEY(data.order_id), newRequest.id);
    await redis.expire(ORDER_REQUESTS_KEY(data.order_id), 60 * 60 * 24);
  } else {
    (globalAny._mockRequests as JoinRequest[]).push(newRequest);
  }

  return NextResponse.json(newRequest);
}

export async function PATCH(req: Request) {
  const data = await req.json();
  const { id } = data;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const redis = getRedis();
  if (redis) {
    const raw = await redis.get<string>(REQUEST_KEY(id));
    if (!raw) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    const existing: JoinRequest = typeof raw === "string" ? JSON.parse(raw) : raw;
    const updated = { ...existing, status: "approved" as const };
    await redis.set(REQUEST_KEY(id), JSON.stringify(updated), { ex: 60 * 60 * 24 });
    return NextResponse.json(updated);
  }

  // In-memory fallback
  const req_ = (globalAny._mockRequests as JoinRequest[]).find((r) => r.id === id);
  if (req_) req_.status = "approved";
  return NextResponse.json({ success: true });
}
