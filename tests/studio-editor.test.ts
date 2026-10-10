import { describe, expect, test } from "bun:test";
import { exportSubtitles, parseSubtitles, subtitleAt, transcriptionResult } from "@/lib/studio/subtitles";
import { localMontage, validateMontagePatch } from "@/lib/studio/montage";
describe("Timed captions and montage commands", () => {
  const input = "1\n00:00:01,000 --> 00:00:03,500\n<b>Привет</b>\nВторая строка\n\n2\n00:00:04,000 --> 00:00:06,000\nԲարև\n";
  test("imports real multiline SRT and preserves Armenian text", () => {
    const cues = parseSubtitles(input);
    expect(cues).toHaveLength(2); expect(cues[0].text).toBe("Привет\nВторая строка");
    expect(subtitleAt(cues, 1)).toContain("Привет"); expect(subtitleAt(cues, 3.5)).toBe("");
    expect(subtitleAt(cues, 4.5)).toBe("Բարև");
  });
  test("reads VTT cue settings and exports cropped captions from montage time zero", () => {
    const cues = parseSubtitles("WEBVTT\n\ncue-a\n00:01.000 --> 00:03.000 align:center\nHello\n\n00:04.000 --> 00:06.000\nWorld\n");
    const exported = exportSubtitles(cues, "srt", 2, 5);
    expect(exported).toContain("00:00:00,000 --> 00:00:01,000");
    expect(exported).toContain("00:00:02,000 --> 00:00:03,000");
    expect(parseSubtitles(exportSubtitles(cues, "vtt"))).toHaveLength(2);
  });
  test("rejects reversed, malformed and oversized caption times", () => {
    expect(() => parseSubtitles("1\n00:00:03,000 --> 00:00:02,000\nBad")).toThrow();
    expect(() => parseSubtitles("1\n00:61:01,000 --> 00:62:02,000\nBad")).toThrow();
    expect(() => transcriptionResult({ text: "test", segments: [{ start: NaN, end: 2, text: "test" }] })).toThrow();
  });
  test("does not invent timestamps for text-only transcription", () => {
    expect(transcriptionResult({ text: "Только текст" })).toEqual({ text: "Только текст", cues: [] });
  });
  test("applies Russian trim, ratio, title and logo commands as a proposal", () => {
    const result = localMontage('Вертикальный 9:16, обрежь с 2 до 12 секунд, заголовок “Наш продукт”, логотип справа сверху', 20);
    expect(result.patch).toMatchObject({ aspectRatio: "9:16", start: 2, end: 12, text: "Наш продукт", logoCorner: "top-right" });
  });
  test("recognizes English and Armenian commands", () => {
    expect(localMontage("Square, black and white, first 5 seconds, add subtitles", 20)).toMatchObject({ patch: { aspectRatio: "1:1", filter: 1, start: 0, end: 5 }, transcribe: true });
    expect(localMontage('Ուղղահայաց 9:16, կտրիր 2-ից մինչև 12 վայրկյանը, վերնագիր՝ “Մեր ապրանքը”, լոգոն՝ ձախ ներքևում', 20).patch).toMatchObject({ aspectRatio: "9:16", start: 2, end: 12, text: "Մեր ապրանքը", logoCorner: "bottom-left" });
  });
  test("rejects provider scripts, arbitrary URLs, out-of-range trims and unsafe transforms", () => {
    expect(() => validateMontagePatch({ script: "rm" }, 20)).toThrow();
    expect(() => validateMontagePatch({ url: "https://example.com" }, 20)).toThrow();
    expect(() => validateMontagePatch({ start: 4, end: 25 }, 20)).toThrow();
    expect(() => validateMontagePatch({ scale: 9000 }, 20)).toThrow();
    expect(() => validateMontagePatch({ end: 5 }, 20, 10, 20)).toThrow();
  });
});
