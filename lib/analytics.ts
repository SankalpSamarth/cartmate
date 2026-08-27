"use client";

import { track } from "@vercel/analytics/react";

type EventProperties = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(name: string, properties?: EventProperties) {
  try {
    track(name, properties);
  } catch {
    // Analytics must never interrupt the ordering flow.
  }
}
