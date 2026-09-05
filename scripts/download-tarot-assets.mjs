import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve("public/cards");
await mkdir(outputDir, { recursive: true });

const slugify = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const majorNames = [
  "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor", "The Hierophant", "The Lovers",
  "The Chariot", "Strength", "The Hermit", "Wheel of Fortune", "Justice", "The Hanged Man", "Death", "Temperance",
  "The Devil", "The Tower", "The Star", "The Moon", "The Sun", "Judgement", "The World",
];
const suits = [
  ["Wands", "wa"],
  ["Cups", "cu"],
  ["Swords", "sw"],
  ["Pentacles", "pe"],
];
const rankNames = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King"];
const rankCodes = ["ac", "02", "03", "04", "05", "06", "07", "08", "09", "10", "pa", "kn", "qu", "ki"];

// The mirror's nine fallback files are mislabeled. Use the explicitly named
// Wikimedia Commons originals for these cards instead.
const commonsOverrides = {
  "ace-of-swords.jpg": "Swords01.jpg",
  "page-of-swords.jpg": "Swords11.jpg",
  "knight-of-swords.jpg": "Swords12.jpg",
  "queen-of-swords.jpg": "Swords13.jpg",
  "king-of-swords.jpg": "Swords14.jpg",
  "page-of-pentacles.jpg": "Pents11.jpg",
  "knight-of-pentacles.jpg": "Pents12.jpg",
  "queen-of-pentacles.jpg": "Pents13.jpg",
  "king-of-pentacles.jpg": "Pents14.jpg",
};

const files = majorNames.map((name, index) => ({
  local: `${slugify(name)}.jpg`,
  code: `ar${String(index).padStart(2, "0")}`,
})).concat(suits.flatMap(([suit, prefix]) => rankNames.map((rank, index) => ({
  local: `${slugify(`${rank} of ${suit}`)}.jpg`,
  code: `${prefix}${rankCodes[index]}`,
}))));

async function download(item, attempt = 1) {
  const target = path.join(outputDir, item.local);
  try {
    const commonsFile = commonsOverrides[item.local];
    const url = commonsFile
      ? `https://commons.wikimedia.org/wiki/Special:Redirect/file/${commonsFile}`
      : `https://raw.githubusercontent.com/seven102161/elaine-tarot-cards/main/cards/${item.code}.jpg`;
    const response = await fetch(url, { headers: { "User-Agent": "MidnightTarot/1.0" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await writeFile(target, Buffer.from(await response.arrayBuffer()));
    return true;
  } catch (error) {
    if (attempt < 3) return download(item, attempt + 1);
    console.error(`FAILED ${item.code}: ${error.message}`);
    return false;
  }
}

let downloaded = 0;
for (let index = 0; index < files.length; index += 8) {
  const results = await Promise.all(files.slice(index, index + 8).map((item) => download(item)));
  downloaded += results.filter(Boolean).length;
}

await writeFile(
  path.join(outputDir, "SOURCE.md"),
  `# Rider–Waite–Smith card artwork

The 78 images reproduce the original Rider–Waite–Smith artwork published in 1909.

- Local download mirror: https://github.com/seven102161/elaine-tarot-cards
- Corrected swords/pentacles fallback images: https://commons.wikimedia.org/wiki/Rider-Waite_tarot_deck
- Mirror provenance: Wikimedia Commons “Roses & Lilies” scans and public-domain RWS mirrors documented in that repository
- Copyright overview: https://commons.wikimedia.org/wiki/Rider-Waite_tarot_deck

The original artwork is public domain in the United States and in jurisdictions whose copyright term is life of the author plus 70 years or fewer. This project uses an original card-back design and does not use later copyrighted packaging or card-back artwork.
`
);

console.log(`Available card images: ${downloaded}/${files.length}`);
