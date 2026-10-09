import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

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

function readValue(node) {
  if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return readValue(node.expression);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(readValue);
  if (ts.isObjectLiteralExpression(node)) {
    return Object.fromEntries(node.properties.filter(ts.isPropertyAssignment).map((property) => [property.name.text, readValue(property.initializer)]));
  }
  throw new Error(`Unsupported translation value: ${node.getText()}`);
}

function declarations(file) {
  const parsed = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const values = {};
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.initializer && ["en", "hy", "ru", "coreLocales", "workspaceCopy", "studioCopy"].includes(node.name.getText(parsed))) values[node.name.getText(parsed)] = readValue(node.initializer);
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  return values;
}

function leaves(value, prefix = "", result = {}) {
  for (const [key, entry] of Object.entries(value)) {
    const target = prefix ? `${prefix}.${key}` : key;
    if (typeof entry === "string") result[target] = entry;
    else leaves(entry, target, result);
  }
  return result;
}

const groups = {
  interface: declarations("src/lib/i18n.ts"),
  core: declarations("src/components/core/locales.ts").coreLocales,
  workspace: declarations("src/components/core/copy.ts").workspaceCopy,
  studio: declarations("src/components/core/studio-copy.ts").studioCopy,
};
const placeholders = (value) => [...new Set([...value.matchAll(/\{([\w]+)\}/g)].map((match) => match[1]))].sort().join(",");
for (const [name, group] of Object.entries(groups)) {
  const reference = leaves(group.en);
  for (const locale of ["en", "hy", "ru"]) {
    const translated = leaves(group[locale]);
    const missing = Object.keys(reference).filter((key) => !Object.hasOwn(translated, key));
    const extra = Object.keys(translated).filter((key) => !Object.hasOwn(reference, key));
    const invalidParams = Object.keys(reference).filter((key) => translated[key] && placeholders(reference[key]) !== placeholders(translated[key]));
    const empty = Object.keys(translated).filter((key) => !translated[key].trim());
    console.log(`${name}/${locale}: ${Object.keys(translated).length} entries; missing ${missing.length}; extra ${extra.length}; placeholder mismatches ${invalidParams.length}; empty ${empty.length}`);
    if (missing.length) console.error(`  missing: ${missing.join(", ")}`);
    if (extra.length) console.error(`  extra: ${extra.join(", ")}`);
    for (const key of invalidParams) console.error(`  ${locale}:${key}: expected {${placeholders(reference[key])}}, found {${placeholders(translated[key])}}`);
    if (empty.length) console.error(`  empty: ${empty.join(", ")}`);
    failed ||= Boolean(missing.length || extra.length || invalidParams.length || empty.length);
  }
}

// Brand names, currencies, keyboard shortcuts, version markers and required asset credits.
const languageIndependent = new Set([
  "Հայ", "Dev", "DevOS", "ՀայDevOS", "HayDevOS", "HAYDEVOS ·", "ՀայDevOS ·", "Owner AI", "Owner AI ·", "LeadOS / CRM",
  "QuoteFlow", "DocumentFlow", "ERP Hub", "HMAC", "HMAC ✓", "HMAC ✗", "USD", "EUR", "AMD", "(USD)",
  "Հայերեն", "Русский", "English", "Solar System Scope / INOVE", "CC BY 4.0", "· three.js",
  "v", "· v", "r", "· r", "X", "Y", "⌘K", "⌘H ·", "&nbsp;",
]);
const visibleAttributes = new Set(["placeholder", "title", "aria-label", "alt", "label"]);
const untranslated = [];
const translatedValues = [];
const checkVisible = (parsed, node, text) => {
  const value = text.replace(/\s+/g, " ").trim();
  if (!/\p{L}/u.test(value) || languageIndependent.has(value) || /^https?:\/\//.test(value) || /^[\w.+-]+@[\w.-]+$/.test(value)) return;
  untranslated.push(`${path.relative(process.cwd(), parsed.fileName)}:${parsed.getLineAndCharacterOfPosition(node.getStart(parsed)).line + 1}: ${value}`);
};
const checkExpression = (parsed, node) => {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) checkVisible(parsed, node, node.text);
  else if (ts.isTemplateExpression(node)) {
    checkVisible(parsed, node, node.head.text);
    for (const span of node.templateSpans) checkVisible(parsed, span.literal, span.literal.text);
  } else if (ts.isConditionalExpression(node)) {
    checkExpression(parsed, node.whenTrue);
    checkExpression(parsed, node.whenFalse);
  } else if (ts.isBinaryExpression(node) && [ts.SyntaxKind.PlusToken, ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)) {
    checkExpression(parsed, node.left);
    checkExpression(parsed, node.right);
  }
};
for (const file of sourceFiles(path.join(process.cwd(), "src"))) {
  const parsed = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const visit = (node) => {
    if (ts.isJsxText(node)) checkVisible(parsed, node, node.text);
    if (ts.isJsxExpression(node) && node.expression && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) checkExpression(parsed, node.expression);
    if (ts.isJsxAttribute(node) && visibleAttributes.has(node.name.text) && node.initializer && ts.isStringLiteral(node.initializer)) checkVisible(parsed, node, node.initializer.text);
    if (ts.isJsxAttribute(node) && node.name.text === "value" && node.initializer && ts.isJsxExpression(node.initializer)) {
      const tag = node.parent.parent.tagName?.getText(parsed);
      const expression = node.initializer.expression;
      if (["Select", "SelectItem", "option", "input"].includes(tag) && expression && ts.isCallExpression(expression) && expression.expression.getText(parsed) === "t") {
        translatedValues.push(`${path.relative(process.cwd(), parsed.fileName)}:${parsed.getLineAndCharacterOfPosition(node.getStart(parsed)).line + 1}: translate the label while keeping the form value stable`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed);
}
console.log(`Untranslated JSX labels: ${untranslated.length}`);
for (const issue of untranslated) console.error(`  untranslated: ${issue}`);
failed ||= untranslated.length > 0;
for (const issue of translatedValues) console.error(`  translated form value: ${issue}`);
failed ||= translatedValues.length > 0;

process.exitCode = failed ? 1 : 0;
