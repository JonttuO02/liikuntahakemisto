// Generates placeholder PWA icons for Liikuntahakemisto.
// Produces a simple indigo (#4F46E5) square at 192x192 and 512x512.
// Run: node scripts/generate-pwa-icons.mjs
//
// Intentionally uses pureimage (pure JS, no native bindings) so this script
// works anywhere Node.js does without requiring Cairo or libvips.

import * as PImage from "pureimage";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { mkdir } from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "../public");

async function generateIcon(size) {
  const img = PImage.make(size, size);
  const ctx = img.getContext("2d");
  ctx.fillStyle = "#4F46E5"; // indigo-600 — matches manifest theme_color (D-17)
  ctx.fillRect(0, 0, size, size);
  await mkdir(new URL('../public', import.meta.url), { recursive: true });
  const outputPath = path.join(publicDir, `icon-${size}x${size}.png`);
  await PImage.encodePNGToStream(img, fs.createWriteStream(outputPath));
  console.log(`Generated ${outputPath}`);
}

try {
  await generateIcon(192);
  await generateIcon(512);
} catch (err) {
  console.error('Icon generation failed:', err);
  process.exit(1);
}
