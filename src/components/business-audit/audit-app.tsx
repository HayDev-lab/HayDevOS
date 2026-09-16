"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleDashed,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { OrbitalScene } from "@/components/visuals/orbital-scene";
import { useLanguage } from "@/components/language-provider";
import { useAppView } from "@/components/app-view";
import {
  auditDomainLabels,
  auditDomains,
  auditQuestions,
  auditStateLabels,
  auditText,
  auditUi,
  haydevDemoAnswers,
  type AuditState,
} from "@/data/business-audit";
import {
  AUDIT_DRAFT_VERSION,
  AUDIT_STORAGE_KEY,
  buildIntegrationPayload,
  createAuditReport,
  parseAuditDraft,
  type AuditAnswers,
  type AuditAudience,
  type AuditDraft,
  type AuditProfile,
} from "@/lib/audit-engine";

const emptyAnswers: AuditAnswers = {};

function Brand({ onBack }: { onBack: () => void }) {
  return (
    <a href="#home" onClick={onBack} className="brand audit-brand" aria-label="HayDev">
      <span className="brand-mark" aria-hidden="true">h<span>↗</span></span>
      <span>haydev<span className="brand-period">.</span></span>
    </a>
  );
}

function ScoreRing({ value }: { value: number }) {
  return (
    <div className="audit-score-ring" style={{ "--score": `${value * 3.6}deg` } as React.CSSProperties}>
      <strong>{value}</strong><span>/ 100</span>
    </div>
  );
}

function StateBadge({ state, locale }: { state: AuditState; locale: "ru" | "hy" | "en" }) {
  return <span className={`audit-state state-${state}`}><i aria-hidden="true" />{auditText(auditStateLabels[state], locale)}</span>;
}

