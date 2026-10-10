"use client";

import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import { Captions, Diamond, Download, Film, LayoutTemplate, LockKeyhole, Mic, Music, Pause, Play, Sliders, Sparkles, Type, UnlockKeyhole, Upload, WandSparkles } from "lucide-react";
import { useStudioCopy } from "./studio-copy";
import { useEditorCopy, studioError } from "./editor-copy";
import { useLocale } from "@/lib/i18n";
import { StudioGeneratorPanel } from "./StudioGeneratorPanel";
import { downloadBlob, logoFromFile, renderMontage, speechFile, type EditorMedia } from "@/lib/studio/browser-media";
import { exportSubtitles, parseSubtitles, subtitleAt, validCues, type SubtitleCue } from "@/lib/studio/subtitles";
import { localMontage, validateMontagePatch, type MontagePatch, type MontageProposal } from "@/lib/studio/montage";
import type { GenerationInput } from "@/lib/studio/media-provider";

const icons = [Film, LayoutTemplate, Type, Music, Mic, Captions, WandSparkles, Sliders, Diamond, Sparkles];
const ratios = ["16:9", "9:16", "1:1"];
const stamp = (value: number) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
type Media = EditorMedia;
type MagicAssetKind = "reference" | "firstFrame" | "lastFrame" | "music" | "voice" | "sound";
type MagicAssetSlot = { file: File; url: string; name: string };
type MagicCharacter = { name: string; description: string; locked: boolean };
type MagicPreferenceKey = "videoStyle" | "videoTone" | "musicStyle" | "musicTone" | "soundStyle" | "voiceStyle" | "voiceTone" | "imageStyle" | "imageTone" | "avatarStyle" | "avatarTone";
type MagicPreferences = Partial<Record<MagicPreferenceKey, string>>;
type MagicPlanView = { providerReady: boolean; provider: string; durationSec: number; steps: Array<{ title: string; detail: string }>; aiSummary?: string };
type MagicCommand = { type: "open_studio_magic"; prompt: string; durationSec: number; language: string; aspectRatio: "16:9" | "9:16" | "1:1"; autoRun: boolean };

