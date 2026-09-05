import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseRest } from "@/lib/supabaseServer";
import { spreadById } from "@/data/spreads";
import type { ReadingContent, SelectedReadingCard } from "@/lib/reading";
import type { Locale } from "@/lib/locale";
import { SharedReading } from "@/components/SharedReading";

export const dynamic = "force-dynamic";

type ReadingRow = {
  id: string;
  spread_id: string;
  question: string;
  context?: string;
  cards: SelectedReadingCard[];
  reading: ReadingContent;
  locale: Locale;
  created_at: string;
  client_id_hash: string;
};

const READING_SELECT = "id,spread_id,question,context,cards,reading,locale,created_at,client_id_hash";

async function loadRow(id: string): Promise<ReadingRow | null> {
  try {
    const rows = await supabaseRest<ReadingRow[]>(
      `reading_sessions?select=${READING_SELECT}&id=eq.${encodeURIComponent(id)}`,
      { method: "GET" },
    );
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const row = await loadRow(id);
  const spread = row ? spreadById.get(row.spread_id) : undefined;
  const title = row
    ? (row.locale === "en" ? spread?.nameEn ?? "A reading" : spread?.name ?? "一次占卜")
    : "Midnight Tarot";
  return {
    title: `${title} · Midnight Tarot`,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${title} · Midnight Tarot`,
      description: "A private midnight ritual, shared as a reflection.",
      type: "article",
    },
  };
}

export default async function ReadingSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await loadRow(id);
  if (!row) notFound();

  const spread = spreadById.get(row.spread_id);
  const spreadName = row.locale === "en" ? spread?.nameEn : spread?.name;

  return (
    <main className="relative z-10 min-h-screen">
      <SharedReading
        readingId={row.id}
        publicReading={{
          id: row.id,
          spreadId: row.spread_id,
          cards: row.cards,
          reading: row.reading,
          locale: row.locale,
          createdAt: row.created_at,
        }}
        spreadName={spreadName}
        locale={row.locale}
      />
    </main>
  );
}
