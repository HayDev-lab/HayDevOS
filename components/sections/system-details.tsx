"use client";
import {useState} from 'react';
import {useLanguage} from '@/components/language-provider';
import {Accordion,AccordionContent,AccordionItem,AccordionTrigger} from '@/components/ui/accordion';
import {ErpSection} from '@/components/sections/erp-section';
import {AutomationSection} from '@/components/sections/growth-system';
import {MissionControl} from '@/components/sections/mission-control';
import {stages as baseStages} from '@/data/site-content';
function SectionLabel({number,children}:{number:string;children:React.ReactNode}){return <div className="section-label"><span className="section-number">{number}</span>{children}</div>}
export default function SystemDetails(){const {t,localize}=useLanguage();const stages=localize(baseStages);const [stage,setStage]=useState(0);const [panel,setPanel]=useState('');return <Accordion type="single" collapsible value={panel} onValueChange={setPanel} className="system-details-content" onClickCapture={event=>{if((event.target as HTMLElement).closest('a[href="#automation"]')){event.preventDefault();setPanel('automation');requestAnimationFrame(()=>document.getElementById('automation')?.scrollIntoView({block:'start'}));}}}>
<AccordionItem value="erp"><AccordionTrigger>{t('ERP и бизнес-ПО')}</AccordionTrigger><AccordionContent><ErpSection/></AccordionContent></AccordionItem>
<AccordionItem value="automation"><AccordionTrigger>{t('Что можно перестать делать вручную')}</AccordionTrigger><AccordionContent><AutomationSection/></AccordionContent></AccordionItem>
<AccordionItem value="owner"><AccordionTrigger>{t('Панель владельца')}</AccordionTrigger><AccordionContent><MissionControl/></AccordionContent></AccordionItem>
<AccordionItem value="process"><AccordionTrigger>{t('Как работаем')}</AccordionTrigger><AccordionContent>    <section className="section container compact-process" id="process" aria-labelledby="process-heading"><SectionLabel number="08">{t("ТРАЕКТОРИЯ ПРОЕКТА")}</SectionLabel><h2 id="process-heading">{t("Аудит, карта, запуск.")} </h2><div className="process-steps" role="group" aria-label={t("Этапы проекта")}>{stages.map((item,i)=><button key={item.en} aria-pressed={stage===i} aria-controls="stage-details" onClick={()=>setStage(i)}><span>0{i+1}</span>{item.name}</button>)}</div><div className="compact-stage" id="stage-details" aria-live="polite"><div><h3>{stages[stage].title}</h3><p>{stages[stage].text}</p></div><div><span className="eyebrow">{t("НА ВЫХОДЕ")}</span><p>{stages[stage].deliverable}</p></div></div></section>

    <section className="container compact-extras" id="outcomes" aria-label={t("Результат")}><Accordion type="single" collapsible><AccordionItem value="trust"><AccordionTrigger>{t("ИНЖЕНЕРИЯ ДОВЕРИЯ")}</AccordionTrigger><AccordionContent><div className="compact-trust">{[["Контроль и доступы","Разделяем роли, защищаем ключи на сервере, согласуем правила работы с данными. В важных ИИ-сценариях решение остаётся за человеком."],["Архитектура под задачу","Выбираем инструменты по процессам и нагрузке. Документируем связи, чтобы систему можно было поддерживать и развивать."],["Измеримый прогресс","До старта определяем события и показатели. После запуска оцениваем реальные изменения, а не обещаем проценты без исходных данных."]].map(([title,text])=><article key={title}><h3>{t(title)}</h3><p>{t(text)}</p></article>)}</div></AccordionContent></AccordionItem></Accordion></section>

</AccordionContent></AccordionItem></Accordion>;}
