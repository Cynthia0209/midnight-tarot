"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { TarotCardView } from "@/components/TarotCardView";
import { playRitualSound } from "@/lib/sound";

gsap.registerPlugin(useGSAP);

export function ShuffleTable({ muted, onComplete }: { muted: boolean; onComplete: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const completed = useRef(false);

  useEffect(() => {
    playRitualSound("shuffle", muted);
  }, [muted]);

  useGSAP(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cards = gsap.utils.toArray<HTMLElement>(".shuffle-card");
    if (reduced) {
      gsap.set(cards, { opacity: 1, x: 0, y: 0, rotation: 0 });
      window.setTimeout(onComplete, 650);
      return;
    }
    const timeline = gsap.timeline({
      onComplete: () => {
        if (!completed.current) {
          completed.current = true;
          window.setTimeout(onComplete, 500);
        }
      },
    });
    timeline
      .fromTo(cards, { opacity: 0, y: -70, rotation: (index) => index * 3 - 12 }, { opacity: 1, y: 0, rotation: 0, duration: .8, stagger: .045, ease: "power3.out" })
      .to(cards.filter((_, index) => index % 2 === 0), { x: -115, rotation: -7, duration: .55, ease: "power2.inOut" })
      .to(cards.filter((_, index) => index % 2 === 1), { x: 115, rotation: 7, duration: .55, ease: "power2.inOut" }, "<")
      .to(cards, { x: 0, rotation: 0, duration: .7, stagger: { each: .025, from: "edges" }, ease: "back.out(1.5)" })
      .to(cards, { y: (index) => (index % 3 - 1) * 7, x: (index) => (index % 2 ? 52 : -52), duration: .42, stagger: .025 })
      .to(cards, { y: 0, x: 0, duration: .65, stagger: { each: .02, from: "random" }, ease: "power3.inOut" })
      .to(cards, { boxShadow: "0 0 42px rgba(216,191,136,.22)", duration: .7, yoyo: true, repeat: 1 });
  }, { scope: root });

  return (
    <div ref={root} className="relative mx-auto flex h-[360px] w-full max-w-xl items-center justify-center" aria-label="正在洗牌">
      {Array.from({ length: 12 }, (_, index) => (
        <div key={index} className="shuffle-card absolute" style={{ zIndex: index }}>
          <TarotCardView disabled compact style={{ transform: `translate(${index * .45}px, ${-index * .35}px)` }} />
        </div>
      ))}
      <div className="absolute bottom-3 text-center">
        <p className="font-display text-xs uppercase tracking-[.42em] text-antiqueGold/70">The deck remembers</p>
        <p className="mt-3 font-zhSerif text-sm tracking-[.2em] text-moon/50">牌序正在为这一次提问固定下来</p>
      </div>
    </div>
  );
}
