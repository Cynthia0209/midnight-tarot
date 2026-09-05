"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { TarotSpread } from "@/data/spreads";
import { tarotSpreads } from "@/data/spreads";
import type { Locale } from "@/lib/locale";

type Props = {
  selectedId?: string;
  onSelect: (spread: TarotSpread) => void;
  locale?: Locale;
};

const spreadCoverById: Record<string, string> = {
  single: "/cards/the-high-priestess.jpg",
  "three-card": "/cards/wheel-of-fortune.jpg",
  relationship: "/cards/the-lovers.jpg",
  career: "/cards/the-chariot.jpg",
  choice: "/cards/justice.jpg",
  "celtic-cross": "/cards/the-world.jpg",
};

export function SpreadGallery({ selectedId, onSelect, locale = "zh" }: Props) {
  return (
    <div className="spread-gallery mx-auto grid max-w-5xl grid-cols-1 gap-6 px-5 pb-12 pt-4 sm:grid-cols-2 lg:grid-cols-3">
      {tarotSpreads.map((spread, index) => {
        return (
          <button
            type="button"
            key={spread.id}
            onClick={() => onSelect(spread)}
            className={`spread-gallery-card group relative flex min-h-[452px] w-full flex-col overflow-hidden text-left ${selectedId === spread.id ? "is-active" : ""}`}
          >
            <div className="spread-gallery-art">
              <Image
                src={spreadCoverById[spread.id]}
                alt=""
                fill
                sizes="(max-width: 768px) 84vw, 354px"
                className="spread-gallery-image"
              />
              <div className="spread-gallery-veil" />
              <div className="spread-gallery-index">
                <span>0{index + 1} · {locale === "en" ? spread.categoryEn : spread.category}</span>
                <span>{locale === "en" ? `${spread.positions.length} ${spread.positions.length === 1 ? "card" : "cards"}` : `${spread.positions.length} 张牌`}</span>
              </div>
              <div className="spread-gallery-map" aria-hidden="true">
                <i className="spread-gallery-aura" />
                {spread.positions.map((position) => (
                  <i
                    key={position.id}
                    className="spread-mini-card"
                    style={{ left: `${position.x}%`, top: `${position.y}%`, "--r": `${position.rotation ?? 0}deg` } as React.CSSProperties}
                  />
                ))}
              </div>
            </div>
            <div className="spread-gallery-copy">
              <p className="spread-gallery-name-en">{spread.nameEn}</p>
              <h3>{locale === "en" ? spread.nameEn : spread.name}</h3>
              <p className="spread-gallery-description">{locale === "en" ? spread.descriptionEn : spread.description}</p>
              <div className="spread-gallery-foot">
                <span>{locale === "en" ? spread.difficultyEn : spread.difficulty}</span>
                <span className="spread-gallery-action">
                  {locale === "en" ? "Choose spread" : "选择牌阵"}
                  <i aria-hidden="true"><ArrowRight size={13} strokeWidth={1.35} /></i>
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
