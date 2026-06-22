"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import type { DeckCard, SelectedReadingCard } from "@/lib/reading";
import { tarotCardById } from "@/data/tarotCards";
import { TarotCardView } from "@/components/TarotCardView";

gsap.registerPlugin(useGSAP);

type Props = {
  deck: DeckCard[];
  selected: SelectedReadingCard[];
  locked: boolean;
  onSelect: (item: DeckCard, element: HTMLButtonElement) => void;
};

export function FanDeck({ deck, selected, locked, onSelect }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const visibleDeck = deck;
  const mobileDeckWidth = 180 + Math.max(0, visibleDeck.length - 1) * 46;
  const selectedIds = new Set(selected.map((item) => item.cardId));

  useGSAP(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.fromTo(
      ".fan-card",
      { opacity: 0, y: reduced ? 10 : 90 },
      { opacity: 1, y: 0, duration: reduced ? .2 : 1.1, stagger: .018, ease: "power3.out" }
    );
  }, { scope: root });

  useEffect(() => {
    const container = root.current;
    if (!container || window.innerWidth >= 768) return;
    container.scrollLeft = Math.max(0, (container.scrollWidth - container.clientWidth) / 2);
  }, []);

  return (
    <div className="relative">
      <div
        ref={root}
        className="fan-scroll relative mx-auto h-[330px] w-full overflow-x-auto overflow-y-visible md:h-[390px] md:max-w-[1120px] md:overflow-visible"
        role="listbox"
        aria-label={`完整塔罗牌组，共 ${visibleDeck.length} 张`}
      >
        <div
          className="fan-deck-track relative h-full"
          style={{ minWidth: `${mobileDeckWidth}px` }}
        >
          {visibleDeck.map((item, index) => {
            const progress = visibleDeck.length <= 1 ? 0.5 : index / (visibleDeck.length - 1);
            const angle = -58 + progress * 116;
            const angleInRadians = angle * Math.PI / 180;
            const xDesktop = 50 + Math.sin(angleInRadians) * 47;
            const yDesktop = 32 + (1 - Math.cos(angleInRadians)) * 46;
            const xMobile = 90 + index * 46;
            const yMobile = 30 + (1 - Math.cos(angleInRadians)) * 76;
            const card = tarotCardById.get(item.cardId);
            const isSelected = selectedIds.has(item.cardId);
            if (!card) return null;
            return (
              <div
                key={item.cardId}
                className={`fan-card absolute ${isSelected ? "pointer-events-none opacity-0" : ""}`}
                style={{
                  left: `var(--fan-left-mobile, ${xMobile}px)`,
                  top: `${yMobile}px`,
                  zIndex: index,
                  "--fan-left-desktop": `${xDesktop}%`,
                  "--fan-top-desktop": `${yDesktop}%`,
                  "--fan-angle": `${angle * .72}deg`,
                } as React.CSSProperties}
                onMouseEnter={(event) => !locked && gsap.to(event.currentTarget, { y: -24, duration: .28, ease: "power2.out" })}
                onMouseLeave={(event) => gsap.to(event.currentTarget, { y: 0, duration: .35, ease: "power2.out" })}
              >
                <TarotCardView
                  card={card}
                  disabled={locked || isSelected}
                  compact
                  flipId={`card-${item.cardId}`}
                  onClick={(event) => onSelect(item, event.currentTarget)}
                />
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-1 text-center text-[11px] tracking-[.18em] text-moon/35 md:hidden">
        完整 {visibleDeck.length} 张牌 · 左右滑动牌组
      </p>
    </div>
  );
}
