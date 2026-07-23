"use client";

import type { SavedReading } from "@/lib/reading";
import { isStructuredReadingV3, personalizeReadingContent, type ReadingContent } from "@/lib/reading";
import { spreadById } from "@/data/spreads";
import { tarotCardById } from "@/data/tarotCards";
import type { Locale } from "@/lib/locale";

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

type RichSegment = {
  text: string;
  bold: boolean;
};

type RichLine = RichSegment[];

type ShareTextSection = {
  eyebrow: string;
  title?: string;
  body: string;
};

const BODY_FONT = "30px serif";
const BODY_BOLD_FONT = "700 30px serif";
const SECTION_LABEL_FONT = "18px Georgia";
const SECTION_TITLE_FONT = "34px serif";
const CARD_TITLE_FONT = "30px serif";
const TEXT_MAX_WIDTH = 820;
const TEXT_LEFT = 130;
const LINE_HEIGHT = 45;
const SECTION_GAP = 34;

function splitMarkdownBold(text: string): RichSegment[] {
  const segments: RichSegment[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > cursor) {
      segments.push({ text: text.slice(cursor, match.index), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), bold: false });
  }

  return segments.filter((segment) => segment.text.length > 0);
}

function measureSegment(context: CanvasRenderingContext2D, segment: RichSegment) {
  context.font = segment.bold ? BODY_BOLD_FONT : BODY_FONT;
  return context.measureText(segment.text).width;
}

function wrapRichText(context: CanvasRenderingContext2D, text: string, maxWidth: number): RichLine[] {
  const lines: RichLine[] = [];
  let line: RichLine = [];
  let lineWidth = 0;

  const pushLine = () => {
    if (line.length) lines.push(line);
    line = [];
    lineWidth = 0;
  };

  for (const segment of splitMarkdownBold(text)) {
    let buffer = "";
    for (const char of segment.text) {
      const candidate = buffer + char;
      const candidateSegment = { text: candidate, bold: segment.bold };
      const candidateWidth = measureSegment(context, candidateSegment);

      if (lineWidth + candidateWidth > maxWidth && (line.length || buffer)) {
        if (buffer) {
          line.push({ text: buffer, bold: segment.bold });
        }
        pushLine();
        buffer = char.trimStart();
      } else {
        buffer = candidate;
      }
    }

    if (buffer) {
      const bufferedSegment = { text: buffer, bold: segment.bold };
      const bufferedWidth = measureSegment(context, bufferedSegment);
      if (lineWidth + bufferedWidth > maxWidth && line.length) pushLine();
      line.push(bufferedSegment);
      lineWidth += bufferedWidth;
    }
  }

  pushLine();
  return lines;
}

function drawRichLine(context: CanvasRenderingContext2D, line: RichLine, x: number, y: number) {
  let cursor = x;
  for (const segment of line) {
    context.font = segment.bold ? BODY_BOLD_FONT : BODY_FONT;
    context.fillStyle = segment.bold ? "#fff7df" : "rgba(245,239,231,.88)";
    context.fillText(segment.text, cursor, y);
    cursor += context.measureText(segment.text).width;
  }
}

function drawRichParagraph(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
) {
  const paragraphs = text
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, " ").trim())
    .filter(Boolean);

  let cursorY = y;
  for (const [paragraphIndex, paragraph] of paragraphs.entries()) {
    const lines = wrapRichText(context, paragraph, maxWidth);
    for (const line of lines) {
      drawRichLine(context, line, x, cursorY);
      cursorY += LINE_HEIGHT;
    }
    if (paragraphIndex < paragraphs.length - 1) cursorY += 14;
  }

  return cursorY;
}

function sectionHeight(context: CanvasRenderingContext2D, section: ShareTextSection) {
  const titleHeight = section.title ? 54 : 0;
  const paragraphLines = section.body
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, " ").trim())
    .filter(Boolean)
    .reduce((total, paragraph) => total + wrapRichText(context, paragraph, TEXT_MAX_WIDTH).length, 0);
  const paragraphGaps = Math.max(0, section.body.split(/\n{2,}/).filter((item) => item.trim()).length - 1) * 14;
  return 44 + titleHeight + paragraphLines * LINE_HEIGHT + paragraphGaps + SECTION_GAP;
}

