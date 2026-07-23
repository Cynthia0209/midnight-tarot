export type CardOrientation = "upright" | "reversed";
export type TarotSuit = "major" | "wands" | "cups" | "swords" | "pentacles";

export type TarotCard = {
  id: number;
  number: string;
  name: string;
  nameZh: string;
  arcana: "major" | "minor";
  suit: TarotSuit;
  imagePath: string;
  uprightKeywords: string[];
  reversedKeywords: string[];
  uprightKeywordsEn: string[];
  reversedKeywordsEn: string[];
  uprightMeaning: string;
  reversedMeaning: string;
  uprightMeaningEn: string;
  reversedMeaningEn: string;
};

const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const majors: Array<[string, string, string[], string[], string[], string[], string, string, string, string]> = [
  ["The Fool", "愚者", ["新开始", "信任", "自由"], ["迟疑", "冒失", "逃避"], ["new beginning", "trust", "freedom"], ["hesitation", "recklessness", "avoidance"], "新的道路正在你面前展开，重要的不是确定，而是愿意迈出第一步。", "你可能在渴望开始与害怕失控之间摇摆，先辨认真正令你停住的是什么。", "A new path is opening. The point is not certainty, but the willingness to take the first honest step.", "You may be caught between wanting to begin and fearing loss of control. First name what is really making you pause."],
  ["The Magician", "魔术师", ["行动力", "专注", "创造"], ["分心", "自我怀疑", "操控"], ["agency", "focus", "creation"], ["distraction", "self-doubt", "control"], "你已经拥有让意图成为现实的工具，能量正等待一个清晰的方向。", "能力并未消失，只是被犹豫或过度控制分散了。", "You already have tools to turn intention into action. Your energy is waiting for a clear direction.", "Your ability has not disappeared; it is being scattered by hesitation or over-control."],
  ["The High Priestess", "女祭司", ["直觉", "静默", "内在知晓"], ["封闭", "秘密", "混乱"], ["intuition", "silence", "inner knowing"], ["closed off", "secrecy", "confusion"], "答案不在喧闹处，你内心已经捕捉到某种尚未说出口的真相。", "外界声音盖住了直觉，暂时不要逼迫自己立即下结论。", "The answer is not in the noise. Some quiet part of you has already noticed an unspoken truth.", "Outside voices may be covering your intuition. Do not force yourself into an immediate conclusion."],
  ["The Empress", "皇后", ["丰盛", "滋养", "感受"], ["匮乏", "依赖", "忽视自己"], ["abundance", "nurture", "feeling"], ["scarcity", "dependency", "self-neglect"], "让事物生长的力量来自照料、耐心和对感受的信任。", "你可能把太多照料给了别人，却忘了补充自己。", "Growth comes from care, patience, and trusting what your feelings are showing you.", "You may be giving care outward while forgetting to replenish yourself."],
  ["The Emperor", "皇帝", ["秩序", "边界", "稳定"], ["僵化", "控制", "权力冲突"], ["structure", "boundaries", "stability"], ["rigidity", "control", "power struggle"], "清晰的结构和边界会让你重新获得稳定感。", "过度控制可能正在压缩真实感受需要的空间。", "Clear structure and boundaries can help you recover steadiness.", "Too much control may be crowding out the space your real feelings need."],
  ["The Hierophant", "教皇", ["传统", "学习", "信念"], ["质疑", "打破惯例", "独立"], ["tradition", "learning", "belief"], ["questioning", "breaking pattern", "independence"], "经验与传统里有可借鉴的智慧，但需要由你赋予它意义。", "旧规则已经不足以回答现在的问题，你正在寻找自己的标准。", "There is wisdom in experience and tradition, but you still need to give it your own meaning.", "Old rules may no longer answer the present question. You are looking for your own standard."],
  ["The Lovers", "恋人", ["连接", "选择", "一致"], ["失衡", "疏离", "价值冲突"], ["connection", "choice", "alignment"], ["imbalance", "distance", "value conflict"], "真正的连接要求诚实地选择，而不只是被吸引。", "表面的靠近之下可能存在节奏或价值上的错位。", "Real connection asks for an honest choice, not only attraction.", "Beneath apparent closeness, there may be a mismatch of rhythm or values."],
  ["The Chariot", "战车", ["意志", "推进", "掌控方向"], ["失控", "阻滞", "方向冲突"], ["willpower", "movement", "direction"], ["loss of control", "blockage", "conflicting direction"], "当内在力量朝同一个方向聚拢，事情便会开始移动。", "你可能同时被两股力量拉扯，先决定什么值得你前进。", "When your inner forces gather toward one direction, the situation can begin to move.", "You may be pulled by two forces at once. Decide what is worth moving toward."],
  ["Strength", "力量", ["勇气", "温柔坚定", "耐心"], ["脆弱", "压抑", "失去信心"], ["courage", "gentle firmness", "patience"], ["vulnerability", "suppression", "lost confidence"], "真正的力量并不喧哗，它来自温柔而稳定地面对自己。", "你可能把坚强误解为不能疲惫，允许自己先恢复。", "Real strength is not loud. It comes from facing yourself with steady gentleness.", "You may be mistaking strength for never getting tired. Let yourself recover first."],
  ["The Hermit", "隐者", ["独处", "寻找", "内在指引"], ["孤立", "退缩", "迷失"], ["solitude", "searching", "inner guidance"], ["isolation", "withdrawal", "lost direction"], "暂时离开噪音会帮助你听见真正重要的声音。", "独处正在从休息变成隔绝，是时候留一扇门给连接。", "Stepping away from noise can help you hear what matters.", "Solitude may be turning from rest into isolation. Leave a door open for connection."],
  ["Wheel of Fortune", "命运之轮", ["转变", "周期", "契机"], ["停滞", "抗拒变化", "重复"], ["change", "cycle", "turning point"], ["stagnation", "resistance", "repetition"], "局面正在转动，你无法控制一切，却可以选择如何回应。", "一个模式似乎正在重复，改变从看清自己的参与方式开始。", "The situation is turning. You cannot control everything, but you can choose your response.", "A pattern may be repeating. Change begins with seeing how you participate in it."],
  ["Justice", "正义", ["诚实", "因果", "平衡"], ["偏见", "逃避责任", "不公平"], ["honesty", "consequence", "balance"], ["bias", "avoidance", "unfairness"], "清楚看见事实与自己的责任，会带来真正的平衡。", "你可能只看见了部分事实，暂缓评判会让真相更完整。", "Seeing the facts and your own responsibility clearly can bring real balance.", "You may only be seeing part of the facts. Pausing judgment can make the truth more complete."],
  ["The Hanged Man", "倒吊人", ["暂停", "换角度", "放下"], ["拖延", "僵持", "徒劳牺牲"], ["pause", "new perspective", "surrender"], ["delay", "stalemate", "empty sacrifice"], "暂停不是失败，换一个角度会让被遮住的意义显现。", "等待已经失去意义，你需要分辨这是臣服还是拖延。", "A pause is not failure. A new angle can reveal what has been hidden.", "Waiting may have lost its meaning. Tell the difference between surrender and avoidance."],
  ["Death", "死神", ["结束", "蜕变", "释放"], ["抗拒结束", "停滞", "执着"], ["ending", "transformation", "release"], ["resisting closure", "stagnation", "attachment"], "某个阶段正在改变形状，放手会为新的生命腾出位置。", "你已经知道什么无法继续，却仍在为熟悉感留门。", "A phase is changing shape. Letting go makes room for something alive.", "You may already know what cannot continue, while still keeping a door open for familiarity."],
  ["Temperance", "节制", ["调和", "疗愈", "耐心"], ["失衡", "过度", "急躁"], ["integration", "healing", "patience"], ["imbalance", "excess", "impatience"], "答案会在两种力量之间缓慢调和，而不是突然降临。", "生活的某一部分占据了过多空间，需要重新调整比例。", "The answer may arrive through gradual blending, not a sudden verdict.", "One part of life may be taking too much space. The proportions need adjusting."],
  ["The Devil", "恶魔", ["束缚", "欲望", "阴影"], ["松绑", "觉察", "重获自由"], ["bondage", "desire", "shadow"], ["release", "awareness", "freedom returning"], "看见自己与恐惧、欲望或习惯之间的契约，是松绑的开始。", "你已经开始识别束缚，旧模式正在失去对你的控制。", "Seeing the contract between you and fear, desire, or habit is the beginning of release.", "You are beginning to recognize the bond. The old pattern is losing its grip."],
  ["The Tower", "高塔", ["骤变", "真相", "瓦解"], ["延迟改变", "余震", "害怕失去"], ["sudden change", "truth", "collapse"], ["delayed change", "aftershock", "fear of loss"], "不稳固的结构正在松动，真相虽然剧烈，却也带来自由。", "你试图推迟必要的改变，但裂缝已经在传递信息。", "An unstable structure is loosening. The truth may be intense, but it also brings freedom.", "You may be delaying a necessary change, but the cracks are already speaking."],
  ["The Star", "星星", ["希望", "疗愈", "清澈"], ["灰心", "疲惫", "失去连接"], ["hope", "healing", "clarity"], ["discouragement", "fatigue", "disconnection"], "经历动荡之后，一种安静而真实的希望正在回来。", "希望仍在，只是疲惫让它暂时显得微弱。", "After disruption, a quiet and real kind of hope is returning.", "Hope is still present; fatigue is only making it seem faint for now."],
  ["The Moon", "月亮", ["潜意识", "朦胧", "直觉"], ["迷雾渐散", "真相浮现", "释放恐惧"], ["subconscious", "uncertainty", "intuition"], ["fog lifting", "truth emerging", "fear releasing"], "此刻的信息并不完整，感受是真的，但解释未必都是事实。", "混乱正在退潮，被恐惧放大的部分会逐渐恢复原貌。", "The information is incomplete. The feeling is real, but the interpretation may not be fact.", "Confusion is receding. What fear enlarged may begin returning to its real size."],
  ["The Sun", "太阳", ["清晰", "喜悦", "生命力"], ["延迟快乐", "勉强乐观", "遮蔽"], ["clarity", "joy", "vitality"], ["delayed joy", "forced optimism", "obscured truth"], "光正在照进局面，你可以更坦然地表达真实的自己。", "快乐并未消失，只是你还没允许自己完全接住它。", "Light is entering the situation. You can express yourself more openly.", "Joy has not vanished; you may not yet be allowing yourself to receive it fully."],
  ["Judgement", "审判", ["觉醒", "回应召唤", "和解"], ["自我否定", "逃避召唤", "迟疑"], ["awakening", "answering the call", "reconciliation"], ["self-judgment", "avoidance", "hesitation"], "过去正在要求被重新理解，而不是被反复惩罚。", "你听见了内心的召唤，却仍担心自己没有资格回应。", "The past is asking to be understood differently, not punished again.", "You may hear the inner call while still doubting whether you are allowed to answer."],
  ["The World", "世界", ["完成", "整合", "抵达"], ["未完成", "延迟", "缺少闭环"], ["completion", "integration", "arrival"], ["unfinished cycle", "delay", "missing closure"], "一个周期正在形成完整意义，你比自己意识到的走得更远。", "最后一步仍未完成，也许需要的只是为这段经历正式命名。", "A cycle is gathering its full meaning. You have come farther than you realize.", "The final step may still be unfinished. Perhaps this experience needs to be named clearly."],
];

