"use client";

import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import { Captions, Diamond, Download, Film, LayoutTemplate, Mic, Music, Pause, Play, Sliders, Sparkles, Type, Upload, WandSparkles } from "lucide-react";
import { useStudioCopy } from "./studio-copy";

const icons = [Film, LayoutTemplate, Type, Music, Mic, Captions, WandSparkles, Sliders, Diamond, Sparkles];
const ratios = ["16:9", "9:16", "1:1"];
const stamp = (value: number) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
type Media = { url: string; name: string; type: "video" | "image" | "audio" };

export function StudioEditor({ onBack, onGenerator }: { onBack: () => void; onGenerator: () => void }) {
  const copy = useStudioCopy();
  const input = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const voiceInput = useRef<HTMLInputElement>(null);
  const player = useRef<HTMLVideoElement | null>(null);
  const mediaAudio = useRef<HTMLAudioElement | null>(null);
  const music = useRef<HTMLAudioElement | null>(null);
  const voice = useRef<HTMLAudioElement | null>(null);
  const [media, setMedia] = useState<Media | null>(null);
  const [audioTrack, setAudioTrack] = useState<Media | null>(null);
  const [voiceTrack, setVoiceTrack] = useState<Media | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [voiceDuration, setVoiceDuration] = useState(0);
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

  useEffect(() => () => { if (media) URL.revokeObjectURL(media.url); }, [media]);
  useEffect(() => () => { if (audioTrack) URL.revokeObjectURL(audioTrack.url); }, [audioTrack]);
  useEffect(() => () => { if (voiceTrack) URL.revokeObjectURL(voiceTrack.url); }, [voiceTrack]);

  const timelineDuration = Math.max(duration, audioDuration, voiceDuration);
  const effectiveEnd = end || timelineDuration;
  const hasPlayable = Boolean(media?.type === "video" || media?.type === "audio" || audioTrack || voiceTrack);

  function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const type = file.type.split("/")[0];
    if (type !== "video" && type !== "image" && type !== "audio") { setError("fileError"); return; }
    setMedia({ url: URL.createObjectURL(file), name: file.name, type });
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
    const track = { url: URL.createObjectURL(file), name: file.name, type: "audio" as const };
    if (kind === "audio") setAudioTrack(track);
    else setVoiceTrack(track);
    setError(null);
  }

  function elements() {
    return [player.current, mediaAudio.current, music.current, voice.current].filter((item): item is HTMLMediaElement => Boolean(item));
  }

  function syncTime(value: number) {
    elements().forEach((element) => { element.currentTime = value; });
  }

  function pauseAll() {
    elements().forEach((element) => element.pause());
    setPlaying(false);
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

  function trackMetadata(element: HTMLMediaElement, kind: "audio" | "voice") {
    const length = Number.isFinite(element.duration) ? element.duration : 0;
    if (kind === "audio") setAudioDuration(length);
    else setVoiceDuration(length);
    if (!duration && !end) { setDuration(length); setEnd(length); }
  }

  function downloadProject() {
    const project = {
      version: 2,
      sourceFile: media?.name ?? null,
      aspectRatio: ratios[ratio],
      clip: { start, end: effectiveEnd },
      transform: { x, y, scale, rotation, opacity },
      overlays: { text, subtitle, brand, color },
      filters: { preset: ["none", "grayscale", "sepia"][filter], brightness, contrast, saturation, blur, vignette },
      tracks: { music: audioTrack?.name ?? null, voiceover: voiceTrack?.name ?? null },
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
      setRatio(1); setText(text || "Ваш заголовок"); setSubtitle(subtitle || "Добавьте субтитры"); setColor("#ffffff"); setFilter(0); setVignette(10);
    } else {
      setRatio(0); setBrand(brand || "HAYDEVOS"); setColor("#ffe0a3"); setFilter(1); setContrast(108); setSaturation(92); setVignette(24);
    }
    setTool(1);
  }

  const visual: CSSProperties = {
    transform: `translate(${x}%, ${y}%) scale(${scale / 100}) rotate(${rotation}deg)`,
    opacity: opacity / 100,
    filter: `${["none", "grayscale(1)", "sepia(1)"][filter]} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`,
  };
  const mediaProps = {
    onLoadedMetadata: (event: { currentTarget: HTMLMediaElement }) => metadata(event.currentTarget),
    onTimeUpdate: (event: { currentTarget: HTMLMediaElement }) => timeUpdate(event.currentTarget),
    onPlay: () => setPlaying(true), onPause: () => setPlaying(false), onEnded: () => setPlaying(false), onError: () => setError("loadError"), preload: "metadata" as const,
  };
  const clipStyle = (from: number, to: number): CSSProperties => {
    const total = timelineDuration || 1;
    return { left: `${Math.max(0, from / total) * 100}%`, width: `${Math.max(2, (Math.max(from, to) - from) / total * 100)}%` };
  };
  const seekFromTimeline = (event: React.MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    seek(((event.clientX - bounds.left) / Math.max(1, bounds.width)) * timelineDuration);
  };

  return <section className="core-editor" aria-label={copy.editor}>
    <div className="editor-toolbar">
      <button type="button" className="studio-ghost" onClick={onBack}>← {copy.back}</button>
      <strong>{copy.project}</strong><span className="toolbar-spacer" />
      <button type="button" className="studio-ghost" onClick={() => input.current?.click()}><Upload size={14} /> {copy.import}</button>
      <select value={ratio} onChange={(event) => setRatio(Number(event.target.value))} aria-label={copy.format} className="studio-select">{ratios.map((value, index) => <option key={value} value={index}>{value} · {copy.formats[index]}</option>)}</select>
      <button type="button" className="studio-ghost" onClick={downloadProject}><Download size={14} /> {copy.download}</button>
      <button type="button" className="studio-primary" onClick={exportSource}><Download size={14} /> {copy.export}</button>
      <input ref={input} type="file" accept="video/*,image/*,audio/*" onChange={importFile} hidden aria-label={copy.import} />
      <input ref={audioInput} type="file" accept="audio/*" onChange={(event) => importTrack(event, "audio")} hidden aria-label={copy.addAudio} />
      <input ref={voiceInput} type="file" accept="audio/*" onChange={(event) => importTrack(event, "voice")} hidden aria-label={copy.addVoice} />
    </div>
    <div className="editor-layout">
      <aside className="editor-tools">{copy.tools.map((label, index) => { const Icon = icons[index]; return <button key={index} type="button" className={tool === index ? "is-active" : ""} aria-pressed={tool === index} onClick={() => { if (index === 9) onGenerator(); else setTool(index); }}><Icon size={18} /><span>{label}</span></button>; })}</aside>
      <div className="editor-stage">
        <div className="stage-top"><span>{copy.preview}</span><span>{stamp(position)} / {stamp(effectiveEnd)}</span><span>{ratios[ratio]}</span></div>
        <div className="stage-canvas core-editor-canvas" style={{ aspectRatio: ratios[ratio].replace(":", "/") }}>
          {media?.type === "video" ? <video ref={player} src={media.url} style={visual} {...mediaProps} playsInline /> : media?.type === "image" ? <img src={media.url} alt={media.name} style={visual} onError={() => setError("loadError")} /> : <div className="core-editor-empty">{media?.type === "audio" ? <Music size={42} /> : <Film size={42} />}<p>{media?.type === "audio" ? media.name : copy.empty}</p><button type="button" className="studio-ghost" onClick={() => input.current?.click()}>{copy.import}</button></div>}
          {media?.type === "audio" && <audio ref={mediaAudio} src={media.url} {...mediaProps} className="core-editor-audio" aria-label={media.name} />}
          {audioTrack && <audio ref={music} src={audioTrack.url} {...mediaProps} onLoadedMetadata={(event) => trackMetadata(event.currentTarget, "audio")} className="core-editor-audio" aria-label={audioTrack.name} />}
          {voiceTrack && <audio ref={voice} src={voiceTrack.url} {...mediaProps} onLoadedMetadata={(event) => trackMetadata(event.currentTarget, "voice")} className="core-editor-audio" aria-label={voiceTrack.name} />}
          <div className="core-editor-vignette" style={{ opacity: vignette / 100 }} />
          <div className="core-editor-overlay" style={{ color }}>{text}</div><div className="core-editor-subtitle" style={{ color }}>{subtitle}</div><div className="core-editor-brand">{brand}</div>
          {hasPlayable && <button type="button" className="stage-play" onClick={toggle} aria-label={playing ? copy.pause : copy.play}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>}
        </div>
        {error && <p role="alert" className="core-studio-notice">{copy[error]}</p>}
        <div className="editor-transport"><button type="button" className="studio-ghost" onClick={() => seek(start)} disabled={!timelineDuration}>↶ {copy.trimStart}</button><input type="range" min={0} max={timelineDuration || 1} step={0.1} value={position} disabled={!timelineDuration} onChange={(event) => seek(Number(event.target.value))} aria-label={copy.seek} className="core-editor-seek" /><button type="button" className="studio-ghost" onClick={() => seek(effectiveEnd)} disabled={!timelineDuration}>{copy.trimEnd} ↷</button></div>
        <div className="timeline-ruler">{Array.from({ length: 7 }, (_, index) => <span key={index}>{stamp(timelineDuration * index / 6)}</span>)}</div>
        <div className="timeline"><div className="track-labels">{copy.tracks.map((label) => <span key={label}>{label}</span>)}</div><div className="tracks" onClick={seekFromTimeline} role="slider" aria-label={copy.seek} aria-valuemin={0} aria-valuemax={timelineDuration} aria-valuenow={position} tabIndex={0}>
          {media && media.type !== "audio" && <button type="button" className="timeline-clip track-video" style={clipStyle(start, effectiveEnd)} onClick={(event) => { event.stopPropagation(); setTool(0); }}>{media.name}</button>}
          {(text || subtitle || brand) && <button type="button" className="timeline-clip track-text" style={clipStyle(0, effectiveEnd)} onClick={(event) => { event.stopPropagation(); setTool(text ? 2 : subtitle ? 5 : 8); }}>{text || subtitle || brand}</button>}
          {audioTrack && <button type="button" className="timeline-clip track-music" style={clipStyle(0, audioDuration || timelineDuration)} onClick={(event) => { event.stopPropagation(); setTool(3); }}>{audioTrack.name}</button>}
          {voiceTrack && <button type="button" className="timeline-clip track-voice" style={clipStyle(0, voiceDuration || timelineDuration)} onClick={(event) => { event.stopPropagation(); setTool(4); }}>{voiceTrack.name}</button>}
          <i className="playhead" style={{ left: `${timelineDuration ? position / timelineDuration * 100 : 0}%` }} />
        </div></div>
        <p className="core-studio-notice">{copy.local}</p><p className="core-studio-notice">{copy.exportSourceNote}</p>
      </div>
      <aside className="editor-inspector"><span className="studio-eyebrow">{copy.inspector}</span><h3>{copy.tools[tool]}</h3>
        {tool === 0 && <><button type="button" className="studio-ghost" onClick={() => input.current?.click()}><Upload size={14} /> {copy.import}</button>{media && <><p className="core-studio-notice">{media.name}</p><button type="button" className="studio-ghost" onClick={() => { pauseAll(); setMedia(null); setDuration(0); setStart(0); setEnd(0); setPosition(0); }}>{copy.clear}</button></>}</>}
        {tool === 1 && <><p className="core-studio-notice">{copy.templatesNote}</p><div className="editor-template-grid">{copy.templateNames.map((label, index) => <button key={label} type="button" className="studio-ghost" onClick={() => applyTemplate(index)}><LayoutTemplate size={14} /> {label}</button>)}</div>{ratios.map((value, index) => <button key={value} type="button" className={ratio === index ? "studio-ghost is-selected" : "studio-ghost"} onClick={() => setRatio(index)}>{value} · {copy.formats[index]}</button>)}</>}
        {[2, 5, 8].includes(tool) && <label className="core-editor-text-label">{tool === 2 ? copy.text : tool === 5 ? copy.subtitle : copy.brand}<textarea rows={3} maxLength={300} value={tool === 2 ? text : tool === 5 ? subtitle : brand} onChange={(event) => (tool === 2 ? setText : tool === 5 ? setSubtitle : setBrand)(event.target.value)} /></label>}
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
