"use client";

import Image from "next/image";
import { forwardRef } from "react";
import type { CSSProperties, MouseEvent } from "react";
import type { CardOrientation, TarotCard } from "@/data/tarotCards";
import { cx } from "@/lib/utils";
import type { Locale } from "@/lib/locale";

type Props = {
  card?: TarotCard;
  revealed?: boolean;
  orientation?: CardOrientation;
  selected?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  style?: CSSProperties;
  flipId?: string;
  tabIndex?: number;
  locale?: Locale;
};

export const TarotCardView = forwardRef<HTMLButtonElement, Props>(function TarotCardView({
  card,
  revealed = false,
  orientation = "upright",
  selected = false,
  disabled = false,
  compact = false,
  onClick,
  className,
  style,
  flipId,
  tabIndex,
  locale = "zh",
}, ref) {
  const cardLabel = revealed && card
    ? locale === "en"
      ? `${card.name} ${orientation}`
      : `${card.nameZh} ${orientation === "reversed" ? "逆位" : "正位"}`
    : locale === "en" ? "Unrevealed tarot card" : "未揭示的塔罗牌";

  return (
    <button
      ref={ref}
      type="button"
      aria-label={cardLabel}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      style={style}
      data-flip-id={flipId}
      tabIndex={tabIndex}
      className={cx(
        "tarot-card group relative aspect-[0.57] shrink-0 rounded-[12px] outline-none md:rounded-[16px]",
        compact ? "w-[78px] sm:w-[92px] md:w-[108px]" : "w-[112px] sm:w-[126px] md:w-[142px]",
        disabled ? "cursor-default" : "cursor-pointer focus-visible:ring-2 focus-visible:ring-antiqueGold",
        selected && "is-selected",
        revealed && "is-revealed",
        className
      )}
    >
      <span className="card-3d absolute inset-0">
        <span className="card-face card-cover absolute inset-0 overflow-hidden rounded-[inherit] bg-[#10091a] shadow-[0_18px_40px_rgba(0,0,0,.55)]">
          <Image src="/card-back.png" alt="" fill sizes="(max-width: 640px) 112px, 142px" className="object-fill" priority={selected} />
          <span className="card-cover-sheen absolute inset-0" />
        </span>

        <span
          aria-hidden={!revealed}
          className="card-face card-art absolute inset-0 overflow-hidden rounded-[inherit] border border-antiqueGold/60 bg-[#e5d8bf] shadow-[0_18px_45px_rgba(0,0,0,.62)]"
          style={{ "--card-orientation": orientation === "reversed" ? "180deg" : "0deg" } as CSSProperties}
        >
          {card && (
            <>
              <span className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_35%,#3b2149,#17101d_72%)] p-3 text-center">
                <span className="text-2xl text-antiqueGold/75">✦</span>
                <span className="mt-3 font-zhSerif text-sm tracking-[.12em] text-moon/85">{locale === "en" ? card.name : card.nameZh}</span>
                <span className="mt-1 font-display text-[8px] uppercase tracking-[.12em] text-antiqueGold/62">{card.name}</span>
              </span>
              {revealed && (
                <Image
                  src={card.imagePath}
                  alt={locale === "en" ? card.name : `${card.nameZh} ${card.name}`}
                  fill
                  sizes="(max-width: 640px) 112px, 142px"
                  className="card-image object-cover"
                  priority={selected}
                  onError={(event) => { event.currentTarget.style.display = "none"; }}
                />
              )}
              <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,10,35,.10),transparent_48%,rgba(15,7,24,.30))] mix-blend-multiply" />
              <span className="absolute inset-[5px] rounded-[8px] border border-[#3a203f]/40" />
            </>
          )}
        </span>
      </span>
    </button>
  );
});
