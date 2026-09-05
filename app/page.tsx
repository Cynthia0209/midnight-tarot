"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { flushSync } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Flip } from "gsap/Flip";
import { gsap } from "gsap";
import { BookOpenText, ChevronLeft, Volume2, VolumeX, X } from "lucide-react";
import { Background } from "@/components/Background";
import { FanDeck } from "@/components/FanDeck";
import { ReadingPanel } from "@/components/ReadingPanel";
import { RitualButton } from "@/components/RitualButton";
import { ShuffleTable } from "@/components/ShuffleTable";
import { SpreadBoard } from "@/components/SpreadBoard";
import { SpreadGallery } from "@/components/SpreadGallery";
import { tarotCards } from "@/data/tarotCards";
import { spreadById, tarotSpreads, type TarotSpread } from "@/data/spreads";
import type { Locale } from "@/lib/locale";
import {
  buildStructuredFallbackReading,
  clearDraft,
  createSession,
  isStructuredReading,
  loadDraft,
  loadReadings,
  personalizeReadingContent,
  readingToPlainText,
  saveReading,
  saveDraft,
  writeReadings,
  type DeckCard,
  type ReadingContent,
  type ReadingSession,
  type ReadingStage,
  type SavedReading,
  type SessionDraft,
} from "@/lib/reading";
import { getMuted, playRitualSound, setMuted as persistMuted, unlockRitualSound } from "@/lib/sound";
import { anonymousFetch } from "@/lib/supabaseClient";
import { createShareImage } from "@/lib/share";
import { trackEvent } from "@/lib/track";

gsap.registerPlugin(Flip);

const pageMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: .65 },
};