const suitMeta: Record<Exclude<TarotSuit, "major">, {
  zh: string;
  element: string;
  upright: string[];
  reversed: string[];
  uprightEn: string[];
  reversedEn: string[];
  meaning: string;
  reversedMeaning: string;
  meaningEn: string;
  reversedMeaningEn: string;
}> = {
  wands: { zh: "权杖", element: "行动与热情", upright: ["行动", "热情", "创造"], reversed: ["阻滞", "耗竭", "冲动"], uprightEn: ["action", "passion", "creation"], reversedEn: ["blockage", "burnout", "impulse"], meaning: "行动与创造的火焰正在推动局面。", reversedMeaning: "行动的能量受阻，可能需要调整节奏与方向。", meaningEn: "The fire of action and creation is moving the situation forward.", reversedMeaningEn: "Action is blocked. The pace or direction may need adjustment." },
  cups: { zh: "圣杯", element: "情感与关系", upright: ["感受", "连接", "直觉"], reversed: ["情绪淤积", "疏离", "失衡"], uprightEn: ["feeling", "connection", "intuition"], reversedEn: ["emotional buildup", "distance", "imbalance"], meaning: "情感与关系正在成为这件事的核心。", reversedMeaning: "情绪没有顺畅流动，需要辨认被压下或投射的感受。", meaningEn: "Feelings and relationships are becoming the heart of the matter.", reversedMeaningEn: "Emotion is not moving freely. Notice what is being suppressed or projected." },
  swords: { zh: "宝剑", element: "思考与真相", upright: ["思考", "真相", "决定"], reversed: ["过度思虑", "冲突", "混乱"], uprightEn: ["thought", "truth", "decision"], reversedEn: ["overthinking", "conflict", "confusion"], meaning: "清晰的思考与诚实表达将带来突破。", reversedMeaning: "思想可能困住了感受，先让事实与担忧分开。", meaningEn: "Clear thinking and honest expression can bring a breakthrough.", reversedMeaningEn: "Thought may be trapping feeling. Separate facts from worry first." },
  pentacles: { zh: "星币", element: "现实与资源", upright: ["稳定", "资源", "实践"], reversed: ["不稳", "匮乏感", "失去耐心"], uprightEn: ["stability", "resources", "practice"], reversedEn: ["instability", "scarcity", "impatience"], meaning: "现实条件、时间和持续投入正在塑造结果。", reversedMeaning: "安全感受到挑战，需要回到具体可掌控的部分。", meaningEn: "Real conditions, time, and steady effort are shaping the result.", reversedMeaningEn: "Security feels challenged. Return to what is concrete and manageable." },
};

