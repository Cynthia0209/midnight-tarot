"use client";

import { useMemo, useState } from "react";
import type { TarotSpread } from "@/data/spreads";
import { tarotCardById } from "@/data/tarotCards";
import type { SavedReading, SelectedReadingCard } from "@/lib/reading";
import { shareReading } from "@/lib/share";

function renderInlineMarkdown(text: string) {
  return text.split(/(\*\*.+?\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={index} className="font-semibold text-moon">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return part;
  });
}

type Props = {
  spread: TarotSpread;
  question: string;
  cards: SelectedReadingCard[];
  text: string;
  loading: boolean;
  error?: string;
  savedReading?: SavedReading;
  onRetry: () => void;
};

export function ReadingPanel({ spread, question, cards, text, loading, error, savedReading, onRetry }: Props) {
  const paragraphs = useMemo(() => text.split(/\n+/).filter(Boolean), [text]);
  const [shareError, setShareError] = useState("");

  const handleShare = async () => {
    if (!savedReading) return;
    setShareError("");

    try {
      await shareReading(savedReading);
    } catch {
      setShareError("分享图片生成失败，请稍后再试。");
    }
  };

  return (
    <section className="ritual-panel rounded-[28px] p-6 md:p-9">
      <div className="flex items-center justify-between border-b border-antiqueGold/10 pb-5">
        <div>
          <p className="font-display text-[10px] uppercase tracking-[.38em] text-antiqueGold/65">Midnight Reading</p>
          <h2 className="mt-2 font-zhSerif text-2xl tracking-[.08em] text-moon">{spread.name}</h2>
        </div>
        <span className="text-2xl text-antiqueGold/55">☾</span>
      </div>

      {question && <p className="my-6 border-l border-antiqueGold/35 pl-4 font-zhSerif text-sm leading-7 text-moon/55">你问：{question}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((item, index) => {
          const card = tarotCardById.get(item.cardId);
          const position = spread.positions[index];
          if (!card) return null;
          return (
            <div key={item.cardId} className="rounded-2xl border border-white/[.055] bg-white/[.025] p-4">
              <p className="text-[10px] uppercase tracking-[.2em] text-antiqueGold/60">{position.titleZh}</p>
              <p className="mt-1 font-zhSerif text-lg text-moon">{card.nameZh} <span className="font-display text-sm text-moon/45">{card.name}</span></p>
              <p className="mt-2 text-xs leading-6 text-moon/48">{item.orientation === "reversed" ? card.reversedMeaning : card.uprightMeaning}</p>
            </div>
          );
        })}
      </div>

      <div className="reading-text mt-8 min-h-40 font-zhSerif text-[17px] leading-8 tracking-[.035em] text-moon/82">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{renderInlineMarkdown(paragraph)}</p>
        ))}
        {loading && <span className="inline-block h-4 w-[2px] animate-pulse bg-antiqueGold align-middle" />}
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-rose-300/15 bg-rose-200/[.035] p-4 text-sm leading-6 text-rose-100/70">
          <p>{error}</p>
          <button type="button" onClick={onRetry} className="mt-3 text-antiqueGold underline decoration-antiqueGold/30 underline-offset-4">重新连接牌意</button>
        </div>
      )}

      {savedReading && (
        <div className="mt-7 flex flex-wrap gap-3 border-t border-antiqueGold/10 pt-6">
          <button type="button" onClick={() => void handleShare()} className="gold-button rounded-full px-6 py-3 text-xs tracking-[.18em]">保存 / 分享结果图</button>
          <span className="self-center text-[11px] text-moon/35">已保存在此浏览器 · 最多保留 20 次</span>
          {shareError && <p className="w-full text-xs text-rose-200/70">{shareError}</p>}
        </div>
      )}
    </section>
  );
}
