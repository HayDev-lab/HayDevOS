"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import {
  Clock3,
  Image as ImageIcon,
  Languages,
  LockKeyhole,
  Mic,
  Music,
  Sparkles,
  UnlockKeyhole,
  Upload,
  UserRound,
  Video,
  Volume2,
} from "lucide-react";
import { generatorTypes } from "@/lib/workspace-routes";
import { useStudioCopy } from "./studio-copy";

const icons = [Video, Music, Mic, ImageIcon, UserRound];
const formats = ["16:9", "9:16", "1:1"];
const voiceFormats = ["mp3", "wav", "opus"];
const qualityKeys: ImageQuality[] = ["low", "medium", "high", "xhigh", "max"];
const preferencesKey = "haydevos.video-generator.preferences.v1";

type VideoTab = "settings" | "styles" | "characters" | "sound";
type ModelTier = "budget" | "balanced" | "top";
type VoiceGender = "female" | "male";
type FrameSlot = "first" | "last" | "reference";
type CharacterSlot = { name: string; description: string; locked: boolean };
type FrameAsset = { name: string; url: string; type: "image" | "video" };
type ReferenceAsset = { name: string; url: string; type: "image" };
type FrameState = Record<FrameSlot, FrameAsset | null>;
type ImageQuality = "low" | "medium" | "high" | "xhigh" | "max";

const videoModels: ReadonlyArray<{
  id: string;
  name: string;
  tier: ModelTier;
  summary: string;
  durations: number[];
}> = [
  { id: "hay-video-lite", name: "Hay Video Lite", tier: "budget", summary: "Черновики и быстрые итерации", durations: [5, 8, 10] },
  { id: "hay-video-fast", name: "Hay Video Fast", tier: "budget", summary: "Быстрый результат для соцсетей", durations: [5, 10, 15] },
  { id: "hay-video-studio", name: "Hay Video Studio", tier: "balanced", summary: "Сбалансированное качество", durations: [5, 10, 15, 20] },
  { id: "hay-video-cinema", name: "Hay Video Cinema", tier: "balanced", summary: "Детализированная режиссура", durations: [5, 10, 15, 20, 30] },
  { id: "hay-video-pro", name: "Hay Video Pro", tier: "top", summary: "Премиальный контроль движения", durations: [5, 10, 15, 20, 30] },
  { id: "hay-video-master", name: "Hay Video Master", tier: "top", summary: "Максимальная детализация сцен", durations: [5, 10, 15, 20, 30, 45] },
];

const voiceCatalog: ReadonlyArray<{ id: string; gender: VoiceGender }> = [
  { id: "coral", gender: "female" },
  { id: "nova", gender: "female" },
  { id: "shimmer", gender: "female" },
  { id: "alloy", gender: "male" },
  { id: "echo", gender: "male" },
  { id: "onyx", gender: "male" },
  { id: "ash", gender: "male" },
  { id: "fable", gender: "male" },
  { id: "sage", gender: "female" },
  { id: "ballad", gender: "female" },
  { id: "verse", gender: "male" },
  { id: "marin", gender: "female" },
  { id: "cedar", gender: "male" },
];

const voiceModels: ReadonlyArray<{
  id: string;
  name: string;
  providerModel: string;
  tier: ModelTier;
  summary: string;
  voices: string[];
}> = [
  { id: "hay-voice-lite", name: "Hay Voice Lite", providerModel: "gpt-4o-mini-tts", tier: "budget", summary: "Доступный TTS-профиль", voices: ["coral", "nova", "shimmer", "alloy", "echo", "onyx"] },
  { id: "hay-voice-fast", name: "Hay Voice Fast", providerModel: "tts-1", tier: "budget", summary: "Минимальная задержка", voices: ["coral", "nova", "shimmer", "alloy", "echo", "onyx"] },
  { id: "hay-voice-studio", name: "Hay Voice Studio", providerModel: "tts-1-hd", tier: "balanced", summary: "Повышенное качество", voices: ["coral", "nova", "shimmer", "alloy", "echo", "onyx"] },
  { id: "hay-voice-natural", name: "Hay Voice Natural", providerModel: "gpt-4o-mini-tts", tier: "balanced", summary: "Интонации по инструкции", voices: ["ballad", "coral", "sage", "ash", "fable", "verse"] },
  { id: "hay-voice-pro", name: "Hay Voice Pro", providerModel: "gpt-4o-mini-tts", tier: "top", summary: "Премиальная выразительность", voices: ["marin", "coral", "shimmer", "cedar", "echo", "onyx"] },
  { id: "hay-voice-master", name: "Hay Voice Master", providerModel: "gpt-4o-mini-tts", tier: "top", summary: "Рекомендуемые голоса высокого качества", voices: ["marin", "nova", "shimmer", "cedar", "verse", "onyx"] },
];

const imageModels: ReadonlyArray<{
  id: string;
  name: string;
  providerModel: string;
  tier: ModelTier;
  summary: string;
  qualities: ImageQuality[];
}> = [
  { id: "hay-image-lite", name: "Hay Image Lite", providerModel: "gpt-image-1-mini", tier: "budget", summary: "Быстрые черновики", qualities: ["low", "medium"] },
  { id: "hay-image-fast", name: "Hay Image Fast", providerModel: "gpt-image-2.5-flare", tier: "budget", summary: "Быстрое image-to-image", qualities: ["low", "medium", "high"] },
  { id: "hay-image-studio", name: "Hay Image Studio", providerModel: "gpt-image-1", tier: "balanced", summary: "Баланс цены и деталей", qualities: ["medium", "high"] },
  { id: "hay-image-edit", name: "Hay Image Edit", providerModel: "gpt-image-1.5", tier: "balanced", summary: "Точное редактирование reference", qualities: ["medium", "high"] },
  { id: "hay-image-pro", name: "Hay Image Pro", providerModel: "gpt-image-2", tier: "top", summary: "Высокая детализация", qualities: ["high", "xhigh"] },
  { id: "hay-image-master", name: "Hay Image Master", providerModel: "gpt-image-2.5-sunburst", tier: "top", summary: "Максимальная точность reference", qualities: ["high", "xhigh", "max"] },
];

