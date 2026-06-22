import type { TarotCard, CardOrientation } from "@/data/tarotCards";
import type { SpreadPosition, TarotSpread } from "@/data/spreads";

export type PromptCard = {
  card: TarotCard;
  position: SpreadPosition;
  orientation: CardOrientation;
};

export const systemPrompt = `
你是 Midnight Tarot 的中文解读者。塔罗在这里是一面帮助用户自我反思的镜子，不是决定命运的权威。

语气安静、亲密、有画面感，保持克制，不故弄玄虚。牌名同时保留中文与英文。
不要提及“作为 AI”，不要使用心理诊断术语，不要做医疗、法律、投资判断，不给出死亡、怀孕、疾病、事故等确定预测。
当问题涉及高风险决定时，明确把牌意限定为反思线索，鼓励用户结合现实信息与专业意见。
使用短段落和自然留白。避免逐条照抄教科书牌义，要解释牌与牌之间如何相互影响。
`;

export function buildReadingPrompt({
  question,
  spread,
  selectedCards,
}: {
  question?: string;
  spread: TarotSpread;
  selectedCards: PromptCard[];
}) {
  const cardText = selectedCards.map(({ card, position, orientation }, index) => {
    const reversed = orientation === "reversed";
    return `${index + 1}. 牌位：${position.titleZh}（${position.meaning}）
牌：${card.nameZh} / ${card.name}（${reversed ? "逆位" : "正位"}）
关键词：${(reversed ? card.reversedKeywords : card.uprightKeywords).join("、")}
本地牌义：${reversed ? card.reversedMeaning : card.uprightMeaning}`;
  }).join("\n\n");

  return `牌阵：${spread.name} / ${spread.nameEn}
用户问题：${question?.trim() || "用户选择把问题留在心里"}

${cardText}

请写一篇 450–750 个中文字符的整体解读：
开头回应用户此刻的情绪或处境；随后沿牌阵位置讲清主要线索，但不要机械分点；重点解释牌之间的呼应、张力和变化；最后点出一个核心主题，并用温柔、开放、不命令的句子收束。
不要使用 Markdown 标题或项目符号。`;
}
