import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src/lib/i18n.ts"), "utf8");
const sections = [
  ["en", "const en: Dict = {", "const hy: Dict = {"],
  ["hy", "const hy: Dict = {", "const ru: Dict = {"],
  ["ru", "const ru: Dict = {", "const DICTS:"],
];
const dictionaries = {};
let failed = false;

for (const [locale, start, end] of sections) {
  const block = source.slice(source.indexOf(start), source.indexOf(end));
  const keys = [...block.matchAll(/^\s*"([^"]+)":/gm)].map((match) => match[1]);
  const duplicateKeys = [...new Set(keys.filter((key, index) => keys.indexOf(key) !== index))];
  dictionaries[locale] = new Set(keys);
  console.log(`${locale}: ${keys.length} keys; duplicates: ${duplicateKeys.join(", ") || "none"}`);
  failed ||= duplicateKeys.length > 0;
}

for (const locale of ["hy", "ru"]) {
  const missing = [...dictionaries.en].filter((key) => !dictionaries[locale].has(key));
  const extra = [...dictionaries[locale]].filter((key) => !dictionaries.en.has(key));
  console.log(`${locale}: missing ${missing.length}; extra ${extra.length}`);
  if (missing.length) console.log(`  missing: ${missing.join(", ")}`);
  if (extra.length) console.log(`  extra: ${extra.join(", ")}`);
  failed ||= missing.length > 0 || extra.length > 0;
}

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [target] : [];
  });
}

const usedKeys = new Set();
for (const file of sourceFiles(path.join(process.cwd(), "src"))) {
  const content = fs.readFileSync(file, "utf8");
  for (const match of content.matchAll(/\bt\(\s*["']([^"']+)["']/g)) usedKeys.add(match[1]);
  for (const match of content.matchAll(/\btranslateText\(\s*["']([^"']+)["']/g)) usedKeys.add(match[1]);
}
const unknownKeys = [...usedKeys].filter((key) => !dictionaries.en.has(key)).sort();
console.log(`literal translation keys: ${usedKeys.size}; unknown: ${unknownKeys.length}`);
if (unknownKeys.length) console.log(`  unknown: ${unknownKeys.join(", ")}`);
failed ||= unknownKeys.length > 0;

process.exitCode = failed ? 1 : 0;
