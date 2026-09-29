export const MAX_OWNER_AI_ACTIONS_PER_RUN = 4;

export interface OwnerAiActionBlock {
  action: string;
  args: Record<string, unknown>;
}

export class OwnerAiActionLimitError extends Error {
  constructor(public readonly count: number) {
    super(`Owner AI response exceeded the ${MAX_OWNER_AI_ACTIONS_PER_RUN}-action limit`);
    this.name = "OwnerAiActionLimitError";
  }
}

export function extractOwnerAiActions(text: string): OwnerAiActionBlock[] {
  const actions: OwnerAiActionBlock[] = [];
  const pattern = /```action\s*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed && typeof parsed === "object" && typeof parsed.action === "string") {
        actions.push({
          action: parsed.action,
          args: parsed.args && typeof parsed.args === "object"
            ? parsed.args as Record<string, unknown>
            : {},
        });
      }
    } catch {
      // Malformed action blocks are data, not executable instructions.
    }
  }
  if (actions.length > MAX_OWNER_AI_ACTIONS_PER_RUN) {
    throw new OwnerAiActionLimitError(actions.length);
  }
  return actions;
}

export function executableOwnerAiActions(
  mode: "OBSERVE" | "ASSIST" | "AUTO",
  text: string,
): OwnerAiActionBlock[] {
  const actions = extractOwnerAiActions(text);
  return mode === "OBSERVE" ? [] : actions;
}
