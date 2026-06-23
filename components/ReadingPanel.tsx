"use client";

import { useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { AnimatePresence, motion } from "framer-motion";
import type { TarotSpread } from "@/data/spreads";
import { tarotCardById } from "@/data/tarotCards";
import type {
  ReadingContent,
  SavedReading,
  SelectedReadingCard,
  StructuredReading,
} from "@/lib/reading";
import { isStructuredReading, isStructuredReadingV3 } from "@/lib/reading";
import { shareReading } from "@/lib/share";
import { SpreadBoard } from "@/components/SpreadBoard";

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
  context,
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
          {context && <p className="mt-4 border-l border-antiqueGold/15 pl-4 text-xs leading-6 text-moon/38">补充背景：{context}</p>}
          <div className="reading-text mt-9 font-zhSerif text-[17px] leading-9 tracking-[.035em] text-moon/82 md:text-[18px]">
            {paragraphs.map((paragraph, index) => <p key={index}>{renderInlineMarkdown(paragraph)}</p>)}
          </div>
          <ReadingActions error={error} savedReading={savedReading} onRetry={onRetry} />
        </article>
      </div>
    </div>
  );
}

function ReadingRitualLoader({ cardCount }: { cardCount: number }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      gsap.set(".ritual-copy", { opacity: 1 });
      return;
    }

    gsap.set(".ritual-thread", { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set(".ritual-node", { scale: 0, transformOrigin: "center" });
    gsap.set(".ritual-copy", { autoAlpha: 0, y: 8 });

    const timeline = gsap.timeline({ repeat: -1, repeatDelay: .35 });
    timeline
      .to(".ritual-node", {
        scale: 1,
        stagger: .16,
        duration: .75,
        ease: "back.out(2)",
      })
      .to(".ritual-thread", {
        strokeDashoffset: 0,
        stagger: .12,
        duration: 1.2,
        ease: "power2.inOut",
      }, "<.15")
      .to(".ritual-orbit", {
        rotation: 360,
        transformOrigin: "50% 50%",
        duration: 8,
        ease: "none",
      }, 0)
      .to(".ritual-copy", {
        autoAlpha: 1,
        y: 0,
        stagger: 1.65,
        duration: .55,
        ease: "power2.out",
      }, .35)
      .to(".ritual-copy", {
        autoAlpha: 0,
        y: -8,
        stagger: 1.65,
        duration: .45,
        ease: "power2.in",
      }, 1.55);

    gsap.to(".ritual-glow", {
      opacity: .72,
      scale: 1.14,
      repeat: -1,
      yoyo: true,
      duration: 2.6,
      ease: "sine.inOut",
    });
  }, { scope });

  return (
    <section ref={scope} className="relative overflow-hidden py-16 text-center md:py-20" aria-live="polite">
      <div className="ritual-glow pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(124,76,145,.2),transparent_68%)] opacity-40 blur-xl" />
      <div className="relative mx-auto h-56 w-56 md:h-64 md:w-64">
        <svg viewBox="0 0 260 260" className="h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id="ritual-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#d8bf88" stopOpacity=".08" />
              <stop offset=".5" stopColor="#d8bf88" stopOpacity=".72" />
              <stop offset="1" stopColor="#a783b8" stopOpacity=".16" />
            </linearGradient>
          </defs>
          <circle cx="130" cy="130" r="94" fill="none" stroke="rgba(216,191,136,.1)" />
          <circle cx="130" cy="130" r="65" fill="none" stroke="rgba(184,151,199,.08)" />
          <g className="ritual-orbit">
            <circle cx="130" cy="36" r="2.5" fill="#d8bf88" opacity=".85" />
            <circle cx="224" cy="130" r="1.4" fill="#b89ac7" opacity=".65" />
            <circle cx="64" cy="197" r="1.8" fill="#d8bf88" opacity=".45" />
          </g>
          <path className="ritual-thread" pathLength="1" d="M130 65 L190 111 L167 181 L93 181 L70 111 Z" fill="none" stroke="url(#ritual-gold)" strokeWidth="1" />
          <path className="ritual-thread" pathLength="1" d="M130 65 L167 181 M190 111 L93 181 M70 111 L190 111" fill="none" stroke="url(#ritual-gold)" strokeWidth=".75" />
          {[[130, 65], [190, 111], [167, 181], [93, 181], [70, 111]].map(([cx, cy], index) => (
            <g key={index} className="ritual-node">
              <circle cx={cx} cy={cy} r="9" fill="#100a17" stroke="rgba(216,191,136,.42)" />
              <circle cx={cx} cy={cy} r="2.2" fill="#d8bf88" />
            </g>
          ))}
          <path d="M130 113 l4.5 12 12 4.5-12 4.5-4.5 12-4.5-12-12-4.5 12-4.5z" fill="#d8bf88" opacity=".82" />
        </svg>
      </div>

      <div className="relative mx-auto -mt-2 h-20 max-w-lg">
        {[
          "正在感应你的问题",
          `正在聆听 ${cardCount} 张牌之间的呼应`,
          "正在将牌意放回你的现实处境",
        ].map((label) => (
          <p key={label} className="ritual-copy absolute inset-x-0 top-0 font-zhSerif text-xl tracking-[.12em] text-moon/78 md:text-2xl">
            {label}
          </p>
        ))}
        <p className="absolute inset-x-0 top-11 font-display text-[9px] uppercase tracking-[.48em] text-antiqueGold/45">
          The reading is taking shape
        </p>
      </div>
    </section>
  );
}

