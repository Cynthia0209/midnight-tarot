import { NextRequest } from "next/server";
import { tarotCardById } from "@/data/tarotCards";
import { spreadById } from "@/data/spreads";
import { buildReadingPrompt, systemPrompt } from "@/lib/prompts";
import { buildFallbackReading } from "@/lib/reading";
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

function textStream(text: string, status = 200) {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return new Response(readable, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = await request.json() as RequestBody;
  } catch {
    return textStream("请求格式无效。", 400);
  }

  const spread = body.spreadId ? spreadById.get(body.spreadId) : undefined;
  if (!spread || !Array.isArray(body.cards) || body.cards.length !== spread.positions.length) {
    return textStream("牌阵或牌数无效。", 400);
  }
  if (typeof body.question === "string" && body.question.length > 240) {
    return textStream("问题内容过长。", 400);
  }

  const seen = new Set<number>();
  const selectedCards = body.cards.map((item, index) => {
    const expectedPosition = spread.positions[index];
    const card = typeof item.cardId === "number" ? tarotCardById.get(item.cardId) : undefined;
    if (!card || item.positionId !== expectedPosition.id || !["upright", "reversed"].includes(item.orientation ?? "") || seen.has(card.id)) return null;
    seen.add(card.id);
    return { card, position: expectedPosition, orientation: item.orientation as "upright" | "reversed" };
  });
  if (selectedCards.some((item) => item === null)) return textStream("牌面数据无效。", 400);

  const cards = selectedCards as NonNullable<(typeof selectedCards)[number]>[];
  const fallback = buildFallbackReading(
    body.question ?? "",
    cards.map(({ card, position, orientation }) => ({
      nameZh: `${card.nameZh}${orientation === "reversed" ? "（逆位）" : ""}`,
      position: position.titleZh,
      meaning: orientation === "reversed" ? card.reversedMeaning : card.uprightMeaning,
    }))
  );
  if (!process.env.DEEPSEEK_API_KEY) return textStream(fallback);

  try {
    const stream = await getOpenAI().chat.completions.create({
			model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
			messages: [
				{
					role: "system",
					content: systemPrompt,
				},
				{
					role: "user",
					content: buildReadingPrompt({
						question: body.question,
						spread,
						selectedCards: cards,
					}),
				},
			],
			stream: true,
		});

		const encoder = new TextEncoder();

		const readable = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of stream) {
						const text = chunk.choices[0]?.delta?.content;

						if (text) {
							controller.enqueue(encoder.encode(text));
						}
					}

					controller.close();
				} catch (error) {
					controller.error(error);
				}
			},
		});

		return new Response(readable, {
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
				"Cache-Control": "no-store",
			},
		}); 
  } catch {
    return textStream(fallback);
  }
}
