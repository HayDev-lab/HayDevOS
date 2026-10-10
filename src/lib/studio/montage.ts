import { z } from "zod";

export const montagePatchSchema = z.object({
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).optional(),
  start: z.number().finite().min(0).max(86400).optional(),
  end: z.number().finite().positive().max(86400).optional(),
  text: z.string().max(2000).optional(),
  subtitle: z.string().max(2000).optional(),
  brand: z.string().max(300).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  x: z.number().min(-50).max(50).optional(), y: z.number().min(-50).max(50).optional(),
  scale: z.number().min(10).max(200).optional(), rotation: z.number().min(-180).max(180).optional(),
  opacity: z.number().min(0).max(100).optional(), filter: z.number().int().min(0).max(2).optional(),
  brightness: z.number().min(50).max(150).optional(), contrast: z.number().min(50).max(150).optional(),
  saturation: z.number().min(0).max(180).optional(), blur: z.number().min(0).max(16).optional(),
  vignette: z.number().min(0).max(80).optional(),
  logoCorner: z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]).optional(),
  logoSize: z.number().min(5).max(40).optional(), logoOpacity: z.number().min(0).max(100).optional(),
}).strict();
export type MontagePatch = z.infer<typeof montagePatchSchema>;
export type MontageProposal = { patch: MontagePatch; transcribe: boolean; source: "local" | "ai" };

export function validateMontagePatch(value: unknown, duration: number, currentStart = 0, currentEnd = duration): MontagePatch {
  const patch = montagePatchSchema.parse(value);
  if (patch.start !== undefined || patch.end !== undefined) {
    const start = patch.start ?? currentStart, end = patch.end ?? currentEnd;
    if (duration <= 0 || start >= end || end > duration) throw new Error("STUDIO_TRIM_INVALID");
  }
  return patch;
}

const timeValue = (value: string) => value.split(":").reduce((total, part) => total * 60 + Number(part.replace(",", ".")), 0);
export function localMontage(prompt: string, duration: number, currentStart = 0, currentEnd = duration): MontageProposal {
  const patch: MontagePatch = {};
  const normalized = prompt.toLowerCase();
  if (/9\s*:\s*16|вертикаль|vertical|ուղղահայաց/.test(normalized)) patch.aspectRatio = "9:16";
  else if (/1\s*:\s*1|квадрат|square|քառակուսի/.test(normalized)) patch.aspectRatio = "1:1";
  else if (/16\s*:\s*9|горизонталь|landscape|հորիզոնական/.test(normalized)) patch.aspectRatio = "16:9";
  const trim = normalized.match(/(?:с|from|սկսած|կտրիր)\s+(\d+(?::\d{2})?(?:[.,]\d+)?)(?:-ից)?\s*(?:сек(?:унд[аы]?)?|seconds?|s|վ(?:այրկյան)?)?\s*(?:до|to|մինչև)\s+(\d+(?::\d{2})?(?:[.,]\d+)?)/);
  if (trim) { patch.start = timeValue(trim[1]); patch.end = timeValue(trim[2]); }
  else {
    const length = normalized.match(/(?:первые|first|առաջին)\s+(\d+(?:[.,]\d+)?)\s*(?:сек|second|s\b|վայրկյան)/);
    if (length) { patch.start = 0; patch.end = Math.min(duration, Number(length[1].replace(",", "."))); }
  }
  if (/ч[её]рно[- ]бел|black.?and.?white|grayscale|սև.?սպիտակ/.test(normalized)) patch.filter = 1;
  if (/сепия|sepia|սեպիա/.test(normalized)) patch.filter = 2;
  const title = prompt.match(/(?:заголовок|текст|title|text|վերնագիր|տեքստ)\s*[:՝—-]?\s*["'«“‘]([^"'»”’]+)["'»”’]/i);
  if (title) patch.text = title[1];
  const corner = /(?:логотип|logo|լոգո)/.test(normalized);
  if (corner) {
    const left = /слева|left|ձախ/.test(normalized), bottom = /снизу|bottom|ներքև/.test(normalized);
    patch.logoCorner = bottom ? left ? "bottom-left" : "bottom-right" : left ? "top-left" : "top-right";
  }
  const transcribe = /субтитр|транскри|subtitle|caption|transcri|ենթագր|վերծան/.test(normalized);
  return { patch: validateMontagePatch(patch, duration, currentStart, currentEnd), transcribe, source: "local" };
}
