"use client";
import { useState, type CSSProperties } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { useAppView } from '@/components/app-view';
import { OrbitalScene } from '@/components/visuals/orbital-scene';
import { heroScenes, heroTicker } from '@/data/business-os';

export function BusinessCore() {
  const { t } = useLanguage(); const { openAudit } = useAppView();
  const [scene, setScene] = useState(0);
  const [active, setActive] = useState(0);
  const view = heroScenes[scene];
  const nodeCount = view.nodes.length;

  function switchScene(next: number) {
    setScene(next); setActive(0);
  }

  return <section className="hero os-hero" id="home" aria-labelledby="hero-heading">
    <div className="container hero-inner">
      <div className="hero-copy">
        <div className="hero-kicker">HAYDEV / SOFTWARE · AI · DIGITAL PRODUCTS</div>
        <h1 id="hero-heading">{t('Создаём софт,')}<br /><span>{t('на котором работает бизнес.')}</span></h1>
        <p className="os-hero-subtitle">{t('От идеи до работающего продукта')}</p>
        <p className="hero-description">{t('Веб-платформы, AI-системы, ERP/CRM, автоматизация и custom software — под конкретную задачу вашего бизнеса.')}</p>
        <p className="hero-description-mobile">{t("Веб-платформы, AI-системы, ERP/CRM, автоматизация и custom software — под конкретную задачу вашего бизнеса.")}</p>
        <div className="hero-cta">
          <a className="button button-primary os-cta" href="#contact">{t('Обсудить продукт')}<ArrowUpRight size={18} /></a>
          <a className="text-link" href="#products">{t('Посмотреть наши продукты')}<ArrowUpRight size={18} /></a>
        </div>
        <p className="hero-footnote"><a className="text-link hero-task-link" href="#contact">{t('Есть задача? Покажите её')} <ArrowUpRight size={14} /></a></p>
      </div>
      <div className="hero-scene business-core">
        <OrbitalScene active={active} scene={scene} />
        <div className="scene-mode" role="group" aria-label={t('Состояния сцены')}>
          {heroScenes.map((item, index) => <button key={item.id} aria-pressed={scene === index} onClick={() => switchScene(index)}>{t(item.label)}</button>)}
        </div>
        <div className="core-heading"><span>{view.heading}</span><span>{nodeCount} / {t('ПОДКЛЮЧЕНО')}</span></div>
        <div className="core-network" data-scene={view.id}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="50" cy="48" rx="39" ry="29" /><path key={scene} className="core-trace" d="M 50 19 A 39 29 0 1 1 49.99 19" /></svg>
          {view.nodes.map((node, i) => {
            const angle = i * Math.PI * 2 / nodeCount - Math.PI / 2;
            return <button key={view.id + node.code} style={{ '--nx': `${50 + 39 * Math.cos(angle)}%`, '--ny': `${48 + 29 * Math.sin(angle)}%` } as CSSProperties} className="business-node" aria-pressed={active === i} aria-controls="core-explanation" onPointerEnter={e => { if (e.pointerType === 'mouse') setActive(i); }} onFocus={() => setActive(i)} onClick={() => setActive(i)}><span className="node-port" />{node.code}</button>;
          })}
        </div>
        <div className="core-explanation" id="core-explanation" aria-live="polite"><span>{view.nodes[active].code}</span><p>{t(view.nodes[active].detail)}</p></div>
      </div>
    </div>
    <div className="os-data-strip container" data-reveal>
      <span>{t('ОДИН ПУТЬ ПРОДУКТА')}</span>
      <p className="data-strip-flow" aria-label="Idea, Architecture, Design, Code, Integration, Launch">
        <strong>Idea</strong><i aria-hidden="true">→</i><strong>Architecture</strong><i aria-hidden="true">→</i><strong>Design</strong><i aria-hidden="true">→</i><strong>Code</strong><i aria-hidden="true">→</i><strong>Integration</strong><i aria-hidden="true">→</i><strong>Launch</strong>
      </p>
      <a href="#build">{t('Как мы строим')} ↗</a>
    </div>
    <div className="hero-ticker" aria-hidden="true">
      <div className="hero-ticker-track">
        {[0, 1].map(copy => <div key={copy} className="hero-ticker-row">
          {heroTicker.map(item => <span key={copy + item}>{item}<i>·</i></span>)}
        </div>)}
      </div>
    </div>
    <div className="hero-scroll-hint" aria-hidden="true">
      <span>{t('ЛИСТАЙТЕ')}</span>
      <i className="hero-scroll-line" />
    </div>
  </section>;
}
