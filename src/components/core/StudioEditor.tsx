"use client";

import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import { Film, LayoutTemplate, Type, Music, Mic, Captions, WandSparkles, Sliders, Diamond, Sparkles, Play, Pause, Upload, Download } from "lucide-react";
import { useStudioCopy } from "./studio-copy";

const icons = [Film, LayoutTemplate, Type, Music, Mic, Captions, WandSparkles, Sliders, Diamond, Sparkles];
const ratios = ["16:9", "9:16", "1:1"];
const stamp = (value: number) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
type Media = { url: string; name: string; type: "video" | "image" | "audio" };

export function StudioEditor({ onBack, onGenerator }: { onBack: () => void; onGenerator: () => void }) {
  const copy = useStudioCopy();
  const input = useRef<HTMLInputElement>(null);
  const player = useRef<HTMLVideoElement | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [media, setMedia] = useState<Media | null>(null);
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
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [error, setError] = useState<"fileError" | "loadError" | null>(null);
  useEffect(() => () => { if (media) URL.revokeObjectURL(media.url); }, [media]);
  function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    const type = file.type.split("/")[0];
    if (type !== "video" && type !== "image" && type !== "audio") { setError("fileError"); return; }
    setMedia({ url: URL.createObjectURL(file), name: file.name, type });
    setDuration(type === "image" ? 5 : 0); setStart(0); setEnd(type === "image" ? 5 : 0); setPosition(0); setPlaying(false); setError(null);
  }
  function toggle() {
    const element = player.current ?? audio.current;
    if (!element) return;
    if (!element.paused) element.pause();
    else { if (element.currentTime < start || element.currentTime >= end) element.currentTime = start; void element.play().catch(() => setError("loadError")); }
  }
  function seek(value: number) { setPosition(value); const element = player.current ?? audio.current; if (element) element.currentTime = value; }
  function timeUpdate(element: HTMLMediaElement) {
    if (end > 0 && element.currentTime >= end) { element.pause(); element.currentTime = end; }
    setPosition(element.currentTime);
  }
  function metadata(element: HTMLMediaElement) {
    const length = Number.isFinite(element.duration) ? element.duration : 0; setDuration(length); setEnd(length);
  }
  function download() {
    const project = { version: 1, sourceFile: media?.name ?? null, aspectRatio: ratios[ratio], clip: { start, end }, transform: { x, y, scale, rotation, opacity }, text, subtitle, brand, color, filter: ["none", "grayscale", "sepia"][filter] };
    const url = URL.createObjectURL(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "haydevos-project.json"; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const visual: CSSProperties = { transform: `translate(${x}%, ${y}%) scale(${scale / 100}) rotate(${rotation}deg)`, opacity: opacity / 100, filter: ["none", "grayscale(1)", "sepia(1)"][filter] };
  const mediaProps = { onLoadedMetadata: (event: { currentTarget: HTMLMediaElement }) => metadata(event.currentTarget), onTimeUpdate: (event: { currentTarget: HTMLMediaElement }) => timeUpdate(event.currentTarget), onPlay: () => setPlaying(true), onPause: () => setPlaying(false), onEnded: () => setPlaying(false), onError: () => setError("loadError"), preload: "metadata" as const };
  return <section className="core-editor" aria-label={copy.editor}>
    <div className="editor-toolbar">
      <button type="button" className="studio-ghost" onClick={onBack}>← {copy.back}</button><strong>{copy.project}</strong><span className="toolbar-spacer"/>
      <button type="button" className="studio-ghost" onClick={() => input.current?.click()}><Upload size={14}/> {copy.import}</button>
      <select value={ratio} onChange={(event) => setRatio(Number(event.target.value))} aria-label={copy.format} className="studio-select">{ratios.map((value, index) => <option key={value} value={index}>{value} · {copy.formats[index]}</option>)}</select>
      <button type="button" className="studio-ghost" onClick={download}><Download size={14}/> {copy.download}</button>
      <button type="button" className="studio-primary" disabled title={copy.exportUnavailable}>{copy.export}</button>
      <input ref={input} type="file" accept="video/*,image/*,audio/*" onChange={importFile} hidden aria-label={copy.import}/>
    </div>
    <div className="editor-layout">
      <aside className="editor-tools">{copy.tools.map((label, index) => { const Icon = icons[index]; return <button key={index} type="button" className={tool === index ? "is-active" : ""} aria-pressed={tool === index} onClick={() => { if (index === 9) onGenerator(); else setTool(index); }}><Icon size={18}/><span>{label}</span></button>; })}</aside>
      <div className="editor-stage">
        <div className="stage-top"><span>{copy.preview}</span><span>{stamp(position)} / {stamp(end || duration)}</span><span>{ratios[ratio]}</span></div>
        <div className="stage-canvas core-editor-canvas" style={{ aspectRatio: ratios[ratio].replace(":", "/") }}>
          {media?.type === "video" ? <video ref={player} src={media.url} style={visual} {...mediaProps} playsInline/> : media?.type === "image" ? <img src={media.url} alt={media.name} style={visual} onError={() => setError("loadError")}/> : <div className="core-editor-empty"><Film size={42}/><p>{media?.type === "audio" ? media.name : copy.empty}</p><button type="button" className="studio-ghost" onClick={() => input.current?.click()}>{copy.import}</button></div>}
          {media?.type === "audio" && <audio ref={audio} src={media.url} {...mediaProps}/>}
          <div className="core-editor-overlay" style={{ color }}>{text}</div><div className="core-editor-subtitle" style={{ color }}>{subtitle}</div><div className="core-editor-brand">{brand}</div>
          {(media?.type === "video" || media?.type === "audio") && <button type="button" className="stage-play" onClick={toggle} aria-label={playing ? copy.pause : copy.play}>{playing ? <Pause size={18}/> : <Play size={18}/>}</button>}
        </div>
        {error && <p role="alert" className="core-studio-notice">{copy[error]}</p>}
        <input type="range" min={0} max={duration || 1} step={0.1} value={position} disabled={!duration} onChange={(event) => seek(Number(event.target.value))} aria-label={copy.seek} className="core-editor-seek"/>
        <div className="timeline-ruler">{Array.from({ length: 6 }, (_, index) => <span key={index}>{stamp(duration * index / 5)}</span>)}</div>
        <div className="timeline"><div className="track-labels">{copy.tracks.map((label) => <span key={label}>{label}</span>)}</div><div className="tracks">
          {media && <b style={{ left: `${duration ? start / duration * 100 : 0}%`, width: `${duration ? (end - start) / duration * 100 : 100}%` }} className={media.type === "audio" ? "track-music" : ""}>{media.name}</b>}
          {text && <b className="track-text" style={{ left: 0, width: "100%" }}>{text}</b>}
          <i className="playhead" style={{ left: `${duration ? position / duration * 100 : 0}%` }}/>
        </div></div>
        <p className="core-studio-notice">{copy.local}</p><p className="core-studio-notice">{copy.exportUnavailable}</p>
      </div>
      <aside className="editor-inspector"><span className="studio-eyebrow">{copy.inspector}</span><h3>{copy.tools[tool]}</h3>
        {tool === 0 && <><button type="button" className="studio-ghost" onClick={() => input.current?.click()}>{copy.import}</button>{media && <><p className="core-studio-notice">{media.name}</p><button type="button" className="studio-ghost" onClick={() => { setMedia(null); setDuration(0); setStart(0); setEnd(0); setPosition(0); setPlaying(false); }}>{copy.clear}</button></>}</>}
        {tool === 1 && <><p className="core-studio-notice">{copy.templatesNote}</p>{ratios.map((value, index) => <button key={value} type="button" className="studio-ghost" onClick={() => setRatio(index)}>{value} · {copy.formats[index]}</button>)}</>}
        {[2, 5, 8].includes(tool) && <label className="core-editor-text-label">{tool === 2 ? copy.text : tool === 5 ? copy.subtitle : copy.brand}<textarea rows={3} maxLength={300} value={tool === 2 ? text : tool === 5 ? subtitle : brand} onChange={(event) => (tool === 2 ? setText : tool === 5 ? setSubtitle : setBrand)(event.target.value)}/></label>}
        {tool === 3 && <p className="core-studio-notice">{copy.audioNote}</p>}{tool === 4 && <p className="core-studio-notice">{copy.voiceNote}</p>}{tool === 6 && <p className="core-studio-notice">{copy.effectsNote}</p>}
        {tool === 7 && <label className="core-editor-text-label">{copy.filter}<select value={filter} onChange={(event) => setFilter(Number(event.target.value))}>{copy.filters.map((label, index) => <option key={index} value={index}>{label}</option>)}</select></label>}
        <Slider label={`${copy.position} X`} value={x} min={-50} max={50} onChange={setX}/><Slider label={`${copy.position} Y`} value={y} min={-50} max={50} onChange={setY}/>
        <Slider label={copy.scale} value={scale} min={10} max={200} unit="%" onChange={setScale}/><Slider label={copy.rotation} value={rotation} min={-180} max={180} unit="°" onChange={setRotation}/><Slider label={copy.opacity} value={opacity} min={0} max={100} unit="%" onChange={setOpacity}/>
        <label className="core-editor-text-label">{copy.color}<input type="color" value={color} onChange={(event) => setColor(event.target.value)}/></label>
        {duration > 0 && <><label>{copy.trimStart}<input type="number" min={0} max={end} step={0.1} value={start} onChange={(event) => setStart(Math.min(end, Math.max(0, Number(event.target.value))))}/></label><label>{copy.trimEnd}<input type="number" min={start} max={duration} step={0.1} value={end} onChange={(event) => setEnd(Math.max(start, Math.min(duration, Number(event.target.value))))}/></label></>}
      </aside>
    </div>
  </section>;
}

function Slider({ label, value, min, max, unit = "", onChange }: { label: string; value: number; min: number; max: number; unit?: string; onChange: (value: number) => void }) {
  return <div><label>{label}<output>{value}{unit}</output></label><input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label={label}/></div>;
}
