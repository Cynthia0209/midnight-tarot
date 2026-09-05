"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { TarotSpread } from "@/data/spreads";
import { tarotCardById } from "@/data/tarotCards";
import type {
  ReadingContent,
  SavedReading,
  SelectedReadingCard,
  StructuredReading,
} from "@/lib/reading";
import {
  isStructuredReading,
  isStructuredReadingV3,
  personalizeReadingContent,
} from "@/lib/reading";
import { shareReading } from "@/lib/share";
import { SpreadBoard } from "@/components/SpreadBoard";
import { FollowupPanel } from "@/components/FollowupPanel";
import { RitualButton } from "@/components/RitualButton";
import type { Locale } from "@/lib/locale";

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
  context?: string;
  reading: ReadingContent | null;
  loading: boolean;
  error?: string;
  savedReading?: SavedReading;
  onRetry: () => void;
  locale?: Locale;
};

function ReadingActions({
  error,
  savedReading,
  onRetry,
  locale = "zh",
}: Pick<Props, "error" | "savedReading" | "onRetry" | "locale">) {
  const [shareError, setShareError] = useState("");

  const handleShare = async () => {
    if (!savedReading) return;
    setShareError("");
    try {
      await shareReading(savedReading);
    } catch {
      setShareError(locale === "en" ? "Could not create the share image. Please try again later." : "分享图片生成失败，请稍后再试。");
    }
  };

  return (
    <>
      {error && (
        <div className="mt-8 border-l border-rose-300/25 pl-4 text-sm leading-7 text-rose-100/70">
          <p>{error}</p>
          <button type="button" onClick={onRetry} className="mt-2 text-antiqueGold underline decoration-antiqueGold/30 underline-offset-4">
            {locale === "en" ? "Reconnect the reading" : "重新连接牌意"}
          </button>
        </div>
      )}
      {savedReading && (
        <div className="reading-actions mt-12">
          <RitualButton type="button" compact onClick={() => void handleShare()}>
            {locale === "en" ? "Save / share image" : "保存 / 分享结果图"}
          </RitualButton>
          <span className="text-[11px] text-moon/55">{locale === "en" ? "Saved in this browser · Up to 50 readings" : "已保存在此浏览器 · 最多保留 50 次"}</span>
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
  context,
  text,
  error,
  savedReading,
  onRetry,
  locale = "zh",
}: Omit<Props, "reading" | "loading"> & { text: string }) {
  const paragraphs = text.split(/\n+/).filter(Boolean);
  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SpreadBoard spread={spread} selected={cards} revealCount={cards.length} showMeanings locale={locale} />
        </div>
        <article className="pb-20">
          <p className="font-display text-[10px] uppercase tracking-[.4em] text-antiqueGold/60">Archived reading</p>
          <h2 className="mt-3 font-zhSerif text-3xl tracking-[.08em] text-moon">{locale === "en" ? "Saved reading" : "过去保存的解读"}</h2>
          {question && <p className="mt-8 border-l border-antiqueGold/35 pl-4 font-zhSerif text-sm leading-7 text-moon/55">{locale === "en" ? "You asked: " : "你问："}{question}</p>}
          {context && <p className="mt-4 border-l border-antiqueGold/15 pl-4 text-xs leading-6 text-moon/60">{locale === "en" ? "Context: " : "补充背景："}{context}</p>}
          <div className="reading-text mt-9 font-zhSerif text-[17px] leading-9 tracking-[.035em] text-moon/82 md:text-[18px]">
            {paragraphs.map((paragraph, index) => <p key={index}>{renderInlineMarkdown(paragraph)}</p>)}
          </div>
          <ReadingActions error={error} savedReading={savedReading} onRetry={onRetry} locale={locale} />
        </article>
      </div>
    </div>
  );
}

function ReadingRitualLoader({ cardCount, locale = "zh" }: { cardCount: number; locale?: Locale }) {
  const headline = locale === "en"
    ? "The reading is taking shape"
    : "解读正在成形";
  const caption = locale === "en"
    ? "The cards are being read. This can take up to a minute — the page can be left alone safely."
    : "牌面正在被细细阅读，最长可能需要一分钟——这段时间里，页面可以安心放着。";

  return (
    <section className="reading-loader py-14 text-center md:py-20" aria-live="polite">
      <div className="reading-moon-loader" aria-hidden="true">
        <div className="moon-core" />
        <div className="moon-orbit orbit-1"><span /></div>
        <div className="moon-orbit orbit-2"><span /></div>
      </div>

      <div className="ritual-copy-shell relative mx-auto mt-8 max-w-lg">
        <p className="ritual-copy font-zhSerif text-2xl tracking-[.08em] text-moon/82 md:text-[28px]">
          {headline}
        </p>
        <p className="ritual-caption">
          {caption}
        </p>
        <div className="ritual-progress" aria-hidden="true" />
      </div>
    </section>
  );
}

function StructuredReadingContent({ structured, locale = "zh" }: { structured: StructuredReading; locale?: Locale }) {
  return (
    <motion.div
      className="reading-manuscript"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: .11, delayChildren: .08 } },
      }}
    >
      {isStructuredReadingV3(structured) && (
        <motion.section
          className="reading-story-section"
          variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
          transition={{ duration: .65 }}
        >
          <p className="font-display text-[10px] uppercase tracking-[.4em] text-antiqueGold/60">What you are really asking</p>
          <h3 className="mt-3 font-zhSerif text-2xl tracking-[.08em] text-moon md:text-3xl">{locale === "en" ? "Where the question is stuck" : "问题真正卡住的地方"}</h3>
          <p className="mt-6 font-zhSerif text-[17px] leading-8 tracking-[.03em] text-moon/82 md:text-[18px] md:leading-9">
            {renderInlineMarkdown(structured.questionFocus)}
          </p>
        </motion.section>
      )}

      <motion.section
        className="reading-story-section"
        variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
        transition={{ duration: .65 }}
      >
        <p className="font-display text-[10px] uppercase tracking-[.4em] text-antiqueGold/60">Opening</p>
        <h3 className="mt-3 font-zhSerif text-2xl tracking-[.08em] text-moon md:text-3xl">{locale === "en" ? "First, the atmosphere of the spread" : "先看整组牌的气氛"}</h3>
        <p className="mt-6 font-zhSerif text-[17px] leading-8 tracking-[.03em] text-moon/82 md:text-[18px] md:leading-9">
          {renderInlineMarkdown(structured.opening)}
        </p>
      </motion.section>

      {structured.cards.map((section, index) => (
        <motion.section
          key={section.positionId}
          className="reading-story-section"
          variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
          transition={{ duration: .65 }}
        >
          <p className="text-[10px] uppercase tracking-[.24em] text-antiqueGold/60">
            {String(index + 1).padStart(2, "0")} · {section.positionTitle}
          </p>
          <p className="mt-6 font-zhSerif text-[17px] leading-8 tracking-[.03em] text-moon/82 md:text-[18px] md:leading-9">
            {renderInlineMarkdown(section.interpretation)}
          </p>
        </motion.section>
      ))}

      <motion.section
        className="reading-story-section"
        variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
        transition={{ duration: .65 }}
      >
        <p className="font-display text-[10px] uppercase tracking-[.4em] text-antiqueGold/60">Connections</p>
        <h3 className="mt-3 font-zhSerif text-2xl tracking-[.08em] text-moon md:text-3xl">{locale === "en" ? "Between the cards" : "牌与牌之间"}</h3>
        <p className="mt-6 font-zhSerif text-[17px] leading-8 tracking-[.03em] text-moon/82 md:text-[18px] md:leading-9">
          {renderInlineMarkdown(structured.connections)}
        </p>
      </motion.section>

      {isStructuredReadingV3(structured) && (
        <motion.section
          className="reading-story-section"
          variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
          transition={{ duration: .65 }}
        >
          <p className="font-display text-[10px] uppercase tracking-[.4em] text-antiqueGold/60">Reality checks</p>
          <h3 className="mt-3 font-zhSerif text-2xl tracking-[.08em] text-moon md:text-3xl">{locale === "en" ? "Bring it back to real life" : "回到现实里验证"}</h3>
          <ol className="mt-6 space-y-4">
            {structured.realityChecks.map((item, index) => (
              <li key={item} className="flex gap-4 font-zhSerif text-[17px] leading-8 tracking-[.03em] text-moon/82 md:text-[18px]">
                <span className="mt-1 font-display text-xs text-antiqueGold/62">0{index + 1}</span>
                <span>{renderInlineMarkdown(item)}</span>
              </li>
            ))}
          </ol>
        </motion.section>
      )}

      <motion.section
        className="reading-story-section reading-story-summary"
        variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
        transition={{ duration: .65 }}
      >
        <p className="font-display text-[10px] uppercase tracking-[.4em] text-antiqueGold/60">The whole reading</p>
        <h3 className="mt-3 font-zhSerif text-2xl tracking-[.08em] text-moon md:text-3xl">{locale === "en" ? "Finally, the whole story" : "最后，把牌放回完整的故事里"}</h3>
        <p className="mt-6 font-zhSerif text-[18px] leading-9 tracking-[.03em] text-moon/88 md:text-[19px]">
          {renderInlineMarkdown(structured.summary)}
        </p>
      </motion.section>
    </motion.div>
  );
}