const avatarModels: ReadonlyArray<{
  id: string;
  name: string;
  providerModel: string;
  tier: ModelTier;
  summary: string;
  qualities: ImageQuality[];
}> = [
  { id: "hay-avatar-lite", name: "Hay Avatar Lite", providerModel: "gpt-image-1-mini", tier: "budget", summary: "Быстрый портретный аватар", qualities: ["low", "medium"] },
  { id: "hay-avatar-fast", name: "Hay Avatar Fast", providerModel: "gpt-image-2.5-flare", tier: "budget", summary: "Быстрые вариации лица", qualities: ["low", "medium", "high"] },
  { id: "hay-avatar-studio", name: "Hay Avatar Studio", providerModel: "gpt-image-1", tier: "balanced", summary: "Естественный студийный аватар", qualities: ["medium", "high"] },
  { id: "hay-avatar-natural", name: "Hay Avatar Natural", providerModel: "gpt-image-1.5", tier: "balanced", summary: "Стабильная передача черт", qualities: ["medium", "high"] },
  { id: "hay-avatar-pro", name: "Hay Avatar Pro", providerModel: "gpt-image-2", tier: "top", summary: "Точная идентичность и свет", qualities: ["high", "xhigh"] },
  { id: "hay-avatar-master", name: "Hay Avatar Master", providerModel: "gpt-image-2.5-sunburst", tier: "top", summary: "Максимальная точность личности", qualities: ["high", "xhigh", "max"] },
];

const defaultCharacters: CharacterSlot[] = [
  { name: "", description: "", locked: false },
  { name: "", description: "", locked: false },
  { name: "", description: "", locked: false },
];

const defaultFrames: FrameState = { first: null, last: null, reference: null };

