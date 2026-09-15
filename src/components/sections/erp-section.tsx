"use client";
import { useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useLanguage } from "@/components/language-provider";
import content from "@/data/erp-content.json";

export function ErpSection() {
  const { t, localize } = useLanguage();
  const { nodes, modules, solutions, packages } = localize(content);
  const [active, setActive] = useState("erp");
  const [industry, setIndustry] = useState("05");
  const solution = solutions.find(item=>item.code===industry) ?? solutions[4];
  const selected = nodes.find(node => node.id === active) ?? nodes[3];
  return <section className="erp-section section container" id="erp" aria-labelledby="erp-heading">
    <div className="section-label"><span className="section-number">ERP</span><span>{t("Для малого и среднего бизнеса в Армении")}</span></div>
    <div className="erp-intro"><h2 id="erp-heading">{t("Бизнес должен работать")}<br /><span className="lime-text">{t("на одних данных")}</span></h2><p>{t("Продажи, склад, закупки, клиенты, сотрудники, задачи и финансы не должны жить в отдельных таблицах.")}</p><p className="erp-principle">{t("Не шаблонная ERP. Не лишняя сложность. Система под ваш бизнес.")}</p></div>
    <ol className="erp-data-pipeline">{["SALE","ERP","INVENTORY","PROCUREMENT","FINANCE","OWNER"].map((x,i)=><li key={x}><span>0{i+1}</span><strong>{x}</strong>{i<5&&<span aria-hidden="true">→</span>}</li>)}</ol><div className="erp-explorer"><div className="erp-module-selector" role="group" aria-label={t("Модули под вашу работу")}>{modules.map(item=><button key={item.node} aria-pressed={active===item.node} aria-controls="erp-connection-details" onClick={()=>setActive(item.node)}><span>+</span>{item.label}</button>)}</div><div className="erp-connection" id="erp-connection-details" aria-live="polite"><span className="eyebrow">ERP / {selected.label}</span><h3>{selected.label}</h3><p className="erp-problem">{selected.problem}</p><p>{selected.value}</p><details><summary>{t("Какие данные")}</summary><p>{selected.data}</p></details><div className="erp-integrations" role="group" aria-label={t("Связи ERP-системы")}>{nodes.map(node=><button key={node.id} aria-pressed={active===node.id} onClick={()=>setActive(node.id)}>{node.label}</button>)}</div></div></div>
    <div className="erp-cta-row"><Button asChild className="button button-primary"><a href="#contact">{t("Спроектировать ERP для бизнеса")}<ArrowUpRight size={18}/></a></Button><a href="#contact" className="text-link">{t("Получить карту автоматизации")}<ArrowUpRight size={18}/></a></div>
    <details className="erp-directions"><summary>{t("ERP под масштаб и отрасль")}</summary><div className="erp-industry-picker"><label htmlFor="erp-industry">{t("ERP под масштаб и отрасль")}</label><NativeSelect id="erp-industry" value={industry} onChange={event=>setIndustry(event.target.value)}>{solutions.map(item=><NativeSelectOption key={item.code} value={item.code}>{item.title}</NativeSelectOption>)}</NativeSelect><p aria-live="polite">{solution.text}</p></div></details>
    <div className="erp-packages" id="erp-packages"><div className="erp-packages-heading"><h3>{t("От первого модуля до всей системы")}</h3><p>{t("Согласуем состав, этапы и стоимость после аудита. Дополнительные модули и интеграции выбираем под процессы компании.")}</p></div><div className="erp-package-grid">{packages.map((item,index)=><article className={`erp-package erp-package-${index}`} key={item.name}><span className="eyebrow">0{index+1} / HAYDEV</span><h4>{item.name}</h4><p className="erp-package-best">{item.best}</p><details className="package-details"><summary>{t("В составе решения")}</summary><ul>{item.items.map(line=><li key={line}><Check size={16}/>{line}</li>)}</ul></details><p className="erp-package-outcome">{item.outcome}</p><Button asChild className={`button ${index===1?"button-primary":"button-outline"}`}><a href="#contact">{item.cta}<ArrowUpRight size={18}/></a></Button></article>)}</div></div>
  </section>;
}