export function StudioEditor({ onBack }: { onBack: () => void }) {
  const copy = useStudioCopy();
  const edit = useEditorCopy();
  const { locale } = useLocale();
  const input = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const voiceInput = useRef<HTMLInputElement>(null);
  const player = useRef<HTMLVideoElement | null>(null);
  const mediaAudio = useRef<HTMLAudioElement | null>(null);
  const music = useRef<HTMLAudioElement | null>(null);
  const voice = useRef<HTMLAudioElement | null>(null);
  const sound = useRef<HTMLAudioElement | null>(null);
  const [media, setMedia] = useState<Media | null>(null);
  const [audioTrack, setAudioTrack] = useState<Media | null>(null);
  const [voiceTrack, setVoiceTrack] = useState<Media | null>(null);
  const [soundTrack, setSoundTrack] = useState<Media | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [soundDuration, setSoundDuration] = useState(0);
  const [tool, setTool] = useState(0);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ratio, setRatio] = useState(0);
  const [scale, setScale] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [opacity, setOpacity] = useState(100);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [text, setText] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [brand, setBrand] = useState("");
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [montageOpen, setMontageOpen] = useState(false);
  const [montagePrompt, setMontagePrompt] = useState("");
  const [proposal, setProposal] = useState<MontageProposal | null>(null);
  const [montageBusy, setMontageBusy] = useState(false);
  const [lastEdit, setLastEdit] = useState<MontagePatch | null>(null);
  const previousCaptions = useRef<{ cues: SubtitleCue[]; transcript: string } | null>(null);
  const [studioNotice, setStudioNotice] = useState<string | null>(null);
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [transcript, setTranscript] = useState("");
  const [transcriptBusy, setTranscriptBusy] = useState(false);
  const [speechSource, setSpeechSource] = useState("main");
  const [speechLanguage, setSpeechLanguage] = useState("auto");
  const [logo, setLogo] = useState<{ url: string; name: string; dataUrl: string } | null>(null);
  const [logoCorner, setLogoCorner] = useState<NonNullable<MontagePatch["logoCorner"]>>("top-right");
  const [logoSize, setLogoSize] = useState(15);
  const [logoOpacity, setLogoOpacity] = useState(100);
  const [renderProgress, setRenderProgress] = useState<number | null>(null);
  const renderAbort = useRef<AbortController | null>(null);
  const speechAbort = useRef<AbortController | null>(null);
  const proposalSource = useRef<string | undefined>(undefined);
  const currentSources = useRef({ media, audioTrack, voiceTrack });
  const captionInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const logoUrl = logo?.url;
  const [color, setColor] = useState("#ffffff");
  const [filter, setFilter] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  const [vignette, setVignette] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [error, setError] = useState<"fileError" | "loadError" | null>(null);
  const [magicOpen, setMagicOpen] = useState(false);
  const [magicPrompt, setMagicPrompt] = useState("");
  const [magicDuration, setMagicDuration] = useState(120);
  const [magicLanguage, setMagicLanguage] = useState(0);
  const [magicPreferences, setMagicPreferences] = useState<MagicPreferences>({});
  const [magicAssets, setMagicAssets] = useState<Partial<Record<MagicAssetKind, MagicAssetSlot>>>({});
  const [magicCharacters, setMagicCharacters] = useState<MagicCharacter[]>([
    { name: "", description: "", locked: false }, { name: "", description: "", locked: false }, { name: "", description: "", locked: false },
  ]);
  const [magicBusy, setMagicBusy] = useState(false);
  const [magicPlan, setMagicPlan] = useState<MagicPlanView | null>(null);
  const [magicError, setMagicError] = useState<string | null>(null);
  const magicAssetsRef = useRef(magicAssets);

  useEffect(() => () => { if (media) URL.revokeObjectURL(media.url); }, [media]);
  useEffect(() => () => { if (audioTrack) URL.revokeObjectURL(audioTrack.url); }, [audioTrack]);
  useEffect(() => () => { if (voiceTrack) URL.revokeObjectURL(voiceTrack.url); }, [voiceTrack]);
  useEffect(() => () => { if (soundTrack) URL.revokeObjectURL(soundTrack.url); }, [soundTrack]);
  useEffect(() => () => { if (logoUrl) URL.revokeObjectURL(logoUrl); }, [logoUrl]);
  useEffect(() => { currentSources.current = { media, audioTrack, voiceTrack }; }, [media, audioTrack, voiceTrack]);
  useEffect(() => () => { renderAbort.current?.abort(); speechAbort.current?.abort(); }, []);
  useEffect(() => { magicAssetsRef.current = magicAssets; }, [magicAssets]);
  useEffect(() => () => { Object.values(magicAssetsRef.current).forEach((asset) => { if (asset) URL.revokeObjectURL(asset.url); }); }, []);

  const timelineDuration = Math.max(duration, audioDuration, voiceDuration, soundDuration);
  const effectiveEnd = end || timelineDuration;
  const hasPlayable = Boolean(media?.type === "video" || media?.type === "audio" || audioTrack || voiceTrack || soundTrack);

  const magicPickers: Array<{ kind: MagicAssetKind; label: string; accept: string }> = [
    { kind: "reference", label: copy.magicReference, accept: "image/*" }, { kind: "firstFrame", label: copy.magicFirst, accept: "image/*,video/*" }, { kind: "lastFrame", label: copy.magicLast, accept: "image/*,video/*" },
    { kind: "music", label: copy.magicMusic, accept: "audio/*" }, { kind: "voice", label: copy.magicVoice, accept: "audio/*" }, { kind: "sound", label: copy.magicSound, accept: "audio/*" },
  ];

  function setMagicAsset(kind: MagicAssetKind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const valid = kind === "reference" ? file.type.startsWith("image/") : kind === "firstFrame" || kind === "lastFrame" ? file.type.startsWith("image/") || file.type.startsWith("video/") : file.type.startsWith("audio/");
    if (!valid || file.size > 25 * 1024 * 1024) { setMagicError(copy.magicError); return; }
    setMagicAssets((current) => {
      const previous = current[kind];
      if (previous) URL.revokeObjectURL(previous.url);
      return { ...current, [kind]: { file, name: file.name, url: URL.createObjectURL(file) } };
    });
    setMagicError(null);
  }

  function updateMagicCharacter(index: number, field: "name" | "description", value: string) {
    setMagicCharacters((current) => current.map((character, candidate) => candidate === index && !character.locked ? { ...character, [field]: value } : character));
  }

  function setMagicPreference(key: MagicPreferenceKey, value: string) {
    setMagicPreferences((current) => {
      if (!value) {
        const next = { ...current };
        delete next[key];
        return next;
      }
      return { ...current, [key]: value };
    });
  }

  async function runMagic(override?: Pick<MagicCommand, "prompt" | "durationSec" | "language" | "aspectRatio">) {
    const effectivePrompt = override?.prompt ?? magicPrompt;
    const effectiveDuration = override?.durationSec ?? magicDuration;
    const effectiveLanguage = override?.language ?? copy.languages[magicLanguage];
    const effectiveAspectRatio = override?.aspectRatio ?? ratios[ratio];
    if (!effectivePrompt.trim() || magicBusy) return;
    setMagicBusy(true); setMagicError(null); setMagicPlan(null);
    try {
      const form = new FormData();
      form.set("prompt", effectivePrompt.trim()); form.set("durationSec", String(Math.max(1, Math.min(600, effectiveDuration)))); form.set("language", effectiveLanguage); form.set("aspectRatio", effectiveAspectRatio); form.set("characters", JSON.stringify(magicCharacters));
      if (Object.keys(magicPreferences).length) form.set("preferences", JSON.stringify(magicPreferences));
      Object.entries(magicAssets).forEach(([kind, asset]) => { if (asset) form.set(kind, asset.file); });
      const response = await fetch("/api/studio/magic", { method: "POST", body: form, credentials: "same-origin" });
      const payload = await response.json() as { plan?: MagicPlanView; error?: string };
      if (!response.ok || !payload.plan) throw new Error(payload.error ?? copy.magicError);
      setMagicPlan(payload.plan);
    } catch (reason) {
      setMagicError(copy.magicError);
    } finally {
      setMagicBusy(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem("haydevos.magic.command");
    if (!raw) return;
    window.sessionStorage.removeItem("haydevos.magic.command");
    try {
      const command = JSON.parse(raw) as Partial<MagicCommand>;
      if (command.type !== "open_studio_magic" || typeof command.prompt !== "string" || !command.prompt.trim()) return;
      const prompt = command.prompt;
      const durationSec = typeof command.durationSec === "number" ? command.durationSec : 120;
      const language = typeof command.language === "string" ? command.language : copy.languages[0] ?? "Русский";
      const aspectRatio = command.aspectRatio && ratios.includes(command.aspectRatio) ? command.aspectRatio : "16:9";
      const languageIndex = copy.languages.findIndex((candidate) => candidate === language);
      queueMicrotask(() => {
        setMagicPrompt(prompt);
        setMagicDuration(Math.max(1, Math.min(600, Math.trunc(durationSec))));
        setMagicLanguage(languageIndex >= 0 ? languageIndex : 0);
        setRatio(Math.max(0, ratios.indexOf(aspectRatio)));
        setMagicOpen(true);
        setMagicError(null);
        if (command.autoRun) void runMagic({ prompt, durationSec, language, aspectRatio });
      });
    } catch {
      queueMicrotask(() => setMagicError(copy.magicError));
    }
  }, [copy.languages]);

  function applyMagicPlan() {
    if (!magicPlan) return;
    const cloneImage = magicAssets.reference;
    if (cloneImage) { setMedia({ url: URL.createObjectURL(cloneImage.file), name: cloneImage.name, type: "image", file: cloneImage.file }); setDuration(magicPlan.durationSec); setStart(0); setEnd(magicPlan.durationSec); setPosition(0); setCues([]); setTranscript(""); setProposal(null); }
    const cloneAudio = (kind: MagicAssetKind): Media | null => { const asset = magicAssets[kind]; return asset ? { url: URL.createObjectURL(asset.file), name: asset.name, type: "audio", file: asset.file } : null; };
    if (magicAssets.music) setAudioTrack(cloneAudio("music"));
    if (magicAssets.voice) setVoiceTrack(cloneAudio("voice"));
    if (magicAssets.sound) setSoundTrack(cloneAudio("sound"));
    setPlaying(false); setTool(0); setMagicOpen(false);
  }

  function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const type = file.type.split("/")[0];
    if (type !== "video" && type !== "image" && type !== "audio") { setError("fileError"); return; }
    pauseAll();
    setMedia({ url: URL.createObjectURL(file), name: file.name, type, file });
    setCues([]); setTranscript(""); setProposal(null); setLastEdit(null);
    setDuration(type === "image" ? 5 : 0);
    setStart(0);
    setEnd(type === "image" ? 5 : 0);
    setPosition(0);
    setPlaying(false);
    setError(null);
  }

  function importTrack(event: ChangeEvent<HTMLInputElement>, kind: "audio" | "voice") {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("audio/")) { setError("fileError"); return; }
    pauseAll();
    const track = { url: URL.createObjectURL(file), name: file.name, type: "audio" as const, file };
    if (kind === "audio") setAudioTrack(track);
    else setVoiceTrack(track);
    setError(null);
  }

  function elements() {
    return [player.current, mediaAudio.current, music.current, voice.current, sound.current].filter((item): item is HTMLMediaElement => Boolean(item));
  }

  function syncTime(value: number) {
    elements().forEach((element) => { element.currentTime = value; });
  }

  function pauseAll() {
    elements().forEach((element) => element.pause());
    setPlaying(false);
  }

  function syncPlaying() {
    setPlaying(elements().some((element) => !element.paused && !element.ended));
  }

  function toggle() {
    const playable = elements();
    if (!playable.length) return;
    if (playable.some((element) => !element.paused)) { pauseAll(); return; }
    const next = effectiveEnd > 0 && (position < start || position >= effectiveEnd) ? start : position;
    syncTime(next);
    void Promise.all(playable.map((element) => element.play())).then(() => setPlaying(true)).catch(() => setError("loadError"));
  }

  function seek(value: number) {
    const next = Math.max(0, Math.min(timelineDuration || value, value));
    setPosition(next);
    syncTime(next);
  }

  function timeUpdate(element: HTMLMediaElement) {
    if (effectiveEnd > 0 && element.currentTime >= effectiveEnd) {
      pauseAll();
      syncTime(effectiveEnd);
      setPosition(effectiveEnd);
      return;
    }
    setPosition(element.currentTime);
  }

  function metadata(element: HTMLMediaElement) {
    const length = Number.isFinite(element.duration) ? element.duration : 0;
    setDuration(length);
    setEnd(length);
  }

  function trackMetadata(element: HTMLMediaElement, kind: "audio" | "voice" | "sound") {
    const length = Number.isFinite(element.duration) ? element.duration : 0;
    if (kind === "audio") setAudioDuration(length);
    else if (kind === "voice") setVoiceDuration(length);
    else setSoundDuration(length);
    if (!duration && !end) { setDuration(length); setEnd(length); }
  }

  function editingSnapshot(): MontagePatch {
    return { aspectRatio: ratios[ratio] as MontagePatch["aspectRatio"], start, end: effectiveEnd, x, y, scale, rotation, opacity, text, subtitle, brand, color, filter, brightness, contrast, saturation, blur, vignette, logoCorner, logoSize, logoOpacity };
  }

  function acceptPatch(patch: MontagePatch) {
    if (patch.aspectRatio) setRatio(ratios.indexOf(patch.aspectRatio));
    if (patch.text !== undefined) setText(patch.text);
    if (patch.subtitle !== undefined) setSubtitle(patch.subtitle);
    if (patch.brand !== undefined) setBrand(patch.brand);
    if (patch.color !== undefined) setColor(patch.color);
    if (patch.logoCorner) setLogoCorner(patch.logoCorner);
    const numeric: Array<[keyof MontagePatch, typeof setX]> = [["start", setStart], ["end", setEnd], ["x", setX], ["y", setY], ["scale", setScale], ["rotation", setRotation], ["opacity", setOpacity], ["filter", setFilter], ["brightness", setBrightness], ["contrast", setContrast], ["saturation", setSaturation], ["blur", setBlur], ["vignette", setVignette], ["logoSize", setLogoSize], ["logoOpacity", setLogoOpacity]];
    numeric.forEach(([key, setter]) => { const value = patch[key]; if (typeof value === "number") setter(value); });
  }

  async function proposeEdit() {
    if (!montagePrompt.trim() || montageBusy) return;
    setMontageBusy(true); setStudioNotice(null); setProposal(null);
    const sourceUrl = media?.url;
    try {
      const local = localMontage(montagePrompt, timelineDuration, start, effectiveEnd);
      let result: MontageProposal;
      if (Object.keys(local.patch).length || local.transcribe) result = local;
      else {
        const response = await fetch("/api/studio/montage", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: montagePrompt, duration: timelineDuration, start, end: effectiveEnd, locale }) });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error?.code ?? "STUDIO_PROMPT_UNSUPPORTED");
        result = { patch: validateMontagePatch(payload.patch, timelineDuration, start, effectiveEnd), transcribe: payload.transcribe === true, source: payload.source === "local" ? "local" : "ai" };
      }
      if (currentSources.current.media?.url !== sourceUrl) return;
      proposalSource.current = sourceUrl; setProposal(result);
    } catch (reason) { setStudioNotice(studioError(reason, edit)); }
    finally { setMontageBusy(false); }
  }

  async function transcribeSpeech(from = start, to = effectiveEnd) {
    if (transcriptBusy) return;
    const source = speechSource === "music" ? audioTrack : speechSource === "voice" ? voiceTrack : media;
    if (!source?.file || source.type === "image") { setStudioNotice(edit.mediaRequired); return; }
    const controller = new AbortController(); speechAbort.current = controller;
    setTranscriptBusy(true); setStudioNotice(null);
    try {
      const prepared = await speechFile(source.file, from, to);
      if (controller.signal.aborted) return;
      const form = new FormData(); form.set("file", prepared.file); form.set("language", speechLanguage);
      const response = await fetch("/api/studio/transcribe", { method: "POST", body: form, credentials: "same-origin", signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.code ?? "STUDIO_PROVIDER_UNAVAILABLE");
      const current = speechSource === "music" ? currentSources.current.audioTrack : speechSource === "voice" ? currentSources.current.voiceTrack : currentSources.current.media;
      if (current?.url !== source.url) return;
      setTranscript(result.text);
      const aligned = validCues((result.cues as SubtitleCue[]).map((cue) => ({ ...cue, start: cue.start + prepared.offset, end: cue.end + prepared.offset })));
      setCues(aligned); setTool(5);
      if (!aligned.length) setStudioNotice(edit.noTimes);
    } catch (reason) { if (!controller.signal.aborted) setStudioNotice(studioError(reason, edit)); }
    finally { setTranscriptBusy(false); }
  }

  function applyProposal() {
    if (!proposal) return;
    try {
      if (proposalSource.current !== media?.url) throw new Error("STUDIO_TRIM_INVALID");
      const patch = validateMontagePatch(proposal.patch, timelineDuration, start, effectiveEnd);
      setLastEdit(editingSnapshot()); previousCaptions.current = { cues, transcript }; pauseAll(); acceptPatch(patch);
      seek(patch.start ?? start); setProposal(null);
      if (proposal.transcribe) void transcribeSpeech(patch.start ?? start, patch.end ?? effectiveEnd);
    } catch (reason) { setStudioNotice(studioError(reason, edit)); }
  }

  function addGenerated(file: File, kind: GenerationInput["kind"], imageLength: number) {
    pauseAll();
    const type = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : "audio";
    const asset: Media = { url: URL.createObjectURL(file), name: file.name, type, file };
    if (kind === "voice") { setVoiceTrack(asset); setVoiceDuration(0); }
    else if (kind === "audio") { setAudioTrack(asset); setAudioDuration(0); }
    else { setMedia(asset); setDuration(type === "image" ? imageLength : 0); setStart(0); setEnd(type === "image" ? imageLength : 0); setPosition(0); setCues([]); setTranscript(""); setProposal(null); setLastEdit(null); }
    setTool(kind === "voice" ? 4 : kind === "audio" ? 3 : 0); setError(null);
  }

  async function importCaptions(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    try { if (file.size > 512000) throw new Error("STUDIO_SUBTITLES_INVALID"); const parsed = parseSubtitles(await file.text()); setCues(parsed); setTranscript(parsed.map((cue) => cue.text).join("\n")); setStudioNotice(null); }
    catch (reason) { setStudioNotice(studioError(reason, edit)); }
  }
  function updateCue(id: string, patch: Partial<SubtitleCue>) {
    setCues((current) => current.map((cue) => cue.id === id ? { ...cue, ...patch } : cue));
  }
  function captionDownload(format: "srt" | "vtt") {
    try { downloadBlob(new Blob([exportSubtitles(cues, format, start, effectiveEnd || Infinity)], { type: format === "srt" ? "text/plain;charset=utf-8" : "text/vtt;charset=utf-8" }), "haydevos-captions." + format); }
    catch (reason) { setStudioNotice(studioError(reason, edit)); }
  }
  async function importLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    try { setLogo(await logoFromFile(file)); setStudioNotice(null); }
    catch (reason) { setStudioNotice(studioError(reason, edit)); }
  }
  async function exportMontage() {
    if (renderProgress !== null) return;
    const controller = new AbortController(); renderAbort.current = controller;
    pauseAll(); setRenderProgress(0); setStudioNotice(null);
    try {
      validCues(cues);
      const rendered = await renderMontage({ media, tracks: [audioTrack, voiceTrack, soundTrack].filter((track): track is Media => Boolean(track)), start, end: effectiveEnd, ratio: ratios[ratio], transform: { x, y, scale, rotation, opacity }, filter: visual.filter as string, vignette, text, subtitle, cues, brand, color, logo: logo ? { ...logo, corner: logoCorner, size: logoSize, opacity: logoOpacity } : null }, controller.signal, setRenderProgress);
      downloadBlob(rendered, "haydevos-montage.webm");
    } catch (reason) { if (!controller.signal.aborted) setStudioNotice(studioError(reason, edit)); }
    finally { setRenderProgress(null); }
  }

  function downloadProject() {
    const project = {
      version: 3,
      sourceFile: media?.name ?? null,
      aspectRatio: ratios[ratio],
      clip: { start, end: effectiveEnd },
      transform: { x, y, scale, rotation, opacity },
      overlays: { text, subtitle, brand, color, cues, logo: logo ? { name: logo.name, dataUrl: logo.dataUrl, corner: logoCorner, size: logoSize, opacity: logoOpacity } : null },
      transcript,
      filters: { preset: ["none", "grayscale", "sepia"][filter], brightness, contrast, saturation, blur, vignette },
      tracks: { music: audioTrack?.name ?? null, voiceover: voiceTrack?.name ?? null, sound: soundTrack?.name ?? null },
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "haydevos-project.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportSource() {
    const target = media ?? audioTrack ?? voiceTrack;
    if (!target) { downloadProject(); return; }
    const link = document.createElement("a");
    link.href = target.url;
    link.download = `haydevos-${target.name.replace(/[^a-z0-9._-]+/gi, "-")}`;
    link.click();
  }

  function applyTemplate(index: number) {
    if (index === 0) {
      setRatio(0); setFilter(0); setBrightness(100); setContrast(100); setSaturation(100); setBlur(0); setVignette(0); setText(""); setSubtitle(""); setBrand(""); setColor("#ffffff");
    } else if (index === 1) {
      setRatio(1); setText(text || copy.text); setSubtitle(subtitle || copy.subtitle); setColor("#ffffff"); setFilter(0); setVignette(10);
    } else {
      setRatio(0); setBrand(brand || "HAYDEVOS"); setColor("#ffe0a3"); setFilter(1); setContrast(108); setSaturation(92); setVignette(24);
    }
    setTool(1);
  }

  const filterPreset = ["", "grayscale(1)", "sepia(1)"][filter];
  const visual: CSSProperties = {
    transform: `translate(${x}%, ${y}%) scale(${scale / 100}) rotate(${rotation}deg)`,
    opacity: opacity / 100,
    filter: `${filterPreset ? `${filterPreset} ` : ""}brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`,
  };
  const mediaProps = {
    onLoadedMetadata: (event: { currentTarget: HTMLMediaElement }) => metadata(event.currentTarget),
    onTimeUpdate: (event: { currentTarget: HTMLMediaElement }) => timeUpdate(event.currentTarget),
    onPlay: syncPlaying, onPause: syncPlaying, onEnded: syncPlaying, onError: () => setError("loadError"), preload: "metadata" as const,
  };
  const clipStyle = (from: number, to: number): CSSProperties => {
    const total = timelineDuration || 1;
    const left = Math.min(100, Math.max(0, from / total * 100));
    return { left: `${left}%`, width: `${Math.min(100 - left, Math.max(2, (Math.max(from, to) - from) / total * 100))}%` };
  };
  const seekFromTimeline = (event: React.MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    seek(((event.clientX - bounds.left) / Math.max(1, bounds.width)) * timelineDuration);
  };

  const changeLabels: Record<string, string> = { aspectRatio: copy.format, start: copy.trimStart, end: copy.trimEnd, text: copy.text, subtitle: copy.subtitle, brand: copy.brand, color: copy.color, x: copy.position + " X", y: copy.position + " Y", scale: copy.scale, rotation: copy.rotation, opacity: copy.opacity, filter: copy.filter, brightness: copy.effectBrightness, contrast: copy.effectContrast, saturation: copy.effectSaturation, blur: copy.effectBlur, vignette: copy.effectVignette, logoCorner: edit.logoPosition, logoSize: edit.logoSize, logoOpacity: edit.logoOpacity };
  const corners = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;
  const activeCaption = cues.length ? subtitleAt(cues, position) : subtitle;
  return <section className="core-editor" aria-label={copy.editor} data-rendering={renderProgress !== null ? "true" : undefined}>
    <div className="editor-toolbar">
      <button type="button" className="studio-ghost" onClick={onBack}>← {copy.back}</button>
      <strong>{copy.project}</strong><span className="toolbar-spacer" />
      <button type="button" className="studio-gold" aria-expanded={generatorOpen} onClick={() => setGeneratorOpen(!generatorOpen)} disabled={renderProgress !== null}><Sparkles size={14}/>{copy.generator}</button>
      <button type="button" className="studio-ghost" aria-expanded={montageOpen} onClick={() => setMontageOpen(!montageOpen)}><WandSparkles size={14}/>{edit.promptEdit}</button>
      <button type="button" className="studio-gold" onClick={() => setMagicOpen(true)}><WandSparkles size={14} /> {copy.magic}</button>
      <button type="button" className="studio-ghost" onClick={() => input.current?.click()} disabled={renderProgress !== null}><Upload size={14} /> {copy.import}</button>
      <select value={ratio} onChange={(event) => setRatio(Number(event.target.value))} aria-label={copy.format} className="studio-select">{ratios.map((value, index) => <option key={value} value={index}>{value} · {copy.formats[index]}</option>)}</select>
      <button type="button" className="studio-ghost" onClick={downloadProject}><Download size={14} /> {copy.download}</button>
      <button type="button" className="studio-ghost" onClick={exportSource} disabled={!media && !audioTrack && !voiceTrack}><Download size={14} /> {edit.original}</button>
      <button type="button" className="studio-primary" onClick={() => void exportMontage()} disabled={renderProgress !== null || !timelineDuration}><Download size={14} /> {renderProgress !== null ? edit.rendering : edit.render}</button>
      <input ref={input} type="file" accept="video/*,image/*,audio/*" onChange={importFile} hidden aria-label={copy.import} />
      <input ref={audioInput} type="file" accept="audio/*" onChange={(event) => importTrack(event, "audio")} hidden aria-label={copy.addAudio} />
      <input ref={voiceInput} type="file" accept="audio/*" onChange={(event) => importTrack(event, "voice")} hidden aria-label={copy.addVoice} />
      <input ref={captionInput} type="file" accept=".srt,.vtt,text/vtt,text/plain" onChange={(event) => void importCaptions(event)} hidden aria-label={edit.importCaptions}/>
      <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void importLogo(event)} hidden aria-label={edit.logoUpload}/>
    </div>
    {studioNotice && <p className="core-studio-notice editor-operation-notice" role="alert">{studioNotice}</p>}
    {renderProgress !== null && <div className="editor-render-progress" role="status"><span>{edit.rendering} {Math.round(renderProgress)}%</span><progress max={100} value={renderProgress}/><button type="button" className="studio-ghost" onClick={() => renderAbort.current?.abort()}>{edit.cancel}</button></div>}
    {generatorOpen && <StudioGeneratorPanel onAdd={addGenerated}/>}
    {montageOpen && <section className="editor-integrated-panel" aria-label={edit.promptEdit}>
      <div className="editor-integrated-head"><h2>{edit.promptEdit}</h2><WandSparkles/></div>
      <label className="core-editor-text-label">{edit.promptEdit}<textarea rows={3} maxLength={8000} value={montagePrompt} onChange={(event) => setMontagePrompt(event.target.value)} placeholder={edit.promptHint}/></label>
      <div className="editor-panel-actions"><button type="button" className="studio-primary" disabled={!montagePrompt.trim() || montageBusy} onClick={() => void proposeEdit()}>{montageBusy ? edit.working : edit.prepare}</button>{lastEdit && <button type="button" className="studio-ghost" onClick={() => { pauseAll(); speechAbort.current?.abort(); acceptPatch(lastEdit); if (previousCaptions.current) { setCues(previousCaptions.current.cues); setTranscript(previousCaptions.current.transcript); } seek(lastEdit.start ?? 0); setLastEdit(null); }}>{edit.undo}</button>}</div>
      {proposal && <div className="editor-edit-proposal"><strong>{edit.changes} · {proposal.source === "local" ? edit.local : edit.ai}</strong><ul>{Object.entries(proposal.patch).map(([key, value]) => <li key={key}><span>{changeLabels[key]}</span><b>{key === "logoCorner" ? edit.logoCorners[corners.indexOf(value as typeof corners[number])] : key === "filter" ? copy.filters[Number(value)] : String(value)}</b></li>)}{proposal.transcribe && <li>{edit.autoCaptions}</li>}</ul><button type="button" className="studio-gold" onClick={applyProposal}>{edit.apply}</button></div>}
    </section>}
    {magicOpen && <div className="editor-magic-panel" role="dialog" aria-labelledby="magic-title">
      <div className="editor-magic-head"><div><span className="studio-eyebrow">{copy.magic}</span><h2 id="magic-title">{copy.magicTitle}</h2></div><button type="button" className="studio-ghost" onClick={() => setMagicOpen(false)} aria-label={copy.magic}>{"×"}</button></div>
      <div className="editor-magic-grid">
        <label className="editor-magic-prompt">{copy.magicPrompt}<textarea rows={4} maxLength={12000} value={magicPrompt} onChange={(event) => setMagicPrompt(event.target.value)} placeholder={copy.magicPromptPlaceholder} /></label>
        <div className="editor-magic-settings"><label>{copy.magicDuration}<input type="number" min={1} max={600} value={magicDuration} onChange={(event) => setMagicDuration(Number(event.target.value))} /></label><label>{copy.language}<select value={magicLanguage} onChange={(event) => setMagicLanguage(Number(event.target.value))}>{copy.languages.map((language, index) => <option key={language} value={index}>{language}</option>)}</select></label><label>{copy.format}<select value={ratio} onChange={(event) => setRatio(Number(event.target.value))}>{ratios.map((value, index) => <option key={value} value={index}>{value} · {copy.formats[index]}</option>)}</select></label></div>
      </div>
      <details className="editor-magic-options">
        <summary><Sliders size={14} /> <span>{copy.magicAdvanced}</span><small>{copy.magicOptionalHint}</small></summary>
        <div className="editor-magic-options-grid">
          <div className="editor-magic-option-group"><strong>{copy.types[0]}</strong><OptionalMagicSelect label={copy.style} value={magicPreferences.videoStyle ?? ""} options={copy.videoStyles} placeholder={copy.magicPromptOnly} onChange={(value) => setMagicPreference("videoStyle", value)} /><OptionalMagicSelect label={copy.tone} value={magicPreferences.videoTone ?? ""} options={copy.videoTones} placeholder={copy.magicPromptOnly} onChange={(value) => setMagicPreference("videoTone", value)} /></div>
          <div className="editor-magic-option-group"><strong>{copy.types[1]}</strong><OptionalMagicSelect label={copy.audioStyle} value={magicPreferences.musicStyle ?? ""} options={copy.musicStyles} placeholder={copy.magicPromptOnly} onChange={(value) => setMagicPreference("musicStyle", value)} /><OptionalMagicSelect label={copy.tone} value={magicPreferences.musicTone ?? ""} options={copy.audioTones} placeholder={copy.magicPromptOnly} onChange={(value) => setMagicPreference("musicTone", value)} /><OptionalMagicSelect label={copy.soundStyle} value={magicPreferences.soundStyle ?? ""} options={copy.soundStyles} placeholder={copy.magicPromptOnly} onChange={(value) => setMagicPreference("soundStyle", value)} /></div>
          <div className="editor-magic-option-group"><strong>{copy.types[2]}</strong><OptionalMagicSelect label={copy.voiceStyle} value={magicPreferences.voiceStyle ?? ""} options={copy.voiceStyles} placeholder={copy.magicPromptOnly} onChange={(value) => setMagicPreference("voiceStyle", value)} /><OptionalMagicSelect label={copy.tone} value={magicPreferences.voiceTone ?? ""} options={copy.voiceTones} placeholder={copy.magicPromptOnly} onChange={(value) => setMagicPreference("voiceTone", value)} /></div>
          <div className="editor-magic-option-group"><strong>{copy.types[3]}</strong><OptionalMagicSelect label={copy.imageStyle} value={magicPreferences.imageStyle ?? ""} options={copy.imageStyles} placeholder={copy.magicPromptOnly} onChange={(value) => setMagicPreference("imageStyle", value)} /><OptionalMagicSelect label={copy.tone} value={magicPreferences.imageTone ?? ""} options={copy.imageTones} placeholder={copy.magicPromptOnly} onChange={(value) => setMagicPreference("imageTone", value)} /></div>
          <div className="editor-magic-option-group"><strong>{copy.types[4]}</strong><OptionalMagicSelect label={copy.avatarStyle} value={magicPreferences.avatarStyle ?? ""} options={copy.avatarStyles} placeholder={copy.magicPromptOnly} onChange={(value) => setMagicPreference("avatarStyle", value)} /><OptionalMagicSelect label={copy.tone} value={magicPreferences.avatarTone ?? ""} options={copy.avatarTones} placeholder={copy.magicPromptOnly} onChange={(value) => setMagicPreference("avatarTone", value)} /></div>
        </div>
      </details>
      <div className="editor-magic-assets"><div className="editor-magic-section-title">{copy.magicReference} · {copy.magicFirst} · {copy.magicLast} · {copy.magicMusic} · {copy.magicVoice} · {copy.magicSound}</div><div className="editor-magic-asset-grid">{magicPickers.map(({ kind, label, accept }) => <label key={kind} className={`editor-magic-asset ${magicAssets[kind] ? "is-filled" : ""}`}><Upload size={14} /><span>{magicAssets[kind]?.name ?? label}</span><input type="file" accept={accept} hidden onChange={(event) => setMagicAsset(kind, event)} />{magicAssets[kind] && <button type="button" className="editor-magic-remove" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setMagicAssets((current) => { const asset = current[kind]; if (asset) URL.revokeObjectURL(asset.url); const next = { ...current }; delete next[kind]; return next; }); }}>×</button>}</label>)}</div></div>
      <div className="editor-magic-characters"><div className="editor-magic-section-title">{copy.magicCharacters}</div><div className="editor-magic-character-grid">{magicCharacters.map((character, index) => <article key={index} className={`editor-magic-character ${character.locked ? "is-locked" : ""}`}><div><strong>{index + 1}. {character.name || copy.magicCharacters}</strong><button type="button" className="editor-magic-lock" onClick={() => setMagicCharacters((current) => current.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, locked: !candidate.locked } : candidate))}>{character.locked ? <LockKeyhole size={13} /> : <UnlockKeyhole size={13} />}{character.locked ? copy.magicUnlock : copy.magicLock}</button></div><input value={character.name} disabled={character.locked} placeholder={copy.magicCharacterPlaceholder} onChange={(event) => updateMagicCharacter(index, "name", event.target.value)} /><textarea rows={2} value={character.description} disabled={character.locked} placeholder={copy.magicCharacterPlaceholder} onChange={(event) => updateMagicCharacter(index, "description", event.target.value)} /></article>)}</div></div>
      {magicError && <p className="core-studio-notice" role="alert">{magicError}</p>}
      <div className="editor-magic-actions"><button type="button" className="studio-primary" disabled={!magicPrompt.trim() || magicBusy} onClick={() => void runMagic()}><WandSparkles size={15} /> {magicBusy ? copy.magicRunning : copy.magicRun}</button>{magicPlan && <button type="button" className="studio-gold" onClick={applyMagicPlan}>{copy.magicApply}</button>}</div>
      {magicPlan && <section className="editor-magic-plan"><div className="editor-magic-plan-head"><strong>{copy.magicPlanSteps}</strong><span className={magicPlan.providerReady ? "is-ready" : "is-local"}>{magicPlan.providerReady ? copy.magicProviderReady : copy.magicPlanOnly}</span></div>{magicPlan.aiSummary && <p className="core-studio-notice">{magicPlan.aiSummary}</p>}<ol>{magicPlan.steps.map((step) => <li key={`${step.title}-${step.detail}`}><strong>{step.title}</strong><span>{step.detail}</span></li>)}</ol></section>}
    </div>}
    <div className="editor-layout">
      <aside className="editor-tools">{copy.tools.map((label, index) => { const Icon = icons[index]; return <button key={index} type="button" className={tool === index ? "is-active" : ""} aria-pressed={tool === index} onClick={() => { if (index === 9) setGeneratorOpen(true); setTool(index); }}><Icon size={18} /><span>{label}</span></button>; })}</aside>
      <div className="editor-stage">
        <div className="stage-top"><span>{copy.preview}</span><span>{stamp(position)} / {stamp(effectiveEnd)}</span><span>{ratios[ratio]}</span></div>
        <div className="stage-canvas core-editor-canvas" style={{ aspectRatio: ratios[ratio].replace(":", "/") }}>
          {media?.type === "video" ? <video ref={player} src={media.url} style={visual} {...mediaProps} playsInline /> : media?.type === "image" ? <img src={media.url} alt={media.name} style={visual} onError={() => setError("loadError")} /> : <div className="core-editor-empty">{media?.type === "audio" ? <Music size={42} /> : <Film size={42} />}<p>{media?.type === "audio" ? media.name : copy.empty}</p><button type="button" className="studio-ghost" onClick={() => input.current?.click()}>{copy.import}</button></div>}
          {media?.type === "audio" && <audio ref={mediaAudio} src={media.url} {...mediaProps} className="core-editor-audio" aria-label={media.name} />}
          {audioTrack && <audio ref={music} src={audioTrack.url} {...mediaProps} onLoadedMetadata={(event) => trackMetadata(event.currentTarget, "audio")} className="core-editor-audio" aria-label={audioTrack.name} />}
          {voiceTrack && <audio ref={voice} src={voiceTrack.url} {...mediaProps} onLoadedMetadata={(event) => trackMetadata(event.currentTarget, "voice")} className="core-editor-audio" aria-label={voiceTrack.name} />}
          {soundTrack && <audio ref={sound} src={soundTrack.url} {...mediaProps} onLoadedMetadata={(event) => trackMetadata(event.currentTarget, "sound")} className="core-editor-audio" aria-label={soundTrack.name} />}
          <div className="core-editor-vignette" style={{ opacity: vignette / 100 }} />
          <div className="core-editor-overlay" style={{ color }}>{text}</div><div className="core-editor-subtitle" style={{ color }}>{activeCaption}</div><div className="core-editor-brand" style={logo && logoCorner === "top-right" ? { left: 14, right: "auto" } : undefined}>{brand}</div>
          {logo && <img className="core-editor-logo" src={logo.url} alt={edit.logo} style={{ width: logoSize + "%", opacity: logoOpacity / 100, top: logoCorner.startsWith("top") ? "2.5%" : undefined, bottom: logoCorner.startsWith("bottom") ? "2.5%" : undefined, left: logoCorner.endsWith("left") ? "2.5%" : undefined, right: logoCorner.endsWith("right") ? "2.5%" : undefined }}/>}
          {hasPlayable && <button type="button" className="stage-play" onClick={toggle} aria-label={playing ? copy.pause : copy.play}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>}
        </div>
        {error && <p role="alert" className="core-studio-notice">{copy[error]}</p>}
        <div className="editor-transport"><button type="button" className="studio-ghost" onClick={() => seek(start)} disabled={!timelineDuration}>↶ {copy.trimStart}</button><input type="range" min={0} max={timelineDuration || 1} step={0.1} value={position} disabled={!timelineDuration} onChange={(event) => seek(Number(event.target.value))} aria-label={copy.seek} className="core-editor-seek" /><button type="button" className="studio-ghost" onClick={() => seek(effectiveEnd)} disabled={!timelineDuration}>{copy.trimEnd} ↷</button></div>
        <div className="timeline-ruler">{Array.from({ length: 7 }, (_, index) => <span key={index}>{stamp(timelineDuration * index / 6)}</span>)}</div>
        <div className="timeline"><div className="track-labels">{copy.tracks.map((label) => <span key={label}>{label}</span>)}<span>{copy.tools[5]}</span></div><div className="tracks" onClick={seekFromTimeline} onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); seek(position + (event.key === "ArrowRight" ? .1 : -.1)); } }} role="slider" aria-label={copy.seek} aria-valuemin={0} aria-valuemax={timelineDuration} aria-valuenow={position} tabIndex={0}>
          {media && media.type !== "audio" && <button type="button" className="timeline-clip track-video" style={clipStyle(start, effectiveEnd)} onClick={(event) => { event.stopPropagation(); setTool(0); }}>{media.name}</button>}
          {(text || subtitle || brand || logo) && <button type="button" className="timeline-clip track-text" style={clipStyle(0, effectiveEnd)} onClick={(event) => { event.stopPropagation(); setTool(text ? 2 : subtitle ? 5 : 8); }}>{text || subtitle || brand || logo?.name}</button>}
          {cues.map((cue) => <button key={cue.id} type="button" className="timeline-clip track-caption" style={clipStyle(cue.start, cue.end)} onClick={(event) => { event.stopPropagation(); seek(cue.start); setTool(5); }} title={cue.text}>{cue.text}</button>)}
          {audioTrack && <button type="button" className="timeline-clip track-music" style={clipStyle(0, audioDuration || timelineDuration)} onClick={(event) => { event.stopPropagation(); setTool(3); }}>{audioTrack.name}</button>}
          {voiceTrack && <button type="button" className="timeline-clip track-voice" style={clipStyle(0, voiceDuration || timelineDuration)} onClick={(event) => { event.stopPropagation(); setTool(4); }}>{voiceTrack.name}</button>}
          {soundTrack && <button type="button" className="timeline-clip track-sound" style={clipStyle(0, soundDuration || timelineDuration)} onClick={(event) => { event.stopPropagation(); setTool(3); }}>{soundTrack.name}</button>}
          <i className="playhead" style={{ left: `${timelineDuration ? position / timelineDuration * 100 : 0}%` }} />
        </div></div>
        <p className="core-studio-notice">{copy.local}</p><p className="core-studio-notice">{edit.renderNote}</p>
      </div>
      <aside className="editor-inspector"><span className="studio-eyebrow">{copy.inspector}</span><h3>{copy.tools[tool]}</h3>
        {tool === 0 && <><button type="button" className="studio-ghost" onClick={() => input.current?.click()}><Upload size={14} /> {copy.import}</button>{media && <><p className="core-studio-notice">{media.name}</p><button type="button" className="studio-ghost" onClick={() => { pauseAll(); speechAbort.current?.abort(); setMedia(null); setDuration(0); setStart(0); setEnd(0); setPosition(0); setCues([]); setTranscript(""); setProposal(null); setLastEdit(null); }}>{copy.clear}</button></>}</>}
        {tool === 1 && <><p className="core-studio-notice">{copy.templatesNote}</p><div className="editor-template-grid">{copy.templateNames.map((label, index) => <button key={label} type="button" className="studio-ghost" onClick={() => applyTemplate(index)}><LayoutTemplate size={14} /> {label}</button>)}</div>{ratios.map((value, index) => <button key={value} type="button" className={ratio === index ? "studio-ghost is-selected" : "studio-ghost"} onClick={() => setRatio(index)}>{value} · {copy.formats[index]}</button>)}</>}
        {[2, 5, 8].includes(tool) && <label className="core-editor-text-label">{tool === 2 ? copy.text : tool === 5 ? edit.subtitleStatic : copy.brand}<textarea rows={3} maxLength={2000} value={tool === 2 ? text : tool === 5 ? subtitle : brand} onChange={(event) => (tool === 2 ? setText : tool === 5 ? setSubtitle : setBrand)(event.target.value)} /></label>}
        {tool === 5 && <div className="editor-caption-controls">
          <h4>{edit.timedCaptions}</h4><div className="editor-panel-actions"><button type="button" className="studio-ghost" onClick={() => captionInput.current?.click()}>{edit.importCaptions}</button><button type="button" className="studio-ghost" onClick={() => setCues((current) => [...current, { id: crypto.randomUUID(), start: position, end: Math.min(position + 3, effectiveEnd > position ? effectiveEnd : position + 3), text: edit.cueText }])}>{edit.addCue}</button></div>
          {!cues.length && <p className="core-studio-notice">{edit.noCues}</p>}
          <div className="editor-cue-list">{cues.map((cue) => <article key={cue.id}><div className="editor-cue-times"><label>{edit.cueStart}<input type="number" min={0} max={cue.end - .01} step={.1} value={cue.start} onChange={(event) => updateCue(cue.id, { start: Math.max(0, Math.min(cue.end - .01, Number(event.target.value))) })}/></label><label>{edit.cueEnd}<input type="number" min={cue.start + .01} step={.1} value={cue.end} onChange={(event) => updateCue(cue.id, { end: Math.max(cue.start + .01, Number(event.target.value)) })}/></label></div><label className="core-editor-text-label">{edit.cueText}<textarea rows={2} maxLength={2000} value={cue.text} onChange={(event) => updateCue(cue.id, { text: event.target.value })}/></label><button type="button" className="studio-ghost" onClick={() => { seek(cue.start); }}>{copy.seek}</button><button type="button" className="studio-ghost" onClick={() => setCues((current) => current.filter((item) => item.id !== cue.id))}>{edit.deleteCue}</button></article>)}</div>
          <div className="editor-panel-actions"><button type="button" className="studio-ghost" disabled={!cues.length} onClick={() => captionDownload("srt")}>{edit.srt}</button><button type="button" className="studio-ghost" disabled={!cues.length} onClick={() => captionDownload("vtt")}>{edit.vtt}</button></div>
          <h4>{edit.transcript}</h4><label>{edit.source}<select value={speechSource} onChange={(event) => setSpeechSource(event.target.value)}><option value="main">{edit.mainSource}</option><option value="music">{edit.musicSource}</option><option value="voice">{edit.voiceSource}</option></select></label>
          <label>{copy.language}<select value={speechLanguage} onChange={(event) => setSpeechLanguage(event.target.value)}><option value="auto">{edit.detectLanguage}</option>{["ru", "en", "hy"].map((value, index) => <option key={value} value={value}>{copy.languages[index]}</option>)}</select></label>
          <p className="core-studio-notice">{edit.transcribeNote}</p><button type="button" className="studio-primary" disabled={transcriptBusy} onClick={() => void transcribeSpeech()}>{transcriptBusy ? edit.working : edit.transcribe}</button>
          {transcript && <><label className="core-editor-text-label">{edit.transcript}<textarea rows={6} value={transcript} readOnly/></label><button type="button" className="studio-ghost" onClick={() => downloadBlob(new Blob([transcript], { type: "text/plain;charset=utf-8" }), "haydevos-transcript.txt")}>{edit.downloadText}</button></>}
        </div>}
        {tool === 8 && <div className="editor-brand-controls"><p className="core-studio-notice">{edit.logoNote}</p><button type="button" className="studio-gold" onClick={() => logoInput.current?.click()}>{edit.logoUpload}</button>{logo && <><img className="editor-logo-thumbnail" src={logo.url} alt={edit.logo}/><p className="core-studio-notice">{logo.name}</p><button type="button" className="studio-ghost" onClick={() => setLogo(null)}>{edit.logoRemove}</button></>}<label>{edit.logoPosition}<select value={logoCorner} onChange={(event) => setLogoCorner(event.target.value as typeof logoCorner)}>{corners.map((value, index) => <option key={value} value={value}>{edit.logoCorners[index]}</option>)}</select></label><Slider label={edit.logoSize} value={logoSize} min={5} max={40} unit="%" onChange={setLogoSize}/><Slider label={edit.logoOpacity} value={logoOpacity} min={0} max={100} unit="%" onChange={setLogoOpacity}/></div>}
        {tool === 0 && media?.type === "image" && <label>{edit.imageDuration}<input type="number" min={1} max={600} value={duration} onChange={(event) => { const value = Math.max(1, Math.min(600, Number(event.target.value))); setDuration(value); setEnd(value); setStart(Math.min(start, value - .1)); }}/></label>}
        {tool === 3 && <><p className="core-studio-notice">{copy.audioNote}</p><button type="button" className="studio-ghost" onClick={() => audioInput.current?.click()}><Upload size={14} /> {copy.addAudio}</button>{audioTrack && <><p className="core-studio-notice">{audioTrack.name}</p><button type="button" className="studio-ghost" onClick={() => { pauseAll(); setAudioTrack(null); setAudioDuration(0); }}>{copy.removeTrack}</button></>}</>}
        {tool === 4 && <><p className="core-studio-notice">{copy.voiceNote}</p><button type="button" className="studio-ghost" onClick={() => voiceInput.current?.click()}><Upload size={14} /> {copy.addVoice}</button>{voiceTrack && <><p className="core-studio-notice">{voiceTrack.name}</p><button type="button" className="studio-ghost" onClick={() => { pauseAll(); setVoiceTrack(null); setVoiceDuration(0); }}>{copy.removeTrack}</button></>}</>}
        {tool === 6 && <><p className="core-studio-notice">{copy.effectsNote}</p><Slider label={copy.effectBrightness} value={brightness} min={50} max={150} unit="%" onChange={setBrightness} /><Slider label={copy.effectContrast} value={contrast} min={50} max={150} unit="%" onChange={setContrast} /><Slider label={copy.effectSaturation} value={saturation} min={0} max={180} unit="%" onChange={setSaturation} /><Slider label={copy.effectBlur} value={blur} min={0} max={16} unit="px" onChange={setBlur} /><Slider label={copy.effectVignette} value={vignette} min={0} max={80} unit="%" onChange={setVignette} /><button type="button" className="studio-ghost" onClick={() => { setBrightness(100); setContrast(100); setSaturation(100); setBlur(0); setVignette(0); }}>{copy.resetEffects}</button></>}
        {tool === 7 && <label className="core-editor-text-label">{copy.filter}<select value={filter} onChange={(event) => setFilter(Number(event.target.value))}>{copy.filters.map((label, index) => <option key={index} value={index}>{label}</option>)}</select></label>}
        <Slider label={`${copy.position} X`} value={x} min={-50} max={50} onChange={setX} /><Slider label={`${copy.position} Y`} value={y} min={-50} max={50} onChange={setY} /><Slider label={copy.scale} value={scale} min={10} max={200} unit="%" onChange={setScale} /><Slider label={copy.rotation} value={rotation} min={-180} max={180} unit="°" onChange={setRotation} /><Slider label={copy.opacity} value={opacity} min={0} max={100} unit="%" onChange={setOpacity} />
        <label className="core-editor-text-label">{copy.color}<input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label>
        {timelineDuration > 0 && <><label>{copy.trimStart}<input type="number" min={0} max={effectiveEnd} step={0.1} value={start} onChange={(event) => setStart(Math.min(effectiveEnd, Math.max(0, Number(event.target.value))))} /></label><label>{copy.trimEnd}<input type="number" min={start} max={timelineDuration} step={0.1} value={effectiveEnd} onChange={(event) => setEnd(Math.max(start, Math.min(timelineDuration, Number(event.target.value))))} /></label></>}
      </aside>
    </div>
  </section>;
}

function Slider({ label, value, min, max, unit = "", onChange }: { label: string; value: number; min: number; max: number; unit?: string; onChange: (value: number) => void }) {
  return <div><label>{label}<output>{value}{unit}</output></label><input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label={label} /></div>;
}

function OptionalMagicSelect({ label, value, options, placeholder, onChange }: { label: string; value: string; options: readonly string[]; placeholder: string; onChange: (value: string) => void }) {
  return <label className="editor-magic-option"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">{placeholder}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}