const ranks: Array<[string, string, string[], string[], string[], string[]]> = [
  ["Ace", "王牌", ["起点", "机会"], ["延迟", "未准备"], ["beginning", "opportunity"], ["delay", "not ready"]],
  ["Two", "二", ["平衡", "选择"], ["犹豫", "失衡"], ["balance", "choice"], ["hesitation", "imbalance"]],
  ["Three", "三", ["发展", "合作"], ["分歧", "停滞"], ["growth", "collaboration"], ["division", "stagnation"]],
  ["Four", "四", ["稳定", "边界"], ["僵化", "不安"], ["stability", "boundaries"], ["rigidity", "unease"]],
  ["Five", "五", ["挑战", "变化"], ["余波", "回避"], ["challenge", "change"], ["aftermath", "avoidance"]],
  ["Six", "六", ["过渡", "支持"], ["停留", "失衡"], ["transition", "support"], ["staying put", "imbalance"]],
  ["Seven", "七", ["考验", "评估"], ["动摇", "分散"], ["test", "evaluation"], ["doubt", "scattered energy"]],
  ["Eight", "八", ["推进", "力量"], ["受限", "延误"], ["movement", "strength"], ["restriction", "delay"]],
  ["Nine", "九", ["成熟", "临界点"], ["疲惫", "焦虑"], ["maturity", "threshold"], ["fatigue", "anxiety"]],
  ["Ten", "十", ["完成", "结果"], ["负担", "未完成"], ["completion", "result"], ["burden", "unfinished"]],
  ["Page", "侍从", ["讯息", "探索"], ["不成熟", "消息延迟"], ["message", "exploration"], ["immaturity", "delayed message"]],
  ["Knight", "骑士", ["追寻", "行动"], ["鲁莽", "方向偏离"], ["pursuit", "action"], ["recklessness", "misdirection"]],
  ["Queen", "王后", ["内在掌握", "滋养"], ["内耗", "界限模糊"], ["inner mastery", "nurture"], ["inner drain", "blurred boundaries"]],
  ["King", "国王", ["成熟掌控", "担当"], ["控制", "固执"], ["mature command", "responsibility"], ["control", "stubbornness"]],
];