export function ContentGenerator({ onRequest, busy, activeType, showLauncher = true }: {
  onRequest: (prompt: string) => Promise<void>;
  busy: boolean;
  activeType?: number;
  showLauncher?: boolean;
}) {
  const copy = useStudioCopy();
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState(0);
  const [style, setStyle] = useState(0);
  const [videoTone, setVideoTone] = useState(0);
  const [videoTab, setVideoTab] = useState<VideoTab>("settings");
  const [modelId, setModelId] = useState(videoModels[0].id);
  const [duration, setDuration] = useState(videoModels[0].durations[1]);
  const [characters, setCharacters] = useState<CharacterSlot[]>(defaultCharacters);
  const [soundStyle, setSoundStyle] = useState(0);
  const [soundLocked, setSoundLocked] = useState(false);
  const [language, setLanguage] = useState(0);
  const [audioStyle, setAudioStyle] = useState(0);
  const [audioTone, setAudioTone] = useState(0);
  const [audioLanguage, setAudioLanguage] = useState(0);
  const [rhymePolish, setRhymePolish] = useState(false);
  const [referencePrompt, setReferencePrompt] = useState("");
  const [voiceModelId, setVoiceModelId] = useState(voiceModels[0].id);
  const [voiceId, setVoiceId] = useState(voiceModels[0].voices[0]);
  const [voiceFormat, setVoiceFormat] = useState(0);
  const [voiceStyle, setVoiceStyle] = useState(0);
  const [voiceTone, setVoiceTone] = useState(0);
  const [imageStyle, setImageStyle] = useState(0);
  const [imageTone, setImageTone] = useState(0);
  const [avatarStyle, setAvatarStyle] = useState(0);
  const [avatarTone, setAvatarTone] = useState(0);
  const [imageModelId, setImageModelId] = useState(imageModels[0].id);
  const [imageQuality, setImageQuality] = useState<ImageQuality>(imageModels[0].qualities[1]);
  const [imageBackground, setImageBackground] = useState(0);
  const [imageReferencePrompt, setImageReferencePrompt] = useState("");
  const [avatarModelId, setAvatarModelId] = useState(avatarModels[0].id);
  const [avatarQuality, setAvatarQuality] = useState<ImageQuality>(avatarModels[0].qualities[1]);
  const [avatarPrompt, setAvatarPrompt] = useState("");
  const [avatarPreserveIdentity, setAvatarPreserveIdentity] = useState(true);
  const [avatarPose, setAvatarPose] = useState(0);
  const [avatarExpression, setAvatarExpression] = useState(0);
  const [avatarBackground, setAvatarBackground] = useState(0);
  const [avatarFraming, setAvatarFraming] = useState(0);
  const [avatarFormat, setAvatarFormat] = useState(0);
  const [imageReference, setImageReference] = useState<ReferenceAsset | null>(null);
  const [avatarReference, setAvatarReference] = useState<ReferenceAsset | null>(null);
  const [frames, setFrames] = useState<FrameState>(defaultFrames);
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);
  const framesRef = useRef<FrameState>(defaultFrames);
  const referencesRef = useRef<{ image: ReferenceAsset | null; avatar: ReferenceAsset | null }>({ image: null, avatar: null });
  const active = activeType;
  const isVideo = active === 0;
  const isAudio = active === 1;
  const isVoice = active === 2;
  const isImage = active === 3;
  const isAvatar = active === 4;
  const selectedModel = videoModels.find((model) => model.id === modelId) ?? videoModels[0];
  const selectedVoiceModel = voiceModels.find((model) => model.id === voiceModelId) ?? voiceModels[0];
  const selectedVoice = voiceCatalog.find((voice) => voice.id === voiceId) ?? voiceCatalog[0];
  const selectedImageModel = imageModels.find((model) => model.id === imageModelId) ?? imageModels[0];
  const selectedAvatarModel = avatarModels.find((model) => model.id === avatarModelId) ?? avatarModels[0];

  useEffect(() => {
    let mounted = true;
    const timer = window.setTimeout(() => {
      if (!mounted) return;
      try {
        const stored = window.localStorage.getItem(preferencesKey);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<{
            modelId: string;
            duration: number;
            style: number;
            videoTone: number;
            characters: CharacterSlot[];
            soundStyle: number;
            soundLocked: boolean;
            language: number;
            audioStyle: number;
            audioTone: number;
            audioLanguage: number;
            rhymePolish: boolean;
            referencePrompt: string;
            voiceModelId: string;
            voiceId: string;
            voiceFormat: number;
            voiceStyle: number;
            voiceTone: number;
            imageStyle: number;
            imageTone: number;
            imageModelId: string;
            imageQuality: ImageQuality;
            imageBackground: number;
            imageReferencePrompt: string;
            avatarStyle: number;
            avatarTone: number;
            avatarModelId: string;
            avatarQuality: ImageQuality;
            avatarPrompt: string;
            avatarPreserveIdentity: boolean;
            avatarPose: number;
            avatarExpression: number;
            avatarBackground: number;
            avatarFraming: number;
            avatarFormat: number;
          }>;
          const storedModel = videoModels.find((model) => model.id === parsed.modelId);
          if (storedModel) {
            setModelId(storedModel.id);
            setDuration(typeof parsed.duration === "number" && storedModel.durations.includes(parsed.duration) ? parsed.duration : storedModel.durations[0]);
          }
          if (typeof parsed.style === "number" && parsed.style >= 0 && parsed.style < copy.videoStyles.length) setStyle(parsed.style);
          if (typeof parsed.videoTone === "number" && parsed.videoTone >= 0 && parsed.videoTone < copy.videoTones.length) setVideoTone(parsed.videoTone);
          if (Array.isArray(parsed.characters) && parsed.characters.length === 3) setCharacters(parsed.characters);
          if (typeof parsed.soundStyle === "number" && parsed.soundStyle >= 0 && parsed.soundStyle < copy.soundStyles.length) setSoundStyle(parsed.soundStyle);
          if (typeof parsed.soundLocked === "boolean") setSoundLocked(parsed.soundLocked);
          if (typeof parsed.language === "number" && parsed.language >= 0 && parsed.language < copy.languages.length) setLanguage(parsed.language);
          if (typeof parsed.audioStyle === "number" && parsed.audioStyle >= 0 && parsed.audioStyle < copy.musicStyles.length) setAudioStyle(parsed.audioStyle);
          if (typeof parsed.audioTone === "number" && parsed.audioTone >= 0 && parsed.audioTone < copy.audioTones.length) setAudioTone(parsed.audioTone);
          if (typeof parsed.audioLanguage === "number" && parsed.audioLanguage >= 0 && parsed.audioLanguage < copy.languages.length) setAudioLanguage(parsed.audioLanguage);
          if (typeof parsed.rhymePolish === "boolean") setRhymePolish(parsed.rhymePolish);
          if (typeof parsed.referencePrompt === "string") setReferencePrompt(parsed.referencePrompt);
          const storedVoiceModel = voiceModels.find((model) => model.id === parsed.voiceModelId);
          if (storedVoiceModel) {
            setVoiceModelId(storedVoiceModel.id);
            setVoiceId(typeof parsed.voiceId === "string" && storedVoiceModel.voices.includes(parsed.voiceId) ? parsed.voiceId : storedVoiceModel.voices[0]);
          }
          if (typeof parsed.voiceFormat === "number" && parsed.voiceFormat >= 0 && parsed.voiceFormat < voiceFormats.length) setVoiceFormat(parsed.voiceFormat);
          if (typeof parsed.voiceStyle === "number" && parsed.voiceStyle >= 0 && parsed.voiceStyle < copy.voiceStyles.length) setVoiceStyle(parsed.voiceStyle);
          if (typeof parsed.voiceTone === "number" && parsed.voiceTone >= 0 && parsed.voiceTone < copy.voiceTones.length) setVoiceTone(parsed.voiceTone);
          if (typeof parsed.imageStyle === "number" && parsed.imageStyle >= 0 && parsed.imageStyle < copy.imageStyles.length) setImageStyle(parsed.imageStyle);
          if (typeof parsed.imageTone === "number" && parsed.imageTone >= 0 && parsed.imageTone < copy.imageTones.length) setImageTone(parsed.imageTone);
          const storedImageModel = imageModels.find((model) => model.id === parsed.imageModelId);
          if (storedImageModel) {
            setImageModelId(storedImageModel.id);
            setImageQuality(typeof parsed.imageQuality === "string" && storedImageModel.qualities.includes(parsed.imageQuality) ? parsed.imageQuality : storedImageModel.qualities[0]);
          }
          if (typeof parsed.imageBackground === "number" && parsed.imageBackground >= 0 && parsed.imageBackground < copy.imageBackgrounds.length) setImageBackground(parsed.imageBackground);
          if (typeof parsed.imageReferencePrompt === "string") setImageReferencePrompt(parsed.imageReferencePrompt);
          if (typeof parsed.avatarStyle === "number" && parsed.avatarStyle >= 0 && parsed.avatarStyle < copy.avatarStyles.length) setAvatarStyle(parsed.avatarStyle);
          if (typeof parsed.avatarTone === "number" && parsed.avatarTone >= 0 && parsed.avatarTone < copy.avatarTones.length) setAvatarTone(parsed.avatarTone);
          const storedAvatarModel = avatarModels.find((model) => model.id === parsed.avatarModelId);
          if (storedAvatarModel) {
            setAvatarModelId(storedAvatarModel.id);
            setAvatarQuality(typeof parsed.avatarQuality === "string" && storedAvatarModel.qualities.includes(parsed.avatarQuality) ? parsed.avatarQuality : storedAvatarModel.qualities[0]);
          }
          if (typeof parsed.avatarPrompt === "string") setAvatarPrompt(parsed.avatarPrompt);
          if (typeof parsed.avatarPreserveIdentity === "boolean") setAvatarPreserveIdentity(parsed.avatarPreserveIdentity);
          if (typeof parsed.avatarPose === "number" && parsed.avatarPose >= 0 && parsed.avatarPose < copy.avatarPoses.length) setAvatarPose(parsed.avatarPose);
          if (typeof parsed.avatarExpression === "number" && parsed.avatarExpression >= 0 && parsed.avatarExpression < copy.avatarExpressions.length) setAvatarExpression(parsed.avatarExpression);
          if (typeof parsed.avatarBackground === "number" && parsed.avatarBackground >= 0 && parsed.avatarBackground < copy.avatarBackgrounds.length) setAvatarBackground(parsed.avatarBackground);
          if (typeof parsed.avatarFraming === "number" && parsed.avatarFraming >= 0 && parsed.avatarFraming < copy.avatarFramings.length) setAvatarFraming(parsed.avatarFraming);
          if (typeof parsed.avatarFormat === "number" && parsed.avatarFormat >= 0 && parsed.avatarFormat < copy.avatarFormats.length) setAvatarFormat(parsed.avatarFormat);
        }
      } catch {
        // A malformed local preference must never block the generator UI.
      } finally {
        setPreferencesHydrated(true);
      }
    }, 0);
    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [copy.audioTones.length, copy.avatarBackgrounds.length, copy.avatarExpressions.length, copy.avatarFormats.length, copy.avatarFramings.length, copy.avatarPoses.length, copy.avatarStyles.length, copy.imageBackgrounds.length, copy.imageStyles.length, copy.languages.length, copy.musicStyles.length, copy.soundStyles.length, copy.videoStyles.length, copy.videoTones.length, copy.voiceStyles.length]);

  useEffect(() => {
    if (!preferencesHydrated) return;
    window.localStorage.setItem(preferencesKey, JSON.stringify({ modelId, duration, style, videoTone, characters, soundStyle, soundLocked, language, audioStyle, audioTone, audioLanguage, rhymePolish, referencePrompt, voiceModelId, voiceId, voiceFormat, voiceStyle, voiceTone, imageStyle, imageTone, imageModelId, imageQuality, imageBackground, imageReferencePrompt, avatarStyle, avatarTone, avatarModelId, avatarQuality, avatarPrompt, avatarPreserveIdentity, avatarPose, avatarExpression, avatarBackground, avatarFraming, avatarFormat }));
  }, [audioLanguage, audioStyle, audioTone, avatarBackground, avatarExpression, avatarFormat, avatarFraming, avatarModelId, avatarPose, avatarPreserveIdentity, avatarPrompt, avatarQuality, avatarStyle, avatarTone, characters, duration, imageBackground, imageModelId, imageQuality, imageReferencePrompt, imageStyle, imageTone, language, modelId, preferencesHydrated, referencePrompt, rhymePolish, soundLocked, soundStyle, style, videoTone, voiceFormat, voiceId, voiceModelId, voiceStyle, voiceTone]);

  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  useEffect(() => {
    referencesRef.current = { image: imageReference, avatar: avatarReference };
  }, [avatarReference, imageReference]);

  useEffect(() => () => {
    Object.values(framesRef.current).forEach((frame) => {
      if (frame) URL.revokeObjectURL(frame.url);
    });
    Object.values(referencesRef.current).forEach((reference) => {
      if (reference) URL.revokeObjectURL(reference.url);
    });
  }, []);

  function chooseModel(nextId: string) {
    const nextModel = videoModels.find((model) => model.id === nextId) ?? videoModels[0];
    setModelId(nextModel.id);
    setDuration(nextModel.durations.includes(duration) ? duration : nextModel.durations[0]);
  }

  function chooseVoiceModel(nextId: string) {
    const nextModel = voiceModels.find((model) => model.id === nextId) ?? voiceModels[0];
    setVoiceModelId(nextModel.id);
    setVoiceId(nextModel.voices.includes(voiceId) ? voiceId : nextModel.voices[0]);
  }

  function chooseImageModel(nextId: string) {
    const nextModel = imageModels.find((model) => model.id === nextId) ?? imageModels[0];
    setImageModelId(nextModel.id);
    setImageQuality(nextModel.qualities.includes(imageQuality) ? imageQuality : nextModel.qualities[0]);
  }

  function chooseAvatarModel(nextId: string) {
    const nextModel = avatarModels.find((model) => model.id === nextId) ?? avatarModels[0];
    setAvatarModelId(nextModel.id);
    setAvatarQuality(nextModel.qualities.includes(avatarQuality) ? avatarQuality : nextModel.qualities[0]);
  }

  function updateCharacter(index: number, key: "name" | "description", value: string) {
    setCharacters((current) => current.map((character, characterIndex) => characterIndex === index && !character.locked ? { ...character, [key]: value } : character));
  }

  function toggleCharacterLock(index: number) {
    setCharacters((current) => current.map((character, characterIndex) => characterIndex === index ? { ...character, locked: !character.locked } : character));
  }

  function setFrame(slot: FrameSlot, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFrames((current) => {
      const previous = current[slot];
      if (previous) URL.revokeObjectURL(previous.url);
      return { ...current, [slot]: { name: file.name, url: URL.createObjectURL(file), type: file.type.startsWith("video/") ? "video" : "image" } };
    });
  }

  function setReferenceAsset(kind: "image" | "avatar", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    const next: ReferenceAsset = { name: file.name, url: URL.createObjectURL(file), type: "image" };
    if (kind === "image") {
      setImageReference((current) => {
        if (current) URL.revokeObjectURL(current.url);
        return next;
      });
    } else {
      setAvatarReference((current) => {
        if (current) URL.revokeObjectURL(current.url);
        return next;
      });
    }
  }

  async function prepare() {
    const missingImageReference = isImage && (!imageReference || !imageReferencePrompt.trim());
    const missingAvatarReference = isAvatar && (!avatarReference || !avatarPrompt.trim());
    if (active === undefined || !prompt.trim() || missingImageReference || missingAvatarReference || busy) return;
    const styleLabel = isVideo ? copy.videoStyles[style] : isAudio ? copy.musicStyles[audioStyle] : isVoice ? copy.voiceStyles[voiceStyle] : isImage ? copy.imageStyles[imageStyle] : copy.avatarStyles[avatarStyle];
    const toneLabel = isVideo ? copy.videoTones[videoTone] : isAudio ? copy.audioTones[audioTone] : isVoice ? copy.voiceTones[voiceTone] : isImage ? copy.imageTones[imageTone] : copy.avatarTones[avatarTone];
    const formatLabel = isVoice ? `${voiceFormats[voiceFormat]} · ${copy.voiceFormats[voiceFormat]}` : `${formats[format]} · ${copy.formats[format]}`;
    const baseRequest = copy.request.replace("{type}", copy.types[active]).replace("{format}", formatLabel).replace("{style}", styleLabel).replace("{prompt}", prompt.trim());
    const request = isVideo ? [
      baseRequest,
      `${copy.model}: ${selectedModel.name} (${copy.modelTiers[selectedModel.tier]})`,
      `${copy.duration}: ${duration} ${copy.secondsUnit}`,
      `${copy.firstFrame}: ${frames.first?.name ?? copy.noFrame}`,
      `${copy.lastFrame}: ${frames.last?.name ?? copy.noFrame}`,
      `${copy.referencePhoto}: ${frames.reference?.name ?? copy.noFrame}`,
      `${copy.referencePrompt}: ${referencePrompt.trim() || copy.noPrompt}`,
      `${copy.tone}: ${toneLabel}`,
      `${copy.soundStyle}: ${copy.soundStyles[soundStyle]}${soundLocked ? ` (${copy.locked})` : ""}`,
      `${copy.language}: ${copy.languages[language]}`,
      `${copy.characters}: ${characters.map((character, index) => `${index + 1}) ${character.name || copy.emptyCharacter}${character.description ? ` — ${character.description}` : ""}${character.locked ? ` (${copy.locked})` : ""}`).join("; ")}`,
    ].join(" ") : isAudio ? [
      baseRequest,
      `${copy.tone}: ${toneLabel}`,
      `${copy.audioStyle}: ${copy.musicStyles[audioStyle]}`,
      `${copy.audioLanguage}: ${copy.languages[audioLanguage]}`,
      `${copy.rhymePolish}: ${rhymePolish ? copy.rhymePolishOn : copy.rhymePolishOff}`,
    ].join(" ") : isVoice ? [
      baseRequest,
      `${copy.tone}: ${toneLabel}`,
      `${copy.voiceModel}: ${selectedVoiceModel.name} [${selectedVoiceModel.providerModel}] (${copy.modelTiers[selectedVoiceModel.tier]})`,
      `${copy.voice}: ${selectedVoice.id} (${selectedVoice.gender === "female" ? copy.voiceFemale : copy.voiceMale})`,
      `${copy.voiceFormat}: ${voiceFormats[voiceFormat]}`,
    ].join(" ") : isImage ? [
      baseRequest,
      `${copy.imageModel}: ${selectedImageModel.name} [${selectedImageModel.providerModel}] (${copy.modelTiers[selectedImageModel.tier]})`,
      `${copy.imageQuality}: ${imageQuality}`,
      `${copy.imageBackground}: ${copy.imageBackgrounds[imageBackground]}`,
      `${copy.imageReference}: ${imageReference?.name ?? copy.noFrame}`,
      `${copy.imageReferencePrompt}: ${imageReferencePrompt.trim()}`,
      copy.photoUsageRequired,
      `${copy.tone}: ${toneLabel}`,
    ].join(" ") : [
      baseRequest,
      `${copy.avatarModel}: ${selectedAvatarModel.name} [${selectedAvatarModel.providerModel}] (${copy.modelTiers[selectedAvatarModel.tier]})`,
      `${copy.avatarQuality}: ${avatarQuality}`,
      `${copy.avatarPhoto}: ${avatarReference?.name ?? copy.noFrame}`,
      `${copy.avatarPrompt}: ${avatarPrompt.trim()}`,
      `${copy.avatarIdentity}: ${avatarPreserveIdentity ? copy.avatarIdentityOn : copy.avatarIdentityOff}`,
      `${copy.avatarPose}: ${copy.avatarPoses[avatarPose]}`,
      `${copy.avatarExpression}: ${copy.avatarExpressions[avatarExpression]}`,
      `${copy.avatarBackground}: ${copy.avatarBackgrounds[avatarBackground]}`,
      `${copy.avatarFraming}: ${copy.avatarFramings[avatarFraming]}`,
      `${copy.avatarFormat}: ${copy.avatarFormats[avatarFormat]}`,
      copy.photoUsageRequired,
      `${copy.tone}: ${toneLabel}`,
    ].join(" ");
    await onRequest(request);
  }

  return <>
    {showLauncher && <section className="ai-creation" aria-label={copy.generator}>
      <div className="ai-creation-head"><div><span className="studio-eyebrow">Owner AI</span><h3>{copy.generator}</h3><p>{copy.generatorNote}</p></div></div>
      <div className="ai-generation-grid">
        {copy.types.map((label, index) => { const Icon = icons[index]; return <Link key={index} className="ai-generation-card" href={`/marketing/generator/${generatorTypes[index]}`} aria-current={active === index ? "page" : undefined}>
          <span className="ai-gen-icon"><Icon size={18}/></span><span><strong>{label}</strong><small>{copy.hints[index]}</small></span><em>{copy.open}</em>
        </Link>; })}
      </div>
    </section>}
    {active !== undefined && <section className="core-generator-page" aria-labelledby="generator-title">
        <span className="studio-eyebrow">Owner AI · {copy.generator}</span>
        <h2 id="generator-title">{copy.create} · {copy.types[active]}</h2>
        <p>{copy.hints[active]}</p>
        <div className={`ai-generator-layout ${isVideo ? "video-generator-layout" : ""}`}>
          <div>
            <label className="ai-prompt-label" htmlFor="media-generator-prompt">{copy.prompt}</label>
            <textarea id="media-generator-prompt" value={prompt} maxLength={7000} onChange={(event) => setPrompt(event.target.value)} rows={5} placeholder={copy.placeholder}/>
            {isVideo ? <>
              <nav className="video-generator-tabs" aria-label={copy.videoSettingsTabs.join(", ")}>
                {copy.videoSettingsTabs.map((label, index) => {
                  const tab = ["settings", "styles", "characters", "sound"][index] as VideoTab;
                  return <button key={tab} type="button" className={videoTab === tab ? "is-active" : ""} aria-pressed={videoTab === tab} onClick={() => setVideoTab(tab)}>{label}</button>;
                })}
              </nav>
              {videoTab === "settings" && <div className="video-generator-panel">
                <div className="ai-generator-options">
                  <label>{copy.format}<select value={format} onChange={(event) => setFormat(Number(event.target.value))}>{formats.map((ratio, index) => <option key={ratio} value={index}>{ratio} · {copy.formats[index]}</option>)}</select></label>
                  <label><span className="field-label-with-icon"><Clock3 size={13}/>{copy.duration}</span><output className="video-duration-output">{duration} {copy.secondsUnit}</output></label>
                </div>
                <div className="video-setting-block"><div className="video-setting-heading"><span>{copy.model}</span><small>{copy.modelHint}</small></div><div className="video-model-grid">
                  {videoModels.map((model) => <button key={model.id} type="button" className={`video-model-card ${model.id === modelId ? "is-selected" : ""}`} aria-pressed={model.id === modelId} onClick={() => chooseModel(model.id)}>
                    <span className={`video-model-tier tier-${model.tier}`}>{copy.modelTiers[model.tier]}</span><strong>{model.name}</strong><small>{model.summary}</small>
                  </button>)}
                </div></div>
                <div className="video-setting-block"><div className="video-setting-heading"><span>{copy.duration}</span><small>{copy.durationHint}</small></div><div className="video-duration-options">
                  {selectedModel.durations.map((seconds) => <button key={seconds} type="button" className={duration === seconds ? "is-selected" : ""} aria-pressed={duration === seconds} onClick={() => setDuration(seconds)}>{seconds} {copy.secondsUnit}</button>)}
                </div></div>
                <div className="video-setting-block"><div className="video-setting-heading"><span>{copy.frames}</span><small>{copy.framesHint}</small></div><div className="video-frame-grid">
                  {(["first", "last"] as const).map((slot) => { const frame = frames[slot]; const label = slot === "first" ? copy.firstFrame : copy.lastFrame; return <article className="video-frame-card" key={slot}>
                    <div className="video-frame-preview">{frame ? frame.type === "video" ? <video src={frame.url} aria-label={label} muted playsInline/> : <img src={frame.url} alt={label}/> : <ImageIcon size={22}/>}</div><div className="video-frame-meta"><strong>{label}</strong><small>{frame?.name ?? copy.noFrame}</small></div><label className="studio-ghost video-frame-upload"><Upload size={13}/>{frame ? copy.replaceFrame : copy.chooseFrame}<input type="file" accept="image/*,video/*" hidden onChange={(event) => setFrame(slot, event)}/></label>
                  </article>; })}
                  {(() => { const frame = frames.reference; return <article className="video-frame-card video-reference-card" key="reference">
                    <div className="video-frame-preview">{frame ? <img src={frame.url} alt={copy.referencePhoto}/> : <ImageIcon size={22}/>}</div><div className="video-frame-meta"><strong>{copy.referencePhoto}</strong><small>{frame?.name ?? copy.noFrame}</small></div><label className="studio-ghost video-frame-upload"><Upload size={13}/>{frame ? copy.replaceFrame : copy.chooseFrame}<input type="file" accept="image/*" hidden onChange={(event) => setFrame("reference", event)}/></label>
                    <label className="video-reference-prompt">{copy.referencePrompt}<textarea rows={2} value={referencePrompt} onChange={(event) => setReferencePrompt(event.target.value)} placeholder={copy.referencePromptPlaceholder}/></label>
                  </article>; })()}
                </div></div>
              </div>}
              {videoTab === "styles" && <div className="video-generator-panel"><div className="video-setting-heading"><span>{copy.style}</span><small>{copy.videoStylesHint}</small></div><div className="video-style-grid">
                {copy.videoStyles.map((label, index) => <button key={label} type="button" className={style === index ? "is-selected" : ""} aria-pressed={style === index} onClick={() => setStyle(index)}><span>{String(index + 1).padStart(2, "0")}</span>{label}</button>)}
              </div><div className="video-tone-block"><div className="video-setting-heading"><span>{copy.tone}</span><small>{copy.toneHint}</small></div><div className="tone-grid">
                {copy.videoTones.map((label, index) => <button key={label} type="button" className={videoTone === index ? "is-selected" : ""} aria-pressed={videoTone === index} onClick={() => setVideoTone(index)}>{label}</button>)}
              </div></div></div>}
              {videoTab === "characters" && <div className="video-generator-panel"><div className="video-setting-heading"><span>{copy.characters}</span><small>{copy.charactersHint}</small></div><div className="video-character-grid">
                {characters.map((character, index) => <article className={`video-character-card ${character.locked ? "is-locked" : ""}`} key={index}><div className="video-character-heading"><strong>{copy.characterSlot.replace("{n}", String(index + 1))}</strong><button type="button" className="video-lock-button" aria-pressed={character.locked} onClick={() => toggleCharacterLock(index)}>{character.locked ? <LockKeyhole size={14}/> : <UnlockKeyhole size={14}/>} {character.locked ? copy.unlock : copy.lock}</button></div><label>{copy.characterName}<input value={character.name} disabled={character.locked} onChange={(event) => updateCharacter(index, "name", event.target.value)} placeholder={copy.characterNamePlaceholder}/></label><label>{copy.characterDescription}<textarea rows={2} value={character.description} disabled={character.locked} onChange={(event) => updateCharacter(index, "description", event.target.value)} placeholder={copy.characterDescriptionPlaceholder}/></label></article>)}
              </div></div>}
              {videoTab === "sound" && <div className="video-generator-panel"><div className="video-sound-grid"><label><span className="field-label-with-icon"><Volume2 size={13}/>{copy.soundStyle}</span><select value={soundStyle} disabled={soundLocked} onChange={(event) => setSoundStyle(Number(event.target.value))}>{copy.soundStyles.map((label, index) => <option key={label} value={index}>{label}</option>)}</select></label><label><span className="field-label-with-icon"><Languages size={13}/>{copy.language}</span><select value={language} onChange={(event) => setLanguage(Number(event.target.value))}>{copy.languages.map((label, index) => <option key={label} value={index}>{label}</option>)}</select></label></div><button type="button" className={`video-sound-lock ${soundLocked ? "is-locked" : ""}`} aria-pressed={soundLocked} onClick={() => setSoundLocked((locked) => !locked)}>{soundLocked ? <LockKeyhole size={15}/> : <UnlockKeyhole size={15}/>} {soundLocked ? copy.soundLocked : copy.lockSound}</button><p className="core-studio-notice">{copy.preferencesSaved}</p></div>}
            </> : isAudio ? <div className="audio-generator-panel">
              <div className="video-setting-heading"><span>{copy.audioStyle}</span><small>{copy.audioStylesHint}</small></div>
              <div className="audio-style-grid">
                {copy.musicStyles.map((label, index) => <button key={label} type="button" className={audioStyle === index ? "is-selected" : ""} aria-pressed={audioStyle === index} onClick={() => setAudioStyle(index)}><span>{String(index + 1).padStart(2, "0")}</span>{label}</button>)}
              </div>
              <div className="video-tone-block"><div className="video-setting-heading"><span>{copy.tone}</span><small>{copy.audioTonesHint}</small></div><div className="tone-grid">
                {copy.audioTones.map((label, index) => <button key={label} type="button" className={audioTone === index ? "is-selected" : ""} aria-pressed={audioTone === index} onClick={() => setAudioTone(index)}>{label}</button>)}
              </div></div>
              <div className="video-sound-grid audio-generator-controls"><label><span className="field-label-with-icon"><Languages size={13}/>{copy.audioLanguage}</span><select value={audioLanguage} onChange={(event) => setAudioLanguage(Number(event.target.value))}>{copy.languages.map((label, index) => <option key={label} value={index}>{label}</option>)}</select></label></div>
              <button type="button" className={`audio-rhyme-polish ${rhymePolish ? "is-enabled" : ""}`} aria-pressed={rhymePolish} onClick={() => setRhymePolish((enabled) => !enabled)}><Sparkles size={15}/>{rhymePolish ? copy.rhymePolishOn : copy.rhymePolishOff}</button>
              <p className="core-studio-notice">{copy.rhymePolishHint}</p>
            </div> : isVoice ? <div className="voice-generator-panel">
              <div className="video-setting-heading"><span>{copy.voiceModel}</span><small>{copy.voiceModelHint}</small></div>
              <div className="voice-model-grid">
                {voiceModels.map((model) => <button key={model.id} type="button" className={`video-model-card ${model.id === voiceModelId ? "is-selected" : ""}`} aria-pressed={model.id === voiceModelId} onClick={() => chooseVoiceModel(model.id)}>
                  <span className={`video-model-tier tier-${model.tier}`}>{copy.modelTiers[model.tier]}</span><strong>{model.name}</strong><small>{model.providerModel} · {model.summary}</small>
                </button>)}
              </div>
              <div className="voice-setting-block"><div className="video-setting-heading"><span>{copy.voice}</span><small>{copy.voiceHint}</small></div><div className="voice-grid">
                {selectedVoiceModel.voices.map((id) => { const voice = voiceCatalog.find((candidate) => candidate.id === id) ?? voiceCatalog[0]; const isSelected = voice.id === voiceId; return <button key={voice.id} type="button" className={`voice-card voice-${voice.gender} ${isSelected ? "is-selected" : ""}`} aria-pressed={isSelected} onClick={() => setVoiceId(voice.id)}><strong>{voice.id}</strong><small>{voice.gender === "female" ? copy.voiceFemale : copy.voiceMale}</small></button>; })}
              </div></div>
              <div className="voice-setting-block"><div className="video-setting-heading"><span>{copy.voiceStyle}</span><small>{copy.voiceStylesHint}</small></div><div className="voice-style-grid">
                {copy.voiceStyles.map((label, index) => <button key={label} type="button" className={voiceStyle === index ? "is-selected" : ""} aria-pressed={voiceStyle === index} onClick={() => setVoiceStyle(index)}><span>{String(index + 1).padStart(2, "0")}</span>{label}</button>)}
              </div><div className="video-tone-block"><div className="video-setting-heading"><span>{copy.tone}</span><small>{copy.voiceTonesHint}</small></div><div className="tone-grid">
                {copy.voiceTones.map((label, index) => <button key={label} type="button" className={voiceTone === index ? "is-selected" : ""} aria-pressed={voiceTone === index} onClick={() => setVoiceTone(index)}>{label}</button>)}
              </div></div></div>
              <div className="voice-generator-controls"><label>{copy.voiceFormat}<select value={voiceFormat} onChange={(event) => setVoiceFormat(Number(event.target.value))}>{voiceFormats.map((formatName, index) => <option key={formatName} value={index}>{formatName.toUpperCase()} · {copy.voiceFormats[index]}</option>)}</select></label></div>
              <p className="core-studio-notice">{copy.voiceOfficialNote}</p><a className="voice-docs-link" href="https://developers.openai.com/api/docs/guides/text-to-speech" target="_blank" rel="noreferrer">{copy.voiceDocsLabel}</a>
            </div> : isImage ? <div className="visual-generator-panel image-generator-panel">
              <div className="video-setting-block"><div className="video-setting-heading"><span>{copy.imageModel}</span><small>{copy.imageModelHint}</small></div><div className="video-model-grid">
                {imageModels.map((model) => <button key={model.id} type="button" className={`video-model-card ${model.id === imageModelId ? "is-selected" : ""}`} aria-pressed={model.id === imageModelId} onClick={() => chooseImageModel(model.id)}><span className={`video-model-tier tier-${model.tier}`}>{copy.modelTiers[model.tier]}</span><strong>{model.name}</strong><small>{model.providerModel} · {model.summary}</small></button>)}
              </div></div>
              <div className="ai-generator-options"><label>{copy.format}<select value={format} onChange={(event) => setFormat(Number(event.target.value))}>{formats.map((ratio, index) => <option key={ratio} value={index}>{ratio} · {copy.formats[index]}</option>)}</select></label><label>{copy.imageQuality}<select value={imageQuality} onChange={(event) => setImageQuality(event.target.value as ImageQuality)}>{selectedImageModel.qualities.map((quality) => <option key={quality} value={quality}>{copy.imageQualities[qualityKeys.indexOf(quality)]}</option>)}</select></label><label>{copy.imageBackground}<select value={imageBackground} onChange={(event) => setImageBackground(Number(event.target.value))}>{copy.imageBackgrounds.map((label, index) => <option key={label} value={index}>{label}</option>)}</select></label></div>
              <article className="reference-photo-card"><div className="video-frame-preview reference-photo-preview">{imageReference ? <img src={imageReference.url} alt={copy.imageReference}/> : <ImageIcon size={24}/>}</div><div className="video-frame-meta"><strong>{copy.imageReference} <span className="required-field">*</span></strong><small>{imageReference?.name ?? copy.noFrame}</small></div><label className="studio-ghost video-frame-upload"><Upload size={13}/>{imageReference ? copy.replaceFrame : copy.chooseFrame}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(event) => setReferenceAsset("image", event)}/></label><p className="core-studio-notice">{!imageReference || !imageReferencePrompt.trim() ? copy.imageReferenceRequired : copy.imageReferenceHint}</p><label className="video-reference-prompt">{copy.imageReferencePrompt} <span className="required-field">*</span><textarea rows={2} required value={imageReferencePrompt} onChange={(event) => setImageReferencePrompt(event.target.value)} placeholder={copy.imageReferencePromptPlaceholder}/></label></article>
              <div className="video-setting-heading"><span>{copy.imageStyle}</span><small>{copy.imageStylesHint}</small></div><div className="visual-style-grid">
                {copy.imageStyles.map((label, index) => <button key={label} type="button" className={imageStyle === index ? "is-selected" : ""} aria-pressed={imageStyle === index} onClick={() => setImageStyle(index)}><span>{String(index + 1).padStart(2, "0")}</span>{label}</button>)}
              </div><div className="video-tone-block"><div className="video-setting-heading"><span>{copy.tone}</span><small>{copy.imageTonesHint}</small></div><div className="tone-grid">
                {copy.imageTones.map((label, index) => <button key={label} type="button" className={imageTone === index ? "is-selected" : ""} aria-pressed={imageTone === index} onClick={() => setImageTone(index)}>{label}</button>)}
              </div></div>
            </div> : isAvatar ? <div className="visual-generator-panel avatar-generator-panel">
              <div className="video-setting-block"><div className="video-setting-heading"><span>{copy.avatarModel}</span><small>{copy.avatarModelHint}</small></div><div className="video-model-grid">
                {avatarModels.map((model) => <button key={model.id} type="button" className={`video-model-card ${model.id === avatarModelId ? "is-selected" : ""}`} aria-pressed={model.id === avatarModelId} onClick={() => chooseAvatarModel(model.id)}><span className={`video-model-tier tier-${model.tier}`}>{copy.modelTiers[model.tier]}</span><strong>{model.name}</strong><small>{model.providerModel} · {model.summary}</small></button>)}
              </div></div>
              <div className="ai-generator-options"><label>{copy.format}<select value={format} onChange={(event) => setFormat(Number(event.target.value))}>{formats.map((ratio, index) => <option key={ratio} value={index}>{ratio} · {copy.formats[index]}</option>)}</select></label><label>{copy.avatarQuality}<select value={avatarQuality} onChange={(event) => setAvatarQuality(event.target.value as ImageQuality)}>{selectedAvatarModel.qualities.map((quality) => <option key={quality} value={quality}>{copy.avatarQualities[qualityKeys.indexOf(quality)]}</option>)}</select></label></div>
              <article className="reference-photo-card"><div className="video-frame-preview reference-photo-preview">{avatarReference ? <img src={avatarReference.url} alt={copy.avatarPhoto}/> : <UserRound size={24}/>}</div><div className="video-frame-meta"><strong>{copy.avatarPhoto} <span className="required-field">*</span></strong><small>{avatarReference?.name ?? copy.noFrame}</small></div><label className="studio-ghost video-frame-upload"><Upload size={13}/>{avatarReference ? copy.replaceFrame : copy.chooseFrame}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(event) => setReferenceAsset("avatar", event)}/></label><p className="core-studio-notice">{!avatarReference || !avatarPrompt.trim() ? copy.avatarReferenceRequired : copy.avatarPhotoHint}</p><label className="video-reference-prompt">{copy.avatarPrompt} <span className="required-field">*</span><textarea rows={2} required value={avatarPrompt} onChange={(event) => setAvatarPrompt(event.target.value)} placeholder={copy.avatarPromptPlaceholder}/></label></article>
              <div className="avatar-settings-grid"><label>{copy.avatarPose}<select value={avatarPose} onChange={(event) => setAvatarPose(Number(event.target.value))}>{copy.avatarPoses.map((label, index) => <option key={label} value={index}>{label}</option>)}</select></label><label>{copy.avatarExpression}<select value={avatarExpression} onChange={(event) => setAvatarExpression(Number(event.target.value))}>{copy.avatarExpressions.map((label, index) => <option key={label} value={index}>{label}</option>)}</select></label><label>{copy.avatarBackground}<select value={avatarBackground} onChange={(event) => setAvatarBackground(Number(event.target.value))}>{copy.avatarBackgrounds.map((label, index) => <option key={label} value={index}>{label}</option>)}</select></label><label>{copy.avatarFraming}<select value={avatarFraming} onChange={(event) => setAvatarFraming(Number(event.target.value))}>{copy.avatarFramings.map((label, index) => <option key={label} value={index}>{label}</option>)}</select></label><label>{copy.avatarFormat}<select value={avatarFormat} onChange={(event) => setAvatarFormat(Number(event.target.value))}>{copy.avatarFormats.map((label, index) => <option key={label} value={index}>{label}</option>)}</select></label></div>
              <button type="button" className={`avatar-identity-toggle ${avatarPreserveIdentity ? "is-enabled" : ""}`} aria-pressed={avatarPreserveIdentity} onClick={() => setAvatarPreserveIdentity((enabled) => !enabled)}>{avatarPreserveIdentity ? <LockKeyhole size={15}/> : <UnlockKeyhole size={15}/>} {avatarPreserveIdentity ? copy.avatarIdentityOn : copy.avatarIdentityOff}</button><p className="avatar-best-practices">{copy.avatarBestPractices}</p>
              <div className="video-setting-heading"><span>{copy.avatarStyle}</span><small>{copy.avatarStylesHint}</small></div><div className="visual-style-grid">
                {copy.avatarStyles.map((label, index) => <button key={label} type="button" className={avatarStyle === index ? "is-selected" : ""} aria-pressed={avatarStyle === index} onClick={() => setAvatarStyle(index)}><span>{String(index + 1).padStart(2, "0")}</span>{label}</button>)}
              </div><div className="video-tone-block"><div className="video-setting-heading"><span>{copy.tone}</span><small>{copy.avatarTonesHint}</small></div><div className="tone-grid">
                {copy.avatarTones.map((label, index) => <button key={label} type="button" className={avatarTone === index ? "is-selected" : ""} aria-pressed={avatarTone === index} onClick={() => setAvatarTone(index)}>{label}</button>)}
              </div></div>
            </div> : null}
            <p className="core-studio-notice">{copy.mediaUnavailable}</p>
            <button type="button" className="studio-primary" disabled title={copy.mediaUnavailable}>{copy.generate}</button>
            <button type="button" className="studio-gold" disabled={!prompt.trim() || (isImage && (!imageReference || !imageReferencePrompt.trim())) || (isAvatar && (!avatarReference || !avatarPrompt.trim())) || busy} onClick={() => void prepare()}>{busy ? copy.preparing : copy.prepare}</button>
          </div>
          <div className="ai-generator-preview"><span className="ai-preview-orb"><Sparkles/></span><strong>{copy.preview}</strong><small>{isVideo ? `${copy.videoStyles[style]} · ${copy.videoTones[videoTone]}` : isAudio ? `${copy.musicStyles[audioStyle]} · ${copy.audioTones[audioTone]} · ${copy.languages[audioLanguage]}` : isVoice ? `${selectedVoiceModel.name} · ${selectedVoice.id} · ${copy.voiceStyles[voiceStyle]} · ${copy.voiceTones[voiceTone]}` : isImage ? `${selectedImageModel.name} · ${copy.imageStyles[imageStyle]} · ${copy.imageTones[imageTone]}${imageReference ? ` · ${imageReference.name}` : ""}` : isAvatar ? `${selectedAvatarModel.name} · ${copy.avatarStyles[avatarStyle]} · ${copy.avatarTones[avatarTone]}${avatarReference ? ` · ${avatarReference.name}` : ""}` : copy.previewEmpty}</small></div>
        </div>
      </section>}
  </>;
}