function readingToShareSections(reading: ReadingContent, cards: SavedReading["cards"], locale: Locale): ShareTextSection[] {
  const personalized = personalizeReadingContent(reading);

  if (typeof personalized === "string") {
    return personalized
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph, index) => ({
        eyebrow: index === 0 ? "READING" : `PART ${index + 1}`,
        title: index === 0 ? locale === "en" ? "Reading" : "解读" : undefined,
        body: paragraph,
      }));
  }

  const sections: ShareTextSection[] = [];
  if (isStructuredReadingV3(personalized) && personalized.questionFocus.trim()) {
    sections.push({ eyebrow: "FOCUS", title: locale === "en" ? "Core question" : "问题的核心", body: personalized.questionFocus });
  }
  sections.push({ eyebrow: "OPENING", title: locale === "en" ? "Opening" : "开场", body: personalized.opening });

  personalized.cards.forEach((card, index) => {
    const selected = cards.find((item) => item.positionId === card.positionId);
    const tarotCard = selected ? tarotCardById.get(selected.cardId) : undefined;
    const orientation = selected?.orientation === "reversed"
      ? locale === "en" ? "reversed" : "逆位"
      : locale === "en" ? "upright" : "正位";
    const title = tarotCard
      ? locale === "en"
        ? `${card.positionTitle} | ${tarotCard.name} (${orientation})`
        : `${card.positionTitle}｜${tarotCard.nameZh} ${tarotCard.name}（${orientation}）`
      : card.positionTitle;
    sections.push({
      eyebrow: `CARD ${String(index + 1).padStart(2, "0")}`,
      title,
      body: card.interpretation,
    });
  });

  sections.push({ eyebrow: "CONNECTIONS", title: locale === "en" ? "Between the cards" : "牌之间的关系", body: personalized.connections });
  if (isStructuredReadingV3(personalized)) {
    sections.push({
      eyebrow: "REALITY CHECKS",
      title: locale === "en" ? "Reality checks" : "现实观察",
      body: personalized.realityChecks.map((item, index) => `${index + 1}. ${item}`).join("\n\n"),
    });
  }
  sections.push({ eyebrow: "SUMMARY", title: locale === "en" ? "Summary" : "总结", body: personalized.summary });
  return sections;
}

function drawTextSection(
  context: CanvasRenderingContext2D,
  section: ShareTextSection,
  y: number,
) {
  context.textAlign = "left";
  context.fillStyle = "rgba(216,191,136,.72)";
  context.font = SECTION_LABEL_FONT;
  context.letterSpacing = "0.18em";
  context.fillText(section.eyebrow, TEXT_LEFT, y);
  context.letterSpacing = "0px";

  let cursorY = y + 44;
  if (section.title) {
    context.fillStyle = "#f5efe7";
    context.font = section.title.includes("｜") ? CARD_TITLE_FONT : SECTION_TITLE_FONT;
    context.fillText(section.title, TEXT_LEFT, cursorY);
    cursorY += 54;
  }

  cursorY = drawRichParagraph(context, section.body, TEXT_LEFT, cursorY, TEXT_MAX_WIDTH);

  context.strokeStyle = "rgba(211,185,126,.16)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(TEXT_LEFT, cursorY + 10);
  context.lineTo(TEXT_LEFT + TEXT_MAX_WIDTH, cursorY + 10);
  context.stroke();

  return cursorY + SECTION_GAP;
}

async function loadCardImage(path: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = new URL(path, window.location.origin).href;
  });
}

function drawCardImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  reversed: boolean,
) {
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;

  if (sourceRatio > targetRatio) {
    sourceWidth = image.naturalHeight * targetRatio;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = image.naturalWidth / targetRatio;
    sourceY = (image.naturalHeight - sourceHeight) / 2;
  }

  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  if (reversed) {
    context.translate(x + width / 2, y + height / 2);
    context.rotate(Math.PI);
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      -width / 2,
      -height / 2,
      width,
      height,
    );
  } else {
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      x,
      y,
      width,
      height,
    );
  }
  context.restore();
}

