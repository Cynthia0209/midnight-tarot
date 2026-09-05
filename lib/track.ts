"use client";

import { anonymousFetch } from "@/lib/supabaseClient";

export type ClientEventName = "reading_started";

/**
 * Fire-and-forget UI funnel tracking.
 * Never send question text, context or reading content — counts and ids only.
 */
export function trackEvent(name: ClientEventName, props?: Record<string, unknown>) {
  try {
    void anonymousFetch("/api/events", {
      method: "POST",
      keepalive: true,
      body: JSON.stringify({ name, props }),
    });
  } catch {
    // Tracking must never interrupt the ritual.
  }
}
