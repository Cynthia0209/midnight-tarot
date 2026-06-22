"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { TarotSpread } from "@/data/spreads";
import { tarotCardById } from "@/data/tarotCards";
import type {
  ReadingContent,
  SavedReading,
  SelectedReadingCard,
  StructuredReading,
} from "@/lib/reading";
import { isStructuredReading } from "@/lib/reading";
import { shareReading } from "@/lib/share";
import { SpreadBoard } from "@/components/SpreadBoard";
import { TarotCardView } from "@/components/TarotCardView";

function renderInlineMarkdown(text: string) {
  return text.split(/(\*\*.+?\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={index} className="font-semibold text-moon">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

type Props = {
  spread: TarotSpread;
  cards: SelectedReadingCard[];
  question: string;
  reading: ReadingContent | null;
  loading: boolean;
  error?: string;
  savedReading?: SavedReading;
  onRetry: () => void;
};

function ReadingActions({
  error,
  savedReading,
  onRetry,
}: Pick<Props, "error" | "savedReading" | "onRetry">) {
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
    <>
      {error && (
        <div className="mt-8 border-l border-rose-300/25 pl-4 text-sm leading-7 text-rose-100/70">
          <p>{error}</p>
          <button type="button" onClick={onRetry} className="mt-2 text-antiqueGold underline decoration-antiqueGold/30 underline-offset-4">
            重新连接牌意
          </button>
        </div>
      )}
      {savedReading && (
        <div className="mt-12 flex flex-wrap items-center gap-4 border-t border-antiqueGold/10 pt-7">
          <button type="button" onClick={() => void handleShare()} className="gold-button rounded-full px-6 py-3 text-xs tracking-[.18em]">
            保存 / 分享结果图
          </button>
          <span className="text-[11px] text-moon/35">已保存在此浏览器 · 最多保留 20 次</span>
          {shareError && <p className="w-full text-xs text-rose-200/70">{shareError}</p>}
        </div>
      )}
    </>
  );
}

function LegacyReading({
  spread,
  cards,
  question,
  text,
  error,
  savedReading,
  onRetry,
}: Omit<Props, "reading" | "loading"> & { text: string }) {
  const paragraphs = text.split(/\n+/).filter(Boolean);
  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SpreadBoard spread={spread} selected={cards} revealCount={cards.length} showMeanings />
        </div>
        <article className="pb-20">
          <p className="font-display text-[10px] uppercase tracking-[.4em] text-antiqueGold/60">Archived reading</p>
          <h2 className="mt-3 font-zhSerif text-3xl tracking-[.08em] text-moon">过去保存的解读</h2>
          {question && <p className="mt-8 border-l border-antiqueGold/35 pl-4 font-zhSerif text-sm leading-7 text-moon/55">你问：{question}</p>}
          <div className="reading-text mt-9 font-zhSerif text-[17px] leading-9 tracking-[.035em] text-moon/82 md:text-[18px]">
            {paragraphs.map((paragraph, index) => <p key={index}>{renderInlineMarkdown(paragraph)}</p>)}
          </div>
          <ReadingActions error={error} savedReading={savedReading} onRetry={onRetry} />
        </article>
      </div>
    </div>
  );
}

export function ReadingPanel({
  spread,
  cards,
  question,
  reading,
  loading,
  error,
  savedReading,
  onRetry,
}: Props) {
  const structured = useMemo<StructuredReading | null>(
    () => isStructuredReading(reading) ? reading : null,
    [reading]
  );

  if (loading && !reading) {
    return (
      <section className="mx-auto flex min-h-[62vh] max-w-3xl flex-col items-center justify-center text-center">
        <div className="relative grid h-28 w-28 place-items-center">
          <motion.span
            className="absolute inset-0 rounded-full border border-antiqueGold/20"
            animate={{ rotate: 360, scale: [1, 1.08, 1] }}
            transition={{ rotate: { duration: 9, repeat: Infinity, ease: "linear" }, scale: { duration: 3, repeat: Infinity } }}
          />
          <span className="text-2xl text-antiqueGold/75">✦</span>
        </div>
        <p className="mt-8 font-display text-[10px] uppercase tracking-[.46em] text-antiqueGold/60">The reader is listening</p>
        <h2 className="mt-4 font-zhSerif text-3xl tracking-[.1em] text-moon">占卜师正在整理牌与牌之间的关系</h2>
      </section>
    );
  }

  if (typeof reading === "string") {
    return (
      <LegacyReading
        spread={spread}
        cards={cards}
        question={question}
        text={reading}
        error={error}
        savedReading={savedReading}
        onRetry={onRetry}
      />
    );
  }

  if (!structured) return null;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="grid gap-12 lg:grid-cols-[minmax(420px,.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <aside className="hidden lg:block">
          <div className="sticky top-20 flex h-[calc(100vh-6rem)] flex-col justify-center">
            <div className="mb-4">
              <p className="font-display text-[10px] uppercase tracking-[.4em] text-antiqueGold/55">Your spread</p>
              <h2 className="mt-2 font-zhSerif text-2xl tracking-[.08em] text-moon">{spread.name}</h2>
            </div>
            <div className="border-y border-antiqueGold/10 bg-[radial-gradient(circle_at_50%_45%,rgba(87,48,107,.12),transparent_65%)]">
              <SpreadBoard spread={spread} selected={cards} revealCount={cards.length} showMeanings />
            </div>
          </div>
        </aside>

        <article className="min-w-0 pb-24">
          {loading && (
            <div className="mb-8 flex items-center gap-3 border-y border-antiqueGold/10 py-4 text-xs tracking-[.12em] text-antiqueGold/60">
              <motion.span
                className="inline-block h-2 w-2 rounded-full bg-antiqueGold/75"
                animate={{ opacity: [.3, 1, .3], scale: [.8, 1.15, .8] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
              已先呈现牌面基础解读，占卜师正在补充更完整的牌组关系…
            </div>
          )}
          {question && (
            <div className="mb-12 border-b border-antiqueGold/10 pb-10">
              <p className="font-display text-[10px] uppercase tracking-[.36em] text-antiqueGold/55">Your question</p>
              <p className="mt-4 font-zhSerif text-xl leading-9 tracking-[.06em] text-moon/70">{question}</p>
            </div>
          )}

          <motion.section
            className="reading-story-section"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .65 }}
          >
            <p className="font-display text-[10px] uppercase tracking-[.4em] text-antiqueGold/60">Opening</p>
            <h2 className="mt-3 font-zhSerif text-3xl tracking-[.08em] text-moon">先看整组牌的气氛</h2>
            <p className="mt-7 font-zhSerif text-[18px] leading-9 tracking-[.035em] text-moon/82">
              {renderInlineMarkdown(structured.opening)}
            </p>
          </motion.section>

          {structured.cards.map((section, index) => {
            const selected = cards[index];
            const card = selected ? tarotCardById.get(selected.cardId) : undefined;
            const position = spread.positions[index];
            if (!selected || !card || !position) return null;
            return (
              <motion.section
                key={section.positionId}
                className="reading-story-section border-t border-antiqueGold/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: .65, delay: Math.min(index * .08, .4) }}
              >
                <div className="mb-8 flex justify-center lg:hidden">
                  <TarotCardView card={card} orientation={selected.orientation} revealed selected disabled />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[.24em] text-antiqueGold/60">
                      {String(index + 1).padStart(2, "0")} · {position.titleZh}
                    </p>
                    <h2 className="mt-3 font-zhSerif text-3xl text-moon">
                      {card.nameZh}
                      <span className="ml-3 font-display text-base text-moon/38">{card.name}</span>
                    </h2>
                  </div>
                  <span className="shrink-0 text-[10px] tracking-[.18em] text-lavender/55">
                    {selected.orientation === "reversed" ? "逆位" : "正位"}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-6 text-moon/38">{position.meaning}</p>
                <p className="mt-7 font-zhSerif text-[18px] leading-9 tracking-[.035em] text-moon/82">
                  {renderInlineMarkdown(section.interpretation)}
                </p>
              </motion.section>
            );
          })}

          <motion.section
            className="reading-story-section border-t border-antiqueGold/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .65, delay: .25 }}
          >
            <p className="font-display text-[10px] uppercase tracking-[.4em] text-antiqueGold/60">Connections</p>
            <h2 className="mt-3 font-zhSerif text-3xl tracking-[.08em] text-moon">牌与牌之间</h2>
            <p className="mt-7 font-zhSerif text-[18px] leading-9 tracking-[.035em] text-moon/82">
              {renderInlineMarkdown(structured.connections)}
            </p>
          </motion.section>

          <motion.section
            className="reading-story-section border-t border-antiqueGold/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .65, delay: .32 }}
          >
            <div className="mb-8 lg:hidden">
              <SpreadBoard spread={spread} selected={cards} revealCount={cards.length} showMeanings />
            </div>
            <p className="font-display text-[10px] uppercase tracking-[.4em] text-antiqueGold/60">The whole reading</p>
            <h2 className="mt-3 font-zhSerif text-3xl tracking-[.08em] text-moon">最后，把牌放回完整的故事里</h2>
            <p className="mt-7 font-zhSerif text-[19px] leading-10 tracking-[.035em] text-moon/88">
              {renderInlineMarkdown(structured.summary)}
            </p>
            <ReadingActions error={error} savedReading={savedReading} onRetry={onRetry} />
          </motion.section>
        </article>
      </div>
    </div>
  );
}
