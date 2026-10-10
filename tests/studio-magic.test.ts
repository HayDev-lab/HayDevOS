import { describe, expect, test } from "bun:test";

import { buildMagicPlan } from "@/lib/studio/magic";

describe("Studio Magic optional generation controls", () => {
  const base = {
    prompt: "Короткая сцена в городе",
    durationSec: 20,
    language: "Русский",
    aspectRatio: "16:9",
    assets: [],
    characters: [],
  };

  test("keeps the prompt-only plan clean when no dropdown is selected", () => {
    const plan = buildMagicPlan(base);
    expect(plan.preferences).toBeUndefined();
    expect(plan.steps.find((step) => step.id === "video")?.detail).not.toContain("Дополнительные параметры");
  });

  test("carries selected styles into the generation step", () => {
    const plan = buildMagicPlan({
      ...base,
      preferences: { videoStyle: "Неон-нуар", musicStyle: "Синтвейв", voiceTone: "Уверенный" },
    });
    expect(plan.preferences?.videoStyle).toBe("Неон-нуар");
    expect(plan.steps.find((step) => step.id === "video")?.detail).toContain("videoStyle=Неон-нуар");
  });
});
