"use client";
import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { buildPipeline } from '@/data/business-os';

export function CustomSoftware() {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const stage = buildPipeline[step];
  return <section id="custom" className="section container custom-software" aria-labelledby="custom-heading">
    <span className="eyebrow">02 / CUSTOM SOFTWARE</span>
    <div className="custom-intro">
      <h2 id="custom-heading">{t('Есть идея?')}<br /><span className="lime-text">{t('Мы превращаем её в продукт.')}</span></h2>
      <p>{t('HayDev может разработать программу под конкретную бизнес-задачу: от внутренней системы компании до полноценной SaaS-платформы. Мы не подбираем шаблон — мы проектируем решение.')}</p>
    </div>
    <ol className="pipeline-rail" aria-label={t('Путь продукта')}>
      {buildPipeline.map((item, index) => <li key={item.code} className={index === step ? 'current' : ''}>
        <button aria-pressed={step === index} onClick={() => setStep(index)} onFocus={() => setStep(index)}>
          <span className="pipeline-index">{String(index + 1).padStart(2, '0')}</span>
          <span className="pipeline-code">{item.code}</span>
        </button>
        {index < buildPipeline.length - 1 && <span className="pipeline-connector" aria-hidden="true" />}
      </li>)}
    </ol>
    <div className="pipeline-detail" aria-live="polite">
      <div className="pipeline-detail-copy">
        <span className="eyebrow">{stage.code}</span>
        <h3>{t(stage.title)}</h3>
        <p>{t(stage.text)}</p>
      </div>
      <div className="pipeline-cta">
        <p>{t('Расскажите, что вы хотите построить. Ответим с архитектурой и планом.')}</p>
        <div className="pipeline-cta-row">
          <a className="button button-primary" href="#contact">{t('Обсудить идею')}<ArrowUpRight size={18} /></a>
          <a className="text-link" href="#products">{t('Наши собственные продукты')} <ArrowUpRight size={16} /></a>
        </div>
      </div>
    </div>
  </section>;
}
