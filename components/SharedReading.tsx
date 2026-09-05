"use client";

import { useEffect, useState } from "react";
import { anonymousFetch } from "@/lib/supabaseClient";
import { tarotCardById } from "@/data/tarotCards";
import { spreadById } from "@/data/spreads";
import {
  isStructuredReading,
  type ReadingContent,
  type SavedReading,
  type SelectedReadingCard,
} from "@/lib/reading";
import type { Locale } from "@/lib/locale";
import { buildReadingMarkdown, downloadText } from "@/lib/readingExport";
import { ReadingPanel } from "@/components/ReadingPanel";

type PublicReading = {
  id: string;
  spreadId: string;
  cards: SelectedReadingCard[];
  reading: ReadingContent;
  locale: Locale;
  createdAt: string;
};

type OwnerReading = PublicReading & { question?: string; context?: string | null };

function CardLine({ card, locale }: { card: SelectedReadingCard; locale: Locale }) {
  const meta = tarotCardById.get(card.cardId);
  const name = locale === "en" ? meta?.name ?? `Card ${card.cardId}` : meta?.nameZh ?? `第 ${card.cardId} 张`;
  const orientation = card.orientation === "reversed" ? (locale === "en" ? "reversed" : "逆位") : locale === "en" ? "upright" : "正位";
  return (
    <p className="font-zhSerif text-sm leading-7 text-moon/80">
      <span className="text-antiqueGold/75">{name}</span>
      <span className="text-moon/45"> · {orientation}</span>
    </p>
  );
}

