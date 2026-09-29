import { describe, expect, test } from "bun:test";

import {
  executableOwnerAiActions,
  extractOwnerAiActions,
  MAX_OWNER_AI_ACTIONS_PER_RUN,
} from "../src/lib/owner-ai/protocol";

describe("Owner AI action protocol", () => {
  test("accepts a bounded action set", () => {
    const text = Array.from({ length: MAX_OWNER_AI_ACTIONS_PER_RUN }, (_, index) =>
      `\`\`\`action\n${JSON.stringify({ action: "createTask", args: { title: `Task ${index}` } })}\n\`\`\``).join("\n");
    expect(extractOwnerAiActions(text)).toHaveLength(MAX_OWNER_AI_ACTIONS_PER_RUN);
  });

  test("rejects the entire model action set above the server cap", () => {
    const text = Array.from({ length: MAX_OWNER_AI_ACTIONS_PER_RUN + 1 }, (_, index) =>
      `\`\`\`action\n${JSON.stringify({ action: "createTask", args: { title: `Task ${index}` } })}\n\`\`\``).join("\n");
    expect(() => extractOwnerAiActions(text)).toThrow("action limit");
  });

  test("OBSERVE mode discards every otherwise valid action", () => {
    const text = '```action\n{"action":"createTask","args":{"title":"blocked"}}\n```';
    expect(executableOwnerAiActions("OBSERVE", text)).toEqual([]);
    expect(executableOwnerAiActions("ASSIST", text)).toHaveLength(1);
  });
});
