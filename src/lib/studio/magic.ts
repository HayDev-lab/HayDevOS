import "server-only";

export type MagicAssetKind = "reference" | "firstFrame" | "lastFrame" | "music" | "voice" | "sound";

export type MagicAssetSummary = {
  kind: MagicAssetKind;
  name: string;
  type: string;
  size: number;
  sha256: string;
};

export type MagicCharacterInput = {
  name: string;
  description: string;
  locked: boolean;
};

export type MagicRequest = {
  prompt: string;
  durationSec: number;
  language: string;
  aspectRatio: string;
  assets: MagicAssetSummary[];
  characters: MagicCharacterInput[];
};

export type MagicStepAction =
  | "use_reference_image"
  | "generate_reference_image"
  | "use_first_frame"
  | "generate_first_frame"
  | "use_last_frame"
  | "generate_last_frame"
  | "lock_characters"
  | "generate_video"
  | "add_music"
  | "add_voice"
  | "add_sound"
  | "render_timeline";

export type MagicPlanStep = {
  id: string;
  action: MagicStepAction;
  title: string;
  detail: string;
  source: "uploaded" | "ai" | "timeline";
};

export type MagicPlan = {
  version: 1;
  status: "planned";
  providerReady: boolean;
  provider: string;
  prompt: string;
  durationSec: number;
  language: string;
  aspectRatio: string;
  assets: MagicAssetSummary[];
  characters: MagicCharacterInput[];
  steps: MagicPlanStep[];
  aiSummary?: string;
  notes: string[];
};

const actionSet = new Set<MagicStepAction>([
  "use_reference_image", "generate_reference_image", "use_first_frame", "generate_first_frame",
  "use_last_frame", "generate_last_frame", "lock_characters", "generate_video", "add_music",
  "add_voice", "add_sound", "render_timeline",
]);

function asset(request: MagicRequest, kind: MagicAssetKind): MagicAssetSummary | undefined {
  return request.assets.find((candidate) => candidate.kind === kind);
}

function step(id: string, action: MagicStepAction, title: string, detail: string, source: MagicPlanStep["source"]): MagicPlanStep {
  return { id, action, title, detail, source };
}

export function buildMagicPlan(request: MagicRequest, providerReady = false, provider = "local-plan"): MagicPlan {
  const reference = asset(request, "reference");
  const firstFrame = asset(request, "firstFrame");
  const lastFrame = asset(request, "lastFrame");
  const music = asset(request, "music");
  const voice = asset(request, "voice");
  const sound = asset(request, "sound");
  const lockedCharacters = request.characters.filter((character) => character.locked && character.description.trim());
  const steps: MagicPlanStep[] = [
    reference
      ? step("reference", "use_reference_image", "Использовать изображение", `${reference.name} будет источником сцены и визуальной идентичности.`, "uploaded")
      : step("reference", "generate_reference_image", "Создать изображение", "AI подберёт или создаст исходный визуальный кадр по промпту.", "ai"),
    firstFrame
      ? step("first-frame", "use_first_frame", "Зафиксировать first frame", `${firstFrame.name} будет начальным кадром.`, "uploaded")
      : step("first-frame", "generate_first_frame", "Сгенерировать first frame", "AI создаст начальный кадр из промпта и reference-изображения.", "ai"),
    lastFrame
      ? step("last-frame", "use_last_frame", "Зафиксировать last frame", `${lastFrame.name} будет финальным кадром.`, "uploaded")
      : step("last-frame", "generate_last_frame", "Сгенерировать last frame", "AI выстроит финальный кадр с сохранением визуальной связности.", "ai"),
  ];
  if (lockedCharacters.length) {
    steps.push(step("characters", "lock_characters", "Зафиксировать персонажей", `${lockedCharacters.length} персонаж(а/ей) будут неизменными между сценами.`, "uploaded"));
  }
  steps.push(step("video", "generate_video", "Собрать видеосцены", `${request.durationSec} секунд в формате ${request.aspectRatio}, язык генерации: ${request.language}.`, "ai"));
  if (music) steps.push(step("music", "add_music", "Добавить музыку", `${music.name} будет отдельной музыкальной дорожкой.`, "uploaded"));
  if (voice) steps.push(step("voice", "add_voice", "Добавить голос", `${voice.name} будет синхронизирован как voiceover.`, "uploaded"));
  if (sound) steps.push(step("sound", "add_sound", "Добавить звуки", `${sound.name} будет добавлен как sound-design слой.`, "uploaded"));
  steps.push(step("render", "render_timeline", "Довести до конца", "Синхронизировать кадры и аудио, проверить длительность и подготовить timeline к экспорту.", "timeline"));
  return {
    version: 1,
    status: "planned",
    providerReady,
    provider,
    prompt: request.prompt,
    durationSec: request.durationSec,
    language: request.language,
    aspectRatio: request.aspectRatio,
    assets: request.assets,
    characters: request.characters,
    steps,
    notes: providerReady
      ? ["План сформирован подключённым Owner AI/MCP провайдером.", "Финальный MP4 появится после выполнения generation/render инструментов провайдера."]
      : ["План сформирован локальным конструктором: внешний Owner AI/MCP провайдер не настроен.", "Загруженные файлы можно сразу применить к локальной монтажной."],
  };
}

function jsonFromText(raw: string): Record<string, unknown> | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? raw;
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(fenced.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function mergeAiPlan(base: MagicPlan, raw: string, provider: string): MagicPlan {
  const parsed = jsonFromText(raw);
  const summary = typeof parsed?.summary === "string" ? parsed.summary.trim().slice(0, 800) : undefined;
  const modelSteps = Array.isArray(parsed?.steps) ? parsed.steps : [];
  const safeSteps = modelSteps.flatMap((candidate, index) => {
    if (!candidate || typeof candidate !== "object") return [];
    const value = candidate as Record<string, unknown>;
    const action = typeof value.action === "string" && actionSet.has(value.action as MagicStepAction) ? value.action as MagicStepAction : null;
    if (!action) return [];
    const original = base.steps.find((item) => item.action === action);
    return [step(original?.id ?? `ai-${index + 1}`, action, original?.title ?? action, typeof value.detail === "string" ? value.detail.slice(0, 500) : original?.detail ?? "", original?.source ?? "ai")];
  });
  return {
    ...base,
    providerReady: true,
    provider,
    aiSummary: summary,
    steps: safeSteps.length ? safeSteps : base.steps,
    notes: ["План сформирован подключённым Owner AI/MCP провайдером.", "Генерация и render выполняются только теми инструментами, которые реально подключены у провайдера."],
  };
}