function StructuredReadingContent({ structured }: { structured: StructuredReading }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: .11, delayChildren: .08 } },
      }}
    >
      {isStructuredReadingV3(structured) && (
        <motion.section
          className="reading-story-section border-b border-antiqueGold/10"
          variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
          transition={{ duration: .65 }}
        >
          <p className="font-display text-[10px] uppercase tracking-[.4em] text-antiqueGold/60">What you are really asking</p>
          <h3 className="mt-3 font-zhSerif text-2xl tracking-[.08em] text-moon md:text-3xl">问题真正卡住的地方</h3>
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
        <h3 className="mt-3 font-zhSerif text-2xl tracking-[.08em] text-moon md:text-3xl">先看整组牌的气氛</h3>
        <p className="mt-6 font-zhSerif text-[17px] leading-8 tracking-[.03em] text-moon/82 md:text-[18px] md:leading-9">
          {renderInlineMarkdown(structured.opening)}
        </p>
      </motion.section>

      {structured.cards.map((section, index) => (
        <motion.section
          key={section.positionId}
          className="reading-story-section border-t border-antiqueGold/10"
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
        className="reading-story-section border-t border-antiqueGold/10"
        variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
        transition={{ duration: .65 }}
      >
        <p className="font-display text-[10px] uppercase tracking-[.4em] text-antiqueGold/60">Connections</p>
        <h3 className="mt-3 font-zhSerif text-2xl tracking-[.08em] text-moon md:text-3xl">牌与牌之间</h3>
        <p className="mt-6 font-zhSerif text-[17px] leading-8 tracking-[.03em] text-moon/82 md:text-[18px] md:leading-9">
          {renderInlineMarkdown(structured.connections)}
        </p>
      </motion.section>

      {isStructuredReadingV3(structured) && (
        <motion.section
          className="reading-story-section border-t border-antiqueGold/10"
          variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
          transition={{ duration: .65 }}
        >
          <p className="font-display text-[10px] uppercase tracking-[.4em] text-antiqueGold/60">Reality checks</p>
          <h3 className="mt-3 font-zhSerif text-2xl tracking-[.08em] text-moon md:text-3xl">回到现实里验证</h3>
          <ol className="mt-6 space-y-4">
            {structured.realityChecks.map((item, index) => (
              <li key={item} className="flex gap-4 font-zhSerif text-[17px] leading-8 tracking-[.03em] text-moon/82 md:text-[18px]">
                <span className="mt-1 font-display text-xs text-antiqueGold/55">0{index + 1}</span>
                <span>{renderInlineMarkdown(item)}</span>
              </li>
            ))}
          </ol>
        </motion.section>
      )}

      <motion.section
        className="reading-story-section border-t border-antiqueGold/10"
        variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
        transition={{ duration: .65 }}
      >
        <p className="font-display text-[10px] uppercase tracking-[.4em] text-antiqueGold/60">The whole reading</p>
        <h3 className="mt-3 font-zhSerif text-2xl tracking-[.08em] text-moon md:text-3xl">最后，把牌放回完整的故事里</h3>
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
}: Props) {
  const structured = useMemo<StructuredReading | null>(
    () => isStructuredReading(reading) ? reading : null,
    [reading]
  );

  if (typeof reading === "string") {
    return (
      <LegacyReading
        spread={spread}
        cards={cards}
        question={question}
        context={context}
        text={reading}
        error={error}
        savedReading={savedReading}
        onRetry={onRetry}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="grid gap-12 lg:grid-cols-[minmax(420px,.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <aside>
          <div className="flex flex-col justify-center lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]">
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
          {question && (
            <div className="mb-9 border-b border-antiqueGold/10 pb-8">
              <p className="font-display text-[10px] uppercase tracking-[.36em] text-antiqueGold/55">Your question</p>
              <p className="mt-4 font-zhSerif text-lg leading-8 tracking-[.05em] text-moon/70">{question}</p>
            </div>
          )}
          {context && (
            <details className="-mt-6 mb-8 border-b border-antiqueGold/10 pb-6 text-moon/40">
              <summary className="cursor-pointer text-[10px] uppercase tracking-[.22em] text-antiqueGold/45">查看本次补充背景</summary>
              <p className="mt-4 text-sm leading-7">{context}</p>
            </details>
          )}

          <section className="pb-10">
            <p className="font-display text-[10px] uppercase tracking-[.42em] text-antiqueGold/58">First impression</p>
            <h2 className="mt-3 font-zhSerif text-3xl tracking-[.08em] text-moon">牌面速读</h2>
            <p className="mt-3 text-sm leading-7 text-moon/38">先看每张牌最直接的声音，完整解读会在下方慢慢成形。</p>
            <div className="mt-8">
              {cards.map((selected, index) => {
                const card = tarotCardById.get(selected.cardId);
                const position = spread.positions[index];
                if (!card || !position) return null;
                const keywords = selected.orientation === "reversed" ? card.reversedKeywords : card.uprightKeywords;
                const meaning = selected.orientation === "reversed" ? card.reversedMeaning : card.uprightMeaning;
                return (
                  <div key={selected.positionId} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 border-t border-antiqueGold/10 py-5 first:border-t-0">
                    <span className="pt-1 font-display text-[10px] text-antiqueGold/45">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <p className="font-zhSerif text-xl text-moon">{card.nameZh}</p>
                        <span className="font-display text-xs text-moon/30">{card.name}</span>
                        <span className="text-[10px] tracking-[.16em] text-lavender/50">{selected.orientation === "reversed" ? "逆位" : "正位"}</span>
                      </div>
                      <p className="mt-1 text-[10px] tracking-[.16em] text-antiqueGold/55">{position.titleZh} · {keywords.slice(0, 3).join(" · ")}</p>
                      <p className="mt-3 font-zhSerif text-[15px] leading-7 tracking-[.025em] text-moon/58">{meaning}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="relative border-t border-antiqueGold/15 pt-12">
            <div className="absolute left-0 top-0 h-px w-24 bg-gradient-to-r from-antiqueGold/70 to-transparent" />
            <p className="font-display text-[10px] uppercase tracking-[.44em] text-antiqueGold/62">The deeper reading</p>
            <h2 className="mt-3 font-zhSerif text-3xl tracking-[.08em] text-moon">占卜师综合解读</h2>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="reading-ritual" exit={{ opacity: 0, y: -12 }} transition={{ duration: .45 }}>
                <ReadingRitualLoader cardCount={cards.length} />
              </motion.div>
            ) : structured ? (
              <motion.div key="reading-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .45 }}>
                <StructuredReadingContent structured={structured} />
              </motion.div>
            ) : null}
          </AnimatePresence>

          {!loading && !structured && !error && (
            <p className="py-12 font-zhSerif text-lg text-moon/45">牌意仍在沉淀，请稍候再试。</p>
          )}

          {!loading && (
            <ReadingActions error={error} savedReading={savedReading} onRetry={onRetry} />
          )}
        </article>
      </div>
    </div>
  );
}
