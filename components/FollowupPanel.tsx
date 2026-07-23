"use client";

import { useEffect, useState } from "react";
import type { SavedReading } from "@/lib/reading";
import { anonymousFetch } from "@/lib/supabaseClient";
import type { Locale } from "@/lib/locale";

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

  useEffect(() => {
    if (savedReading) {
      void syncReading(savedReading);
      void loadFollowups(savedReading.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedReading?.id]);

  async function syncReading(reading: SavedReading) {
    setSyncMessage("");
    const response = await anonymousFetch("/api/readings", {
      method: "POST",
      body: JSON.stringify(reading),
    });
    if (!response.ok) setSyncMessage(locale === "en" ? "Cloud follow-up history is temporarily unavailable. You can still ask, but follow-ups may not remain after refresh." : "云端追问记录暂时不可用；你仍然可以继续问，但刷新后可能不会保留这些追问。");
  }

  async function loadFollowups(readingId: string) {
    const response = await anonymousFetch(`/api/followups?readingId=${encodeURIComponent(readingId)}`);
    const data = await response.json().catch(() => ({})) as { followups?: Followup[] };
    if (response.ok) setFollowups(data.followups ?? []);
  }

  async function submitFollowup() {
    if (!savedReading || !question.trim()) return;
    setFollowupBusy(true);
    setFollowupError("");
    try {
      const response = await anonymousFetch("/api/followups", {
        method: "POST",
        body: JSON.stringify({ readingId: savedReading.id, question: question.trim(), reading: savedReading }),
      });
      const data = await response.json() as { followup?: Followup; error?: string };
      if (!response.ok || !data.followup) throw new Error(data.error ?? (locale === "en" ? "Follow-up failed." : "追问失败。"));
      setFollowups((items) => [...items, data.followup!]);
      setQuestion("");
    } catch (error) {
      setFollowupError(error instanceof Error ? error.message : locale === "en" ? "Follow-up failed." : "追问失败。");
    } finally {
      setFollowupBusy(false);
    }
  }

  return (
    <section className="mt-16 border-t border-antiqueGold/15 pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-[10px] uppercase tracking-[.44em] text-antiqueGold/62">Further question</p>
          <h2 className="mt-3 font-zhSerif text-3xl tracking-[.08em] text-moon">{locale === "en" ? "Ask a little more" : "继续问一问"}</h2>
          <p className="mt-4 max-w-2xl font-zhSerif text-[16px] leading-8 tracking-[.025em] text-moon/64 md:text-[17px]">
            {locale === "en"
              ? "Free testing mode is on. You can ask about this same spread without drawing new cards or using credits."
              : "现在是免费测试模式。你可以围绕这一次牌阵继续追问，不会重新抽牌，也不会消耗次数。"}
          </p>
        </div>
        <div className="text-right text-xs leading-6 text-moon/35">
          <p>Free follow-up mode</p>
          <p className="font-display uppercase tracking-[.28em] text-antiqueGold/55">Unlimited</p>
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
            className="min-h-28 w-full resize-none rounded-[24px] border border-white/[.08] bg-white/[.025] px-5 py-4 font-zhSerif text-base leading-8 text-moon outline-none placeholder:text-moon/25 focus:border-antiqueGold/35"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-moon/35">{locale === "en" ? "Free follow-up" : "免费追问"} · {question.length}/240</p>
            <button type="button" disabled={followupBusy || !question.trim()} onClick={() => void submitFollowup()} className="gold-button rounded-full px-7 py-3 text-xs tracking-[.16em] disabled:opacity-45">
              {followupBusy ? locale === "en" ? "The reader is looking at the cards..." : "占卜师正在看牌…" : locale === "en" ? "Submit follow-up" : "提交追问"}
            </button>
          </div>
        </div>
      )}

      {followupError && <p className="mt-4 text-sm text-rose-100/70">{followupError}</p>}

      {followups.length > 0 && (
        <div className="mt-10 space-y-8">
          {followups.map((item, index) => (
            <article key={item.id ?? index} className="border-t border-antiqueGold/10 pt-7">
              <p className="text-[10px] uppercase tracking-[.28em] text-antiqueGold/55">Follow-up {String(index + 1).padStart(2, "0")}</p>
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
    </section>
  );
}
