export type SpreadCategory = "每日" | "关系" | "方向" | "抉择" | "深度";

export type SpreadPosition = {
  id: string;
  title: string;
  titleZh: string;
  meaning: string;
  x: number;
  y: number;
  rotation?: number;
  mobileX?: number;
  mobileY?: number;
  mobileRotation?: number;
};

export type TarotSpread = {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  category: SpreadCategory;
  difficulty: "轻盈" | "深入" | "完整";
  positions: SpreadPosition[];
};

const p = (
  id: string,
  titleZh: string,
  title: string,
  meaning: string,
  x: number,
  y: number,
  rotation = 0,
  mobileX = x,
  mobileY = y,
  mobileRotation = rotation
): SpreadPosition => ({ id, titleZh, title, meaning, x, y, rotation, mobileX, mobileY, mobileRotation });

export const tarotSpreads: TarotSpread[] = [
  {
    id: "single",
    name: "一张牌的指引",
    nameEn: "A Single Light",
    description: "为今天或一个具体问题，留下一束清晰的光。",
    category: "每日",
    difficulty: "轻盈",
    positions: [p("guidance", "此刻的指引", "Guidance", "此刻最值得你留意的能量", 50, 50)],
  },
  {
    id: "three-card",
    name: "时间之流",
    nameEn: "Past · Present · Future",
    description: "看见过去如何流向现在，以及能量正在去往哪里。",
    category: "方向",
    difficulty: "轻盈",
    positions: [
      p("past", "过去", "Past", "仍在影响你的过去", 22, 52),
      p("present", "现在", "Present", "此刻真正发生的事", 50, 45),
      p("future", "未来", "Future", "能量自然发展的方向", 78, 52),
    ],
  },
  {
    id: "relationship",
    name: "关系镜面",
    nameEn: "The Relationship Mirror",
    description: "不是预测对方，而是看清彼此、连接和未说出口的部分。",
    category: "关系",
    difficulty: "深入",
    positions: [
      p("you", "你的能量", "You", "你带入关系的感受与期待", 15, 55, -4, 18, 35, -3),
      p("them", "对方的能量", "Them", "对方呈现出的状态", 85, 55, 4, 82, 35, 3),
      p("bond", "连接", "The Bond", "你们之间真实流动的能量", 50, 24, 0, 35, 70),
      p("shadow", "隐秘模式", "The Shadow", "关系里被忽略或回避的部分", 35, 76, -2, 65, 70),
      p("path", "关系方向", "The Path", "这段关系邀请你看见什么", 65, 76, 2, 50, 92),
    ],
  },
  {
    id: "career",
    name: "事业罗盘",
    nameEn: "The Work Compass",
    description: "辨认当前位置、天赋、阻力，以及最有生命力的下一步。",
    category: "方向",
    difficulty: "深入",
    positions: [
      p("current", "当前位置", "Current", "你现在所处的事业能量", 50, 48),
      p("gift", "可用天赋", "Gift", "可以依靠的能力与资源", 22, 25, -3, 22, 22),
      p("challenge", "主要阻力", "Challenge", "需要被看见的现实挑战", 78, 25, 3, 78, 22),
      p("action", "下一步", "Next Step", "当下最有力量的行动方向", 22, 78, -3, 22, 78),
      p("potential", "发展潜力", "Potential", "持续投入可能打开的空间", 78, 78, 3, 78, 78),
    ],
  },
  {
    id: "choice",
    name: "两条道路",
    nameEn: "Between Two Paths",
    description: "当两个选择都在召唤你，看看每条路真正携带的代价与礼物。",
    category: "抉择",
    difficulty: "深入",
    positions: [
      p("heart", "内心真正所求", "The Heart", "你的核心需要与选择标准", 50, 18),
      p("a-gift", "道路 A · 礼物", "Path A · Gift", "选择 A 会打开的可能", 20, 50, -4),
      p("a-cost", "道路 A · 代价", "Path A · Cost", "选择 A 需要承担的部分", 32, 82, -2),
      p("b-gift", "道路 B · 礼物", "Path B · Gift", "选择 B 会打开的可能", 80, 50, 4),
      p("b-cost", "道路 B · 代价", "Path B · Cost", "选择 B 需要承担的部分", 68, 82, 2),
    ],
  },
  {
    id: "celtic-cross",
    name: "凯尔特十字",
    nameEn: "The Celtic Cross",
    description: "当问题复杂而深远，用十张牌看见它的根、影响和可能走向。",
    category: "深度",
    difficulty: "完整",
    positions: [
      p("heart", "核心", "The Heart", "问题的核心能量", 35, 50),
      p("cross", "交叉影响", "The Cross", "推动或阻碍核心的力量", 35, 50, 90),
      p("above", "意识", "Above", "你正在追求或意识到的部分", 35, 16),
      p("below", "根源", "Below", "更深层的根源与潜意识", 35, 84),
      p("past", "近因", "Past", "正在离开的影响", 12, 50),
      p("near", "近期", "Near Future", "即将进入局面的能量", 58, 50),
      p("self", "自我", "Self", "你在其中的位置", 82, 86),
      p("world", "环境", "Environment", "他人与环境的影响", 82, 63),
      p("hopes", "希望与恐惧", "Hopes & Fears", "渴望与担忧交织之处", 82, 40),
      p("outcome", "可能走向", "Outcome", "当前能量延续时的方向", 82, 17),
    ],
  },
];

export const spreadById = new Map(tarotSpreads.map((spread) => [spread.id, spread]));
export const threeCardSpread = tarotSpreads[1].positions;
