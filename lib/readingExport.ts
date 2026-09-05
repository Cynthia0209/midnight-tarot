import { readingToPlainText, type SavedReading } from "@/lib/reading";
import { spreadById } from "@/data/spreads";
import { createShareImage } from "@/lib/share";

export function buildReadingMarkdown(item: SavedReading): string {
  const spread = spreadById.get(item.spreadId);
  const title = item.locale === "en" ? spread?.nameEn ?? item.spreadId : spread?.name ?? item.spreadId;
  const questionLine = item.question?.trim()
    ? `> ${item.question.trim()}`
    : item.locale === "en"
      ? "> A question held silently"
      : "> 一个没有说出口的问题";
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
}

export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportReadingImage(item: SavedReading): Promise<void> {
  const file = await createShareImage(item);
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `midnight-tarot-${item.spreadId}-${item.createdAt.slice(0, 10)}.png`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
