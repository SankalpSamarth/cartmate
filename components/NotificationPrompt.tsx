"use client";

import { useEffect, useState } from "react";
import { getDeviceId } from "@/lib/device";
import { trackEvent } from "@/lib/analytics";

interface NotificationPromptProps {
  hostel: string | null;
}

type AlertStatus =
  | "checking"
  | "ready"
  | "enabled"
  | "unsupported"
  | "denied"
  | "unconfigured"
  | "error";

function shortHostel(hostel: string) {
  return hostel
    .replace(/^HB4\s+/i, "")
    .replace(/-WING/i, "-Wing")
    .replace(/\s*\(([^)]+)\)$/, " · $1");
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}

export function NotificationPrompt({ hostel }: NotificationPromptProps) {
  const [status, setStatus] = useState<AlertStatus>("checking");
  const [working, setWorking] = useState(false);
  const [enabledHostel, setEnabledHostel] = useState<string | null>(null);

  useEffect(() => {
    async function hydrateStatus() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }

      try {
        const config = await fetch("/api/push", { cache: "no-store" });
        if (!config.ok) {
          setStatus("unconfigured");
          return;
        }
        const registration = await navigator.serviceWorker.register("/sw.js");
        const subscription = await registration.pushManager.getSubscription();
        setEnabledHostel(localStorage.getItem("cartmate_notification_hostel"));
        setStatus(subscription ? "enabled" : "ready");
      } catch {
        setStatus("error");
      }
    }

    void hydrateStatus();
  }, []);

  const enableAlerts = async () => {
    if (!hostel || working) return;
    setWorking(true);
    trackEvent("notification_prompt_clicked", { hostel });

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        trackEvent("notification_denied", { hostel });
        return;
      }

      const configResponse = await fetch("/api/push", { cache: "no-store" });
      if (!configResponse.ok) {
        setStatus("unconfigured");
        return;
      }
      const { publicKey } = (await configResponse.json()) as { publicKey: string };
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const saveResponse = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: getDeviceId(),
          hostel,
          subscription: subscription.toJSON(),
        }),
      });
      if (!saveResponse.ok) throw new Error("Unable to save subscription");

      localStorage.setItem("cartmate_notification_hostel", hostel);
      setEnabledHostel(hostel);
      setStatus("enabled");
      trackEvent("notification_enabled", { hostel });
    } catch {
      setStatus("error");
    } finally {
      setWorking(false);
    }
  };

  const disableAlerts = async () => {
    if (working) return;
    setWorking(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      await subscription?.unsubscribe();
      await fetch("/api/push", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: getDeviceId() }),
      });
      localStorage.removeItem("cartmate_notification_hostel");
      setEnabledHostel(null);
      setStatus("ready");
      trackEvent("notification_disabled", { hostel: hostel || "unknown" });
    } catch {
      setStatus("error");
    } finally {
      setWorking(false);
    }
  };

  if (!hostel) {
    return <p className="notification-note">Choose your hostel above to turn on order alerts.</p>;
  }

  const label = shortHostel(hostel);

  if (status === "checking") return null;
  if (status === "unsupported") {
    return (
      <p className="notification-note">
        On iPhone, add CartMate to your Home Screen first to receive alerts.
      </p>
    );
  }
  if (status === "denied") {
    return <p className="notification-note">Notifications are blocked in your browser settings.</p>;
  }
  if (status === "unconfigured") {
    return <p className="notification-note">Order alerts are being set up. WhatsApp sharing still works.</p>;
  }
  if (status === "enabled" && (!enabledHostel || enabledHostel === hostel)) {
    return (
      <div className="notification-enabled">
        <span>Alerts on for {enabledHostel ? shortHostel(enabledHostel) : label}</span>
        <button type="button" onClick={disableAlerts} disabled={working}>
          Turn off
        </button>
      </div>
    );
  }

  return (
    <div className="notification-action">
      <button type="button" className="btn btn--notify" onClick={enableAlerts} disabled={working}>
        {working
          ? "Updating alerts…"
          : status === "enabled"
            ? `Switch alerts to ${label}`
            : `Notify me for ${label}`}
      </button>
      {status === "error" && <p>Couldn&apos;t enable alerts. Please try again.</p>}
    </div>
  );
}
