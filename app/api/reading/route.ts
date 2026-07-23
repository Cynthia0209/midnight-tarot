import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { tarotCardById } from "@/data/tarotCards";
import { spreadById } from "@/data/spreads";
import { buildReadingPrompt, getSystemPrompt } from "@/lib/prompts";
import {
  buildStructuredFallbackReading,
  isStructuredReading,
  personalizeReadingContent,
  type StructuredReading,
  type StructuredReadingV3,
} from "@/lib/reading";
import { getDeepSeekModel, getOpenAI } from "@/lib/openai";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isLocale, type Locale } from "@/lib/locale";

export const runtime = "nodejs";

function readingResponse(
  payload: { reading: unknown; fallback?: boolean; error?: string },
  init: ResponseInit = {},
  timings?: { totalMs: number; upstreamMs?: number },
) {
  const headers = new Headers(init.headers);
  if (timings) {
    headers.set(
      "Server-Timing",
      [
        `total;dur=${timings.totalMs}`,
        timings.upstreamMs === undefined ? "" : `deepseek;dur=${timings.upstreamMs}`,
      ].filter(Boolean).join(", "),
    );
  }
  if (payload.fallback !== undefined) headers.set("X-Reading-Fallback", String(payload.fallback));
  return NextResponse.json(payload, { ...init, headers });
}

type RequestBody = {
  spreadId?: string;
  question?: string;
  context?: string;
  locale?: Locale;
  cards?: Array<{
    positionId?: string;
    cardId?: number;
    orientation?: "upright" | "reversed";
  }>;
};

function logReadingFallback(reason: string, details?: unknown) {
  console.error("[reading:fallback]", reason, details ?? "");
}

function parseModelJson(content: string): unknown {
  const cleaned = content.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("model_response_not_json");
  }
}

function validateReading(reading: unknown, expectedPositionIds: string[]): { reading: StructuredReading | null; reason?: string } {
  if (!isStructuredReading(reading)) return { reading: null, reason: "shape_invalid" };
  if (reading.version !== 3) return { reading: null, reason: "version_not_3" };
  if (reading.cards.length !== expectedPositionIds.length) return { reading: null, reason: "card_count_mismatch" };
  const actualIds = reading.cards.map((card) => card.positionId);
  if (new Set(actualIds).size !== actualIds.length) return { reading: null, reason: "duplicate_position_id" };
  if (actualIds.some((id, index) => id !== expectedPositionIds[index])) return { reading: null, reason: "position_order_mismatch" };
  if (!reading.opening.trim() || !reading.connections.trim() || !reading.summary.trim()) return { reading: null, reason: "empty_core_field" };
  if (!reading.questionFocus.trim() || reading.realityChecks.some((item) => !item.trim())) return { reading: null, reason: "empty_v3_field" };
  if (reading.cards.some((card) => !card.interpretation.trim())) return { reading: null, reason: "empty_card_interpretation" };
  return { reading };
}

function asText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function repairReading(
  value: unknown,
  positions: Array<{ id: string; title: string }>,
  locale: Locale,
): StructuredReadingV3 | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const rawCards = Array.isArray(raw.cards) ? raw.cards : [];
  if (rawCards.length !== positions.length) return null;

  const realityChecks = Array.isArray(raw.realityChecks)
    ? raw.realityChecks.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 2)
    : [];

  while (realityChecks.length < 2) {
    realityChecks.push(realityChecks.length === 0
      ? locale === "en" ? "Watch whether the next real action matches the words being spoken." : "观察接下来一次相关互动中，现实行动是否和口头表达一致。"
      : locale === "en" ? "Notice your body response: more settled, or pulled back into the same tension." : "留意你自己的身体反应：是更安定，还是反复进入同一种紧绷。");
  }

  const cards = rawCards.map((item, index) => {
    const card = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      positionId: positions[index].id,
      positionTitle: asText(card.positionTitle, positions[index].title),
      interpretation: asText(
        card.interpretation,
        locale === "en"
          ? `This card lands in ${positions[index].title}, asking you to observe that part of the situation before deciding.`
          : `这张牌落在${positions[index].title}，提示你先回到这个牌位代表的现实处境里观察。`,
      ),
    };
  });

  return {
    version: 3,
    questionFocus: asText(raw.questionFocus, locale === "en" ? "The real question is whether the signal in front of you deserves more energy." : "这次问题真正卡住的地方，是你想确认眼前的信号是否值得继续投入。"),
    opening: asText(raw.opening, locale === "en" ? "These cards do not rush to a conclusion; they first place the center of the situation in front of you." : "这组牌没有急着给出结论，而是先把当前局面的重点放到你面前。"),
    cards,
    connections: asText(raw.connections, locale === "en" ? "Taken together, the point is not one isolated card meaning but the practical rhythm these cards describe." : "这些牌放在一起看，重点不在单张牌义，而在它们共同指向的现实节奏。"),
    realityChecks: realityChecks as [string, string],
    summary: asText(raw.summary, locale === "en" ? "With the current information, do not treat the cards as a verdict. Treat them as a reminder to verify the next step in real life." : "在当前信息下，先不要把牌当作定论；把它当作一个提醒，回到现实中确认下一步。"),
  };
}

