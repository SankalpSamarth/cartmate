import webpush, { type PushSubscription } from "web-push";
import { getRedis } from "@/lib/redis";

export interface StoredPushSubscription {
  deviceId: string;
  hostel: string;
  subscription: PushSubscription;
  updatedAt: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

type PushGlobal = typeof globalThis & {
  _mockPushSubscriptions?: Map<string, StoredPushSubscription>;
};

const pushGlobal = globalThis as PushGlobal;
if (!pushGlobal._mockPushSubscriptions) {
  pushGlobal._mockPushSubscriptions = new Map();
}

const SUBSCRIPTION_KEY = (deviceId: string) => `cartmate:push:subscription:${deviceId}`;
const HOSTEL_SUBSCRIBERS_KEY = (hostel: string) =>
  `cartmate:push:hostel:${encodeURIComponent(hostel)}`;
const SUBSCRIPTION_TTL_SECONDS = 60 * 60 * 24 * 90;

function getVapidDetails() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "https://cartmate-ten.vercel.app/";

  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

export function getVapidPublicKey() {
  return getVapidDetails()?.publicKey ?? null;
}

function parseRecord(value: StoredPushSubscription | string | null): StoredPushSubscription | null {
  if (!value) return null;
  return typeof value === "string" ? JSON.parse(value) : value;
}

export async function savePushSubscription(record: StoredPushSubscription) {
  const redis = getRedis();
  if (!redis) {
    pushGlobal._mockPushSubscriptions!.set(record.deviceId, record);
    return;
  }

  const previous = parseRecord(
    await redis.get<StoredPushSubscription | string>(SUBSCRIPTION_KEY(record.deviceId))
  );

  const pipeline = redis.pipeline();
  if (previous && previous.hostel !== record.hostel) {
    pipeline.srem(HOSTEL_SUBSCRIBERS_KEY(previous.hostel), record.deviceId);
  }
  pipeline.set(SUBSCRIPTION_KEY(record.deviceId), JSON.stringify(record), {
    ex: SUBSCRIPTION_TTL_SECONDS,
  });
  pipeline.sadd(HOSTEL_SUBSCRIBERS_KEY(record.hostel), record.deviceId);
  pipeline.expire(HOSTEL_SUBSCRIBERS_KEY(record.hostel), SUBSCRIPTION_TTL_SECONDS);
  await pipeline.exec();
}

export async function removePushSubscription(deviceId: string) {
  const redis = getRedis();
  if (!redis) {
    pushGlobal._mockPushSubscriptions!.delete(deviceId);
    return;
  }

  const record = parseRecord(
    await redis.get<StoredPushSubscription | string>(SUBSCRIPTION_KEY(deviceId))
  );
  const pipeline = redis.pipeline();
  pipeline.del(SUBSCRIPTION_KEY(deviceId));
  if (record) pipeline.srem(HOSTEL_SUBSCRIBERS_KEY(record.hostel), deviceId);
  await pipeline.exec();
}

async function getPushSubscription(deviceId: string) {
  const redis = getRedis();
  if (!redis) {
    return pushGlobal._mockPushSubscriptions!.get(deviceId) ?? null;
  }
  return parseRecord(
    await redis.get<StoredPushSubscription | string>(SUBSCRIPTION_KEY(deviceId))
  );
}

export async function sendPushToDevice(deviceId: string, payload: PushPayload) {
  const vapid = getVapidDetails();
  if (!vapid) return false;

  const record = await getPushSubscription(deviceId);
  if (!record) return false;

  try {
    await webpush.sendNotification(record.subscription, JSON.stringify(payload), {
      vapidDetails: vapid,
      TTL: 60 * 15,
      urgency: "high",
    });
    return true;
  } catch (error) {
    const statusCode =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : null;
    if (statusCode === 404 || statusCode === 410) {
      await removePushSubscription(deviceId);
    } else {
      console.error("[CartMate] push delivery failed:", error);
    }
    return false;
  }
}

export async function sendPushToHostel(
  hostel: string,
  payload: PushPayload,
  excludeDeviceId?: string
) {
  const redis = getRedis();
  const deviceIds = redis
    ? ((await redis.smembers(HOSTEL_SUBSCRIBERS_KEY(hostel))) as string[])
    : [...pushGlobal._mockPushSubscriptions!.values()]
        .filter((record) => record.hostel === hostel)
        .map((record) => record.deviceId);

  const targets = deviceIds
    .filter((deviceId) => deviceId !== excludeDeviceId)
    .slice(0, 200);

  await Promise.allSettled(targets.map((deviceId) => sendPushToDevice(deviceId, payload)));
  return targets.length;
}