const majorCards: TarotCard[] = majors.map((item, id) => ({
  id,
  number: String(id),
  name: item[0],
  nameZh: item[1],
  arcana: "major",
  suit: "major",
  imagePath: `/cards/${slugify(item[0])}.jpg`,
  uprightKeywords: item[2],
  reversedKeywords: item[3],
  uprightKeywordsEn: item[4],
  reversedKeywordsEn: item[5],
  uprightMeaning: item[6],
  reversedMeaning: item[7],
  uprightMeaningEn: item[8],
  reversedMeaningEn: item[9],
}));

const suits: Array<Exclude<TarotSuit, "major">> = ["wands", "cups", "swords", "pentacles"];
const minorCards: TarotCard[] = suits.flatMap((suit, suitIndex) =>
  ranks.map((rank, rankIndex) => {
    const meta = suitMeta[suit];
    const name = `${rank[0]} of ${suit[0].toUpperCase()}${suit.slice(1)}`;
    return {
      id: 22 + suitIndex * 14 + rankIndex,
      number: String(rankIndex + 1),
      name,
      nameZh: `${meta.zh}${rank[1]}`,
      arcana: "minor" as const,
      suit,
      imagePath: `/cards/${slugify(name)}.jpg`,
      uprightKeywords: [...rank[2], ...meta.upright].slice(0, 4),
      reversedKeywords: [...rank[3], ...meta.reversed].slice(0, 4),
      uprightKeywordsEn: [...rank[4], ...meta.uprightEn].slice(0, 4),
      reversedKeywordsEn: [...rank[5], ...meta.reversedEn].slice(0, 4),
      uprightMeaning: `${rank[1]}象征${rank[2].join("与")}。${meta.meaning}`,
      reversedMeaning: `${rank[1]}的能量暂时不顺畅。${meta.reversedMeaning}`,
      uprightMeaningEn: `${rank[0]} carries ${rank[4].join(" and ")}. ${meta.meaningEn}`,
      reversedMeaningEn: `The ${rank[0]}'s energy is not flowing cleanly. ${meta.reversedMeaningEn}`,
    };
  })
);

export const tarotCards: TarotCard[] = [...majorCards, ...minorCards];
export const tarotCardById = new Map(tarotCards.map((card) => [card.id, card]));
