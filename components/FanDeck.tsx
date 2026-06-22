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
  const visibleDeck = deck.slice(0, 36);
  const selectedIds = new Set(selected.map((item) => item.cardId));

  useGSAP(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.fromTo(
      ".fan-card",
      { opacity: 0, y: reduced ? 10 : 90, rotation: 0 },
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
        aria-label="塔罗牌组"
      >
        <div className="relative h-full min-w-[1840px] md:min-w-0">
          {visibleDeck.map((item, index) => {
            const progress = index / (visibleDeck.length - 1);
            const angle = -30 + progress * 60;
            const xDesktop = 50 + (progress - .5) * 82;
            const yDesktop = 29 + Math.abs(progress - .5) * 34;
            const xMobile = 90 + index * 46;
            const card = tarotCardById.get(item.cardId);
            const isSelected = selectedIds.has(item.cardId);
            if (!card) return null;
            return (
              <div
                key={item.cardId}
                className={`fan-card absolute ${isSelected ? "pointer-events-none opacity-0" : ""}`}
                style={{
                  left: `var(--fan-left-mobile, ${xMobile}px)`,
                  top: "32px",
                  zIndex: index,
                  "--fan-left-desktop": `${xDesktop}%`,
                  "--fan-top-desktop": `${yDesktop}%`,
                  "--fan-angle": `${angle * .55}deg`,
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
      <p className="mt-1 text-center text-[11px] tracking-[.22em] text-moon/35 md:hidden">左右滑动牌组 · 触碰直觉最先停留的牌</p>
    </div>
  );
}
