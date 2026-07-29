import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import type { Order } from "@/lib/types";

// ── In-memory fallback (local dev without Upstash) ──────────────
const globalAny = global as any;
if (!globalAny._mockOrders) globalAny._mockOrders = [];

// ── Redis helpers ────────────────────────────────────────────────
const ORDERS_KEY = "cartmate:orders"; // sorted set: score = expiry ms
const ORDER_KEY = (id: string) => `cartmate:order:${id}`;
const STATS_KEY = "cartmate:stats:orders"; // sorted set: score = created ms

async function redisGetActiveOrders(redis: NonNullable<ReturnType<typeof getRedis>>): Promise<Order[]> {
  const now = Date.now();
  // Remove expired first
  await redis.zremrangebyscore(ORDERS_KEY, "-inf", now);
  // Get IDs of still-active orders (expiry > now)
  const ids = await redis.zrange(ORDERS_KEY, now, "+inf", { byScore: true });
  if (!ids.length) return [];
  const pipeline = redis.pipeline();
  for (const id of ids) pipeline.get(ORDER_KEY(id as string));
  const results = await pipeline.exec();
  return (results as (Order | null)[])
    .filter(Boolean)
    .map((r) => r as Order)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

async function redisCreateOrder(redis: NonNullable<ReturnType<typeof getRedis>>, order: Order): Promise<void> {
  const expiryMs = new Date(order.expires_at).getTime();
  const ttlSecs = Math.ceil((expiryMs - Date.now()) / 1000);
  await redis.set(ORDER_KEY(order.id), JSON.stringify(order), { ex: ttlSecs });
  await redis.zadd(ORDERS_KEY, { score: expiryMs, member: order.id });
  // Track for stats (keep 7 days)
  await redis.zadd(STATS_KEY, { score: new Date(order.created_at).getTime(), member: order.id });
  await redis.expire(STATS_KEY, 60 * 60 * 24 * 7);
}

async function redisDeleteOrder(redis: NonNullable<ReturnType<typeof getRedis>>, id: string, deviceId: string): Promise<boolean> {
  const raw = await redis.get<string>(ORDER_KEY(id));
  if (!raw) return false;
  const order: Order = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (order.device_id !== deviceId) return false;
  await redis.del(ORDER_KEY(id));
  await redis.zrem(ORDERS_KEY, id);
  return true;
}

// ── Route handlers ───────────────────────────────────────────────

export async function GET() {
  const redis = getRedis();
  if (redis) {
    const orders = await redisGetActiveOrders(redis);
    return NextResponse.json(orders);
  }
  // In-memory fallback
  const active = (globalAny._mockOrders as Order[])
    .filter((o) => new Date(o.expires_at) > new Date())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return NextResponse.json(active);
}

export async function POST(req: Request) {
  const data = await req.json();

  // Server-side validation
  if (!data.platform || !data.hostel || !data.note || !data.whatsapp_number || !data.expires_at || !data.device_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (data.note.length > 150) {
    return NextResponse.json({ error: "Note too long" }, { status: 400 });
  }
  if (!/^\d{10}$/.test(data.whatsapp_number)) {
    return NextResponse.json({ error: "Invalid WhatsApp number" }, { status: 400 });
  }

  const order: Order = {
    ...data,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };

  const redis = getRedis();
  if (redis) {
    // Rate limit: one active post per device
    const existing = await redisGetActiveOrders(redis);
    const alreadyPosted = existing.find((o) => o.device_id === data.device_id);
    if (alreadyPosted) {
      return NextResponse.json({ error: "You already have an active post" }, { status: 429 });
    }
    await redisCreateOrder(redis, order);
  } else {
    (globalAny._mockOrders as Order[]).unshift(order);
  }

  return NextResponse.json(order);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const deviceId = searchParams.get("deviceId");

  if (!id || !deviceId) {
    return NextResponse.json({ error: "Missing id or deviceId" }, { status: 400 });
  }

  const redis = getRedis();
  if (redis) {
    const ok = await redisDeleteOrder(redis, id, deviceId);
    if (!ok) return NextResponse.json({ error: "Not found or not your post" }, { status: 404 });
    return NextResponse.json({ success: true });
  }

  // In-memory fallback
  globalAny._mockOrders = (globalAny._mockOrders as Order[]).filter(
    (o) => !(o.id === id && o.device_id === deviceId)
  );
  return NextResponse.json({ success: true });
}
