import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { tarotCardById } from "@/data/tarotCards";
import { spreadById } from "@/data/spreads";
import { buildFollowupPrompt, getSystemPrompt, type PromptCard } from "@/lib/prompts";
import { getDeepSeekModel, getOpenAI } from "@/lib/openai";
import { getAnonymousClient, supabaseRest } from "@/lib/supabaseServer";
import {
  isStructuredReading,
  personalizeReadingText,
  readingToPlainText,
  type ReadingContent,
  type SavedReading,
  type SelectedReadingCard,
} from "@/lib/reading";
import { checkRateLimit } from "@/lib/rateLimit";
import { isLocale, type Locale } from "@/lib/locale";

export const runtime = "nodejs";

type ReadingRow = {
  id: string;
  client_id_hash: string;
  spread_id: string;
  question: string;
  context: string | null;
  cards: SelectedReadingCard[];
  reading: ReadingContent;
  locale?: Locale;
};

type FollowupRow = {
  id?: string;
  question: string;
  answer: string | null;
  created_at?: string;
};

type FollowupBody = {
  readingId?: string;
  question?: string;
  reading?: SavedReading;
};

function savedReadingToRow(reading: SavedReading | undefined, readingId: string): ReadingRow | null {
  if (!reading || reading.id !== readingId) return null;
  if (!spreadById.has(reading.spreadId) || !Array.isArray(reading.cards)) return null;
  if (!(typeof reading.reading === "string" || isStructuredReading(reading.reading))) return null;
  return {
    id: reading.id,
    client_id_hash: "client-payload",
    spread_id: reading.spreadId,
    question: reading.question ?? "",
    context: reading.context ?? null,
    cards: reading.cards,
    reading: reading.reading,
    locale: reading.locale,
  };
}

export async function GET(request: NextRequest) {
  const client = getAnonymousClient(request);
  if (!client) return NextResponse.json({ error: "当前浏览器凭证无效，请刷新页面后重试。" }, { status: 401 });
  const readingId = request.nextUrl.searchParams.get("readingId");
  if (!readingId) return NextResponse.json({ error: "缺少占卜 ID。" }, { status: 400 });
  const rows = await supabaseRest<FollowupRow[]>(
    `followup_questions?reading_id=eq.${readingId}&client_id_hash=eq.${client.clientIdHash}&status=eq.answered&select=id,question,answer,created_at&order=created_at.asc&limit=50`,
  ).catch(() => []);
  return NextResponse.json({
    followups: rows.map((item) => ({
      id: item.id,
      question: item.question,
      answer: item.answer,
      createdAt: item.created_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const client = getAnonymousClient(request);
  if (!client) return NextResponse.json({ error: "当前浏览器凭证无效，请刷新页面后重试。" }, { status: 401 });
  const limit = checkRateLimit(`followup:${client.clientIdHash}`, 10, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "追问太频繁了，请稍等一下再试。" }, { status: 429 });
  const body = await request.json().catch(() => null) as FollowupBody | null;
  const readingId = body?.readingId;
  const question = body?.question?.trim();
  if (!readingId || !question || question.length > 240) {
    return NextResponse.json({ error: "追问内容无效，最多 240 字。" }, { status: 400 });
  }

  const readingRows = await supabaseRest<ReadingRow[]>(
    `reading_sessions?id=eq.${readingId}&client_id_hash=eq.${client.clientIdHash}&select=id,client_id_hash,spread_id,question,context,cards,reading`,
  ).catch(() => []);
  const reading = readingRows[0] ?? savedReadingToRow(body?.reading, readingId);
  const spread = reading ? spreadById.get(reading.spread_id) : undefined;
  const locale: Locale = isLocale(body?.reading?.locale) ? body.reading.locale : isLocale(reading?.locale) ? reading.locale : "zh";
  if (!reading || !spread) return NextResponse.json({ error: locale === "en" ? "This reading could not be found. Please complete a reading first." : "没有找到这次占卜，请先完成一次解读。" }, { status: 404 });

  const selectedCards = reading.cards.map((selected, index): PromptCard | null => {
    const card = tarotCardById.get(selected.cardId);
    const position = spread.positions[index];
    return card && position ? { card, position, orientation: selected.orientation } : null;
  });
  if (selectedCards.some((item) => item === null)) {
    return NextResponse.json({ error: locale === "en" ? "The reading card data is invalid." : "占卜牌面数据无效。" }, { status: 400 });
  }

  const followupId = randomUUID();
  let persisted = false;
  await supabaseRest("followup_questions", {
      method: "POST",
      body: JSON.stringify({
        id: followupId,
        client_id_hash: client.clientIdHash,
        reading_id: reading.id,
        question,
        status: "pending",
        credit_cost: 0,
      }),
    })
    .then(() => { persisted = true; })
    .catch(() => undefined);

  try {
    const recentRows = await supabaseRest<FollowupRow[]>(
      `followup_questions?reading_id=eq.${reading.id}&client_id_hash=eq.${client.clientIdHash}&status=eq.answered&select=question,answer&order=created_at.desc&limit=3`,
    ).catch(() => []);
    const prompt = buildFollowupPrompt({
      question,
      originalQuestion: reading.question,
      context: reading.context ?? "",
      spread,
      selectedCards: selectedCards as PromptCard[],
      initialSummary: readingToPlainText(reading.reading).slice(0, 1400),
      recentFollowups: recentRows.reverse().map((item) => ({ question: item.question, answer: item.answer ?? "" })),
      locale,
    });
    const timeoutMs = Number(process.env.DEEPSEEK_FOLLOWUP_TIMEOUT_MS ?? 22000);
    const completion = await getOpenAI().chat.completions.create({
      model: getDeepSeekModel(),
      messages: [
        { role: "system", content: getSystemPrompt(locale) },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 720,
      thinking: { type: "disabled" },
    } as Parameters<ReturnType<typeof getOpenAI>["chat"]["completions"]["create"]>[0] & {
      thinking?: { type: "disabled" };
    }, {
      signal: AbortSignal.timeout(timeoutMs),
      maxRetries: 0,
      timeout: timeoutMs,
    }) as { choices: Array<{ message?: { content?: string | null } }> };

    const answer = personalizeReadingText(completion.choices[0]?.message?.content?.trim() ?? "");
    if (!answer) throw new Error("empty_followup");
    if (persisted) await supabaseRest(`followup_questions?id=eq.${followupId}`, {
      method: "PATCH",
      body: JSON.stringify({ answer, status: "answered", answered_at: new Date().toISOString() }),
    }).catch(() => undefined);
    return NextResponse.json({ followup: { id: followupId, question, answer } });
  } catch {
    if (persisted) await supabaseRest(`followup_questions?id=eq.${followupId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "failed" }),
    }).catch(() => undefined);
    return NextResponse.json({ error: locale === "en" ? "The connection is unsteady tonight. Please try again later." : "今晚的连接有些不稳，请稍后再试。" }, { status: 503 });
  }
}
