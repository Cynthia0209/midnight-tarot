import { NextRequest, NextResponse } from "next/server";
import { getAnonymousClient, supabaseRest } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type ReadingRow = {
  id: string;
  spread_id: string;
  question: string;
  context?: string;
  cards: Array<{ cardId: number; orientation: "upright" | "reversed"; positionId: string }>;
  reading: unknown;
  locale: "en" | "zh";
  created_at: string;
  client_id_hash: string;
};

const READING_SELECT = "id,spread_id,question,context,cards,reading,locale,created_at,client_id_hash";

function publicReading(row: ReadingRow) {
  return {
    id: row.id,
    spreadId: row.spread_id,
    cards: row.cards,
    reading: row.reading,
    locale: row.locale,
    createdAt: row.created_at,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let row: ReadingRow | null = null;
  try {
    const rows = await supabaseRest<ReadingRow[]>(
      `reading_sessions?select=${READING_SELECT}&id=eq.${encodeURIComponent(id)}`,
      { method: "GET" },
    );
    row = rows?.[0] ?? null;
  } catch {
    row = null;
  }
  if (!row) return NextResponse.json({ error: "没有找到这次占卜。" }, { status: 404 });

  const client = getAnonymousClient(request);
  const owner = Boolean(client && client.clientIdHash === row.client_id_hash);

  if (owner) {
    return NextResponse.json({
      owner: true,
      reading: { ...publicReading(row), question: row.question, context: row.context },
    });
  }
  return NextResponse.json({ owner: false, reading: publicReading(row) });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = getAnonymousClient(request);
  if (!client) {
    return NextResponse.json({ error: "当前浏览器凭证无效，请刷新页面后重试。" }, { status: 401 });
  }
  const { id } = await params;
  let row: Pick<ReadingRow, "client_id_hash"> | null = null;
  try {
    const rows = await supabaseRest<Pick<ReadingRow, "client_id_hash">[]>(
      `reading_sessions?select=client_id_hash&id=eq.${encodeURIComponent(id)}`,
      { method: "GET" },
    );
    row = rows?.[0] ?? null;
  } catch {
    row = null;
  }
  if (!row) return NextResponse.json({ error: "没有找到这次占卜。" }, { status: 404 });
  if (row.client_id_hash !== client.clientIdHash) {
    return NextResponse.json({ error: "这段解读不属于你。" }, { status: 403 });
  }
  try {
    await supabaseRest(`reading_sessions?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch {
    return NextResponse.json({ error: "删除失败，请稍后再试。" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
