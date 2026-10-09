"use client";

import { useState } from "react";
import Link from "next/link";
import { Image, Mic, Music, Sparkles, UserRound, Video } from "lucide-react";
import { generatorTypes } from "@/lib/workspace-routes";
import { useStudioCopy } from "./studio-copy";

const icons = [Video, Music, Mic, Image, UserRound];
const formats = ["16:9", "9:16", "1:1"];

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
  const active = activeType;
  async function prepare() {
    if (active === undefined || !prompt.trim() || busy) return;
    const request = copy.request.replace("{type}", copy.types[active]).replace("{format}", `${formats[format]} · ${copy.formats[format]}`).replace("{style}", copy.styles[style]).replace("{prompt}", prompt.trim());
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
        <div className="ai-generator-layout">
          <div>
            <label className="ai-prompt-label" htmlFor="media-generator-prompt">{copy.prompt}</label>
            <textarea id="media-generator-prompt" value={prompt} maxLength={7000} onChange={(event) => setPrompt(event.target.value)} rows={5} placeholder={copy.placeholder}/>
            <div className="ai-generator-options">
              <label>{copy.format}<select value={format} onChange={(event) => setFormat(Number(event.target.value))}>{formats.map((ratio, index) => <option key={ratio} value={index}>{ratio} · {copy.formats[index]}</option>)}</select></label>
              <label>{copy.style}<select value={style} onChange={(event) => setStyle(Number(event.target.value))}>{copy.styles.map((label, index) => <option key={index} value={index}>{label}</option>)}</select></label>
            </div>
            <p className="core-studio-notice">{copy.mediaUnavailable}</p>
            <button type="button" className="studio-primary" disabled title={copy.mediaUnavailable}>{copy.generate}</button>
            <button type="button" className="studio-gold" disabled={!prompt.trim() || busy} onClick={() => void prepare()}>{busy ? copy.preparing : copy.prepare}</button>
          </div>
          <div className="ai-generator-preview"><span className="ai-preview-orb"><Sparkles/></span><strong>{copy.preview}</strong><small>{copy.previewEmpty}</small></div>
        </div>
      </section>}
  </>;
}
