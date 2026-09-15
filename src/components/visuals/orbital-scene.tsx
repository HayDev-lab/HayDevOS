"use client";
import { useEffect, useRef, useState } from "react";
import type { OrbitalEngine } from "./orbital-engine";
export function OrbitalScene({ active, scene = 0 }: { active: number; scene?: number }) {
 const canvas=useRef<HTMLCanvasElement>(null),engine=useRef<OrbitalEngine|null>(null);const [ready,setReady]=useState(false),[fallback,setFallback]=useState(false);
 const state=useRef({active,scene});useEffect(()=>{state.current={active,scene};engine.current?.setActive(active);},[active]);useEffect(()=>{state.current={active,scene};engine.current?.setScene(scene);},[scene]);
 useEffect(()=>{
  const node=canvas.current;if(!node)return;let cancelled=false;let started=false;
  const observer=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting||started)return;started=true;void import('./orbital-engine').then(({createOrbitalEngine})=>{if(cancelled)return;engine.current=createOrbitalEngine(node,()=>{setReady(false);setFallback(true);},()=>{if(!cancelled)setReady(true);});engine.current.setScene(state.current.scene);engine.current.setActive(state.current.active);}).catch((error: unknown)=>{node.dataset.failure=error instanceof Error?error.message:"Renderer initialization failed";if(!cancelled)setFallback(true);});});observer.observe(node);
  return()=>{cancelled=true;observer.disconnect();engine.current?.dispose();engine.current=null;};
 },[]);
 return <div className={`webgl-scene ${ready&&!fallback?'is-ready':''}`} data-renderer={ready&&!fallback?'webgl':'fallback'}>
  <picture className="webgl-fallback"><img src="/images/command-core.webp" alt="" width={720} height={640} fetchPriority="high"/></picture>
  <canvas ref={canvas} aria-hidden="true" className="orbital-canvas"/>
 </div>;
}
