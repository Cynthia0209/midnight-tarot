"use client";

import type { SavedReading } from "@/lib/reading";
import { readingToPlainText } from "@/lib/reading";
import { spreadById } from "@/data/spreads";
import { tarotCardById } from "@/data/tarotCards";

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const char of text) {
    const test = line + char;
    if (context.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export async function createShareImage(reading: SavedReading): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1440;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");

  const gradient = context.createLinearGradient(0, 0, 1080, 1440);
  gradient.addColorStop(0, "#08060f");
  gradient.addColorStop(0.5, "#160d25");
  gradient.addColorStop(1, "#050408");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(211,185,126,.45)";
  context.lineWidth = 2;
  context.strokeRect(54, 54, 972, 1332);

  context.textAlign = "center";
  context.fillStyle = "#d8bf88";
  context.font = "28px Georgia";
  context.fillText("MIDNIGHT TAROT", 540, 125);
  context.fillStyle = "#f5efe7";
  context.font = "56px Georgia";
  context.fillText(spreadById.get(reading.spreadId)?.name ?? "塔罗解读", 540, 205);

  if (reading.question) {
    context.fillStyle = "rgba(245,239,231,.72)";
    context.font = "30px serif";
    wrapText(context, reading.question, 780).slice(0, 2).forEach((line, index) => context.fillText(line, 540, 270 + index * 40));
  }

  const cardWidth = Math.min(190, 820 / reading.cards.length);
  const startX = 540 - ((reading.cards.length - 1) * cardWidth) / 2;
  reading.cards.forEach((selected, index) => {
    const card = tarotCardById.get(selected.cardId);
    const x = startX + index * cardWidth;
    context.fillStyle = "#21132f";
    context.strokeStyle = "rgba(211,185,126,.55)";
    context.fillRect(x - 68, 360, 136, 220);
    context.strokeRect(x - 68, 360, 136, 220);
    context.fillStyle = "#d8bf88";
    context.font = "38px Georgia";
    context.fillText("✦", x, 465);
    context.fillStyle = "#f5efe7";
    context.font = "18px serif";
    context.fillText(card?.nameZh ?? "", x, 615);
    context.fillStyle = "rgba(245,239,231,.6)";
    context.font = "14px sans-serif";
    context.fillText(selected.orientation === "reversed" ? "逆位" : "正位", x, 640);
  });

  context.textAlign = "left";
  context.fillStyle = "rgba(245,239,231,.88)";
  context.font = "30px serif";
  const readingLines = wrapText(context, readingToPlainText(reading.reading).replace(/\n+/g, " "), 820).slice(0, 12);
  readingLines.forEach((line, index) => context.fillText(line, 130, 740 + index * 45));
  context.textAlign = "center";
  context.fillStyle = "rgba(216,191,136,.7)";
  context.font = "20px Georgia";
  context.fillText("把牌当作镜子，而不是命令。", 540, 1330);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not create image")), "image/png")
  );
  return new File([blob], `midnight-tarot-${reading.id}.png`, { type: "image/png" });
}

export async function shareReading(reading: SavedReading): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = await createShareImage(reading);
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: "Midnight Tarot", text: "我的午夜塔罗解读", files: [file] });
      return "shared";
    } catch (error) {
      const cancelled =
        error instanceof DOMException && error.name === "AbortError" ||
        error instanceof Error && /cancel(?:led|ed)?/i.test(error.message);

      if (cancelled) return "cancelled";
      throw error;
    }
  }

  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(file);
  link.href = objectUrl;
  link.download = file.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  return "downloaded";
}
