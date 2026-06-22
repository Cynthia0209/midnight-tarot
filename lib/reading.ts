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

export type SavedReading = {
  id: string;
  spreadId: string;
  question: string;
  cards: SelectedReadingCard[];
  reading: string;
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
