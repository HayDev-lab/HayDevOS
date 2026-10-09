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
const preferencesKey = "haydevos.video-generator.preferences.v1";

type VideoTab = "settings" | "styles" | "characters" | "sound";
type ModelTier = "budget" | "balanced" | "top";
type VoiceGender = "female" | "male";
type FrameSlot = "first" | "last" | "reference";
type CharacterSlot = { name: string; description: string; locked: boolean };
type FrameAsset = { name: string; url: string; type: "image" | "video" };
type FrameState = Record<FrameSlot, FrameAsset | null>;

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
  const [genericStyle, setGenericStyle] = useState(0);
  const [videoTab, setVideoTab] = useState<VideoTab>("settings");
  const [modelId, setModelId] = useState(videoModels[0].id);
  const [duration, setDuration] = useState(videoModels[0].durations[1]);
  const [characters, setCharacters] = useState<CharacterSlot[]>(defaultCharacters);
  const [soundStyle, setSoundStyle] = useState(0);
  const [soundLocked, setSoundLocked] = useState(false);
  const [language, setLanguage] = useState(0);
  const [audioStyle, setAudioStyle] = useState(0);
  const [audioLanguage, setAudioLanguage] = useState(0);
  const [rhymePolish, setRhymePolish] = useState(false);
  const [referencePrompt, setReferencePrompt] = useState("");
  const [voiceModelId, setVoiceModelId] = useState(voiceModels[0].id);
  const [voiceId, setVoiceId] = useState(voiceModels[0].voices[0]);
  const [voiceFormat, setVoiceFormat] = useState(0);
  const [frames, setFrames] = useState<FrameState>(defaultFrames);
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);
  const framesRef = useRef<FrameState>(defaultFrames);
  const active = activeType;
  const isVideo = active === 0;
  const isAudio = active === 1;
  const isVoice = active === 2;
  const selectedModel = videoModels.find((model) => model.id === modelId) ?? videoModels[0];
  const selectedVoiceModel = voiceModels.find((model) => model.id === voiceModelId) ?? voiceModels[0];
  const selectedVoice = voiceCatalog.find((voice) => voice.id === voiceId) ?? voiceCatalog[0];

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
            characters: CharacterSlot[];
            soundStyle: number;
            soundLocked: boolean;
            language: number;
            audioStyle: number;
            audioLanguage: number;
            rhymePolish: boolean;
            referencePrompt: string;
            voiceModelId: string;
            voiceId: string;
            voiceFormat: number;
          }>;
          const storedModel = videoModels.find((model) => model.id === parsed.modelId);
          if (storedModel) {
            setModelId(storedModel.id);
            setDuration(typeof parsed.duration === "number" && storedModel.durations.includes(parsed.duration) ? parsed.duration : storedModel.durations[0]);
          }
          if (typeof parsed.style === "number" && parsed.style >= 0 && parsed.style < copy.videoStyles.length) setStyle(parsed.style);
          if (Array.isArray(parsed.characters) && parsed.characters.length === 3) setCharacters(parsed.characters);
          if (typeof parsed.soundStyle === "number" && parsed.soundStyle >= 0 && parsed.soundStyle < copy.soundStyles.length) setSoundStyle(parsed.soundStyle);
          if (typeof parsed.soundLocked === "boolean") setSoundLocked(parsed.soundLocked);
          if (typeof parsed.language === "number" && parsed.language >= 0 && parsed.language < copy.languages.length) setLanguage(parsed.language);
          if (typeof parsed.audioStyle === "number" && parsed.audioStyle >= 0 && parsed.audioStyle < copy.musicStyles.length) setAudioStyle(parsed.audioStyle);
          if (typeof parsed.audioLanguage === "number" && parsed.audioLanguage >= 0 && parsed.audioLanguage < copy.languages.length) setAudioLanguage(parsed.audioLanguage);
          if (typeof parsed.rhymePolish === "boolean") setRhymePolish(parsed.rhymePolish);
          if (typeof parsed.referencePrompt === "string") setReferencePrompt(parsed.referencePrompt);
          const storedVoiceModel = voiceModels.find((model) => model.id === parsed.voiceModelId);
          if (storedVoiceModel) {
            setVoiceModelId(storedVoiceModel.id);
            setVoiceId(typeof parsed.voiceId === "string" && storedVoiceModel.voices.includes(parsed.voiceId) ? parsed.voiceId : storedVoiceModel.voices[0]);
          }
          if (typeof parsed.voiceFormat === "number" && parsed.voiceFormat >= 0 && parsed.voiceFormat < voiceFormats.length) setVoiceFormat(parsed.voiceFormat);
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
  }, [copy.languages.length, copy.musicStyles.length, copy.soundStyles.length, copy.videoStyles.length]);

  useEffect(() => {
    if (!preferencesHydrated) return;
    window.localStorage.setItem(preferencesKey, JSON.stringify({ modelId, duration, style, characters, soundStyle, soundLocked, language, audioStyle, audioLanguage, rhymePolish, referencePrompt, voiceModelId, voiceId, voiceFormat }));
  }, [audioLanguage, audioStyle, characters, duration, language, modelId, preferencesHydrated, referencePrompt, rhymePolish, soundLocked, soundStyle, style, voiceFormat, voiceId, voiceModelId]);

  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  useEffect(() => () => {
    Object.values(framesRef.current).forEach((frame) => {
      if (frame) URL.revokeObjectURL(frame.url);
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

  async function prepare() {
    if (active === undefined || !prompt.trim() || busy) return;
    const styleLabel = isVideo ? copy.videoStyles[style] : isAudio ? copy.musicStyles[audioStyle] : copy.styles[genericStyle];
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
      `${copy.soundStyle}: ${copy.soundStyles[soundStyle]}${soundLocked ? ` (${copy.locked})` : ""}`,
      `${copy.language}: ${copy.languages[language]}`,
      `${copy.characters}: ${characters.map((character, index) => `${index + 1}) ${character.name || copy.emptyCharacter}${character.description ? ` — ${character.description}` : ""}${character.locked ? ` (${copy.locked})` : ""}`).join("; ")}`,
    ].join(" ") : isAudio ? [
      baseRequest,
      `${copy.audioStyle}: ${copy.musicStyles[audioStyle]}`,
      `${copy.audioLanguage}: ${copy.languages[audioLanguage]}`,
      `${copy.rhymePolish}: ${rhymePolish ? copy.rhymePolishOn : copy.rhymePolishOff}`,
    ].join(" ") : isVoice ? [
      baseRequest,
      `${copy.voiceModel}: ${selectedVoiceModel.name} [${selectedVoiceModel.providerModel}] (${copy.modelTiers[selectedVoiceModel.tier]})`,
      `${copy.voice}: ${selectedVoice.id} (${selectedVoice.gender === "female" ? copy.voiceFemale : copy.voiceMale})`,
      `${copy.voiceFormat}: ${voiceFormats[voiceFormat]}`,
    ].join(" ") : baseRequest;
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
              {videoTab === "styles" && <div className="video-generator-panel"><div className="video-setting-heading"><span>{copy.style}</span><small>{copy.stylesHint}</small></div><div className="video-style-grid">
                {copy.videoStyles.map((label, index) => <button key={label} type="button" className={style === index ? "is-selected" : ""} aria-pressed={style === index} onClick={() => setStyle(index)}><span>{String(index + 1).padStart(2, "0")}</span>{label}</button>)}
              </div></div>}
              {videoTab === "characters" && <div className="video-generator-panel"><div className="video-setting-heading"><span>{copy.characters}</span><small>{copy.charactersHint}</small></div><div className="video-character-grid">
                {characters.map((character, index) => <article className={`video-character-card ${character.locked ? "is-locked" : ""}`} key={index}><div className="video-character-heading"><strong>{copy.characterSlot.replace("{n}", String(index + 1))}</strong><button type="button" className="video-lock-button" aria-pressed={character.locked} onClick={() => toggleCharacterLock(index)}>{character.locked ? <LockKeyhole size={14}/> : <UnlockKeyhole size={14}/>} {character.locked ? copy.unlock : copy.lock}</button></div><label>{copy.characterName}<input value={character.name} disabled={character.locked} onChange={(event) => updateCharacter(index, "name", event.target.value)} placeholder={copy.characterNamePlaceholder}/></label><label>{copy.characterDescription}<textarea rows={2} value={character.description} disabled={character.locked} onChange={(event) => updateCharacter(index, "description", event.target.value)} placeholder={copy.characterDescriptionPlaceholder}/></label></article>)}
              </div></div>}
              {videoTab === "sound" && <div className="video-generator-panel"><div className="video-sound-grid"><label><span className="field-label-with-icon"><Volume2 size={13}/>{copy.soundStyle}</span><select value={soundStyle} disabled={soundLocked} onChange={(event) => setSoundStyle(Number(event.target.value))}>{copy.soundStyles.map((label, index) => <option key={label} value={index}>{label}</option>)}</select></label><label><span className="field-label-with-icon"><Languages size={13}/>{copy.language}</span><select value={language} onChange={(event) => setLanguage(Number(event.target.value))}>{copy.languages.map((label, index) => <option key={label} value={index}>{label}</option>)}</select></label></div><button type="button" className={`video-sound-lock ${soundLocked ? "is-locked" : ""}`} aria-pressed={soundLocked} onClick={() => setSoundLocked((locked) => !locked)}>{soundLocked ? <LockKeyhole size={15}/> : <UnlockKeyhole size={15}/>} {soundLocked ? copy.soundLocked : copy.lockSound}</button><p className="core-studio-notice">{copy.preferencesSaved}</p></div>}
            </> : isAudio ? <div className="audio-generator-panel">
              <div className="video-setting-heading"><span>{copy.audioStyle}</span><small>{copy.audioStylesHint}</small></div>
              <div className="audio-style-grid">
                {copy.musicStyles.map((label, index) => <button key={label} type="button" className={audioStyle === index ? "is-selected" : ""} aria-pressed={audioStyle === index} onClick={() => setAudioStyle(index)}><span>{String(index + 1).padStart(2, "0")}</span>{label}</button>)}
              </div>
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
              <div className="voice-generator-controls"><label>{copy.voiceFormat}<select value={voiceFormat} onChange={(event) => setVoiceFormat(Number(event.target.value))}>{voiceFormats.map((formatName, index) => <option key={formatName} value={index}>{formatName.toUpperCase()} · {copy.voiceFormats[index]}</option>)}</select></label></div>
              <p className="core-studio-notice">{copy.voiceOfficialNote}</p><a className="voice-docs-link" href="https://developers.openai.com/api/docs/guides/text-to-speech" target="_blank" rel="noreferrer">{copy.voiceDocsLabel}</a>
            </div> : <div className="ai-generator-options">
              <label>{copy.format}<select value={format} onChange={(event) => setFormat(Number(event.target.value))}>{formats.map((ratio, index) => <option key={ratio} value={index}>{ratio} · {copy.formats[index]}</option>)}</select></label>
              <label>{copy.style}<select value={genericStyle} onChange={(event) => setGenericStyle(Number(event.target.value))}>{copy.styles.map((label, index) => <option key={index} value={index}>{label}</option>)}</select></label>
            </div>}
            <p className="core-studio-notice">{copy.mediaUnavailable}</p>
            <button type="button" className="studio-primary" disabled title={copy.mediaUnavailable}>{copy.generate}</button>
            <button type="button" className="studio-gold" disabled={!prompt.trim() || busy} onClick={() => void prepare()}>{busy ? copy.preparing : copy.prepare}</button>
          </div>
          <div className="ai-generator-preview"><span className="ai-preview-orb"><Sparkles/></span><strong>{copy.preview}</strong><small>{isVideo ? `${selectedModel.name} · ${duration} ${copy.secondsUnit} · ${copy.videoStyles[style]}` : isAudio ? `${copy.musicStyles[audioStyle]} · ${copy.languages[audioLanguage]}` : isVoice ? `${selectedVoiceModel.name} · ${selectedVoice.id} · ${voiceFormats[voiceFormat].toUpperCase()}` : copy.previewEmpty}</small></div>
        </div>
      </section>}
  </>;
}
