"use client";
import { ArrowUpRight } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { useAppView } from '@/components/app-view';
import { products } from '@/data/business-os';

export function HaydevProducts({ onShowcase }: { onShowcase?: () => void }) {
  const { t } = useLanguage();
  const { openAudit } = useAppView();
  return <section id="products" className="section container haydev-products" aria-labelledby="products-heading">
    <span className="eyebrow">04 / HAYDEV PRODUCTS</span>
    <div className="os-section-heading" data-reveal>
      <h2 id="products-heading">{t('Мы не только создаём продукты для клиентов.')}<br /><span className="lime-text">{t('Мы создаём свои.')}</span></h2>
      <p>{t('Собственные продукты HayDev — доказательство того, что мы умеем проектировать, разрабатывать и запускать сложные системы.')}</p>
    </div>
    <div className="products-grid" data-reveal>
      {products.map(product => <article key={product.code} className={`product-card status-${product.status.replace(' ', '-').toLowerCase()}`}>
        <div className="product-card-head">
          <span className="product-code">{product.code}</span>
          <span className="product-status" data-status={product.status}>{t(product.status)}</span>
        </div>
        <h3>{product.name}</h3>
        <p>{t(product.text)}</p>
        <ul className="product-features" aria-label={t('Внутри продукта')}>
          {product.features.map(feature => <li key={feature}>{t(feature)}</li>)}
        </ul>
        <div className="product-card-foot">
          {product.cta && (product.cta.audit
            ? <a className="text-link" href="#audit" onClick={event => { event.preventDefault(); openAudit(); }}>{t(product.cta.label)} <ArrowUpRight size={16} /></a>
            : <a className="text-link" href="#erp" onClick={event => { if (onShowcase) { event.preventDefault(); onShowcase(); } }}>{t(product.cta.label)} <ArrowUpRight size={16} /></a>)}
          {!product.cta && <span className="product-soon">{t('В разработке — дата не обещана')}</span>}
        </div>
      </article>)}
    </div>
    <p className="products-note" data-reveal>{t('Статусы честные: LIVE — работает и используется. IN DEVELOPMENT — в разработке, без обещанных дат.')}</p>
  </section>;
}