export default function Home() {
  const [locale, setLocale] = useState<Locale>("en");
  const [stage, setStage] = useState<ReadingStage>("intro");
  const [spread, setSpread] = useState<TarotSpread>(tarotSpreads[1]);
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [session, setSession] = useState<ReadingSession | null>(null);
  const [revealCount, setRevealCount] = useState(0);
  const [reading, setReading] = useState<ReadingContent | null>(null);
  const [readingLoading, setReadingLoading] = useState(false);
  const [readingError, setReadingError] = useState<string>();
  const [savedReading, setSavedReading] = useState<SavedReading>();
  const [shareCopied, setShareCopied] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedReading[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const isReturning = history.length >= 2;
  const [muted, setMuted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [resumableDraft, setResumableDraft] = useState<SessionDraft | null>(null);
  const [exitConfirm, setExitConfirm] = useState<null | "back" | "home">(null);

  useEffect(() => {
    setMuted(getMuted());
    setHistory(loadReadings());
    setResumableDraft(loadDraft());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const flowStage = session !== null && (
    ["shuffle", "connect", "draw", "reveal"].includes(stage)
    || (stage === "reading" && !savedReading)
  );

  useEffect(() => {
    if (!flowStage || !session) return;
    saveDraft({ stage, session, revealCount, savedAt: new Date().toISOString() });
  }, [stage, session, revealCount, flowStage]);

  useEffect(() => {
    if (!flowStage) return;
    const guardBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guardBeforeUnload);
    return () => window.removeEventListener("beforeunload", guardBeforeUnload);
  }, [flowStage]);

  const resumeDraft = () => {
    if (!resumableDraft) return;
    const draftSpread = spreadById.get(resumableDraft.session.spreadId);
    if (!draftSpread) {
      clearDraft();
      setResumableDraft(null);
      return;
    }
    setSpread(draftSpread);
    setLocale(resumableDraft.session.locale);
    setQuestion(resumableDraft.session.question ?? "");
    setContext(resumableDraft.session.context ?? "");
    setSession(resumableDraft.session);
    setRevealCount(resumableDraft.revealCount);
    setReading(null);
    setReadingError(undefined);
    setSavedReading(undefined);
    setStage(resumableDraft.stage);
    setResumableDraft(null);
  };

  const requestBack = () => {
    if (stage === "draw" && selectedCount > 0) {
      setExitConfirm("back");
      return;
    }
    setStage("intention");
  };

  const confirmExit = () => {
    const destination = exitConfirm;
    setExitConfirm(null);
    setSession(null);
    setRevealCount(0);
    setReading(null);
    setSavedReading(undefined);
    clearDraft();
    setStage(destination === "back" ? "intention" : "intro");
  };

  const handleBrandClick = () => {
    if (stage === "intro") return;
    if (flowStage && stage !== "reading") {
      setExitConfirm("home");
      return;
    }
    setStage("intro");
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [stage]);

  useEffect(() => {
    if (stage !== "connect") return;
    setConnected(false);
    const timer = window.setTimeout(() => setConnected(true), isReturning ? 1800 : 2800);
    return () => window.clearTimeout(timer);
  }, [stage, history.length, isReturning]);

  useEffect(() => {
    if (stage !== "reveal" || !session) return;
    if (revealCount >= session.selected.length) {
      const timer = window.setTimeout(() => setStage("reading"), 900);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      playRitualSound("flip", muted);
      setRevealCount((count) => count + 1);
    }, revealCount === 0 ? 700 : 950);
    return () => window.clearTimeout(timer);
  }, [stage, revealCount, session, muted]);

  useEffect(() => {
    if (stage === "reading" && session && !reading && !readingLoading) void generateReading(session);
    // readingLoading intentionally omitted: the transition should trigger exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const selectedCount = session?.selected.length ?? 0;
  const hasDrawnCards = stage === "reveal" || stage === "reading" || (stage === "draw" && selectedCount > 0);
  const neededCount = spread.positions.length;
  const stageLabel = useMemo(() => {
    const labels: Record<Locale, Record<ReadingStage, string>> = {
      en: {
        intro: "Entry",
        spread: "Choose spread",
        intention: "Set intention",
        shuffle: "Shuffle",
        connect: "Connect",
        draw: "Draw",
        reveal: "Reveal",
        reading: "Reading",
      },
      zh: {
        intro: "入口",
        spread: "选择牌阵",
        intention: "留下问题",
        shuffle: "洗牌",
        connect: "连接",
        draw: "选牌",
        reveal: "揭牌",
        reading: "解读",
      },
    };
    return labels[locale][stage];
  }, [locale, stage]);

  const STAGE_SEQUENCE: ReadingStage[] = ["intro", "spread", "intention", "shuffle", "connect", "draw", "reveal", "reading"];
  const stepNumber = STAGE_SEQUENCE.indexOf(stage) + 1;
  const totalSteps = STAGE_SEQUENCE.length;

  const chooseSpread = (next: TarotSpread) => {
    setSpread(next);
    setStage("intention");
  };

  const beginRitual = (ritualQuestion = question, ritualContext = context) => {
    if (!muted) void unlockRitualSound();
    trackEvent("reading_started", { spreadId: spread.id });
    const next = createSession(spread.id, ritualQuestion, tarotCards.map((card) => card.id), ritualContext, locale);
    setSession(next);
    setRevealCount(0);
    setReading(null);
    setReadingError(undefined);
    setSavedReading(undefined);
    setStage("shuffle");
  };

  const selectCard = (item: DeckCard, element: HTMLButtonElement) => {
    if (!session || session.selected.length >= neededCount || session.selected.some((card) => card.cardId === item.cardId)) return;
    const index = session.selected.length;
    const state = Flip.getState(element);
    const nextSession: ReadingSession = {
      ...session,
      stage: "draw",
      selected: [...session.selected, { ...item, positionId: spread.positions[index].id }],
    };
    flushSync(() => setSession(nextSession));
    playRitualSound("draw", muted);
    requestAnimationFrame(() => {
      Flip.from(state, {
        targets: `[data-flip-id="card-${item.cardId}"]`,
        duration: .85,
        ease: "power3.inOut",
        absolute: true,
        scale: true,
      });
    });
    if (nextSession.selected.length === neededCount) window.setTimeout(() => setStage("reveal"), 1100);
  };

  async function generateReading(activeSession: ReadingSession) {
    setReadingLoading(true);
    setReadingError(undefined);

    const fallback = buildStructuredFallbackReading(
      activeSession.question,
      activeSession.context ?? "",
      activeSession.selected.map((item, index) => {
        const card = tarotCards.find((candidate) => candidate.id === item.cardId)!;
        return {
          positionId: spread.positions[index].id,
          positionTitle: locale === "en" ? spread.positions[index].title : spread.positions[index].titleZh,
          nameZh: `${card.nameZh}${item.orientation === "reversed" ? "（逆位）" : ""}`,
          name: `${card.name}${item.orientation === "reversed" ? " (reversed)" : ""}`,
          meaning: locale === "en"
            ? item.orientation === "reversed" ? card.reversedMeaningEn : card.uprightMeaningEn
            : item.orientation === "reversed" ? card.reversedMeaning : card.uprightMeaning,
        };
      }),
      locale,
    );
    setReading(null);

    try {
      const response = await anonymousFetch("/api/reading", {
        method: "POST",
        body: JSON.stringify({
          spreadId: activeSession.spreadId,
          question: activeSession.question,
          context: activeSession.context,
          locale: activeSession.locale,
          cards: activeSession.selected.map(({ positionId, cardId, orientation }) => ({ positionId, cardId, orientation })),
        }),
      });
      if (!response.ok) {
        throw new Error("Reading request failed");
      }
      const data = await response.json() as { reading?: unknown; fallback?: boolean };
      const nextReading = personalizeReadingContent(
        isStructuredReading(data.reading) ? data.reading : fallback,
      );
      setReading(nextReading);
      if (data.fallback) setReadingError(activeSession.locale === "en" ? "The connection is faint tonight, so I kept a local card-based reading for you. You can reconnect later." : "今晚的连接有些微弱，先为你保留了基于牌面的本地解读。你可以稍后重新连接。");
      completeReading(activeSession, nextReading);
    } catch {
      setReading(fallback);
      setReadingError(activeSession.locale === "en" ? "The connection is faint tonight, so I kept a local card-based reading for you. You can reconnect later." : "今晚的连接有些微弱，先为你保留了基于牌面的本地解读。你可以稍后重新连接。");
      completeReading(activeSession, fallback);
    } finally {
      setReadingLoading(false);
    }
  }

  async function persistReadingToCloud(reading: SavedReading) {
    try {
      await anonymousFetch("/api/readings", {
        method: "POST",
        body: JSON.stringify({
          id: reading.id,
          spreadId: reading.spreadId,
          question: reading.question,
          context: reading.context,
          cards: reading.cards,
          reading: reading.reading,
          createdAt: reading.createdAt,
          locale: reading.locale ?? "en",
        }),
      });
    } catch {
      // The ritual is complete on this device; cloud sync is best-effort.
    }
  }

  function completeReading(activeSession: ReadingSession, content: ReadingContent) {
    const saved: SavedReading = {
      id: activeSession.id,
      spreadId: activeSession.spreadId,
      question: activeSession.question,
      context: activeSession.context,
      locale: activeSession.locale,
      cards: activeSession.selected,
      reading: content,
      createdAt: activeSession.createdAt,
    };
    setSavedReading(saved);
    setHistory(saveReading(saved));
    void persistReadingToCloud(saved);
    clearDraft();
  }

  const restart = () => {
    setSession(null);
    setQuestion("");
    setContext("");
    setReading(null);
    setSavedReading(undefined);
    setRevealCount(0);
    clearDraft();
    setStage("spread");
  };

  const copyShareLink = async () => {
    const id = savedReading?.id ?? session?.id;
    if (!id) return;
    const url = `${window.location.origin}/reading/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2400);
    } catch {
      // Clipboard may be unavailable in some contexts; the link is still shown.
    }
  };

  const buildReadingMarkdown = (item: SavedReading): string => {
    const spread = spreadById.get(item.spreadId);
    const title = item.locale === "en" ? spread?.nameEn ?? item.spreadId : spread?.name ?? item.spreadId;
    const questionLine = item.question?.trim()
      ? `> ${item.question.trim()}`
      : item.locale === "en" ? "> A question held silently" : "> 一个没有说出口的问题";
    return [
      `# Midnight Tarot · ${title}`,
      "",
      questionLine,
      "",
      readingToPlainText(item.reading),
      "",
      "---",
      `${item.locale === "en" ? "From Midnight Tarot" : "来自 Midnight Tarot"} · ${new Date(item.createdAt).toLocaleString(item.locale === "en" ? "en-US" : "zh-CN")}`,
    ].join("\n");
  };

  const downloadText = (filename: string, text: string) => {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportReadingMarkdown = (item: SavedReading) => {
    const stamp = item.createdAt.slice(0, 10);
    downloadText(`midnight-tarot-${item.spreadId}-${stamp}.md`, buildReadingMarkdown(item));
  };

  const exportReadingImage = async (item: SavedReading) => {
    try {
      const file = await createShareImage(item);
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `midnight-tarot-${item.spreadId}-${item.createdAt.slice(0, 10)}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // Image export failed; the reading remains in the archive.
    }
  };

  const removeReading = async (id: string) => {
    const next = history.filter((item) => item.id !== id);
    setHistory(next);
    writeReadings(next);
    setDeleteId(null);
    try {
      await anonymousFetch(`/api/readings/${id}`, { method: "DELETE" });
    } catch {
      // Local removal stands regardless of cloud sync result.
    }
  };

  const toggleMuted = () => {
    const next = !muted;
    setMuted(next);
    persistMuted(next);
    if (!next) {
      void unlockRitualSound().then(() => playRitualSound("draw", false));
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-clip text-moon" data-stage={stage}>
      <Background />

      <header className="site-header relative z-50">
        <button type="button" onClick={handleBrandClick} className="brand-lockup" aria-label="Midnight Tarot home">
          <span className="brand-mark" aria-hidden="true">
            <Image src="/brand-sigil.webp" alt="" fill sizes="46px" className="brand-mark-image" priority />
          </span>
          <span className="brand-type"><b>Midnight Tarot</b><small>{locale === "en" ? "Private readings" : "月下牌语"}</small></span>
        </button>
        <div className="site-controls">
          {stage !== "intro" && (
            <span className="stage-progress" aria-label={stageLabel}>
              <span className="stage-rail" aria-hidden="true">
                {STAGE_SEQUENCE.map((stageKey, index) => (
                  <span
                    key={stageKey}
                    className={`stage-pip${index < stepNumber - 1 ? " is-past" : ""}${index === stepNumber - 1 ? " is-current" : ""}`}
                  />
                ))}
              </span>
              <span className="stage-name">{stageLabel}</span>
            </span>
          )}
          {stage === "intro" && (
            <div className="language-switch" aria-label={locale === "en" ? "Choose language" : "选择语言"}>
              <button
                type="button"
                onClick={() => setLocale("en")}
                aria-pressed={locale === "en"}
                className={locale === "en" ? "is-active" : ""}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLocale("zh")}
                aria-pressed={locale === "zh"}
                className={locale === "zh" ? "is-active" : ""}
              >
                中文
              </button>
            </div>
          )}
          <button type="button" onClick={() => setHistoryOpen(true)} className="header-tool" aria-label={locale === "en" ? "Open reading history" : "打开历史解读"}>
            <span className="header-tool-icon" aria-hidden="true"><BookOpenText size={14} strokeWidth={1.35} /></span>
            <span className="header-tool-label">{locale === "en" ? "Archive" : "历史"}</span>
            {history.length > 0 && <span className="header-tool-count">{history.length}</span>}
          </button>
          <button
            type="button"
            onClick={toggleMuted}
            aria-label={muted ? locale === "en" ? "Turn sound on" : "开启声音" : locale === "en" ? "Mute" : "静音"}
            title={muted ? locale === "en" ? "Sound is off. Click to turn it on." : "声音已关闭，点击开启" : locale === "en" ? "Sound is on. Click to mute." : "声音已开启，点击静音"}
            className={`header-tool header-tool-square ${muted ? "is-muted" : ""}`}
          >
            <span aria-hidden="true">{muted ? <VolumeX size={15} strokeWidth={1.35} /> : <Volume2 size={15} strokeWidth={1.35} />}</span>
          </button>
        </div>
      </header>

      <div className="relative z-10 min-h-[calc(100dvh-5rem)] px-5 pb-12">
        <AnimatePresence mode="wait">
          {stage === "intro" && (
            <motion.section key="intro" {...pageMotion} className="intro-scene">
              <div className="intro-visual" aria-hidden="true" />
              <div className="intro-shade" aria-hidden="true" />
              <div className="intro-copy">
              <p className="intro-kicker">A private ritual after dark</p>
              <h1 className="intro-title">
                {locale === "en"
                  ? <><span className="intro-title-line">Meet the cards</span><span className="intro-title-line">after midnight</span></>
                  : <><span className="intro-title-line">在午夜，</span><span className="intro-title-line">与牌相遇</span></>}
              </h1>
              <p className="intro-description">
                {locale === "en"
                  ? "No fixed fate. Only a shuffled deck, and a quiet mirror for what is already moving inside you."
                  : "这里没有注定的答案。只有一副洗好的牌，和一面愿意陪你看见内心的镜子。"}
              </p>
              <RitualButton onClick={() => setStage("spread")} className="intro-action">{locale === "en" ? "Begin reading" : "进入占卜"}</RitualButton>
              <p className="intro-note">{locale === "en" ? "Begin when it is quiet and you will not be interrupted" : "请在安静、不被打扰的时候开始"}</p>
              <p className="intro-note intro-disclosure">
                {locale === "en"
                  ? "Your reading is written with the help of AI — a mirror for reflection, not a verdict."
                  : "解读由 AI 参与生成——它是一面镜子，不是判决。"}
              </p>
              {resumableDraft && (
                <button type="button" onClick={resumeDraft} className="intro-resume mt-7">
                  <span aria-hidden="true">✦</span>
                  {locale === "en" ? "Return to the reading in progress" : "回到刚才那次占卜"}
                  <span aria-hidden="true">✦</span>
                </button>
              )}
              </div>
            </motion.section>
          )}

          {stage === "spread" && (
            <motion.section key="spread" {...pageMotion} className="spread-selection mx-auto pt-8 md:pt-14">
              <div className="mx-auto max-w-3xl text-center">
                <p className="font-display text-[10px] uppercase tracking-[.48em] text-antiqueGold/65">{locale === "en" ? "Choose your spread" : "选择牌阵"}</p>
                <h1 className="mt-4 font-zhSerif text-4xl tracking-[.1em] md:text-6xl">{locale === "en" ? "What do you want to see tonight?" : "今晚，你想看见什么？"}</h1>
                <p className="mt-5 font-zhSerif text-sm leading-7 text-moon/60">{locale === "en" ? "Each spread is a different angle on the same question." : "每一种牌阵，都是观看同一个问题的不同角度。"}</p>
              </div>
              <div className="mt-7 md:mt-12"><SpreadGallery selectedId={spread.id} onSelect={chooseSpread} locale={locale} /></div>
            </motion.section>
          )}

          {stage === "intention" && (
            <motion.section key="intention" {...pageMotion} className="intention-stage mx-auto flex min-h-[calc(100vh-9rem)] max-w-3xl flex-col items-center justify-center text-center">
              <button type="button" onClick={() => setStage("spread")} className="quiet-navigation"><span aria-hidden="true"><ChevronLeft size={14} strokeWidth={1.35} /></span> {locale === "en" ? "Choose another spread" : "重新选择牌阵"}</button>
              <p className="font-display text-[10px] uppercase tracking-[.45em] text-antiqueGold/65">{spread.nameEn} · {neededCount} cards</p>
              <h1 className="mt-5 font-zhSerif text-4xl tracking-[.1em] md:text-6xl">{locale === "en" ? spread.nameEn : spread.name}</h1>
              <p className="mt-5 max-w-xl font-zhSerif text-sm leading-7 text-moon/60">{locale === "en" ? spread.descriptionEn : spread.description}</p>
              <div className="intention-panel mt-10 w-full">
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value.slice(0, 240))}
                  placeholder={locale === "en" ? "Write your question, or hold it silently..." : "写下你的问题，或让它只留在心里…"}
                  className="intention-question min-h-36 w-full resize-none px-6 py-7 text-center font-zhSerif text-lg leading-8 tracking-[.08em] text-moon outline-none placeholder:text-moon/55"
                />
                <div className="flex items-center justify-between px-4 pb-3 text-[10px] text-moon/55"><span>{locale === "en" ? "Your question is not saved until the reading is complete" : "问题不会被保存，直到解读完成"}</span><span>{question.length}/240</span></div>
                <div className="intention-divider" />
                <textarea
                  value={context}
                  onChange={(event) => setContext(event.target.value.slice(0, 500))}
                  placeholder={locale === "en" ? "Optional: add what happened, who is involved, and what feels most tangled..." : "可选：补充发生了什么、涉及谁，以及你最纠结的部分…"}
                  className="intention-context min-h-28 w-full resize-none px-6 py-5 text-left font-zhSerif text-sm leading-7 tracking-[.06em] text-moon outline-none placeholder:text-moon/55"
                />
                <div className="flex items-center justify-between px-4 pb-3 text-[10px] text-moon/55"><span>{locale === "en" ? "Context stays in your browser and will not appear in the share image" : "背景只保存在你的浏览器，不会出现在分享图中"}</span><span>{context.length}/500</span></div>
              </div>
              <RitualButton onClick={() => beginRitual()} className="mt-8">{locale === "en" ? "Start shuffling" : "开始洗牌"}</RitualButton>
              <button type="button" onClick={() => { setQuestion(""); setContext(""); beginRitual("", ""); }} className="mt-5 text-xs tracking-[.14em] text-moon/55 hover:text-moon">{locale === "en" ? "Begin without writing anything" : "什么都不写，直接开始"}</button>
            </motion.section>
          )}

          {stage === "shuffle" && session && (
            <motion.section key="shuffle" {...pageMotion} className="shuffle-stage mx-auto flex min-h-[calc(100vh-9rem)] max-w-4xl flex-col items-center justify-center text-center">
              <button type="button" onClick={requestBack} className="quiet-navigation"><span aria-hidden="true"><ChevronLeft size={14} strokeWidth={1.35} /></span> {locale === "en" ? "Return to the question" : "回到问题"}</button>
              <p className="font-display text-[10px] uppercase tracking-[.48em] text-antiqueGold/65">{locale === "en" ? "The shuffle" : "洗牌"}</p>
              <h1 className="mt-4 font-zhSerif text-3xl tracking-[.12em] md:text-5xl">{locale === "en" ? "Let the disorder settle into order" : "让混乱，慢慢形成秩序"}</h1>
              <ShuffleTable muted={muted} onComplete={() => setStage("connect")} locale={locale} fast={isReturning} />
            </motion.section>
          )}

          {stage === "connect" && session && (
            <motion.section key="connect" {...pageMotion} className="connect-stage mx-auto flex min-h-[calc(100dvh-8rem)] max-w-4xl items-center justify-center text-center">
              <div className="connection-chamber">
                <button type="button" onClick={requestBack} className="quiet-navigation"><span aria-hidden="true"><ChevronLeft size={14} strokeWidth={1.35} /></span> {locale === "en" ? "Return to the question" : "回到问题"}</button>
                <p className="connection-kicker">{locale === "en" ? "Ready before the draw" : "抽牌之前"}</p>
                <h1 className="connection-title">{locale === "en" ? "The deck is ready" : "牌已经准备好了"}</h1>
                <p className="connection-copy">{locale === "en" ? "Keep the question in mind. When you are ready, choose the card that first asks for your attention." : "把问题留在心里。准备好后，选择第一张吸引你注意的牌。"}</p>
                <motion.div
                  className="connect-deck"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
                  aria-hidden="true"
                >
                  <span /><span /><span />
                </motion.div>
                <ol className="connect-steps" aria-label={locale === "en" ? "Reading progress" : "占卜进度"}>
                  <li className="is-complete"><span>1</span>{locale === "en" ? "Question held" : "问题已留下"}</li>
                  <li className="is-complete"><span>2</span>{locale === "en" ? "Deck shuffled" : "牌已经洗好"}</li>
                  <li><span>3</span>{locale === "en" ? "Choose by instinct" : "凭直觉选牌"}</li>
                </ol>
                <div className={`connect-readiness ${connected ? "is-ready" : ""}`} aria-hidden={!connected}>
                  <p id="connect-next-step">{locale === "en" ? "The deck is ready for you" : "牌已经准备好回应你"}</p>
                </div>
                <RitualButton
                  type="button"
                  disabled={!connected}
                  aria-describedby={connected ? "connect-next-step" : undefined}
                  onClick={() => setStage("draw")}
                  className={connected ? "connect-ready-button cursor-pointer" : ""}
                >
                  {connected ? locale === "en" ? "I’m ready · Choose cards" : "我准备好了 · 进入选牌" : locale === "en" ? "Setting the deck..." : "正在固定牌序…"}
                </RitualButton>
                <p className="connect-untimed">{locale === "en" ? "Nothing here is timed." : "这里没有倒计时。"}</p>
              </div>
            </motion.section>
          )}

          {(stage === "draw" || stage === "reveal") && session && (
            <motion.section key="table" {...pageMotion} className="draw-stage mx-auto max-w-[1220px] pt-4 text-center">
              <div className="flex justify-start">
                <button type="button" onClick={requestBack} className="quiet-navigation"><span aria-hidden="true"><ChevronLeft size={14} strokeWidth={1.35} /></span> {locale === "en" ? "Return to the question" : "回到问题"}</button>
              </div>
              <p className="font-display text-[10px] uppercase tracking-[.42em] text-antiqueGold/65">{stage === "draw" ? locale === "en" ? "Choose by instinct" : "凭直觉选牌" : locale === "en" ? "The cards speak" : "牌语"}</p>
              <h1 className="mt-3 font-zhSerif text-2xl tracking-[.1em] md:text-4xl">
                {stage === "draw" ? locale === "en" ? "What first draws you is rarely accidental" : "第一眼吸引你的，往往不是偶然" : locale === "en" ? "The secret is opening card by card" : "秘密正在一张一张打开"}
              </h1>
              <p className="mt-3 text-xs tracking-[.18em] text-moon/55">
                {stage === "draw"
                  ? locale === "en" ? `Full 78-card deck · Selected ${selectedCount} / ${neededCount}` : `完整 78 张牌 · 已选择 ${selectedCount} / ${neededCount}`
                  : locale === "en" ? `Revealing ${Math.min(revealCount + 1, neededCount)} / ${neededCount}` : `正在揭示 ${Math.min(revealCount + 1, neededCount)} / ${neededCount}`}
              </p>
              {stage === "draw" && <FanDeck deck={session.deck} selected={session.selected} locked={selectedCount >= neededCount} onSelect={selectCard} locale={locale} />}
              <div className={stage === "draw" ? "mt-3 md:mt-5" : "mt-8"}>
                <SpreadBoard spread={spread} selected={session.selected} revealCount={revealCount} showMeanings={stage === "reveal"} locale={locale} />
              </div>
            </motion.section>
          )}

          {stage === "reading" && session && (
            <motion.section key="reading" {...pageMotion} className="reading-stage mx-auto max-w-[1320px] py-7">
              <div className="mb-8 text-center">
                <p className="font-display text-[10px] uppercase tracking-[.46em] text-antiqueGold/65">{locale === "en" ? "Your reflection" : "你的解读"}</p>
                <h1 className="mt-3 font-zhSerif text-3xl tracking-[.12em] md:text-5xl">{locale === "en" ? "The cards have answered" : "牌已经回应"}</h1>
              </div>
              <ReadingPanel
                spread={spread}
                cards={session.selected}
                question={session.question}
                context={session.context}
                reading={reading}
                loading={readingLoading}
                error={readingError}
                savedReading={savedReading}
                onRetry={() => void generateReading(session)}
                locale={session.locale}
              />
              <div className="mt-9 flex flex-col items-center gap-4">
                <RitualButton tone="smoke" compact onClick={restart}>{locale === "en" ? "Start a new reading" : "开始一次新的占卜"}</RitualButton>
                <button type="button" onClick={copyShareLink} className="quiet-navigation" aria-label={locale === "en" ? "Copy a link to this reading" : "复制这段仪式的链接"}>
                  {shareCopied ? (locale === "en" ? "Link copied" : "链接已复制") : (locale === "en" ? "Copy a link to this reading" : "复制这段仪式的链接")}
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <footer className="relative z-10 px-5 pb-10 text-center">
        <p className="mx-auto max-w-xl text-[10px] leading-5 tracking-[.14em] text-moon/55">
          {locale === "en"
            ? "For reflection and self-inquiry. Not a substitute for medical, legal, financial, or crisis care."
            : "用于反思与自我探询，不能替代医疗、法律、财务或危机援助。"}
        </p>
        <nav aria-label={locale === "en" ? "Legal and support" : "条款与支持"} className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link href="/privacy" className="footer-legal-link">{locale === "en" ? "Privacy" : "隐私"}</Link>
          <Link href="/terms" className="footer-legal-link">{locale === "en" ? "Terms" : "条款"}</Link>
          <Link href="/support" className="footer-legal-link">{locale === "en" ? "Support" : "支持"}</Link>
        </nav>
      </footer>

      <AnimatePresence>
        {exitConfirm && (
          <motion.div className="fixed inset-0 z-[110] grid place-items-center bg-black/65 p-5 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExitConfirm(null)}>
            <motion.div
              className="exit-confirm-panel w-full max-w-sm px-8 py-9 text-center"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ ease: [0.2, .8, .2, 1] }}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={locale === "en" ? "Leave this reading" : "离开这次占卜"}
            >
              <p className="font-zhSerif text-lg leading-8 tracking-[.06em] text-moon/85">
                {hasDrawnCards
                  ? locale === "en" ? "Leave this reading? The cards you pulled will be released." : "离开这次占卜？已抽到的牌将放回牌堆。"
                  : locale === "en" ? "Leave this reading? The spread has not yet taken shape." : "离开这次占卜？此刻的牌阵还未成形。"}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <RitualButton type="button" tone="smoke" compact autoFocus onClick={() => setExitConfirm(null)}>
                  {locale === "en" ? "Stay" : "留下"}
                </RitualButton>
                <RitualButton type="button" compact onClick={confirmExit}>
                  {hasDrawnCards
                    ? locale === "en" ? "Release the cards" : "放回牌堆"
                    : locale === "en" ? "Leave quietly" : "就此离开"}
                </RitualButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {historyOpen && (
          <motion.div className="fixed inset-0 z-[100] flex justify-end bg-black/65 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setHistoryOpen(false)}>
            <motion.aside className="history-drawer h-full w-full max-w-md overflow-y-auto p-6" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ ease: [0.2, .8, .2, 1] }} onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div><p className="font-display text-[10px] uppercase tracking-[.35em] text-antiqueGold/60">{locale === "en" ? "Private archive" : "私人档案"}</p><h2 className="mt-2 font-zhSerif text-3xl">{locale === "en" ? "Your readings" : "你的解读"}</h2></div>
                <button type="button" onClick={() => setHistoryOpen(false)} className="history-close" aria-label={locale === "en" ? "Close archive" : "关闭历史记录"}><X size={17} strokeWidth={1.35} /></button>
              </div>
              <div className="mt-8 space-y-3">
                {history.length === 0 && <p className="rounded-2xl border border-white/[.06] p-6 text-sm leading-7 text-moon/55">{locale === "en" ? "After you complete a reading, it will be quietly saved on this device." : "完成一次占卜后，结果会安静地保存在这台设备里。"}</p>}
                {history.map((item) => {
                  const spreadName = item.locale === "en" ? spreadById.get(item.spreadId)?.nameEn : spreadById.get(item.spreadId)?.name;
                  const openReading = () => {
                    const historicSpread = spreadById.get(item.spreadId);
                    if (!historicSpread) return;
                    const historicLocale = item.locale ?? locale;
                    setSpread(historicSpread);
                    setLocale(historicLocale);
                    setSession({
                      id: item.id,
                      spreadId: item.spreadId,
                      question: item.question,
                      context: item.context,
                      locale: historicLocale,
                      stage: "reading",
                      deck: [],
                      selected: item.cards,
                      createdAt: item.createdAt,
                    });
                    setReading(item.reading);
                    setSavedReading(item);
                    setRevealCount(item.cards.length);
                    setStage("reading");
                    setHistoryOpen(false);
                  };
                  return (
                    <div key={item.id} className="history-entry w-full p-5 text-left">
                      <button type="button" onClick={openReading} className="block w-full text-left">
                        <p className="text-[10px] tracking-[.2em] text-antiqueGold/62">{spreadName} · {new Date(item.createdAt).toLocaleDateString(item.locale === "en" ? "en-US" : "zh-CN")}</p>
                        <p className="mt-2 line-clamp-2 font-zhSerif text-sm leading-6 text-moon/65">{item.question || (item.locale === "en" ? "A question held silently" : "一个没有说出口的问题")}</p>
                      </button>
                      <div className="mt-3 flex items-center gap-4 text-[11px] tracking-[.14em] text-moon/45">
                        <button type="button" className="history-action" onClick={(event) => { event.stopPropagation(); void exportReadingImage(item); }}>{item.locale === "en" ? "Image" : "图片"}</button>
                        <button type="button" className="history-action" onClick={(event) => { event.stopPropagation(); exportReadingMarkdown(item); }}>{item.locale === "en" ? "Text" : "文稿"}</button>
                        <button type="button" className="history-action history-action-remove" onClick={(event) => { event.stopPropagation(); setDeleteId(item.id); }}>{item.locale === "en" ? "Remove" : "移除"}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId && (
          <motion.div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteId(null)}>
            <motion.div className="exit-confirm-panel mx-4 max-w-sm p-8 text-center" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} onClick={(event) => event.stopPropagation()}>
              <p className="font-display text-[10px] uppercase tracking-[.42em] text-antiqueGold/65">{locale === "en" ? "Release this reading" : "让这段解读离开"}</p>
              <p className="mt-4 font-zhSerif text-lg leading-8 tracking-[.06em] text-moon/85">{locale === "en" ? "This reading will leave your archive. We never kept a copy." : "这段将离开你的档案。我们不曾留存副本。"}</p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <RitualButton type="button" tone="smoke" compact autoFocus onClick={() => setDeleteId(null)}>{locale === "en" ? "Keep it" : "留着"}</RitualButton>
                <RitualButton type="button" compact onClick={() => void removeReading(deleteId)}>{locale === "en" ? "Let it go" : "让它离开"}</RitualButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
