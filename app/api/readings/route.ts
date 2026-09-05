import { NextRequest, NextResponse } from "next/server";
import { getAnonymousClient, supabaseRest } from "@/lib/supabaseServer";
import { isStructuredReading, type SelectedReadingCard } from "@/lib/reading";
import { spreadById } from "@/data/spreads";
import { tarotCardById } from "@/data/tarotCards";
import { isLocale, type Locale } from "@/lib/locale";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

type Body = {
  id?: string;
  spreadId?: string;
  question?: string;
  context?: string;
  cards?: SelectedReadingCard[];
  reading?: unknown;
  createdAt?: string;
  locale?: Locale;
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Body | null;
  const locale: Locale = isLocale(body?.locale) ? body.locale : "zh";
  const client = getAnonymousClient(request);
  if (!client) return NextResponse.json({ error: locale === "en" ? "Your browser credential is no longer valid. Please refresh and try again." : "当前浏览器凭证无效，请刷新页面后重试。" }, { status: 401 });
  const limit = checkRateLimit(`save-reading:${getClientIp(request)}`, 30, 60_000);
  if (!limit.ok) return NextResponse.json({ error: locale === "en" ? "Too many readings are being saved. Please wait a moment." : "保存得有点太频繁了，请稍后再试。" }, { status: 429 });

  const readingId = body?.id;
  const spread = body?.spreadId ? spreadById.get(body.spreadId) : undefined;
  const validId = typeof readingId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(readingId);
  if (!validId || !readingId || !spread || !Array.isArray(body?.cards) || body.cards.length !== spread.positions.length) {
    return NextResponse.json({ error: locale === "en" ? "The reading data is invalid." : "占卜数据无效。" }, { status: 400 });
  }
  const cardIds = new Set<number>();
  const cardsValid = body.cards.every((item, index) => {
    if (!tarotCardById.has(item.cardId) || !["upright", "reversed"].includes(item.orientation)) return false;
    if (item.positionId !== spread.positions[index]?.id || cardIds.has(item.cardId)) return false;
    cardIds.add(item.cardId);
    return true;
  });
  if (!cardsValid) {
    return NextResponse.json({ error: locale === "en" ? "The card data is invalid." : "牌面数据无效。" }, { status: 400 });
  }
  if (!(typeof body.reading === "string" || isStructuredReading(body.reading))) {
    return NextResponse.json({ error: locale === "en" ? "The reading content is invalid." : "解读内容无效。" }, { status: 400 });
  }
  if (JSON.stringify(body.reading).length > 40_000) {
    return NextResponse.json({ error: locale === "en" ? "The reading content is too large." : "解读内容过长。" }, { status: 413 });
  }
  if (body.question !== undefined && typeof body.question !== "string") {
    return NextResponse.json({ error: locale === "en" ? "The question is invalid." : "问题内容无效。" }, { status: 400 });
  }
  if (body.context !== undefined && typeof body.context !== "string") {
    return NextResponse.json({ error: locale === "en" ? "The context is invalid." : "补充背景内容无效。" }, { status: 400 });
  }
  if (body.createdAt !== undefined && (typeof body.createdAt !== "string" || !Number.isFinite(Date.parse(body.createdAt)))) {
    return NextResponse.json({ error: locale === "en" ? "The reading date is invalid." : "解读时间无效。" }, { status: 400 });
  }

  const record = JSON.stringify({
    id: readingId,
    client_id_hash: client.clientIdHash,
    spread_id: body.spreadId,
    question: body.question?.slice(0, 240) ?? "",
    context: body.context?.slice(0, 500) || null,
    cards: body.cards,
    reading: body.reading,
    locale,
    created_at: body.createdAt ?? new Date().toISOString(),
  });

  try {
    const existingRows = await supabaseRest<Array<{ client_id_hash: string }>>(
      `reading_sessions?id=eq.${encodeURIComponent(readingId)}&select=client_id_hash&limit=1`,
    );
    const existing = existingRows[0];
    if (existing && existing.client_id_hash !== client.clientIdHash) {
      return NextResponse.json({ error: locale === "en" ? "This reading belongs to another browser." : "这段解读属于另一个浏览器。" }, { status: 403 });
    }

    if (existing) {
      await supabaseRest(
        `reading_sessions?id=eq.${encodeURIComponent(readingId)}&client_id_hash=eq.${encodeURIComponent(client.clientIdHash)}`,
        { method: "PATCH", body: record },
      );
    } else {
      await supabaseRest("reading_sessions", { method: "POST", body: record });
    }
    return NextResponse.json({ ok: true, readingId });
  } catch {
    // The completion flow and FollowupPanel can save the same reading at nearly
    // the same time. If the competing insert belongs to this client, treat the
    // save as idempotent and update it. A different owner is still rejected.
    try {
      const racedRows = await supabaseRest<Array<{ client_id_hash: string }>>(
        `reading_sessions?id=eq.${encodeURIComponent(readingId)}&select=client_id_hash&limit=1`,
      );
      const raced = racedRows[0];
      if (raced?.client_id_hash === client.clientIdHash) {
        await supabaseRest(
          `reading_sessions?id=eq.${encodeURIComponent(readingId)}&client_id_hash=eq.${encodeURIComponent(client.clientIdHash)}`,
          { method: "PATCH", body: record },
        );
        return NextResponse.json({ ok: true, readingId });
      }
      if (raced) {
        return NextResponse.json({ error: locale === "en" ? "This reading belongs to another browser." : "这段解读属于另一个浏览器。" }, { status: 403 });
      }
    } catch {
      // Preserve the original save failure response below.
    }
    return NextResponse.json({ error: locale === "en" ? "The reading could not be saved to the cloud." : "云端保存失败。" }, { status: 500 });
  }
}
