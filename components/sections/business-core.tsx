"use client";
import { useState, type CSSProperties } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { OrbitalScene } from '@/components/visuals/orbital-scene';
import { businessNodes } from '@/data/business-os';
export function BusinessCore() {
 const {t}=useLanguage(); const [active,setActive]=useState(3);
 return <section className="hero os-hero" id="home" aria-labelledby="hero-heading"><div className="container hero-inner">
  <div className="hero-copy"><div className="hero-kicker">HAYDEV / BUSINESS OPERATING SYSTEMS</div><h1 id="hero-heading">{t('Ваш бизнес.')}<br/><span>{t('Одна система.')}</span></h1><p className="os-hero-subtitle">{t('Цифровая операционная система вашего бизнеса')}</p><p className="hero-description">{t('Клиенты, продажи, процессы и AI — на одних данных.')}</p>
  <p className="hero-description-mobile">{t("Клиенты, продажи, процессы и AI — на одних данных.")}</p>
  <div className="hero-cta"><a className="button button-primary os-cta" href="#industries">{t('Показать мой бизнес')}<ArrowUpRight size={18}/></a><a className="text-link" href="#audit">{t('Запустить Business Audit')}<ArrowUpRight size={18}/></a></div><p className="hero-footnote">{t('От первой заявки до управленческой аналитики.')}</p></div>
  <div className="hero-scene business-core"><OrbitalScene active={active}/><div className="core-heading"><span>DIGITAL BUSINESS CORE</span><span>10 / CONNECTED</span></div>
   <div className="core-network"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="50" cy="46" rx="39" ry="31"/><path key={active} className="core-trace" d="M 50 15 A 39 31 0 1 1 49.99 15"/></svg>
   {businessNodes.map((node,i)=>{const angle=i*Math.PI*2/10-Math.PI/2;return <button key={node.code} style={{'--nx':`${50+39*Math.cos(angle)}%`,'--ny':`${46+31*Math.sin(angle)}%`} as CSSProperties} className="business-node" aria-pressed={active===i} aria-controls="core-explanation" onPointerEnter={e=>{if(e.pointerType==='mouse')setActive(i);}} onFocus={()=>setActive(i)} onClick={()=>setActive(i)}><span className="node-port"/>{node.code}</button>;})}</div>
   <div className="core-explanation" id="core-explanation" aria-live="polite"><span>{businessNodes[active].code}</span><p>{t(businessNodes[active].detail)}</p></div>
  </div></div><div className="os-data-strip container"><span>{t('ОДИН ПУТЬ ДАННЫХ')}</span><p>Marketing → Website → CRM → Sales → ERP → Analytics</p><a href="#growth-os">{t('Посмотреть систему')} ↗</a></div></section>;
}
