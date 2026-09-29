import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const sharp = require(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "node_modules",
    "next",
    "node_modules",
    "sharp",
  ),
);

const source = "public/branding/haydevos-logo.png";
const destination = "public/branding/haydevos-logo-transparent.png";

// Background is near-black (RGB ≈ 0–4). Treat anything darker than 24 as
// background, fade 24–48 for a smooth anti-aliased edge, keep brighter pixels
// fully opaque. This preserves the cyan/white sign while dropping the canvas.
const THRESHOLD_FULL = 24;
const THRESHOLD_FADE = 48;

const raw = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { data, info } = raw;
const { width, height, channels } = info;

const out = Buffer.alloc(width * height * 4);
for (let i = 0, p = 0; i < data.length; i += channels, p += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  let alpha = 255;
  if (lum <= THRESHOLD_FULL) {
    alpha = 0;
  } else if (lum <= THRESHOLD_FADE) {
    alpha = Math.round(((lum - THRESHOLD_FULL) / (THRESHOLD_FADE - THRESHOLD_FULL)) * 255);
  }
  out[p] = r;
  out[p + 1] = g;
  out[p + 2] = b;
  out[p + 3] = alpha;
}

await sharp(out, { raw: { width, height, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(destination);

const stats = await sharp(destination).stats();
console.log(JSON.stringify({ destination, alphaChannels: stats.channels, size: (await readFile(destination)).length }, null, 2));
void writeFile;