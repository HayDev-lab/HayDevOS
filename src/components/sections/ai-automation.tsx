"use client";
import { useState } from 'react';
import { useLanguage } from '@/components/language-provider';
import { automationActions, automationRules, intelligence } from '@/data/business-os';

export function AutomationSection() {
  const { t } = useLanguage();
  const [action, setAction] = useState(0), [module, setModule] = useState(0);
  return <section id="automation" className="section container os-automation" aria-labelledby="automation-heading">
    <span className="eyebrow">03 / AI & AUTOMATION</span>
    <div className="os-section-heading">
      <h2 id="automation-heading">{t('AI там, где он действительно полезен')}</h2>
      <p>{t('Не generic AI promises — рабочие сценарии: анализ документов, обработка лидов, база знаний, автоматизация поддержки.')}</p>
    </div>
    <div className="automation-layout" data-reveal>
      <div className="automation-actions" role="group" aria-label={t('Действия для автоматизации')}>
        {automationActions.map((x, i) => <button key={x} onClick={() => setAction(i)} aria-pressed={action === i}><span>{t(x)}</span><span>{i === action ? t('Автоматически') : '↗'}</span></button>)}
      </div>
      <div className="automation-recipe" aria-live="polite">
        <span className="eyebrow">{t('ПРИМЕР ПРАВИЛА')}</span>
        <h3>{t(automationActions[action])}</h3>
        <ol>
          <li><span>01</span>{t(automationRules[action][0])}</li>
          <li><span>02</span>{t(automationRules[action][1])}</li>
          <li><span>03</span>{t(automationRules[action][2])}</li>
          <li><span>04</span>{t('Результат и журнал ошибок')}</li>
        </ol>
        <p>{t('Документы и важные AI-решения проходят проверку человеком. Ошибки передаются ответственному.')}</p>
      </div>
    </div>
    <p className="automation-principle">{t('Автоматизируем то, что действительно мешает бизнесу расти.')}</p>
    <div className="intelligence-layer" data-reveal>
      <div><span className="eyebrow">HAYDEV INTELLIGENCE LAYER</span><p>{t('Модули, которые можно включить в вашу систему.')}</p></div>
      <div className="intelligence-selector" role="group" aria-label="HayDev Intelligence Layer">{intelligence.map((x, i) => <button key={x.name} onClick={() => setModule(i)} aria-pressed={module === i}>{x.name}</button>)}</div>
      <p className="intelligence-detail" aria-live="polite">{t(intelligence[module].text)}</p>
    </div>
  </section>;
}
