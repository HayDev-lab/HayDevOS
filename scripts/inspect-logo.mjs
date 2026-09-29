import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const require = createRequire(import.meta.url);
const sharp = require(join(dirname(fileURLToPath(import.meta.url)), "..", "node_modules", "next", "node_modules", "sharp"));

const file = "public/branding/haydevos-logo.png";
const { data, info } = await sharp(file)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
const key = (x, y) => {
  const i = (y * width + x) * channels;
  return `${data[i]},${data[i + 1]},${data[i + 2]}`;
};

const corners = [
  [0, 0],
  [width - 1, 0],
  [0, height - 1],
  [width - 1, height - 1],
  [Math.floor(width / 2), 0],
  [Math.floor(width / 2), height - 1],
  [0, Math.floor(height / 2)],
  [width - 1, Math.floor(height / 2)],
  [10, 10],
  [width - 11, 10],
  [10, height - 11],
  [width - 11, height - 11],
];

const hist = new Map();
for (let i = 0; i < data.length; i += channels) {
  const k = `${data[i]},${data[i + 1]},${data[i + 2]}`;
  hist.set(k, (hist.get(k) ?? 0) + 1);
}

const top = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

console.log(JSON.stringify({ width, height, channels }, null, 2));
console.log("corners:", corners.map(([x, y]) => `${x},${y}:${key(x, y)}`).join(" | "));
console.log("topColors:", JSON.stringify(top));