"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import type { OrbitalEngine } from "./orbital-engine";
export function OrbitalScene({ active }: { active: number }) {
 const { t }=useLanguage();const canvas=useRef<HTMLCanvasElement>(null),engine=useRef<OrbitalEngine|null>(null);const [ready,setReady]=useState(false),[paused,setPaused]=useState(false),[fallback,setFallback]=useState(false);
 const current=useRef({active,paused});useEffect(()=>{current.current={active,paused};engine.current?.setActive(active);engine.current?.setPaused(paused||fallback);},[active,paused,fallback]);
 useEffect(()=>{
  const node=canvas.current;if(!node)return;let cancelled=false;let started=false;
  const observer=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting||started)return;started=true;void import('./orbital-engine').then(({createOrbitalEngine})=>{if(cancelled)return;engine.current=createOrbitalEngine(node,()=>{setReady(false);setFallback(true);},()=>{if(!cancelled)setReady(true);});engine.current.setActive(current.current.active);engine.current.setPaused(current.current.paused);}).catch((error: unknown)=>{node.dataset.failure=error instanceof Error?error.message:"Renderer initialization failed";if(!cancelled)setFallback(true);});});observer.observe(node);
  return()=>{cancelled=true;observer.disconnect();engine.current?.dispose();engine.current=null;};
 },[]);
 return <div className={`webgl-scene ${ready&&!fallback?'is-ready':''}`} data-renderer={ready&&!fallback?'webgl':'fallback'}>
  <picture className="webgl-fallback"><source media="(max-width:767px)" srcSet="/images/orbital-core-mobile.webp"/><img src="/images/orbital-core.webp" alt="" width={1536} height={1024} fetchPriority="high"/></picture>
  <canvas ref={canvas} aria-hidden="true" className="orbital-canvas"/>
  <div className="webgl-toolbar" role="group" aria-label={t("Управление 3D-сценой")}>
   <span>{t(fallback?"Статичный вид":"Вращайте ядро")}</span>
   <button disabled={!ready||fallback} aria-label={t("Повернуть влево")} onClick={()=>engine.current?.turn(-.35)}><ChevronLeft size={17}/></button>
   <button disabled={!ready||fallback} aria-label={t("Повернуть вправо")} onClick={()=>engine.current?.turn(.35)}><ChevronRight size={17}/></button>
   <button className="pause-scene" disabled={!ready||fallback} aria-label={t(paused?"Продолжить вращение":"Остановить вращение")} aria-pressed={paused} onClick={()=>setPaused(!paused)}>{paused?<Play size={15}/>:<Pause size={15}/>}</button>
   <button disabled={!ready||fallback} aria-label={t("Сбросить ракурс")} onClick={()=>engine.current?.reset()}><RotateCcw size={15}/></button>
   <button disabled={!ready} className="static-toggle" onClick={()=>{setFallback(!fallback);engine.current?.setPaused(!fallback||paused);}}>{t(fallback?"3D":"2D")}</button>
  </div>
 </div>;
}
