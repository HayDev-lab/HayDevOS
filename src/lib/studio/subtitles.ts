export type SubtitleCue = { id: string; start: number; end: number; text: string };

export function validCues(cues: SubtitleCue[]): SubtitleCue[] {
  if (cues.length > 3000) throw new Error("STUDIO_SUBTITLES_INVALID");
  return cues.map((cue) => {
    if (!Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.start < 0 || cue.end <= cue.start || cue.end > 86400 || !cue.text.trim() || cue.text.length > 2000) throw new Error("STUDIO_SUBTITLES_INVALID");
    return { ...cue, text: cue.text.replace(/<[^>]*>/g, "").replace(/\0/g, "").trim() };
  }).sort((a, b) => a.start - b.start);
}

function seconds(raw: string): number {
  const parts = raw.trim().replace(",", ".").split(":").map(Number);
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => !Number.isFinite(part) || part < 0) || parts.at(-1)! >= 60 || (parts.length === 3 && parts[1] >= 60)) throw new Error("STUDIO_SUBTITLES_INVALID");
  return parts.reduce((total, part) => total * 60 + part, 0);
}

export function parseSubtitles(raw: string): SubtitleCue[] {
  if (raw.length > 512000) throw new Error("STUDIO_SUBTITLES_INVALID");
  const cues: SubtitleCue[] = [];
  for (const block of raw.replace(/^\uFEFF/, "").replace(/\r/g, "").trim().split(/\n[ \t]*\n/)) {
    if (/^(WEBVTT|NOTE|STYLE|REGION)\b/.test(block)) continue;
    const lines = block.split("\n");
    const timing = lines.findIndex((line) => line.includes("-->"));
    if (timing < 0) { if (block.trim()) throw new Error("STUDIO_SUBTITLES_INVALID"); continue; }
    const match = lines[timing].match(/^(\d{1,3}:\d{2}(?::\d{2})?[.,]\d{1,3})\s+-->\s+(\d{1,3}:\d{2}(?::\d{2})?[.,]\d{1,3})(?:\s+.*)?$/);
    if (!match) throw new Error("STUDIO_SUBTITLES_INVALID");
    cues.push({ id: "cue-" + cues.length, start: seconds(match[1]), end: seconds(match[2]), text: lines.slice(timing + 1).join("\n") });
  }
  if (!cues.length) throw new Error("STUDIO_SUBTITLES_INVALID");
  return validCues(cues);
}

function timestamp(value: number, format: "srt" | "vtt") {
  const ms = Math.round(Math.max(0, value) * 1000);
  return [Math.floor(ms / 3600000), Math.floor(ms / 60000) % 60, Math.floor(ms / 1000) % 60].map((part) => String(part).padStart(2, "0")).join(":") + (format === "srt" ? "," : ".") + String(ms % 1000).padStart(3, "0");
}

export function exportSubtitles(cues: SubtitleCue[], format: "srt" | "vtt", clipStart = 0, clipEnd = Infinity): string {
  const clipped = validCues(cues).filter((cue) => cue.end > clipStart && cue.start < clipEnd);
  const body = clipped.map((cue, index) => (format === "srt" ? String(index + 1) + "\n" : "") + timestamp(Math.max(cue.start, clipStart) - clipStart, format) + " --> " + timestamp(Math.min(cue.end, clipEnd) - clipStart, format) + "\n" + cue.text).join("\n\n");
  return (format === "vtt" ? "WEBVTT\n\n" : "") + body + "\n";
}

export function subtitleAt(cues: SubtitleCue[], position: number): string {
  return cues.filter((cue) => cue.start <= position && cue.end > position).map((cue) => cue.text).join("\n");
}

export function transcriptionResult(value: unknown): { text: string; cues: SubtitleCue[] } {
  if (!value || typeof value !== "object") throw new Error("STUDIO_PROVIDER_INVALID_RESPONSE");
  const data = value as { text?: unknown; segments?: Array<{ start: number; end: number; text: string }> };
  if (typeof data.text !== "string" || data.text.length > 200000 || !data.text.trim()) throw new Error("STUDIO_TRANSCRIPT_EMPTY");
  const cues = Array.isArray(data.segments) ? validCues(data.segments.filter((segment) => typeof segment.text === "string" && segment.text.trim()).map((segment, index) => ({ ...segment, id: "transcript-" + index }))) : [];
  return { text: data.text.trim(), cues };
}
