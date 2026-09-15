"use client";
import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { buildCategories } from '@/data/business-os';

export function WhatWeBuild() {
  const { t } = useLanguage();
  const [selected, setSelected] = useState(0);
  const category = buildCategories[selected];
  return <section id="build" className="section container what-we-build" aria-labelledby="build-heading">
    <span className="eyebrow">01 / WHAT WE BUILD</span>
    <div className="os-section-heading">
      <h2 id="build-heading">{t('Что мы создаём')}<br /><span className="lime-text">{t('для вашего бизнеса')}</span></h2>
      <p>{t('Не набор одинаковых карточек — карта направлений. Выберите категорию: мы строим продукты всех этих типов.')}</p>
    </div>
    <div className="build-map" data-reveal>
      <div className="build-categories" role="group" aria-label={t('Категории продуктов')}>
        {buildCategories.map((item, index) => <button key={item.id} aria-pressed={selected === index} onClick={() => setSelected(index)} onPointerEnter={e => { if (e.pointerType === 'mouse') setSelected(index); }} onFocus={() => setSelected(index)}>
          <span className="build-category-code">{item.code}</span>
          <strong>{t(item.title)}</strong>
          <span className="build-category-count">{item.items.length} {t('направлений')}</span>
        </button>)}
      </div>
      <div className="build-visual" aria-live="polite">
        <div className="build-visual-head">
          <span className="eyebrow">{category.code}</span>
          <p>{t(category.text)}</p>
        </div>
        <ul className="build-items">
          {category.items.map(item => <li key={item}>{t(item)}</li>)}
        </ul>
        <div className="build-stack" aria-label={t('Из чего состоит')}>
          <span className="eyebrow">{t('ИЗ ЧЕГО СОСТОИТ')}</span>
          <div className="build-stack-list">
            {category.stack.map((line, index) => <span key={line}>{String(index + 1).padStart(2, '0')} · {t(line)}</span>)}
          </div>
        </div>
        <a className="text-link" href="#contact">{t('Обсудить продукт')} <ArrowUpRight size={16} /></a>
      </div>
    </div>
  </section>;
}
