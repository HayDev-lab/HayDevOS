import { describe, expect, test } from "bun:test";

import {
  buildCompetitorAnalysis,
  diffCompetitorText,
  extractCompetitorSnapshot,
  hashCompetitorSnapshot,
  normalizeCompetitorText,
} from "../src/lib/competitors/service";

describe("competitor monitoring primitives", () => {
  test("extracts bounded text and metadata without a browser", () => {
    const result = extractCompetitorSnapshot(
      "<html><head><title>Competitor</title><meta name=\"description\" content=\"New plan\"></head><body><script>alert(1)</script><main><h1>New plan</h1><p>Pricing and API update</p></main></body></html>",
      "text/html",
    );
    expect(result.title).toBe("Competitor");
    expect(result.description).toBe("New plan");
    expect(result.text).toContain("Pricing and API update");
    expect(result.text).not.toContain("alert");
  });

  test("produces stable hashes and bounded diffs", () => {
    const first = normalizeCompetitorText("Pricing\nAPI\n");
    const second = normalizeCompetitorText("Pricing\nAPI\nNew launch\n");
    expect(hashCompetitorSnapshot({ title: "A", description: null, text: first })).toBe(hashCompetitorSnapshot({ title: "A", description: null, text: first }));
    expect(diffCompetitorText(first, second)).toEqual({ added: ["New launch"], removed: [] });
  });

  test("builds a deterministic three-day report", () => {
    const report = buildCompetitorAnalysis({
      periodStart: "2026-10-01T00:00:00.000Z",
      periodEnd: "2026-10-04T00:00:00.000Z",
      competitors: [
        { name: "A", url: "https://a.example", status: "changed", changed: true, added: ["New AI pricing"], removed: [], title: "Pricing" },
        { name: "B", url: "https://b.example", status: "unchanged", changed: false, added: [], removed: [], title: null },
      ],
    });
    expect(report.provider).toBe("local-heuristic");
    expect(report.summary).toContain("1 из 2");
    expect(JSON.parse(report.details).themes).toContain("pricing");
  });
});
