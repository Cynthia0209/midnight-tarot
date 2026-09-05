"use client";

import { useEffect, useRef, useState } from "react";
import type { SavedReading } from "@/lib/reading";
import { anonymousFetch } from "@/lib/supabaseClient";
import type { Locale } from "@/lib/locale";
import { RitualButton } from "@/components/RitualButton";

type Followup = {
  id: string;
  question: string;
  answer: string;
  createdAt?: string;
};

function renderInlineMarkdown(text: string) {
  return text.split(/(\*\*.+?\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={index} className="font-semibold text-moon">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export function FollowupPanel({ savedReading, locale = "zh" }: { savedReading?: SavedReading; locale?: Locale }) {
  const [syncMessage, setSyncMessage] = useState("");
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [question, setQuestion] = useState("");
  const [followupBusy, setFollowupBusy] = useState(false);
  const [followupError, setFollowupError] = useState("");
  const latestAnswerRef = useRef<HTMLElement | null>(null);
  const activeReadingIdRef = useRef<string | null>(null);
  const syncPromiseRef = useRef<Promise<boolean> | null>(null);
  const followupBusyRef = useRef(false);

  useEffect(() => {
    activeReadingIdRef.current = savedReading?.id ?? null;
    setFollowups([]);
    setFollowupError("");
    if (!savedReading) return;

    const syncPromise = syncReading(savedReading);
    syncPromiseRef.current = syncPromise;
    void syncPromise.then(() => loadFollowups(savedReading.id));

    return () => {
      if (activeReadingIdRef.current === savedReading.id) activeReadingIdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedReading?.id, locale]);

  async function syncReading(reading: SavedReading): Promise<boolean> {
    if (activeReadingIdRef.current === reading.id) setSyncMessage("");
    try {
      const response = await anonymousFetch("/api/readings", {
        method: "POST",
        body: JSON.stringify(reading),
      });
      if (!response.ok && activeReadingIdRef.current === reading.id) {
        setSyncMessage(locale === "en" ? "Cloud follow-up history is temporarily unavailable. Please reconnect before asking a follow-up." : "云端追问记录暂时不可用，请恢复连接后再追问。");
      }
      return response.ok;
    } catch {
      if (activeReadingIdRef.current === reading.id) {
        setSyncMessage(locale === "en" ? "Cloud follow-up history is temporarily unavailable. Please reconnect before asking a follow-up." : "云端追问记录暂时不可用，请恢复连接后再追问。");
      }
      return false;
    }
  }

  async function loadFollowups(readingId: string) {
    try {
      const response = await anonymousFetch(`/api/followups?readingId=${encodeURIComponent(readingId)}&locale=${encodeURIComponent(locale)}`);
      const data = await response.json().catch(() => ({})) as { followups?: Followup[] };
      if (response.ok && activeReadingIdRef.current === readingId) setFollowups(data.followups ?? []);
    } catch {
      // The report itself remains usable while cloud history is unavailable.
    }
  }

  async function submitFollowup() {
    if (!savedReading || !question.trim() || followupBusyRef.current) return;
    followupBusyRef.current = true;
    setFollowupBusy(true);
    setFollowupError("");
    try {
      const initiallySynced = await syncPromiseRef.current;
      const synced = initiallySynced || await syncReading(savedReading);
      if (!synced) {
        throw new Error(locale === "en" ? "Reconnect before submitting this follow-up." : "请恢复连接后再提交追问。");
      }
      const response = await anonymousFetch("/api/followups", {
        method: "POST",
        body: JSON.stringify({ readingId: savedReading.id, question: question.trim(), reading: savedReading }),
      });
      const data = await response.json() as { followup?: Followup; error?: string };
      if (!response.ok || !data.followup) {
        throw new Error(data.error ?? (locale === "en" ? "Follow-up failed." : "追问失败。"));
      }
      setFollowups((items) => [...items, data.followup!]);
      setQuestion("");
      window.setTimeout(() => {
        latestAnswerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
    } catch (error) {
      setFollowupError(error instanceof Error ? error.message : locale === "en" ? "Follow-up failed." : "追问失败。");
    } finally {
      followupBusyRef.current = false;
      setFollowupBusy(false);
    }
  }

  return (
    <section className="followup-panel mt-16 pt-12">
      {followups.length > 0 && (
        <div className="mb-14 space-y-8" aria-label={locale === "en" ? "Previous follow-ups" : "已有追问"}>
          {followups.map((item, index) => (
            <article
              key={item.id ?? index}
              ref={index === followups.length - 1 ? latestAnswerRef : undefined}
              className="followup-answer pt-7"
            >
              <p className="text-[10px] uppercase tracking-[.28em] text-antiqueGold/62">Follow-up {String(index + 1).padStart(2, "0")}</p>
              <p className="mt-3 font-zhSerif text-lg leading-8 text-moon/78">{locale === "en" ? "You asked: " : "你问："}{item.question}</p>
              <div className="mt-4 font-zhSerif text-[17px] leading-9 tracking-[.025em] text-moon/82">
                {item.answer.split(/\n+/).filter(Boolean).map((paragraph, paragraphIndex) => (
                  <p key={paragraphIndex} className="mb-4 last:mb-0">{renderInlineMarkdown(paragraph)}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-[10px] uppercase tracking-[.44em] text-antiqueGold/62">{locale === "en" ? "Further question" : "继续追问"}</p>
          <h2 className="mt-3 font-zhSerif text-3xl tracking-[.08em] text-moon">{locale === "en" ? "Ask a little more" : "继续问一问"}</h2>
          <p className="mt-4 max-w-2xl font-zhSerif text-[16px] leading-8 tracking-[.025em] text-moon/64 md:text-[17px]">
            {locale === "en"
              ? "Continue asking about this same spread — no new cards needed."
              : "围绕这一次牌阵继续追问，无需重新抽牌。"}
          </p>
        </div>
      </div>

      {syncMessage && <p className="mt-6 text-sm text-rose-100/65">{syncMessage}</p>}

      {savedReading && (
        <div className="mt-8">
          <p className="mb-4 font-zhSerif text-[15px] leading-7 tracking-[.02em] text-moon/58 md:text-base">{locale === "en" ? "Follow-ups continue from this reading's question, context, spread, and drawn cards." : "追问会继续使用这一次的原问题、背景、牌阵和已抽到的牌。"}</p>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value.slice(0, 240))}
            placeholder={locale === "en" ? "Ask one specific follow-up about this spread..." : "围绕这次牌阵继续问一个具体问题…"}
            className="followup-question min-h-28 w-full resize-none px-5 py-4 font-zhSerif text-base leading-8 text-moon outline-none placeholder:text-moon/55"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-moon/55">{locale === "en" ? "Follow-up" : "追问"} · {question.length}/240</p>
            <RitualButton type="button" compact disabled={followupBusy || !question.trim()} onClick={() => void submitFollowup()}>
              {followupBusy ? locale === "en" ? "The reader is looking at the cards..." : "占卜师正在看牌…" : locale === "en" ? "Submit follow-up" : "提交追问"}
            </RitualButton>
          </div>
        </div>
      )}

      {followupBusy && (
        <div className="followup-ritual mt-8 flex flex-col items-center gap-4 py-6" aria-live="polite">
          <span className="followup-ritual-glow" aria-hidden="true" />
          <p className="font-zhSerif text-sm tracking-[.16em] text-moon/65">{locale === "en" ? "Laying your question onto the table." : "把你的问题，轻轻放在牌上。"}</p>
        </div>
      )}

      {followupError && <p className="mt-4 text-sm text-rose-100/70">{followupError}</p>}

    </section>
  );
}
