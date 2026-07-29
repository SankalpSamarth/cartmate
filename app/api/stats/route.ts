import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";


import { getRedis } from "@/lib/redis";

const STATS_KEY = "cartmate:stats:orders"; // sorted set: score = created timestamp ms

export async function GET() {
  const redis = getRedis();

  if (redis) {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const [lastHour, today] = await Promise.all([
      redis.zcount(STATS_KEY, oneHourAgo, now),
      redis.zcount(STATS_KEY, oneDayAgo, now),
    ]);

    return NextResponse.json({ lastHour, today });
  }

  // Fallback: count from in-memory mock orders
  const globalAny = global as any;
  const orders = (globalAny._mockOrders ?? []) as { created_at: string }[];
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const lastHour = orders.filter((o) => new Date(o.created_at).getTime() > oneHourAgo).length;
  const today = orders.filter((o) => new Date(o.created_at).getTime() > oneDayAgo).length;

  return NextResponse.json({ lastHour, today });
}
