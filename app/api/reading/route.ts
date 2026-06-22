import { NextRequest, NextResponse } from "next/server";
import { tarotCardById } from "@/data/tarotCards";
import { spreadById } from "@/data/spreads";
import { buildReadingPrompt, systemPrompt } from "@/lib/prompts";
import {
  buildStructuredFallbackReading,
  isStructuredReading,
  type StructuredReading,
} from "@/lib/reading";
import { getOpenAI } from "@/lib/openai";

export const runtime = "nodejs";

type RequestBody = {
  spreadId?: string;
  question?: string;
  cards?: Array<{
    positionId?: string;
    cardId?: number;
    orientation?: "upright" | "reversed";
  }>;
};

function parseModelJson(content: string): unknown {
  const cleaned = content.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

function validateReading(reading: unknown, expectedPositionIds: string[]): StructuredReading | null {
  if (!isStructuredReading(reading)) return null;
  if (reading.cards.length !== expectedPositionIds.length) return null;
  const actualIds = reading.cards.map((card) => card.positionId);
  if (new Set(actualIds).size !== actualIds.length) return null;
  if (actualIds.some((id, index) => id !== expectedPositionIds[index])) return null;
  if (!reading.opening.trim() || !reading.connections.trim() || !reading.summary.trim()) return null;
  if (reading.cards.some((card) => !card.interpretation.trim())) return null;
  return reading;
}

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = await request.json() as RequestBody;
  } catch {
    return NextResponse.json({ error: "请求格式无效。" }, { status: 400 });
  }

  const spread = body.spreadId ? spreadById.get(body.spreadId) : undefined;
  if (!spread || !Array.isArray(body.cards) || body.cards.length !== spread.positions.length) {
    return NextResponse.json({ error: "牌阵或牌数无效。" }, { status: 400 });
  }
  if (typeof body.question === "string" && body.question.length > 240) {
    return NextResponse.json({ error: "问题内容过长。" }, { status: 400 });
  }

  const seen = new Set<number>();
  const selectedCards = body.cards.map((item, index) => {
    const expectedPosition = spread.positions[index];
    const card = typeof item.cardId === "number" ? tarotCardById.get(item.cardId) : undefined;
    if (!card || item.positionId !== expectedPosition.id || !["upright", "reversed"].includes(item.orientation ?? "") || seen.has(card.id)) return null;
    seen.add(card.id);
    return { card, position: expectedPosition, orientation: item.orientation as "upright" | "reversed" };
  });
  if (selectedCards.some((item) => item === null)) {
    return NextResponse.json({ error: "牌面数据无效。" }, { status: 400 });
  }

  const cards = selectedCards as NonNullable<(typeof selectedCards)[number]>[];
  const fallback = buildStructuredFallbackReading(
    body.question ?? "",
    cards.map(({ card, position, orientation }) => ({
      positionId: position.id,
      positionTitle: position.titleZh,
      nameZh: `${card.nameZh}${orientation === "reversed" ? "（逆位）" : ""}`,
      meaning: orientation === "reversed" ? card.reversedMeaning : card.uprightMeaning,
    }))
  );

  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json({ reading: fallback, fallback: true });
  }

  try {
    const maxTokens = Math.min(3600, 900 + cards.length * 260);
    const completion = await getOpenAI().chat.completions.create({
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: buildReadingPrompt({
            question: body.question,
            spread,
            selectedCards: cards,
          }),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: maxTokens,
    }, {
      signal: AbortSignal.timeout(30000),
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return NextResponse.json({ reading: fallback, fallback: true });
    const reading = validateReading(parseModelJson(content), spread.positions.map((position) => position.id));
    return NextResponse.json({ reading: reading ?? fallback, fallback: !reading });
  } catch {
    return NextResponse.json({ reading: fallback, fallback: true });
  }
}