function ReadingBody({ reading, showFocus, locale }: { reading: ReadingContent; showFocus: boolean; locale: Locale }) {
  if (typeof reading === "string") {
    return (
      <div className="space-y-4 whitespace-pre-line font-zhSerif text-[15px] leading-8 tracking-[.02em] text-moon/82">
        {reading.split("\n\n").map((block, index) => (
          <p key={index}>{block}</p>
        ))}
      </div>
    );
  }
  const structured = isStructuredReading(reading) ? reading : null;
  if (!structured) return null;
  const isV3 = structured.version === 3;
  return (
    <div className="space-y-7">
      {showFocus && isV3 && "questionFocus" in structured && (
        <p className="whitespace-pre-line font-zhSerif text-[15px] leading-8 tracking-[.02em] text-moon/82">{structured.questionFocus}</p>
      )}
      <p className="whitespace-pre-line font-zhSerif text-[15px] leading-8 tracking-[.02em] text-moon/82">{structured.opening}</p>
      <div className="space-y-5">
        {structured.cards.map((card) => (
          <div key={card.positionId}>
            <p className="text-[10px] uppercase tracking-[.34em] text-antiqueGold/60">{card.positionTitle}</p>
            <p className="mt-1 whitespace-pre-line font-zhSerif text-[15px] leading-8 tracking-[.02em] text-moon/82">{card.interpretation}</p>
          </div>
        ))}
      </div>
      <p className="whitespace-pre-line font-zhSerif text-[15px] leading-8 tracking-[.02em] text-moon/82">{structured.connections}</p>
      {isV3 && "realityChecks" in structured && (
        <div className="rounded-2xl border border-white/[.06] p-5">
          <p className="text-[10px] uppercase tracking-[.34em] text-antiqueGold/60">{locale === "en" ? "Reality check" : "现实观察"}</p>
          <ul className="mt-2 space-y-1.5 font-zhSerif text-sm leading-7 text-moon/72">
            {structured.realityChecks.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="whitespace-pre-line font-zhSerif text-[15px] leading-8 tracking-[.02em] text-moon/82">{structured.summary}</p>
    </div>
  );
}

export function SharedReading({
  readingId,
  publicReading,
  spreadName,
  locale,
}: {
  readingId: string;
  publicReading: PublicReading;
  spreadName?: string;
  locale: Locale;
}) {
  const [ownerReading, setOwnerReading] = useState<OwnerReading | null>(null);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [removed, setRemoved] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await anonymousFetch(`/api/readings/${readingId}`);
        if (!response.ok) {
          if (active) setIsOwner(false);
          return;
        }
        const data = (await response.json()) as { owner: boolean; reading: OwnerReading };
        if (!active) return;
        setIsOwner(data.owner);
        if (data.owner) setOwnerReading(data.reading);
      } catch {
        if (active) setIsOwner(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [readingId]);

  const savedOwnerReading: SavedReading | undefined = ownerReading
    ? {
        id: ownerReading.id,
        spreadId: ownerReading.spreadId,
        question: ownerReading.question ?? "",
        context: ownerReading.context ?? undefined,
        locale: ownerReading.locale,
        cards: ownerReading.cards,
        reading: ownerReading.reading,
        createdAt: ownerReading.createdAt,
      }
    : undefined;

  const handleDelete = async () => {
    try {
      const response = await anonymousFetch(`/api/readings/${readingId}`, { method: "DELETE" });
      if (response.ok) setRemoved(true);
    } catch {
      // Deletion failed; the reading stays.
    }
  };

  const handleExportMarkdown = () => {
    if (!ownerReading) return;
    const saved: SavedReading = {
      id: ownerReading.id,
      spreadId: ownerReading.spreadId,
      question: ownerReading.question ?? "",
      context: ownerReading.context ?? undefined,
      locale: ownerReading.locale,
      cards: ownerReading.cards,
      reading: ownerReading.reading,
      createdAt: ownerReading.createdAt,
    };
    downloadText(`midnight-tarot-${ownerReading.spreadId}-${ownerReading.createdAt.slice(0, 10)}.md`, buildReadingMarkdown(saved));
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2400);
    } catch {
      // Clipboard unavailable; the address bar shows the link.
    }
  };

  if (removed) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <p className="font-zhSerif text-2xl tracking-[.1em] text-moon/85">{locale === "en" ? "This reading has left." : "这段解读已经离开。"}</p>
        <p className="mt-4 text-sm leading-7 text-moon/55">{locale === "en" ? "The link no longer opens. What it held returns to the quiet." : "链接已无法打开。它曾承载的，回到安静里。"}</p>
      </div>
    );
  }

  if (isOwner === null) {
    return (
      <div className="mx-auto flex min-h-[68vh] max-w-xl items-center justify-center px-6 py-24 text-center" aria-live="polite">
        <div>
          <div className="reading-loader-deck" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="mt-7 font-zhSerif text-lg tracking-[.12em] text-moon/68">
            {locale === "en" ? "Returning to your reading" : "正在回到你的解读"}
          </p>
        </div>
      </div>
    );
  }

  const ownerSpread = ownerReading ? spreadById.get(ownerReading.spreadId) : undefined;

  if (isOwner && ownerReading && savedOwnerReading && ownerSpread) {
    return (
      <div className="owner-reading-return mx-auto max-w-[1320px] px-5 py-12 md:px-8 md:py-16">
        <header className="mb-10 text-center md:mb-14">
          <p className="font-display text-[10px] uppercase tracking-[.46em] text-antiqueGold/65">
            {locale === "en" ? "Your reflection" : "你的解读"}
          </p>
          <h1 className="mt-3 font-zhSerif text-3xl tracking-[.12em] text-moon md:text-5xl">
            {locale === "en" ? "The cards are still here" : "牌仍在这里等你"}
          </h1>
        </header>

        <ReadingPanel
          spread={ownerSpread}
          cards={ownerReading.cards}
          question={ownerReading.question ?? ""}
          context={ownerReading.context ?? undefined}
          reading={ownerReading.reading}
          loading={false}
          savedReading={savedOwnerReading}
          onRetry={() => undefined}
          locale={ownerReading.locale}
        />

        <div className="mt-2 flex flex-wrap items-center justify-center gap-5 pb-10 text-[11px] tracking-[.14em] text-moon/45">
          <button type="button" className="history-action" onClick={copyLink}>
            {copyState === "copied" ? (locale === "en" ? "Link copied" : "链接已复制") : locale === "en" ? "Copy link" : "复制链接"}
          </button>
          <button type="button" className="history-action" onClick={handleExportMarkdown}>{locale === "en" ? "Save text" : "保存文稿"}</button>
          <button type="button" className="history-action history-action-remove" onClick={handleDelete}>{locale === "en" ? "Release" : "让这段离开"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="font-display text-[10px] uppercase tracking-[.46em] text-antiqueGold/60">{locale === "en" ? "A reading" : "一次占卜"}</p>
      <h1 className="mt-3 font-zhSerif text-3xl tracking-[.1em] text-moon/90">{spreadName ?? (locale === "en" ? "Midnight Tarot" : "午夜塔罗")}</h1>
      <p className="mt-2 text-xs tracking-[.2em] text-moon/45">{new Date(publicReading.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "zh-CN")}</p>

      <div className="mt-9 space-y-5">
        {publicReading.cards.map((card) => (
          <CardLine key={card.positionId} card={card} locale={locale} />
        ))}
      </div>

      <div className="mt-10 border-t border-white/[.07] pt-9">
        <ReadingBody reading={publicReading.reading} showFocus={false} locale={locale} />
      </div>

      <div className="share-seal" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="34" height="34" className="share-seal-mark">
          <circle cx="16" cy="16" r="15" fill="none" stroke="rgba(216,191,136,.32)" strokeWidth="1" />
          <path d="M22 7a9 9 0 1 0 0 18 7 7 0 1 1 0-18z" fill="rgba(216,191,136,.5)" />
        </svg>
      </div>
      <p className="mt-5 text-center text-[11px] tracking-[.3em] text-antiqueGold/55">
        {locale === "en" ? "Read at Midnight Tarot" : "来自 Midnight Tarot"}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-[11px] tracking-[.14em] text-moon/45">
        <button type="button" className="history-action" onClick={copyLink}>
          {copyState === "copied" ? (locale === "en" ? "Link copied" : "链接已复制") : locale === "en" ? "Copy link" : "复制链接"}
        </button>
      </div>
    </div>
  );
}
