"use client";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Upload, Video, Music, Mic, Image as ImageIcon, UserRound } from "lucide-react";
import { useStudioCopy } from "./studio-copy";
import { studioError, useEditorCopy } from "./editor-copy";
import type { GenerationInput } from "@/lib/studio/media-provider";
const kinds: GenerationInput["kind"][] = ["video", "audio", "voice", "image", "avatar"];
const icons = [Video, Music, Mic, ImageIcon, UserRound];
export function StudioGeneratorPanel({ onAdd }: { onAdd: (file: File, kind: GenerationInput["kind"], duration: number) => void }) {
  const copy = useStudioCopy(), edit = useEditorCopy();
  const [kind, setKind] = useState<GenerationInput["kind"]>("video"), [prompt, setPrompt] = useState(""), [ratio, setRatio] = useState("16:9"), [duration, setDuration] = useState(5), [voice, setVoice] = useState("coral");
  const [reference, setReference] = useState<File | null>(null), [available, setAvailable] = useState<string[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ file: File; url: string; kind: GenerationInput["kind"]; duration: number } | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/studio/generate", { credentials: "same-origin", signal: controller.signal }).then(async (response) => {
      if (!response.ok) return;
      const data = await response.json(); if (Array.isArray(data.generation)) setAvailable(data.generation);
    }).catch(() => {});
    return () => { controller.abort(); request.current?.abort(); };
  }, []);
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);
  async function generate() {
    if (busy || !prompt.trim()) return;
    const controller = new AbortController(); request.current = controller; setBusy(true); setError(null);
    try {
      const form = new FormData(); form.set("kind", kind); form.set("prompt", prompt.trim()); form.set("aspectRatio", ratio); form.set("durationSec", String(duration)); form.set("voice", voice); if (reference) form.set("reference", reference);
      const response = await fetch("/api/studio/generate", { method: "POST", body: form, credentials: "same-origin", signal: controller.signal });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error?.code ?? "STUDIO_PROVIDER_UNAVAILABLE"); }
      const blob = await response.blob();
      const mime = blob.type.split(";")[0];
      const extension = ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm", "audio/mpeg": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "audio/ogg": "ogg", "audio/webm": "webm", "audio/mp4": "m4a" } as Record<string, string>)[mime] ?? "bin";
      const file = new File([blob], "haydevos-" + kind + "." + extension, { type: blob.type });
      setResult({ file, url: URL.createObjectURL(file), kind, duration });
    } catch (reason) { if (!controller.signal.aborted) setError(studioError(reason, edit)); }
    finally { setBusy(false); }
  }
  return <section className="editor-integrated-panel" aria-label={copy.generator}>
    <div className="editor-integrated-head"><div><span className="studio-eyebrow">{copy.generator}</span><h2>{edit.generationNote}</h2></div><Sparkles /></div>
    <div className="editor-kind-tabs" role="group" aria-label={copy.generator}>{kinds.map((value, index) => { const Icon = icons[index]; return <button key={value} type="button" aria-pressed={kind === value} className={kind === value ? "studio-gold" : "studio-ghost"} onClick={() => { setKind(value); setError(null); }}><Icon size={16}/>{copy.types[index]}</button>; })}</div>
    <div className="editor-generator-fields">
      <label className="core-editor-text-label">{copy.prompt}<textarea value={prompt} rows={4} maxLength={8000} onChange={(event) => setPrompt(event.target.value)} /></label>
      <div className="editor-generator-options"><label>{copy.format}<select value={ratio} onChange={(event) => setRatio(event.target.value)}>{["16:9", "9:16", "1:1"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>{edit.duration}<input type="number" min={1} max={120} value={duration} onChange={(event) => setDuration(Math.max(1, Math.min(120, Number(event.target.value))))}/></label>
        {kind === "voice" && <label>{edit.voice}<select value={voice} onChange={(event) => setVoice(event.target.value)}>{["coral", "alloy", "nova", "shimmer", "echo", "onyx"].map((value) => <option key={value}>{value}</option>)}</select></label>}
        {["image", "avatar", "video"].includes(kind) && <label className="editor-file-button studio-ghost"><Upload size={14}/>{reference?.name ?? edit.reference}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file && file.size > 4 * 1024 * 1024) { setError(edit.fileTooLarge); return; } setReference(file ?? null); }} /></label>}
      </div>
    </div>
    {!available.includes(kind) && <p className="core-studio-notice" role="status">{edit.providerMissing}</p>}
    <button type="button" className="studio-primary" disabled={busy || !prompt.trim() || !available.includes(kind) || (kind === "avatar" && !reference)} onClick={() => void generate()}>{busy ? edit.working : edit.generate}</button>
    {error && <p className="core-studio-notice" role="alert">{error}</p>}
    {result && <div className="editor-generated-result">
      {result.file.type.startsWith("image/") ? <img src={result.url} alt={result.file.name}/> : result.file.type.startsWith("video/") ? <video src={result.url} controls/> : <audio src={result.url} controls/>}
      <button type="button" className="studio-gold" onClick={() => onAdd(result.file, result.kind, result.duration)}>{edit.addTimeline}</button>
      <p className="core-studio-notice">{edit.replaceNote}</p>
    </div>}
  </section>;
}