export function ReadingPanel({
  spread,
  cards,
  question,
  context,
  reading,
  loading,
  error,
  savedReading,
  onRetry,
  locale = "zh",
}: Props) {
  const structured = useMemo<StructuredReading | null>(
    () => {
      const personalized = reading ? personalizeReadingContent(reading) : null;
      return isStructuredReading(personalized) ? personalized : null;
    },
    [reading]
  );

  if (typeof reading === "string") {
    return (
      <LegacyReading
        spread={spread}
        cards={cards}
        question={question}
        context={context}
        text={personalizeReadingContent(reading) as string}
        error={error}
        savedReading={savedReading}
        onRetry={onRetry}
        locale={locale}
      />
    );
  }

  return (
    <div className="reading-layout mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[minmax(420px,.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <aside>
          <div className="flex flex-col justify-center lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]">
            <div className="reading-spread-heading mb-4">
              <p className="font-display text-[10px] uppercase tracking-[.4em] text-antiqueGold/62">Your spread</p>
              <h2 className="mt-2 font-zhSerif text-2xl tracking-[.08em] text-moon">{locale === "en" ? spread.nameEn : spread.name}</h2>
            </div>
            <div className="reading-spread-stage">
              <SpreadBoard spread={spread} selected={cards} revealCount={cards.length} showMeanings locale={locale} />
            </div>
          </div>
        </aside>

        <article className="min-w-0 pb-24">
          {question && (
            <div className="mb-9 border-b border-antiqueGold/10 pb-8">
              <p className="font-display text-[10px] uppercase tracking-[.36em] text-antiqueGold/62">Your question</p>
              <p className="mt-4 font-zhSerif text-lg leading-8 tracking-[.05em] text-moon/70">{question}</p>
            </div>
          )}
          {context && (
            <details className="-mt-6 mb-8 border-b border-antiqueGold/10 pb-6 text-moon/60">
              <summary className="cursor-pointer text-[10px] uppercase tracking-[.22em] text-antiqueGold/62">{locale === "en" ? "View this reading's context" : "查看本次补充背景"}</summary>
              <p className="mt-4 text-sm leading-7">{context}</p>
            </details>
          )}

          <section className="reading-first-impression pb-10">
            <p className="font-display text-[10px] uppercase tracking-[.42em] text-antiqueGold/65">First impression</p>
            <h2 className="mt-3 font-zhSerif text-3xl tracking-[.08em] text-moon">{locale === "en" ? "First impression" : "牌面速读"}</h2>
            <p className="mt-4 max-w-2xl font-zhSerif text-[16px] leading-8 tracking-[.025em] text-moon/64 md:text-[17px]">{locale === "en" ? "Before the deeper reading, let each card say what it notices first." : "在更深的解读之前，先让每张牌说出它最先注意到的。"}</p>
            <div className="mt-8">
              {cards.map((selected, index) => {
                const card = tarotCardById.get(selected.cardId);
                const position = spread.positions[index];
                if (!card || !position) return null;
                const keywords = selected.orientation === "reversed"
                  ? locale === "en" ? card.reversedKeywordsEn : card.reversedKeywords
                  : locale === "en" ? card.uprightKeywordsEn : card.uprightKeywords;
                const meaning = selected.orientation === "reversed"
                  ? locale === "en" ? card.reversedMeaningEn : card.reversedMeaning
                  : locale === "en" ? card.uprightMeaningEn : card.uprightMeaning;
                return (
                  <div key={selected.positionId} className="reading-card-voice grid grid-cols-[2rem_minmax(0,1fr)] gap-3 py-5">
                    <span className="pt-1 font-display text-[10px] text-antiqueGold/62">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <p className="font-zhSerif text-xl text-moon">{locale === "en" ? card.name : card.nameZh}</p>
                        <span className="font-display text-xs text-moon/55">{card.name}</span>
                        <span className="text-[10px] tracking-[.16em] text-lavender/70">{selected.orientation === "reversed" ? locale === "en" ? "reversed" : "逆位" : locale === "en" ? "upright" : "正位"}</span>
                      </div>
                      <p className="mt-1 text-[10px] tracking-[.16em] text-antiqueGold/62">{locale === "en" ? position.title : position.titleZh} · {keywords.slice(0, 3).join(" · ")}</p>
                      <p className="mt-3 font-zhSerif text-[15px] leading-7 tracking-[.025em] text-moon/58">{meaning}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="reading-deeper-heading relative pt-12">
            <p className="font-display text-[10px] uppercase tracking-[.44em] text-antiqueGold/62">The deeper reading</p>
            <h2 className="mt-3 font-zhSerif text-3xl tracking-[.08em] text-moon">{locale === "en" ? "Deeper reading" : "占卜师综合解读"}</h2>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="reading-ritual" exit={{ opacity: 0, y: -12 }} transition={{ duration: .45 }}>
                <ReadingRitualLoader cardCount={cards.length} locale={locale} />
              </motion.div>
            ) : structured ? (
              <motion.div key="reading-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .45 }}>
                <StructuredReadingContent structured={structured} locale={locale} />
              </motion.div>
            ) : null}
          </AnimatePresence>

          {!loading && !structured && !error && (
            <p className="py-12 font-zhSerif text-lg text-moon/60">{locale === "en" ? "The meaning is still settling. Please try again in a moment." : "牌意仍在沉淀，请稍候再试。"}</p>
          )}

          {!loading && (
            <>
              <ReadingActions error={error} savedReading={savedReading} onRetry={onRetry} locale={locale} />
              <FollowupPanel savedReading={savedReading} locale={locale} />
              <div className="reading-closing-note mt-14">
                <p>
                  {locale === "en"
                    ? "This reading was written with the help of AI — a mirror for reflection, not a verdict."
                    : "这段解读由 AI 参与生成——它是一面镜子，不是判决。"}
                </p>
                <p>
                  {locale === "en"
                    ? "If tonight feels heavier than the cards can hold, please reach out to someone you trust."
                    : "如果今晚的重量超过了牌能承载的范围，请去找一个你信任的人。"}
                </p>
              </div>
            </>
          )}
        </article>
      </div>
    </div>
  );
}
