import type { CardOrientation } from "@/data/tarotCards";
import type { Locale } from "@/lib/locale";

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
  context?: string;
  locale: Locale;
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

export type StructuredReadingV2 = {
  version: 2;
  opening: string;
  cards: StructuredReadingCard[];
  connections: string;
  summary: string;
};

export type StructuredReadingV3 = {
  version: 3;
  questionFocus: string;
  opening: string;
  cards: StructuredReadingCard[];
  connections: string;
  realityChecks: [string, string];
  summary: string;
};

export type StructuredReading = StructuredReadingV2 | StructuredReadingV3;
export type ReadingContent = string | StructuredReading;

export type SavedReading = {
  id: string;
  spreadId: string;
  question: string;
  context?: string;
  locale?: Locale;
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

export function createSession(spreadId: string, question: string, cardIds: number[], context = "", locale: Locale = "en"): ReadingSession {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    spreadId,
    question,
    context: context.trim() || undefined,
    locale,
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
  context: string,
  cards: Array<{ positionId: string; positionTitle: string; nameZh: string; name?: string; meaning: string }>,
  locale: Locale = "zh",
): StructuredReadingV3 {
  if (locale === "en") {
    const detail = context.trim()
      ? `You added this context: "${context.trim().slice(0, 120)}".`
      : "";
    const focus = question.trim()
      ? `You are really asking: "${question.trim().slice(0, 96)}".`
      : "These cards are not rushing toward a conclusion; they are placing the most useful clues in front of you.";

    return {
      version: 3,
      questionFocus: `${focus}${detail ? ` ${detail}` : ""}`,
      opening: "The full reading is still forming. Start with the basic card meanings and notice where they touch your real situation.",
      cards: cards.map((item) => ({
        positionId: item.positionId,
        positionTitle: item.positionTitle,
        interpretation: `${item.name ?? item.nameZh} appears in ${item.positionTitle}. ${item.meaning}`,
      })),
      connections: cards.length > 1
        ? "Taken together, these cards do not describe separate events. They form a path: what came before shapes your current response, and your current choice changes what comes next."
        : "This single card is both a mirror and a pause. It asks you to see the real feeling clearly before deciding the next step.",
      realityChecks: [
        "Watch the next relevant conversation for what the other person actually does, not only what you hope it means.",
        "Notice whether the same hesitation returns, and whether it is triggered by new facts or by a familiar fear.",
      ],
      summary: "Before treating the cards as a decision, bring the question back to one verifiable action: clarify information, ask a specific question, or set a clear time to review what has changed.",
    };
  }

  const detail = context.trim()
    ? `你补充的情况是：“${context.trim().slice(0, 96)}”。`
    : "";
  const focus = question.trim()
    ? `你真正想确认的是：“${question.trim().slice(0, 72)}”。`
    : "这组牌没有急着给出结论，而是把此刻最值得留意的线索一张张放在你面前。";

  return {
    version: 3,
    questionFocus: `${focus}${detail}`,
    opening: "完整解读仍在生成。先从牌面的基础含义开始看，留意它与你描述的现实处境在哪一点发生了呼应。",
    cards: cards.map((item) => ({
      positionId: item.positionId,
      positionTitle: item.positionTitle,
      interpretation: `${item.positionTitle}出现${item.nameZh}。${item.meaning}`,
    })),
    connections: cards.length > 1
      ? "把这些牌放在一起看，它们呈现的不是彼此割裂的事件，而是一条正在形成的路径：前面的经验影响着当下的反应，而当下的选择又会改变后续的走向。"
      : "这一张牌既是此刻的镜子，也是一处停顿。它提醒你先看清正在发生的真实感受，再决定下一步。",
    realityChecks: [
      "观察接下来一次相关沟通中，对方实际做了什么，而不只看自己希望它代表什么。",
      "留意同一个犹豫是否再次出现，以及触发它的是事实变化，还是熟悉的担心。",
    ],
    summary: "在完整解读返回前，先不要急着根据牌做决定。把问题带回一个可验证的现实动作：确认信息、提出具体问题，或为自己设定一个清楚的时间点。",
  };
}

export function isStructuredReading(value: unknown): value is StructuredReading {
  if (!value || typeof value !== "object") return false;
  const reading = value as Partial<StructuredReading>;
  const commonValid = (reading.version === 2 || reading.version === 3)
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
  if (!commonValid) return false;
  if (reading.version === 2) return true;
  const version3 = reading as Partial<StructuredReadingV3>;
  return typeof version3.questionFocus === "string"
    && Array.isArray(version3.realityChecks)
    && version3.realityChecks.length === 2
    && version3.realityChecks.every((item) => typeof item === "string");
}

export function isStructuredReadingV3(reading: StructuredReading): reading is StructuredReadingV3 {
  return reading.version === 3;
}

export function personalizeReadingText(text: string): string {
  return text
    .replace(/这位用户/g, "你")
    .replace(/该用户/g, "你")
    .replace(/用户/g, "你")
    .replace(/提问者/g, "你")
    .replace(/来访者/g, "你")
    .replace(/求问者/g, "你");
}

export function personalizeReadingContent(reading: ReadingContent): ReadingContent {
  if (typeof reading === "string") return personalizeReadingText(reading);

  const common = {
    ...reading,
    opening: personalizeReadingText(reading.opening),
    cards: reading.cards.map((card) => ({
      ...card,
      interpretation: personalizeReadingText(card.interpretation),
    })),
    connections: personalizeReadingText(reading.connections),
    summary: personalizeReadingText(reading.summary),
  };

  if (reading.version === 2) return common;
  return {
    ...common,
    version: 3,
    questionFocus: personalizeReadingText(reading.questionFocus),
    realityChecks: reading.realityChecks.map(personalizeReadingText) as [string, string],
  };
}

export function readingToPlainText(reading: ReadingContent): string {
  const personalized = personalizeReadingContent(reading);
  if (typeof personalized === "string") return personalized;
  return [
    ...(personalized.version === 3 ? [personalized.questionFocus] : []),
    personalized.opening,
    ...personalized.cards.map((card) => `${card.positionTitle}：${card.interpretation}`),
    personalized.connections,
    ...(personalized.version === 3 ? [`现实观察：${personalized.realityChecks.join("；")}`] : []),
    personalized.summary,
  ].join("\n\n");
}
