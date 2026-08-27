import { NextResponse } from "next/server";
import { HOSTELS } from "@/lib/constants";
import {
  getVapidPublicKey,
  removePushSubscription,
  savePushSubscription,
  type StoredPushSubscription,
} from "@/lib/push";
import type { PushSubscription } from "web-push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAllowedPushEndpoint(endpoint: string) {
  try {
    const hostname = new URL(endpoint).hostname;
    return (
      hostname === "fcm.googleapis.com" ||
      hostname === "updates.push.services.mozilla.com" ||
      hostname === "web.push.apple.com" ||
      hostname.endsWith(".push.apple.com") ||
      hostname === "notify.windows.com" ||
      hostname.endsWith(".notify.windows.com")
    );
  } catch {
    return false;
  }
}

function isPushSubscription(value: unknown): value is PushSubscription {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PushSubscription>;
  return Boolean(
    candidate.endpoint &&
      typeof candidate.endpoint === "string" &&
      candidate.endpoint.startsWith("https://") &&
      candidate.endpoint.length < 2048 &&
      isAllowedPushEndpoint(candidate.endpoint) &&
      candidate.keys?.p256dh &&
      candidate.keys.p256dh.length < 256 &&
      candidate.keys?.auth &&
      candidate.keys.auth.length < 128
  );
}

export async function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json({ configured: false }, { status: 503 });
  }
  return NextResponse.json({ configured: true, publicKey });
}

export async function POST(request: Request) {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json({ error: "Push notifications are not configured" }, { status: 503 });
  }

  const data = await request.json();
  const { deviceId, hostel, subscription } = data as {
    deviceId?: string;
    hostel?: string;
    subscription?: unknown;
  };

  if (
    !deviceId ||
    deviceId.length > 100 ||
    !hostel ||
    !HOSTELS.includes(hostel) ||
    !isPushSubscription(subscription)
  ) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const record: StoredPushSubscription = {
    deviceId,
    hostel,
    subscription,
    updatedAt: new Date().toISOString(),
  };
  await savePushSubscription(record);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const data = await request.json();
  const deviceId = typeof data?.deviceId === "string" ? data.deviceId : "";
  if (!deviceId || deviceId.length > 100) {
    return NextResponse.json({ error: "Invalid device" }, { status: 400 });
  }
  await removePushSubscription(deviceId);
  return NextResponse.json({ success: true });
}
