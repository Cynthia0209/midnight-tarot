import { NextRequest, NextResponse } from "next/server";
import { getAnonymousClient } from "@/lib/supabaseServer";
import { recordEvent, type AppEventName } from "@/lib/events";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Only UI-side funnel events may be sent from the browser. Everything else is
// recorded server-side where it cannot be spoofed or blocked.
const ALLOWED: AppEventName[] = ["reading_started"];

export async function POST(request: NextRequest) {
  const client = getAnonymousClient(request);
  if (!client) return NextResponse.json({ ok: false }, { status: 401 });

  const limit = checkRateLimit(`events:${getClientIp(request)}`, 60, 60_000);
  if (!limit.ok) return NextResponse.json({ ok: false }, { status: 429 });

  const body = (await request.json().catch(() => null)) as
    | { name?: string; readingId?: string; props?: Record<string, unknown> }
    | null;

  const name = body?.name as AppEventName | undefined;
  if (!name || !ALLOWED.includes(name)) return NextResponse.json({ ok: false }, { status: 400 });
  if (body?.props && JSON.stringify(body.props).length > 2_000) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  await recordEvent({
    clientIdHash: client.clientIdHash,
    name,
    readingId: body?.readingId ?? null,
    props: body?.props,
  });

  return NextResponse.json({ ok: true });
}
