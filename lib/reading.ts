import type { CardOrientation } from "@/data/tarotCards";

export type ReadingStage = "intro" | "spread" | "intention" | "shuffle" | "connect" | "draw" | "reveal" | "reading";

export type DeckCard = {
  cardId: number;
  orientation: CardOrientation;
};

export type SelectedReadingCard = DeckCard & {
  positionId: string;
};

export type ReadingSession = {
  id: string;
  spreadId: string;
  question: string;
  stage: ReadingStage;
  deck: DeckCard[];
  selected: SelectedReadingCard[];
  createdAt: string;
};

export type StructuredReadingCard = {
  positionId: string;
  positionTitle: string;
  interpretation: string;
};

export type StructuredReading = {
  version: 2;
  opening: string;
  cards: StructuredReadingCard[];
  connections: string;
  summary: string;
};

export type ReadingContent = string | StructuredReading;

export type SavedReading = {
  id: string;
  spreadId: string;
  question: string;
  cards: SelectedReadingCard[];
  reading: ReadingContent;
  createdAt: string;
};

export function createShuffledDeck(cardIds: number[]): DeckCard[] {
  const values = [...cardIds];
  const cryptoApi = globalThis.crypto;

  const randomIndex = (max: number) => {
    if (!cryptoApi?.getRandomValues) return Math.floor(Math.random() * max);
    const limit = Math.floor(0x100000000 / max) * max;
    const sample = new Uint32Array(1);
    do cryptoApi.getRandomValues(sample); while (sample[0] >= limit);
    return sample[0] % max;
  };

  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }

  return values.map((cardId) => ({
    cardId,
    orientation: randomIndex(2) === 0 ? "upright" : "reversed",
  }));
}

export function createSession(spreadId: string, question: string, cardIds: number[]): ReadingSession {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    spreadId,
    question,
    stage: "shuffle",
    deck: createShuffledDeck(cardIds),
    selected: [],
    createdAt: new Date().toISOString(),
  };
}

const STORAGE_KEY = "midnight-tarot-readings-v1";

export function loadReadings(): SavedReading[] {
  if (typeof window === "undefined") return [];
  try {
    const data = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(data) ? data.slice(0, 20) : [];
  } catch {
    return [];
  }
}

export function saveReading(reading: SavedReading): SavedReading[] {
  const next = [reading, ...loadReadings().filter((item) => item.id !== reading.id)].slice(0, 20);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function buildFallbackReading(question: string, cards: Array<{ nameZh: string; position: string; meaning: string }>) {
  const focus = question.trim() ? `关于“${question.trim().slice(0, 42)}”` : "关于你此刻没有说出口的问题";
  const threads = cards.map((item) => `${item.position}出现${item.nameZh}：${item.meaning}`).join("\n\n");
  return `${focus}，这组牌没有给出一个僵硬的结论，而是在邀请你看见正在流动的线索。\n\n${threads}\n\n把它当成一面镜子，而不是命令。真正值得相信的，是你读到这些话时，心里最先亮起或轻轻收紧的地方。`;
}

export function buildStructuredFallbackReading(
  question: string,
  cards: Array<{ positionId: string; positionTitle: string; nameZh: string; meaning: string }>
): StructuredReading {
  const focus = question.trim()
    ? `关于“${question.trim().slice(0, 48)}”，这组牌更像是在梳理你已经隐约感觉到、却还没有完全说清的部分。`
    : "这组牌没有急着给出结论，而是把此刻最值得留意的线索一张张放在你面前。";

  return {
    version: 2,
    opening: `${focus}先不必把它当成命令，留意哪些画面让你停顿，那里往往比一个仓促的答案更接近问题核心。`,
    cards: cards.map((item) => ({
      positionId: item.positionId,
      positionTitle: item.positionTitle,
      interpretation: `${item.positionTitle}出现${item.nameZh}。${item.meaning}`,
    })),
    connections: cards.length > 1
      ? "把这些牌放在一起看，它们呈现的不是彼此割裂的事件，而是一条正在形成的路径：前面的经验影响着当下的反应，而当下的选择又会改变后续的走向。"
      : "这一张牌既是此刻的镜子，也是一处停顿。它提醒你先看清正在发生的真实感受，再决定下一步。",
    summary: "最终需要被带回现实的，不是一个绝对预言，而是一个可以观察的信号：接下来当相似的情绪、关系模式或选择再次出现时，你是否能比过去更早认出它？",
  };
}

export function isStructuredReading(value: unknown): value is StructuredReading {
  if (!value || typeof value !== "object") return false;
  const reading = value as Partial<StructuredReading>;
  return reading.version === 2
    && typeof reading.opening === "string"
    && Array.isArray(reading.cards)
    && reading.cards.every((card) =>
      Boolean(card)
      && typeof card.positionId === "string"
      && typeof card.positionTitle === "string"
      && typeof card.interpretation === "string"
    )
    && typeof reading.connections === "string"
    && typeof reading.summary === "string";
}

export function readingToPlainText(reading: ReadingContent): string {
  if (typeof reading === "string") return reading;
  return [
    reading.opening,
    ...reading.cards.map((card) => `${card.positionTitle}：${card.interpretation}`),
    reading.connections,
    reading.summary,
  ].join("\n\n");
}
