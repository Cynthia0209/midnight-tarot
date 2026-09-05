import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const cardsDir = path.resolve("public/cards");
const expectedHashes = {
  "ace-of-swords.jpg": "32f0f932346a25b6ec3753ff95d3e4a7481cb5c3582205ba76c53356a496f15a",
  "page-of-swords.jpg": "ac69cec7c4b763fe229b3bc43214d5c81e573abe0584a13691970ab65be351ad",
  "knight-of-swords.jpg": "b38c1618eb6b5eca33d5bfebfddf8739773fb4ec8918a8946b4df2790d95db4e",
  "queen-of-swords.jpg": "55854543540d12f9c201197537f4521b22379b84d0955149621755601ce6da90",
  "king-of-swords.jpg": "5307da08322c8ccf2bc748aec5fe919e16849568fda3986225a921bf2cac9cee",
  "page-of-pentacles.jpg": "d2c3cb2f6a602e62748f873eca72acfab06b64a6de50cf3499e6197d650b6fe9",
  "knight-of-pentacles.jpg": "6a652fbf447b7d0c78145627749c87806d1c356e96e73ca365d2618d9b255e9f",
  "queen-of-pentacles.jpg": "051a9a46a806910754969d806b3cf1e1621d30f51225b0a3db9b5474e222a877",
  "king-of-pentacles.jpg": "887b31bb3a9213e9f97dd6fd9c0f8b421c24735f3a0efd1d087fadfb600b0020",
};

const jpgFiles = (await readdir(cardsDir)).filter((name) => name.endsWith(".jpg"));
const failures = [];

if (jpgFiles.length !== 78) {
  failures.push(`expected 78 JPG card faces, found ${jpgFiles.length}`);
}

const hashOwners = new Map();
for (const file of jpgFiles) {
  const buffer = await readFile(path.join(cardsDir, file));
  const hash = createHash("sha256").update(buffer).digest("hex");
  const duplicate = hashOwners.get(hash);
  if (duplicate) failures.push(`${file} duplicates ${duplicate}`);
  else hashOwners.set(hash, file);

  if (expectedHashes[file] && expectedHashes[file] !== hash) {
    failures.push(`${file} does not match its verified card face`);
  }
}

for (const file of Object.keys(expectedHashes)) {
  if (!jpgFiles.includes(file)) failures.push(`${file} is missing`);
}

if (failures.length) {
  console.error("Card asset verification failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Card asset verification passed: 78 unique card faces, verified mappings intact.");
