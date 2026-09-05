import { supabaseRest } from "@/lib/supabaseServer";

export type AppEventName =
  | "reading_started"
  | "reading_completed"
  | "followup_submitted";

/**
 * Product analytics.
 *
 * Privacy rule: only counts, ids and coarse context are stored.
 * Never pass question text, context text, card names or reading content here.
 *
 * Analytics must never break the ritual, so every failure is swallowed.
 */
export async function recordEvent(input: {
  clientIdHash: string;
  name: AppEventName;
  readingId?: string | null;
  props?: Record<string, unknown>;
}): Promise<void> {
  try {
    await supabaseRest("app_events", {
      method: "POST",
      body: JSON.stringify({
        client_id_hash: input.clientIdHash,
        name: input.name,
        reading_id: input.readingId ?? null,
        props: input.props ?? {},
      }),
    });
  } catch {
    // Intentionally ignored: a missing analytics row must never fail a reading.
  }
}