export async function createShareImage(reading: SavedReading): Promise<File> {
  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d");
  if (!measureContext) throw new Error("Canvas is unavailable");
  const locale = reading.locale ?? "zh";
  const sections = readingToShareSections(reading.reading, reading.cards, locale);
  const textStartY = 720;
  const estimatedTextHeight = sections.reduce((total, section) => total + sectionHeight(measureContext, section), 0);

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = Math.max(1440, Math.min(6400, textStartY + estimatedTextHeight + 170));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");

  const gradient = context.createLinearGradient(0, 0, 1080, canvas.height);
  gradient.addColorStop(0, "#08060f");
  gradient.addColorStop(0.5, "#160d25");
  gradient.addColorStop(1, "#050408");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(211,185,126,.45)";
  context.lineWidth = 2;
  context.strokeRect(54, 54, 972, canvas.height - 108);

  context.textAlign = "center";
  context.fillStyle = "#d8bf88";
  context.font = "28px Georgia";
  context.fillText("MIDNIGHT TAROT", 540, 125);
  context.fillStyle = "#f5efe7";
  context.font = "56px Georgia";
  const spread = spreadById.get(reading.spreadId);
  context.fillText(locale === "en" ? spread?.nameEn ?? "Tarot Reading" : spread?.name ?? "塔罗解读", 540, 205);

  if (reading.question) {
    context.fillStyle = "rgba(245,239,231,.72)";
    context.font = "30px serif";
    wrapText(context, reading.question, 780).slice(0, 2).forEach((line, index) => context.fillText(line, 540, 270 + index * 40));
  }

  const loadedCardImages = await Promise.all(
    reading.cards.map((selected) => {
      const card = tarotCardById.get(selected.cardId);
      return card ? loadCardImage(card.imagePath) : Promise.resolve(null);
    }),
  );

  const cardSpacing = Math.min(190, 820 / reading.cards.length);
  const startX = 540 - ((reading.cards.length - 1) * cardSpacing) / 2;
  reading.cards.forEach((selected, index) => {
    const card = tarotCardById.get(selected.cardId);
    const image = loadedCardImages[index];
    const x = startX + index * cardSpacing;
    const imageX = x - 68;
    const imageY = 360;
    const imageWidth = 136;
    const imageHeight = 220;

    context.fillStyle = "#21132f";
    context.strokeStyle = "rgba(211,185,126,.55)";
    context.fillRect(imageX, imageY, imageWidth, imageHeight);
    if (image) {
      drawCardImage(
        context,
        image,
        imageX,
        imageY,
        imageWidth,
        imageHeight,
        selected.orientation === "reversed",
      );
      const shade = context.createLinearGradient(0, imageY, 0, imageY + imageHeight);
      shade.addColorStop(0, "rgba(22,10,31,.04)");
      shade.addColorStop(1, "rgba(10,5,15,.22)");
      context.fillStyle = shade;
      context.fillRect(imageX, imageY, imageWidth, imageHeight);
    } else {
      context.fillStyle = "#d8bf88";
      context.font = "38px Georgia";
      context.fillText("✦", x, 465);
    }
    context.strokeStyle = "rgba(211,185,126,.72)";
    context.lineWidth = 2;
    context.strokeRect(imageX, imageY, imageWidth, imageHeight);
    context.strokeStyle = "rgba(211,185,126,.28)";
    context.lineWidth = 1;
    context.strokeRect(imageX + 6, imageY + 6, imageWidth - 12, imageHeight - 12);
    context.fillStyle = "#f5efe7";
    context.font = "18px serif";
    context.fillText(locale === "en" ? card?.name ?? "" : card?.nameZh ?? "", x, 615);
    context.fillStyle = "rgba(245,239,231,.6)";
    context.font = "14px sans-serif";
    context.fillText(selected.orientation === "reversed" ? locale === "en" ? "reversed" : "逆位" : locale === "en" ? "upright" : "正位", x, 640);
  });

  let cursorY = textStartY;
  sections.forEach((section) => {
    cursorY = drawTextSection(context, section, cursorY);
  });

  context.textAlign = "center";
  context.fillStyle = "rgba(216,191,136,.7)";
  context.font = "20px Georgia";
  context.fillText(locale === "en" ? "Treat the cards as a mirror, not a command." : "把牌当作镜子，而不是命令。", 540, canvas.height - 92);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not create image")), "image/png")
  );
  return new File([blob], `midnight-tarot-${reading.id}.png`, { type: "image/png" });
}

export async function shareReading(reading: SavedReading): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = await createShareImage(reading);
  const prefersNativeShare = window.matchMedia("(pointer: coarse)").matches;
  if (prefersNativeShare && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: "Midnight Tarot", text: reading.locale === "en" ? "My Midnight Tarot reading" : "我的午夜塔罗解读", files: [file] });
      return "shared";
    } catch (error) {
      const cancelled =
        error instanceof DOMException && error.name === "AbortError" ||
        error instanceof Error && /cancel(?:led|ed)?/i.test(error.message);

      if (cancelled) return "cancelled";
    }
  }

  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(file);
  link.href = objectUrl;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  return "downloaded";
}