export function AuditApp() {
  const { locale, setLocale } = useLanguage();
  const { closeAudit } = useAppView();
  const l = locale as "ru" | "hy" | "en";
  const ui = (key: keyof typeof auditUi) => auditText(auditUi[key], l);
  const complexityLabel = (value: "low" | "medium" | "high") => ui(value === "high" ? "complexityHigh" : value === "medium" ? "complexityMedium" : "complexityLow");
  const [answers, setAnswers] = useState<AuditAnswers>(emptyAnswers);
  const [currentStep, setCurrentStep] = useState(0);
  const [audience, setAudience] = useState<AuditAudience>("internal");
  const [profile, setProfile] = useState<AuditProfile>("current");
  const [hydrated, setHydrated] = useState(false);
  const [restored, setRestored] = useState(false);
  const [screen, setScreen] = useState<"questions" | "report">("questions");
  const [planVisible, setPlanVisible] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reportRef = useRef<HTMLHeadingElement>(null);
  const question = auditQuestions[currentStep];
  const selectedId = answers[question.id] ?? "";
  const report = useMemo(() => createAuditReport(answers), [answers]);
  const activeVisual = auditDomains.indexOf(question.domains[0]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = parseAuditDraft(localStorage.getItem(AUDIT_STORAGE_KEY));
      if (saved) {
        setAnswers(saved.answers);
        setCurrentStep(saved.currentStep);
        setAudience(saved.audience);
        setProfile(saved.profile);
        setRestored(Object.keys(saved.answers).length > 0);
      }
      setHydrated(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const draft: AuditDraft = {
      version: AUDIT_DRAFT_VERSION,
      audience,
      profile,
      answers,
      currentStep,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(draft));
  }, [answers, audience, currentStep, hydrated, profile]);

  function focusHeading(target: "question" | "report" = "question") {
    requestAnimationFrame(() => (target === "question" ? headingRef.current : reportRef.current)?.focus());
  }

  function goToStep(index: number) {
    setCurrentStep(Math.max(0, Math.min(auditQuestions.length - 1, index)));
    setScreen("questions");
    focusHeading();
  }

  function reset(nextProfile: AuditProfile = "current") {
    setProfile(nextProfile);
    setAnswers(nextProfile === "demo" ? haydevDemoAnswers : {});
    setCurrentStep(0);
    setScreen("questions");
    setPlanVisible(false);
    setRestored(false);
    focusHeading();
  }

  function showReport() {
    if (!report.completed) return;
    setScreen("report");
    setPlanVisible(false);
    void buildIntegrationPayload({
      version: AUDIT_DRAFT_VERSION,
      audience,
      profile,
      answers,
      currentStep,
      updatedAt: new Date().toISOString(),
    });
    focusHeading("report");
  }

  function answer(choiceId: string) {
    setAnswers((current) => ({ ...current, [question.id]: choiceId }));
  }

  const planPhases = [
      { label: ui("phaseFoundation"), items: report.priorities.filter((item) => item.question.id === "data-quality") },
      { label: ui("phaseConnect"), items: report.priorities.filter((item) => item.question.id !== "data-quality" && !item.question.domains.includes("Automation") && !item.question.recommendation.connectsTo.includes("AI")) },
      { label: ui("phaseAutomate"), items: report.priorities.filter((item) => item.question.domains.includes("Automation") && !item.question.recommendation.connectsTo.includes("AI")) },
      { label: ui("phasePilot"), items: report.priorities.filter((item) => item.question.recommendation.connectsTo.includes("AI")) },
    ].filter((phase) => phase.items.length > 0);

  return (
    <main className="audit-app">
      <a href="#audit-main" className="skip-link">{l === "hy" ? "Անցնել բովանդակությանը" : l === "en" ? "Skip to content" : "Перейти к содержимому"}</a>
      <header className="audit-header">
        <div className="container audit-header-inner">
          <Brand onBack={() => closeAudit()} />
          <div className="audit-product-id"><span>/</span><strong>{ui("title")}</strong><small>{ui("subtitle")}</small></div>
          <nav className="audit-language" aria-label={l === "hy" ? "Լեզու" : l === "en" ? "Language" : "Язык"}>
            {(["hy", "ru", "en"] as const).map((code) => <a key={code} href="#" aria-current={locale === code ? "page" : undefined} onClick={(event) => { event.preventDefault(); setLocale(code); }}>{code.toUpperCase()}</a>)}
          </nav>
          <a href="#home" className="audit-back" onClick={(event) => { event.preventDefault(); closeAudit(); }}><ArrowLeft size={17} />{ui("back")}</a>
        </div>
      </header>

      <section className="container audit-commandbar" aria-label={ui("title")}>
        <div className="audit-mode-group">
          <span>CONTEXT</span>
          <button aria-pressed={profile === "current"} onClick={() => reset("current")}>{ui("current")}</button>
          <button aria-pressed={profile === "demo"} onClick={() => reset("demo")}>{ui("demo")}</button>
        </div>
        <div className="audit-mode-group">
          <span>AUDIENCE</span>
          <button aria-pressed={audience === "internal"} onClick={() => setAudience("internal")}>{ui("internal")}</button>
          <button aria-pressed={audience === "public"} onClick={() => setAudience("public")}>{ui("public")}</button>
        </div>
        <div className="audit-save-state" role="status"><ShieldCheck size={16} />{ui("saved")}</div>
      </section>

      {profile === "demo" && <p className="container audit-demo-notice"><Sparkles size={15} />{ui("demoNotice")}</p>}
      {restored && <div className="container audit-restore" role="status"><span>{ui("restore")}</span><button onClick={() => reset("current")}><RotateCcw size={15} />{ui("reset")}</button></div>}

      {screen === "questions" ? (
        <div className="container audit-layout" id="audit-main">
          <aside className="audit-rail" aria-label={ui("progress")}>
            <div className="audit-rail-top"><span>{ui("progress")}</span><strong>{report.answeredCount}/{auditQuestions.length}</strong></div>
            <div className="audit-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={auditQuestions.length} aria-valuenow={report.answeredCount}><i style={{ width: `${(report.answeredCount / auditQuestions.length) * 100}%` }} /></div>
            <ol>
              {auditQuestions.map((item, index) => {
                const answered = Boolean(answers[item.id]);
                return <li key={item.id}><button onClick={() => goToStep(index)} aria-current={index === currentStep ? "step" : undefined} disabled={!answered && index > currentStep}><span>{answered ? <Check size={13} /> : String(index + 1).padStart(2, "0")}</span><b>{auditText(item.mapLabel, l)}</b></button></li>;
              })}
            </ol>
          </aside>

          <section className="audit-question-panel" aria-labelledby="audit-question-heading">
            <div className="audit-question-meta"><span>{ui("question")} {currentStep + 1} {ui("of")} {auditQuestions.length}</span><span>{question.domains.map((domain) => auditText(auditDomainLabels[domain], l)).join(" · ")}</span></div>
            <h1 id="audit-question-heading" tabIndex={-1} ref={headingRef}>{auditText(question.prompt, l)}</h1>
            <p className="audit-question-hint">{auditText(question.hint, l)}</p>
            <RadioGroup value={selectedId} onValueChange={answer} aria-labelledby="audit-question-heading" className="audit-choice-grid">
              {question.choices.map((item, index) => (
                <label key={item.id} htmlFor={`choice-${question.id}-${item.id}`} className={selectedId === item.id ? "is-selected" : ""}>
                  <span className="audit-choice-index">{String(index + 1).padStart(2, "0")}</span>
                  <RadioGroupItem id={`choice-${question.id}-${item.id}`} value={item.id} />
                  <span>{auditText(item.label, l)}</span>
                  {selectedId === item.id && <Check aria-hidden="true" size={18} />}
                </label>
              ))}
            </RadioGroup>
            <div className="audit-navigation">
              <Button className="button button-outline" disabled={currentStep === 0} onClick={() => goToStep(currentStep - 1)}><ArrowLeft size={17} />{ui("previous")}</Button>
              {currentStep < auditQuestions.length - 1 ? (
                <Button className="button button-primary" disabled={!selectedId} onClick={() => goToStep(currentStep + 1)}>{ui("next")}<ArrowRight size={17} /></Button>
              ) : (
                <Button className="button button-primary" disabled={!report.completed} onClick={showReport}>{ui("showReport")}<ArrowRight size={17} /></Button>
              )}
            </div>
          </section>

          <aside className="audit-live-map" aria-label={ui("map")}>
            <div className="audit-orbit" aria-hidden="true"><OrbitalScene active={Math.max(0, activeVisual)} /></div>
            <div className="audit-live-heading"><span>{ui("map")}</span><small>{ui("live")}</small></div>
            <div className="audit-map-list">
              {report.map.map((item) => (
                <div key={item.question.id} className={item.question.id === question.id ? "is-active" : ""}>
                  <span>{auditText(item.question.mapLabel, l)}</span>
                  {item.state ? <StateBadge state={item.state} locale={l} /> : <span className="audit-unanswered"><CircleDashed size={13} />{ui("unanswered")}</span>}
                </div>
              ))}
            </div>
          </aside>
        </div>
      ) : (
        <section className="container audit-report" id="audit-main" aria-labelledby="audit-report-heading">
          <div className="audit-report-hero">
            <div><span className="eyebrow">HAYDEV / DIAGNOSTIC OUTPUT</span><h1 id="audit-report-heading" ref={reportRef} tabIndex={-1}>{ui("report")}</h1><p>{ui("reportIntro")}</p></div>
            <ScoreRing value={report.overallScore} />
            <p className="audit-score-note">{ui("notEfficiency")}</p>
          </div>

          <div className="audit-report-grid">
            <section className="audit-report-block audit-domain-block" aria-labelledby="domain-scores-heading">
              <div className="audit-block-heading"><span>01</span><h2 id="domain-scores-heading">{ui("scores")}</h2></div>
              <div className="audit-domain-scores">
                {auditDomains.map((domain) => <div key={domain}><span>{auditText(auditDomainLabels[domain], l)}</span><div><i style={{ width: `${report.domainScores[domain]}%` }} /></div><strong>{report.domainScores[domain]}</strong></div>)}
              </div>
            </section>

            <section className="audit-report-block" aria-labelledby="automation-map-heading">
              <div className="audit-block-heading"><span>02</span><h2 id="automation-map-heading">{ui("map")}</h2></div>
              <div className="audit-report-map">
                {report.map.map((item) => <div key={item.question.id}><span>{auditText(item.question.mapLabel, l)}</span>{item.state && <StateBadge state={item.state} locale={l} />}</div>)}
              </div>
            </section>
          </div>

          <section className="audit-report-block audit-priority-block" aria-labelledby="priorities-heading">
            <div className="audit-block-heading"><span>03</span><h2 id="priorities-heading">{ui("priorities")}</h2><p>{ui("noPromise")}</p></div>
            <ol className="audit-priorities">
              {report.priorities.map((item, index) => <li key={item.question.id}>
                <span className="audit-priority-number">{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{auditText(item.question.recommendation.title, l)}</h3><p>{auditText(item.question.recommendation.rationale, l)}</p></div>
                <dl><div><dt>{ui("impact")}</dt><dd>{ui(item.impact)}</dd></div><div><dt>{ui("complexity")}</dt><dd>{complexityLabel(item.complexity)}</dd></div></dl>
                <div className="audit-connections"><span>{ui("connections")}</span>{item.question.recommendation.connectsTo.map((target) => <b key={target}>{target}</b>)}</div>
              </li>)}
            </ol>
          </section>

          <div className="audit-report-footer">
            <p><ShieldCheck size={18} />{ui("caveat")}</p>
            <div><Button className="button button-outline" onClick={() => { setScreen("questions"); focusHeading(); }}><ArrowLeft size={17} />{ui("edit")}</Button>
              {audience === "internal" ? <Button className="button button-primary" onClick={() => setPlanVisible(true)}><Workflow size={18} />{ui("internalCta")}</Button> : <a className="button button-primary" href="#contact" onClick={(event) => { event.preventDefault(); closeAudit("contact"); }}>{ui("publicCta")}<ArrowRight size={17} /></a>}
            </div>
          </div>

          {planVisible && <section className="audit-plan" aria-labelledby="audit-plan-heading"><span className="eyebrow">INTERNAL / NEXT STEP</span><h2 id="audit-plan-heading">{ui("plan")}</h2><p>{ui("planIntro")}</p><div>{planPhases.map((phase) => <article key={phase.label}><span>{phase.label}</span>{phase.items.map((item) => <p key={item.question.id}>{auditText(item.question.recommendation.title, l)}</p>)}</article>)}</div></section>}
        </section>
      )}
    </main>
  );
}