function getAnonymousUserId(request: NextRequest) {
  const rawIp = request.headers.get("x-nf-client-connection-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "anonymous";
  return createHash("sha256").update(rawIp).digest("base64url").slice(0, 32);
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const limit = checkRateLimit(`reading:${getClientIp(request)}`, 12, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "请求有点太密集了，请稍后再试。" }, { status: 429 });
  }
  let body: RequestBody;
  try {
    body = await request.json() as RequestBody;
  } catch {
    return NextResponse.json({ error: "请求格式无效。" }, { status: 400 });
  }

  const spread = body.spreadId ? spreadById.get(body.spreadId) : undefined;
  const locale: Locale = isLocale(body.locale) ? body.locale : "zh";
  if (!spread || !Array.isArray(body.cards) || body.cards.length !== spread.positions.length) {
    return NextResponse.json({ error: locale === "en" ? "The spread or card count is invalid." : "牌阵或牌数无效。" }, { status: 400 });
  }
  if (typeof body.question === "string" && body.question.length > 240) {
    return NextResponse.json({ error: locale === "en" ? "The question is too long." : "问题内容过长。" }, { status: 400 });
  }
  if (body.context !== undefined && (typeof body.context !== "string" || body.context.length > 500)) {
    return NextResponse.json({ error: locale === "en" ? "The extra context is invalid or too long." : "补充背景内容无效或过长。" }, { status: 400 });
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
    return NextResponse.json({ error: locale === "en" ? "The card data is invalid." : "牌面数据无效。" }, { status: 400 });
  }

  const cards = selectedCards as NonNullable<(typeof selectedCards)[number]>[];
  const fallback = buildStructuredFallbackReading(
    body.question ?? "",
    body.context ?? "",
    cards.map(({ card, position, orientation }) => ({
      positionId: position.id,
      positionTitle: locale === "en" ? position.title : position.titleZh,
      nameZh: `${card.nameZh}${orientation === "reversed" ? "（逆位）" : ""}`,
      name: `${card.name}${orientation === "reversed" ? " (reversed)" : ""}`,
      meaning: locale === "en"
        ? orientation === "reversed" ? card.reversedMeaningEn : card.uprightMeaningEn
        : orientation === "reversed" ? card.reversedMeaning : card.uprightMeaning,
    })),
    locale,
  );

  if (!process.env.DEEPSEEK_API_KEY) {
    logReadingFallback("missing_deepseek_api_key");
    return readingResponse({ reading: fallback, fallback: true }, {}, { totalMs: Date.now() - startedAt });
  }

  try {
    const maxTokens = Math.min(5000, 1800 + cards.length * 320);
    const timeoutMs = Number(process.env.DEEPSEEK_TIMEOUT_MS ?? Math.min(45000, 24000 + cards.length * 1800));
    const upstreamStartedAt = Date.now();
    const completion = await getOpenAI().chat.completions.create({
      model: getDeepSeekModel(),
      messages: [
        { role: "system", content: getSystemPrompt(locale) },
        {
          role: "user",
          content: buildReadingPrompt({
            question: body.question,
            context: body.context,
            spread,
            selectedCards: cards,
            locale,
          }),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: maxTokens,
      thinking: { type: "disabled" },
      user_id: getAnonymousUserId(request),
    } as Parameters<ReturnType<typeof getOpenAI>["chat"]["completions"]["create"]>[0] & {
      stream?: false;
      thinking?: { type: "disabled" };
      user_id?: string;
    }, {
      signal: AbortSignal.timeout(timeoutMs),
      maxRetries: 0,
      timeout: timeoutMs,
    }) as { choices: Array<{ finish_reason?: string; message?: { content?: string | null } }> };
    const upstreamMs = Date.now() - upstreamStartedAt;

    const choice = completion.choices[0];
    const content = choice?.message?.content;
    if (!content) {
      logReadingFallback("empty_model_content", { finishReason: choice?.finish_reason });
      return readingResponse(
        { reading: fallback, fallback: true },
        {},
        { totalMs: Date.now() - startedAt, upstreamMs },
      );
    }
    const parsed = parseModelJson(content);
    const expectedIds = spread.positions.map((position) => position.id);
    const valid = validateReading(parsed, expectedIds);
    const repaired = valid.reading ? null : repairReading(
      parsed,
      spread.positions.map((position) => ({
        id: position.id,
        title: locale === "en" ? position.title : position.titleZh,
      })),
      locale,
    );
    const repairedValid = repaired ? validateReading(repaired, expectedIds) : { reading: null };
    const reading = valid.reading ?? repairedValid.reading;
    if (!reading) {
      logReadingFallback(valid.reason ?? "validation_failed", {
        finishReason: choice?.finish_reason,
        preview: content.slice(0, 800),
      });
    } else if (!valid.reading && repairedValid.reading) {
      console.warn("[reading:repaired]", valid.reason ?? "validation_failed");
    }
    return readingResponse(
      {
        reading: personalizeReadingContent(reading ?? fallback),
        fallback: !reading,
      },
      {},
      { totalMs: Date.now() - startedAt, upstreamMs },
    );
  } catch (error) {
    logReadingFallback("deepseek_request_failed", error instanceof Error ? error.message : error);
    return readingResponse(
      { reading: fallback, fallback: true },
      {},
      { totalMs: Date.now() - startedAt },
    );
  }
}
