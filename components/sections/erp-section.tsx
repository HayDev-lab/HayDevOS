"use client";
import { useState, type CSSProperties } from "react";
import { ArrowUpRight, Check, CircleDot, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLanguage } from "@/components/language-provider";
import content from "@/data/erp-content.json";

export function ErpSection() {
  const { t, localize } = useLanguage();
  const { nodes, modules, solutions, packages } = localize(content);
  const [active, setActive] = useState("erp");
  const selected = nodes.find(node => node.id === active) ?? nodes[3];
  return <section className="erp-section section container" id="erp" aria-labelledby="erp-heading">
    <div className="section-label"><span className="section-number">ERP</span><span>{t("Для малого и среднего бизнеса в Армении")}</span></div>
    <div className="erp-intro"><h2 id="erp-heading">{t("ERP-системы, которые собирают бизнес")}<br /><span className="lime-text">{t("в один центр управления")}</span></h2><p>{t("Когда сайт, реклама, заявки, сотрудники, склад, финансы и клиенты живут отдельно — бизнес теряет деньги и скорость. HayDev создаёт ERP-системы под реальные процессы компании: от заявок и продаж до задач, склада, финансов и аналитики. Мы соединяем ERP с CRM, сайтом, рекламой, мессенджерами и AI, чтобы владелец видел бизнес как единую систему, а команда работала без хаоса.")}</p><p className="erp-principle">{t("Не шаблонная ERP. Не лишняя сложность. Система под ваш бизнес.")}</p></div>
    <div className="erp-command">
      <div className="erp-command-header"><span className="eyebrow">HAYDEV / BUSINESS COMMAND CORE</span><p>{t("Выберите связь и посмотрите, как работают данные.")}</p></div>
      <div className="erp-command-grid">
        <div className="erp-orbits">
          <svg className="erp-orbit-lines" viewBox="0 0 600 510" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="300" cy="255" rx="227" ry="198"/><ellipse cx="300" cy="255" rx="152" ry="131"/>{nodes.map((node,index)=>{const angle=(index*36-90)*Math.PI/180;return <path key={node.id} className={active===node.id?"active":""} d={`M300 255 L${300+227*Math.cos(angle)} ${255+198*Math.sin(angle)}`}/>;})}</svg>
          <div className="erp-core" aria-hidden="true"><Workflow size={34}/><strong>ERP</strong><span>{t("УПРАВЛЕНИЕ БИЗНЕСОМ")}</span></div>
          <div className="erp-node-group" role="group" aria-label={t("Связи ERP-системы")}>{nodes.map((node,index)=>{
            const angle=(index*36-90)*Math.PI/180;
            return <button key={node.id} style={{"--node-x":`${50+37.8*Math.cos(angle)}%`,"--node-y":`${50+38.8*Math.sin(angle)}%`} as CSSProperties} className={`erp-node ${active===node.id?"selected":""}`} aria-pressed={active===node.id} aria-controls="erp-connection-details" onClick={()=>setActive(node.id)}><CircleDot size={14}/>{node.label}</button>;
          })}</div>
        </div>
        <div className="erp-connection" id="erp-connection-details" aria-live="polite" aria-atomic="true"><span className="eyebrow">ERP ↔ {selected.label}</span><h3>{selected.label}</h3><dl><div><dt>{t("Проблема")}</dt><dd>{selected.problem}</dd></div><div><dt>{t("Какие данные")}</dt><dd>{selected.data}</dd></div><div><dt>{t("Что меняется")}</dt><dd>{selected.value}</dd></div></dl><a href="#contact" className="text-link">{t("Обсудить систему управления")}<ArrowUpRight size={18}/></a></div>
      </div>
      <p className="erp-diagram-note">{t("Схема связей, не демонстрация реальных показателей.")}</p>
    </div>
    <div className="erp-modules"><div><h3>{t("Модули под вашу работу")}</h3><p>{t("Собираем нужный набор на аудите. Начать можно с одного процесса.")}</p></div><ul>{modules.map(item=><li key={item.label}><a href="#erp-connection-details" onClick={()=>setActive(item.node)}>{item.label}<ArrowUpRight size={16}/></a></li>)}</ul></div>
    <div className="erp-cta-row"><Button asChild className="button button-primary"><a href="#contact">{t("Спроектировать ERP для бизнеса")}<ArrowUpRight size={18}/></a></Button><a href="#contact" className="text-link">{t("Получить карту автоматизации")}<ArrowUpRight size={18}/></a></div>
    <div className="erp-industries"><h3>{t("ERP под масштаб и отрасль")}</h3><Accordion type="single" collapsible className="erp-solution-list">{solutions.map(item=><AccordionItem value={item.code} key={item.code}><AccordionTrigger><span className="erp-solution-number">{item.code}</span><span>{item.title}</span></AccordionTrigger><AccordionContent><p>{item.text}</p><a href="#contact" className="text-link">{t("Обсудить задачу")}<ArrowUpRight size={16}/></a></AccordionContent></AccordionItem>)}</Accordion></div>
    <div className="erp-packages" id="erp-packages"><div className="erp-packages-heading"><h3>{t("От первого модуля до всей системы")}</h3><p>{t("Согласуем состав, этапы и стоимость после аудита. Дополнительные модули и интеграции выбираем под процессы компании.")}</p></div><div className="erp-package-grid">{packages.map((item,index)=><article className={`erp-package erp-package-${index}`} key={item.name}><span className="eyebrow">0{index+1} / HAYDEV</span><h4>{item.name}</h4><p className="erp-package-best">{item.best}</p><span className="eyebrow">{t("В составе решения")}</span><ul>{item.items.map(line=><li key={line}><Check size={16}/>{line}</li>)}</ul><p className="erp-package-outcome">{item.outcome}</p><Button asChild className={`button ${index===1?"button-primary":"button-outline"}`}><a href="#contact">{item.cta}<ArrowUpRight size={18}/></a></Button></article>)}</div></div>
  </section>;
}
