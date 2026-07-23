"use client";

import type { TarotSpread } from "@/data/spreads";
import { tarotSpreads } from "@/data/spreads";
import type { Locale } from "@/lib/locale";

type Props = {
  selectedId?: string;
  onSelect: (spread: TarotSpread) => void;
  locale?: Locale;
};

export function SpreadGallery({ selectedId, onSelect, locale = "zh" }: Props) {
  return (
    <div className="fan-scroll -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(1.25rem,calc((100vw-1120px)/2))] pb-8 pt-3">
      {tarotSpreads.map((spread, index) => (
        <button
          type="button"
          key={spread.id}
          onClick={() => onSelect(spread)}
          className={`ritual-panel group relative min-h-[390px] w-[min(82vw,330px)] shrink-0 snap-center overflow-hidden rounded-[28px] p-6 text-left transition duration-500 hover:-translate-y-2 hover:border-antiqueGold/40 ${selectedId === spread.id ? "border-antiqueGold/65 shadow-[0_0_50px_rgba(216,191,136,.12)]" : ""}`}
        >
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[.28em] text-antiqueGold/65">
            <span>0{index + 1} · {locale === "en" ? spread.categoryEn : spread.category}</span>
            <span>{locale === "en" ? `${spread.positions.length} ${spread.positions.length === 1 ? "card" : "cards"}` : `${spread.positions.length} 张牌`}</span>
          </div>
          <div className="relative mx-auto my-7 h-40 w-full max-w-[240px] rounded-full border border-antiqueGold/[.08] bg-[radial-gradient(circle,rgba(103,60,125,.18),transparent_66%)]">
            {spread.positions.map((position) => (
              <i
                key={position.id}
                className="spread-mini-card"
                style={{ left: `${position.x}%`, top: `${position.y}%`, "--r": `${position.rotation ?? 0}deg` } as React.CSSProperties}
              />
            ))}
          </div>
          <p className="font-display text-[11px] uppercase tracking-[.3em] text-lavender/65">{spread.nameEn}</p>
          <h3 className="mt-2 font-zhSerif text-3xl tracking-[.08em] text-moon">{locale === "en" ? spread.nameEn : spread.name}</h3>
          <p className="mt-4 font-zhSerif text-sm leading-7 text-moon/58">{locale === "en" ? spread.descriptionEn : spread.description}</p>
          <div className="mt-6 flex items-center justify-between border-t border-white/[.06] pt-4 text-xs text-moon/45">
            <span>{locale === "en" ? spread.difficultyEn : spread.difficulty}</span>
            <span className="text-antiqueGold transition group-hover:translate-x-1">{locale === "en" ? "Choose spread" : "选择牌阵"} →</span>
          </div>
        </button>
      ))}
    </div>
  );
}
