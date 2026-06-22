"use client";

import type { TarotSpread } from "@/data/spreads";
import { tarotCardById } from "@/data/tarotCards";
import type { SelectedReadingCard } from "@/lib/reading";
import { TarotCardView } from "@/components/TarotCardView";

type Props = {
  spread: TarotSpread;
  selected: SelectedReadingCard[];
  revealCount: number;
  showMeanings?: boolean;
};

export function SpreadBoard({
  spread,
  selected,
  revealCount,
  showMeanings = false,
}: Props) {
  const tall = spread.positions.length >= 10;
  return (
    <div className={`relative mx-auto w-full max-w-[760px] ${tall ? "h-[610px] sm:h-[690px]" : spread.positions.length >= 5 ? "h-[500px] sm:h-[590px]" : "h-[300px] sm:h-[380px]"}`}>
      {spread.positions.map((position, index) => {
        const item = selected[index];
        const card = item ? tarotCardById.get(item.cardId) : undefined;
        return (
          <div
            key={position.id}
            className="spread-slot flex flex-col items-center"
            style={{
              left: `${position.mobileX ?? position.x}%`,
              top: `${position.mobileY ?? position.y}%`,
              "--slot-r": `${position.mobileRotation ?? position.rotation ?? 0}deg`,
              "--desktop-x": `${position.x}%`,
              "--desktop-y": `${position.y}%`,
              "--desktop-r": `${position.rotation ?? 0}deg`,
              zIndex: index + 1,
            } as React.CSSProperties}
          >
            <div>
              {item && card ? (
                <TarotCardView
                  card={card}
                  orientation={item.orientation}
                  revealed={index < revealCount}
                  selected
                  disabled
                  compact={spread.positions.length >= 5}
                  flipId={`card-${item.cardId}`}
                />
              ) : (
                <div className={`${spread.positions.length >= 5 ? "w-[78px] sm:w-[92px] md:w-[108px]" : "w-[112px] sm:w-[126px] md:w-[142px]"} aspect-[.57] rounded-[12px] border border-dashed border-antiqueGold/25 bg-white/[.015]`} />
              )}
            </div>
            <div className="spread-slot-label mt-2 w-28 text-center">
              <p className="font-zhSerif text-[11px] tracking-[.08em] text-antiqueGold/85">{position.titleZh}</p>
              {showMeanings && index < revealCount && card && (
                <p className="mt-1 hidden text-[9px] leading-4 text-moon/45 sm:block">
                  {item.orientation === "reversed" ? card.reversedKeywords.slice(0, 2).join(" · ") : card.uprightKeywords.slice(0, 2).join(" · ")}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
