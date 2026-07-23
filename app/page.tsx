"use client";

import { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Flip } from "gsap/Flip";
import { gsap } from "gsap";
import { Background } from "@/components/Background";
import { FanDeck } from "@/components/FanDeck";
import { ReadingPanel } from "@/components/ReadingPanel";
import { ShuffleTable } from "@/components/ShuffleTable";
import { SpreadBoard } from "@/components/SpreadBoard";
import { SpreadGallery } from "@/components/SpreadGallery";
import { tarotCards } from "@/data/tarotCards";
import { spreadById, tarotSpreads, type TarotSpread } from "@/data/spreads";
import type { Locale } from "@/lib/locale";
import {
  buildStructuredFallbackReading,
  createSession,
  isStructuredReading,
  loadReadings,
  personalizeReadingContent,
  saveReading,
  type DeckCard,
  type ReadingContent,
  type ReadingSession,
  type ReadingStage,
  type SavedReading,
} from "@/lib/reading";
import { getMuted, playRitualSound, setMuted as persistMuted, unlockRitualSound } from "@/lib/sound";

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
  const [history, setHistory] = useState<SavedReading[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setMuted(getMuted());
    setHistory(loadReadings());
  }, []);

  useEffect(() => {
    if (stage !== "connect") return;
    setConnected(false);
    const timer = window.setTimeout(() => setConnected(true), 2800);
    return () => window.clearTimeout(timer);
  }, [stage]);

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

  const chooseSpread = (next: TarotSpread) => {
    setSpread(next);
    setStage("intention");
  };

  const beginRitual = (ritualQuestion = question, ritualContext = context) => {
    if (!muted) void unlockRitualSound();
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
      const response = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadId: activeSession.spreadId,
          question: activeSession.question,
          context: activeSession.context,
          locale: activeSession.locale,
          cards: activeSession.selected.map(({ positionId, cardId, orientation }) => ({ positionId, cardId, orientation })),
        }),
      });
      if (!response.ok) throw new Error("Reading request failed");
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
  }

  const restart = () => {
    setSession(null);
    setQuestion("");
    setContext("");
    setReading(null);
    setSavedReading(undefined);
    setRevealCount(0);
    setStage("spread");
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
    <main className="relative min-h-screen overflow-x-clip text-moon">
      <Background />

      <header className="relative z-50 flex h-20 items-center justify-between px-5 md:px-9">
        <button type="button" onClick={() => setStage("intro")} className="font-display text-[11px] uppercase tracking-[.42em] text-antiqueGold/80">Midnight Tarot</button>
        <div className="flex items-center gap-2">
          {stage !== "intro" && <span className="mr-2 hidden text-[10px] tracking-[.22em] text-moon/30 sm:inline">{stageLabel}</span>}
          {stage === "intro" && (
            <div className="rounded-full border border-antiqueGold/20 bg-white/[.025] p-1 text-[10px] uppercase tracking-[.18em] text-moon/55">
              <button
                type="button"
                onClick={() => setLocale("en")}
                aria-pressed={locale === "en"}
                className={`rounded-full px-3 py-1.5 transition ${locale === "en" ? "bg-antiqueGold/15 text-antiqueGold" : "hover:text-moon"}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLocale("zh")}
                aria-pressed={locale === "zh"}
                className={`rounded-full px-3 py-1.5 transition ${locale === "zh" ? "bg-antiqueGold/15 text-antiqueGold" : "hover:text-moon"}`}
              >
                中文
              </button>
            </div>
          )}
          <button type="button" onClick={() => setHistoryOpen(true)} className="rounded-full border border-white/[.08] bg-white/[.025] px-4 py-2 text-[11px] text-moon/55 transition hover:border-antiqueGold/30">{locale === "en" ? "History" : "历史"} {history.length || ""}</button>
          <button
            type="button"
            onClick={toggleMuted}
            aria-label={muted ? locale === "en" ? "Turn sound on" : "开启声音" : locale === "en" ? "Mute" : "静音"}
            title={muted ? locale === "en" ? "Sound is off. Click to turn it on." : "声音已关闭，点击开启" : locale === "en" ? "Sound is on. Click to mute." : "声音已开启，点击静音"}
            className={`grid h-9 w-9 place-items-center rounded-full border bg-white/[.025] text-sm transition ${muted ? "border-white/[.08] text-moon/30" : "border-antiqueGold/25 text-antiqueGold/75"}`}
          >
            {muted ? "♩" : "♪"}
          </button>
        </div>
      </header>

      <div className="relative z-10 min-h-[calc(100vh-5rem)] px-5 pb-12">
        <AnimatePresence mode="wait">
          {stage === "intro" && (
            <motion.section key="intro" {...pageMotion} className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl flex-col items-center justify-center text-center">
              <div className="mb-8 grid h-20 w-20 place-items-center rounded-full border border-antiqueGold/20 bg-[radial-gradient(circle,rgba(216,191,136,.12),transparent_70%)] text-3xl text-antiqueGold">☾</div>
              <p className="font-display text-xs uppercase tracking-[.58em] text-antiqueGold/70">A private ritual after dark</p>
              <h1 className="mt-7 font-zhSerif text-[clamp(3rem,9vw,7.2rem)] font-light leading-[1.16] tracking-[.12em] text-[#f4eff5]">
                {locale === "en" ? <>Meet the cards<br />after midnight</> : <>在午夜，<br />与牌相遇</>}
              </h1>
              <p className="mt-7 max-w-xl font-zhSerif text-base leading-8 tracking-[.12em] text-moon/48 md:text-lg">
                {locale === "en"
                  ? "No fixed fate. Only a shuffled deck, and a quiet mirror for what is already moving inside you."
                  : "这里没有注定的答案。只有一副洗好的牌，和一面愿意陪你看见内心的镜子。"}
              </p>
              <button type="button" onClick={() => setStage("spread")} className="gold-button mt-10 rounded-full px-10 py-4 font-zhSerif text-base tracking-[.22em]">{locale === "en" ? "Begin reading" : "进入占卜"}</button>
              <p className="mt-5 text-[10px] tracking-[.18em] text-moon/25">{locale === "en" ? "Begin when it is quiet and you will not be interrupted" : "请在安静、不被打扰的时候开始"}</p>
            </motion.section>
          )}

          {stage === "spread" && (
            <motion.section key="spread" {...pageMotion} className="mx-auto pt-8 md:pt-14">
              <div className="mx-auto max-w-3xl text-center">
                <p className="font-display text-[10px] uppercase tracking-[.48em] text-antiqueGold/65">Choose your spread</p>
                <h1 className="mt-4 font-zhSerif text-4xl tracking-[.1em] md:text-6xl">{locale === "en" ? "What do you want to see tonight?" : "今晚，你想看见什么？"}</h1>
                <p className="mt-5 font-zhSerif text-sm leading-7 text-moon/45">{locale === "en" ? "Each spread is a different angle on the same question." : "每一种牌阵，都是观看同一个问题的不同角度。"}</p>
              </div>
              <div className="mt-7 md:mt-12"><SpreadGallery selectedId={spread.id} onSelect={chooseSpread} locale={locale} /></div>
            </motion.section>
          )}

          {stage === "intention" && (
            <motion.section key="intention" {...pageMotion} className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-3xl flex-col items-center justify-center text-center">
              <button type="button" onClick={() => setStage("spread")} className="mb-8 text-xs tracking-[.18em] text-moon/35 hover:text-antiqueGold">← {locale === "en" ? "Choose another spread" : "重新选择牌阵"}</button>
              <p className="font-display text-[10px] uppercase tracking-[.45em] text-antiqueGold/65">{spread.nameEn} · {neededCount} cards</p>
              <h1 className="mt-5 font-zhSerif text-4xl tracking-[.1em] md:text-6xl">{locale === "en" ? spread.nameEn : spread.name}</h1>
              <p className="mt-5 max-w-xl font-zhSerif text-sm leading-7 text-moon/45">{locale === "en" ? spread.descriptionEn : spread.description}</p>
              <div className="ritual-panel mt-10 w-full rounded-[28px] p-3">
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value.slice(0, 240))}
                  placeholder={locale === "en" ? "Write your question, or hold it silently..." : "写下你的问题，或让它只留在心里…"}
                  className="min-h-36 w-full resize-none rounded-[20px] bg-black/10 px-6 py-7 text-center font-zhSerif text-lg leading-8 tracking-[.08em] text-moon outline-none placeholder:text-moon/25 focus:bg-white/[.015]"
                />
                <div className="flex items-center justify-between px-4 pb-3 text-[10px] text-moon/25"><span>{locale === "en" ? "Your question is not saved until the reading is complete" : "问题不会被保存，直到解读完成"}</span><span>{question.length}/240</span></div>
                <div className="mx-3 border-t border-antiqueGold/10" />
                <textarea
                  value={context}
                  onChange={(event) => setContext(event.target.value.slice(0, 500))}
                  placeholder={locale === "en" ? "Optional: add what happened, who is involved, and what feels most tangled..." : "可选：补充发生了什么、涉及谁，以及你最纠结的部分…"}
                  className="min-h-28 w-full resize-none rounded-[20px] bg-black/10 px-6 py-5 text-left font-zhSerif text-sm leading-7 tracking-[.06em] text-moon outline-none placeholder:text-moon/25 focus:bg-white/[.015]"
                />
                <div className="flex items-center justify-between px-4 pb-3 text-[10px] text-moon/25"><span>{locale === "en" ? "Context stays in your browser and will not appear in the share image" : "背景只保存在你的浏览器，不会出现在分享图中"}</span><span>{context.length}/500</span></div>
              </div>
              <button type="button" onClick={() => beginRitual()} className="gold-button mt-8 rounded-full px-10 py-4 font-zhSerif tracking-[.2em]">{locale === "en" ? "Start shuffling" : "开始洗牌"}</button>
              <button type="button" onClick={() => { setQuestion(""); setContext(""); beginRitual("", ""); }} className="mt-5 text-xs tracking-[.14em] text-moon/30 hover:text-moon/60">{locale === "en" ? "Begin without writing anything" : "什么都不写，直接开始"}</button>
            </motion.section>
          )}

          {stage === "shuffle" && session && (
            <motion.section key="shuffle" {...pageMotion} className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-4xl flex-col items-center justify-center text-center">
              <p className="font-display text-[10px] uppercase tracking-[.48em] text-antiqueGold/65">The shuffle</p>
              <h1 className="mt-4 font-zhSerif text-3xl tracking-[.12em] md:text-5xl">{locale === "en" ? "Let the disorder settle into order" : "让混乱，慢慢形成秩序"}</h1>
              <ShuffleTable muted={muted} onComplete={() => setStage("connect")} locale={locale} />
            </motion.section>
          )}

          {stage === "connect" && session && (
            <motion.section key="connect" {...pageMotion} className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-3xl flex-col items-center justify-center text-center">
              <div className="relative grid h-52 w-52 place-items-center rounded-full border border-antiqueGold/10">
                <motion.div className="absolute h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(216,191,136,.22),rgba(87,48,107,.08),transparent_70%)]" animate={{ scale: [1, 1.22, 1], opacity: [.55, 1, .55] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} />
                <span className="relative text-4xl text-antiqueGold/75">✦</span>
              </div>
              <h1 className="mt-9 font-zhSerif text-3xl leading-relaxed tracking-[.12em] md:text-5xl">{locale === "en" ? <>Hold the question quietly.<br />No need to rush the answer.</> : <>把问题留在心里。<br />不必急着寻找答案。</>}</h1>
              <p className="mt-6 max-w-lg font-zhSerif text-sm leading-7 text-moon/42">{locale === "en" ? "Breathe slowly. Imagine your hands resting over the deck, waiting for the first card to move closer." : "慢慢呼吸。想象双手覆在牌上，等第一张牌向你靠近。"}</p>
              <div className={`mt-8 flex h-12 flex-col items-center transition-opacity duration-500 ${connected ? "opacity-100" : "opacity-0"}`} aria-hidden={!connected}>
                <p id="connect-next-step" className="text-[11px] tracking-[.16em] text-antiqueGold/70">{locale === "en" ? "When you are ready, use the button below to draw cards" : "准备好后，点击下方按钮进入选牌"}</p>
                <span className="connect-guide-arrow mt-1 text-lg leading-none text-antiqueGold/70">↓</span>
              </div>
              <button
                type="button"
                disabled={!connected}
                aria-describedby={connected ? "connect-next-step" : undefined}
                onClick={() => setStage("draw")}
                className={`gold-button rounded-full px-10 py-4 text-sm tracking-[.18em] disabled:cursor-wait disabled:opacity-35 ${connected ? "connect-ready-button cursor-pointer" : ""}`}
              >
                {connected ? locale === "en" ? "I am ready · Draw cards" : "我准备好了 · 进入选牌" : locale === "en" ? "Connecting..." : "正在连接…"}
              </button>
            </motion.section>
          )}

          {(stage === "draw" || stage === "reveal") && session && (
            <motion.section key="table" {...pageMotion} className="mx-auto max-w-[1220px] pt-4 text-center">
              <p className="font-display text-[10px] uppercase tracking-[.42em] text-antiqueGold/65">{stage === "draw" ? "Choose by instinct" : "The cards speak"}</p>
              <h1 className="mt-3 font-zhSerif text-2xl tracking-[.1em] md:text-4xl">
                {stage === "draw" ? locale === "en" ? "What first draws you is rarely accidental" : "第一眼吸引你的，往往不是偶然" : locale === "en" ? "The secret is opening card by card" : "秘密正在一张一张打开"}
              </h1>
              <p className="mt-3 text-xs tracking-[.18em] text-moon/35">
                {stage === "draw"
                  ? locale === "en" ? `Full 78-card deck · Selected ${selectedCount} / ${neededCount}` : `完整 78 张牌 · 已选择 ${selectedCount} / ${neededCount}`
                  : locale === "en" ? `Revealing ${Math.min(revealCount + 1, neededCount)} / ${neededCount}` : `正在揭示 ${Math.min(revealCount + 1, neededCount)} / ${neededCount}`}
              </p>
              {stage === "draw" && <FanDeck deck={session.deck} selected={session.selected} locked={selectedCount >= neededCount} onSelect={selectCard} locale={locale} />}
              <div className={stage === "draw" ? "-mt-8 md:-mt-20" : "mt-8"}>
                <SpreadBoard spread={spread} selected={session.selected} revealCount={revealCount} showMeanings={stage === "reveal"} locale={locale} />
              </div>
            </motion.section>
          )}

          {stage === "reading" && session && (
            <motion.section key="reading" {...pageMotion} className="mx-auto max-w-[1320px] py-7">
              <div className="mb-8 text-center">
                <p className="font-display text-[10px] uppercase tracking-[.46em] text-antiqueGold/65">Your reflection</p>
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
              <div className="mt-9 text-center"><button type="button" onClick={restart} className="text-xs tracking-[.2em] text-moon/35 hover:text-antiqueGold">{locale === "en" ? "Start a new reading" : "开始一次新的占卜"}</button></div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {historyOpen && (
          <motion.div className="fixed inset-0 z-[100] flex justify-end bg-black/65 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setHistoryOpen(false)}>
            <motion.aside className="h-full w-full max-w-md overflow-y-auto border-l border-antiqueGold/15 bg-[#0b0710] p-6" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ ease: [0.2, .8, .2, 1] }} onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div><p className="font-display text-[10px] uppercase tracking-[.35em] text-antiqueGold/60">Private archive</p><h2 className="mt-2 font-zhSerif text-3xl">{locale === "en" ? "Your readings" : "你的解读"}</h2></div>
                <button type="button" onClick={() => setHistoryOpen(false)} className="text-2xl text-moon/40">×</button>
              </div>
              <div className="mt-8 space-y-3">
                {history.length === 0 && <p className="rounded-2xl border border-white/[.06] p-6 text-sm leading-7 text-moon/35">{locale === "en" ? "After you complete a reading, it will be quietly saved on this device." : "完成一次占卜后，结果会安静地保存在这台设备里。"}</p>}
                {history.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
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
                    }}
                    className="w-full rounded-2xl border border-white/[.06] bg-white/[.02] p-5 text-left transition hover:border-antiqueGold/25 hover:bg-white/[.035]"
                  >
                    <p className="text-[10px] tracking-[.2em] text-antiqueGold/55">{item.locale === "en" ? spreadById.get(item.spreadId)?.nameEn : spreadById.get(item.spreadId)?.name} · {new Date(item.createdAt).toLocaleDateString(item.locale === "en" ? "en-US" : "zh-CN")}</p>
                    <p className="mt-2 line-clamp-2 font-zhSerif text-sm leading-6 text-moon/65">{item.question || (item.locale === "en" ? "A question held silently" : "一个没有说出口的问题")}</p>
                  </button>
                ))}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
