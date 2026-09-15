"use client";
import { useMemo, useState } from 'react';
import { ArrowUpRight, Boxes, FileScan, Activity, Inbox, ReceiptText, ScanSearch, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { useAppView } from '@/components/app-view';
import { products, productIcons, type ProductStatus } from '@/data/business-os';

const iconMap: Record<string, LucideIcon> = {
  boxes: Boxes,
  'scan-search': ScanSearch,
  activity: Activity,
  inbox: Inbox,
  'receipt-text': ReceiptText,
  'file-scan': FileScan,
};

type Filter = "ALL" | ProductStatus;

export function HaydevProducts({ onShowcase }: { onShowcase?: () => void }) {
  const { t } = useLanguage();
  const { openAudit } = useAppView();
  const [filter, setFilter] = useState<Filter>("ALL");

  const counts = useMemo(() => {
    const live = products.filter(p => p.status === "LIVE").length;
    return { ALL: products.length, LIVE: live, "IN DEVELOPMENT": products.length - live };
  }, []);

  const visible = filter === "ALL" ? products : products.filter(p => p.status === filter);
  const filters: { key: Filter; label: string }[] = [
    { key: "ALL", label: t("ВСЕ") },
    { key: "LIVE", label: t("LIVE") },
    { key: "IN DEVELOPMENT", label: t("В РАЗРАБОТКЕ") },
  ];

  return <section id="products" className="section container haydev-products" aria-labelledby="products-heading">
    <span className="eyebrow">05 / HAYDEV PRODUCTS</span>
    <div className="os-section-heading" data-reveal>
      <h2 id="products-heading">{t('Мы не только создаём продукты для клиентов.')}<br /><span className="lime-text">{t('Мы создаём свои.')}</span></h2>
      <p>{t('Собственные продукты HayDev — доказательство того, что мы умеем проектировать, разрабатывать и запускать сложные системы.')}</p>
    </div>
    <div className="products-filter" role="group" aria-label={t('Фильтр продуктов')} data-reveal>
      {filters.map(item => <button key={item.key} aria-pressed={filter === item.key} onClick={() => setFilter(item.key)}>
        {item.label}<span className="filter-count">{counts[item.key]}</span>
      </button>)}
    </div>
    <div data-reveal>
      <div className="products-grid" key={filter}>
        {visible.map(product => {
        const Icon = iconMap[productIcons[product.code] ?? 'boxes'];
        return <article key={product.code} className={`product-card status-${product.status.replace(' ', '-').toLowerCase()}`}>
          <div className="product-card-head">
            <span className="product-icon" aria-hidden="true"><Icon size={20} strokeWidth={1.5} /></span>
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
        </article>;
        })}
      </div>
    </div>
    <p className="products-note" data-reveal>{t('Статусы честные: LIVE — работает и используется. IN DEVELOPMENT — в разработке, без обещанных дат.')}</p>
  </section>;
}
