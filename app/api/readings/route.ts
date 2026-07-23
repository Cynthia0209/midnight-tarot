import { NextRequest, NextResponse } from "next/server";
import { getAnonymousClient, supabaseRest } from "@/lib/supabaseServer";
import { isStructuredReading, type SelectedReadingCard } from "@/lib/reading";
import { spreadById } from "@/data/spreads";
import { tarotCardById } from "@/data/tarotCards";

export const runtime = "nodejs";

type Body = {
  id?: string;
  spreadId?: string;
  question?: string;
  context?: string;
  cards?: SelectedReadingCard[];
  reading?: unknown;
  createdAt?: string;
};

export async function POST(request: NextRequest) {
  const client = getAnonymousClient(request);
  if (!client) return NextResponse.json({ error: "当前浏览器凭证无效，请刷新页面后重试。" }, { status: 401 });
  const body = await request.json().catch(() => null) as Body | null;
  if (!body?.id || !body.spreadId || !spreadById.has(body.spreadId) || !Array.isArray(body.cards)) {
    return NextResponse.json({ error: "占卜数据无效。" }, { status: 400 });
  }
  if (!body.cards.every((item) => tarotCardById.has(item.cardId) && ["upright", "reversed"].includes(item.orientation))) {
    return NextResponse.json({ error: "牌面数据无效。" }, { status: 400 });
  }
  if (!(typeof body.reading === "string" || isStructuredReading(body.reading))) {
    return NextResponse.json({ error: "解读内容无效。" }, { status: 400 });
  }

  try {
    await supabaseRest("reading_sessions", {
      method: "POST",
      prefer: "resolution=merge-duplicates",
      body: JSON.stringify({
        id: body.id,
        client_id_hash: client.clientIdHash,
        spread_id: body.spreadId,
        question: body.question?.slice(0, 240) ?? "",
        context: body.context?.slice(0, 500) || null,
        cards: body.cards,
        reading: body.reading,
        created_at: body.createdAt ?? new Date().toISOString(),
      }),
    });
    return NextResponse.json({ ok: true, readingId: body.id });
  } catch {
    return NextResponse.json({ error: "云端保存失败。" }, { status: 500 });
  }
}
