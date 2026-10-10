"use client";

/**
 * ReportView — full audit report.
 *
 * Sections:
 *  1. Hero — overall score gauge + score-version badge + Deterministic pill +
 *     PDF/DOCX/Share actions.
 *  2. Category score cards (6) — each with a mini radial + bar + answered/total.
 *  3. Gaps — list of answered questions below threshold, with evidence +
 *     impact badge + related-module pill.
 *  4. Automation opportunities — current vs target maturity, qualitative impact.
 *  5. Recommended HayDev modules — clickable cards that drill into the module.
 *  6. Answer evidence table — ref + question + answer + evidence.
 *
 * No fake ROI — only qualitative impact (high/medium/low).
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  FileType2,
  Share2,
  ArrowRight,
  AlertTriangle,
  Zap,
  Lightbulb,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { useAppStore } from "@/lib/store/app-store";
import { cn, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  CATEGORY_BY_ID,
  pickL10n,
  type AuditReport,
  type CategoryId,
  type Question,
} from "../types";
import { QUESTION_BY_ID } from "../questionnaire";
import { auditModuleNameKey } from "../scoring";
import { BusinessContextSummary } from "./BusinessContextPanel";
import {
  ScoreGauge,
  MiniScoreGauge,
  ScoreBar,
  ScoreBadge,
  ImpactBadge,
  MaturityBadge,
  DeterministicBadge,
  TONE_COLOR,
} from "./shared";

interface Props {
  report: AuditReport;
  /** Allow the parent to switch to the Compare tab after generating. */
  onOpenCompare?: () => void;
}

export function ReportView({ report, onOpenCompare }: Props) {
  const { t, locale } = useLocale();
  const setActiveModule = useAppStore((s) => s.setActiveModule);

  const evidence = useMemo(() => {
    const rows: Array<{
      ref: string;
      categoryId: CategoryId;
      question: string;
      answerLabel: string;
      evidence?: string;
    }> = [];
    for (const cs of report.categories) {
      for (const qid of Object.keys(report.answers)) {
        const q = QUESTION_BY_ID[qid];
        if (!q || q.category !== cs.categoryId) continue;
        const a = report.answers[qid];
        rows.push({
          ref: q.ref,
          categoryId: q.category,
          question: pickL10n(q.text, locale),
          answerLabel: describeAnswer(q, a, locale),
          evidence: a.evidence,
        });
      }
    }
    return rows.sort((a, b) => a.ref.localeCompare(b.ref));
  }, [report, locale]);

  function generatePdf() {
    toast.success(t("audit.toast.pdfGenerated"), {
      description: `${t("audit.report.scoreVersion")}: ${report.scoreVersion}`,
    });
  }
  function generateDocx() {
    toast.success(t("audit.toast.docxGenerated"), {
      description: `${t("audit.report.scoreVersion")}: ${report.scoreVersion}`,
    });
  }
  function share() {
    toast.info(t("audit.toast.shareLink"));
  }

  return (
    <div className="space-y-4">
      {/* Hero — overall gauge */}
      <section className="surface-elevated overflow-hidden rounded-xl border border-border/60">
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-[auto_1fr] sm:p-6">
          <div className="flex flex-col items-center justify-center gap-2">
            <ScoreGauge
              score={report.overall}
              size={200}
              label={t("audit.report.overall")}
              sublabel={t("audit.report.overallSub")}
            />
            <ScoreBadge score={report.overall} />
          </div>
          <div className="flex flex-col justify-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">
                {t("audit.report.title")}
              </h2>
              <DeterministicBadge />
              {report.mode === "demo" ? (
                <span className="rounded-full border border-cyan/30 bg-cyan/10 px-2 py-0.5 text-[10px] font-medium text-cyan">
                  {t("audit.mode.demo")}
                </span>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3">
              <Meta
                label={t("audit.report.runId")}
                value={report.id}
                mono
              />
              <Meta
                label={t("audit.report.createdAt")}
                value={formatDateTime(report.createdAt, locale)}
              />
              <Meta
                label={t("audit.report.questionnaireVersion")}
                value={report.questionnaireVersion}
                mono
              />
              <Meta
                label={t("audit.report.scoreVersion")}
                value={report.scoreVersion}
                mono
              />
              <Meta
                label={t("audit.report.mode")}
                value={report.mode === "demo" ? t("audit.mode.demo") : t("audit.mode.current")}
              />
              <Meta
                label={t("audit.report.gaps")}
                value={`${report.gaps.length} / ${evidence.length}`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                onClick={generatePdf}
                className="h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <FileText className="h-3.5 w-3.5" />
                {t("audit.report.generatePdf")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={generateDocx}
                className="h-8 gap-1.5 border-border/60"
              >
                <FileType2 className="h-3.5 w-3.5" />
                {t("audit.report.generateDocx")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={share}
                className="h-8 gap-1.5 border-border/60"
              >
                <Share2 className="h-3.5 w-3.5" />
                {t("common.export")}
              </Button>
              {onOpenCompare ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onOpenCompare}
                  className="h-8 gap-1 text-muted-foreground"
                >
                  {t("audit.action.compare")}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
            <p className="text-[11px] text-muted-foreground/70">
              {t("audit.report.immutableNote")}
            </p>
          </div>
        </div>
      </section>

      {report.businessContext && <BusinessContextSummary context={report.businessContext} />}

      {/* Category score cards */}
      <section>
        <SectionTitle
          icon={<Zap className="h-3.5 w-3.5" />}
          title={t("audit.report.categoryScores")}
          sub={t("audit.report.categoryScoresSub")}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {report.categories.map((cs) => {
            const cat = CATEGORY_BY_ID[cs.categoryId];
            return (
              <motion.div
                key={cs.categoryId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="surface-elevated rounded-xl border border-border/60 p-4"
              >
                <div className="flex items-start gap-3">
                  <MiniScoreGauge score={cs.score} size={84} />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-foreground">
                      {t(cat.nameKey)}
                    </h4>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {t(cat.descKey)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <ScoreBadge score={cs.score} showLabel={false} />
                      <span className="text-[10px] text-muted-foreground/80">
                        {cs.answered}/{cs.total} {t("audit.report.answered")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <ScoreBar score={cs.score} showThresholds />
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Gaps + Opportunities */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Gaps */}
        <section>
          <SectionTitle
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            title={t("audit.report.gaps")}
            sub={t("audit.report.gapsSub")}
            count={report.gaps.length}
          />
          <ScrollArea className="h-96 rounded-xl border border-border/60 bg-card/40">
            <ul className="divide-y divide-border/40">
              {report.gaps.length === 0 ? (
                <li className="p-4 text-xs text-muted-foreground">
                  {t("audit.report.gapsEmpty")}
                </li>
              ) : (
                report.gaps.map((g) => {
                  const cat = CATEGORY_BY_ID[g.categoryId];
                  return (
                    <li key={g.questionId} className="p-3">
                      <div className="flex items-start gap-2">
                        <span
                          className="mt-0.5 inline-flex h-5 min-w-12 items-center justify-center rounded border px-1 font-mono text-[10px] font-medium"
                          style={{
                            borderColor: `color-mix(in srgb, ${TONE_COLOR[cat.accent]} 30%, transparent)`,
                            color: TONE_COLOR[cat.accent],
                            background: `color-mix(in srgb, ${TONE_COLOR[cat.accent]} 10%, transparent)`,
                          }}
                        >
                          {g.ref}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <ImpactBadge impact={g.impact} />
                            {g.relatedModule ? (
                              <button
                                type="button"
                                onClick={() => setActiveModule(g.relatedModule!)}
                                className="text-[10px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                              >
                                {t(auditModuleNameKey(g.relatedModule))}
                              </button>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-foreground">
                            {pickL10n(g.questionText, locale)}
                          </p>
                          {g.evidence ? (
                            <p className="mt-1 rounded-md border border-border/40 bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground">
                              {g.evidence}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </ScrollArea>
        </section>

        {/* Automation opportunities */}
        <section>
          <SectionTitle
            icon={<Lightbulb className="h-3.5 w-3.5" />}
            title={t("audit.report.opportunities")}
            sub={t("audit.report.opportunitiesSub")}
            count={report.opportunities.length}
          />
          <ScrollArea className="h-96 rounded-xl border border-border/60 bg-card/40">
            <ul className="divide-y divide-border/40">
              {report.opportunities.length === 0 ? (
                <li className="p-4 text-xs text-muted-foreground">
                  {t("audit.report.opportunitiesEmpty")}
                </li>
              ) : (
                report.opportunities.map((op) => (
                  <li key={op.id} className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-medium text-foreground">
                            {pickL10n(op.processLabel, locale)}
                          </span>
                          <ImpactBadge impact={op.impact} />
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {pickL10n(op.rationale, locale)}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <MaturityBadge maturity={op.current} />
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <MaturityBadge maturity={op.target} />
                          {op.relatedModule ? (
                            <button
                              type="button"
                              onClick={() => setActiveModule(op.relatedModule!)}
                              className="ml-auto inline-flex items-center gap-1 text-[10px] text-cyan hover:text-cyan/80"
                            >
                              {t(auditModuleNameKey(op.relatedModule))}
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </ScrollArea>
        </section>
      </div>

      {/* Recommended HayDev modules */}
      <section>
        <SectionTitle
          icon={<ArrowRight className="h-3.5 w-3.5" />}
          title={t("audit.report.recommendedModules")}
          sub={t("audit.report.recommendedModulesSub")}
          count={report.recommendedModules.length}
        />
        {report.recommendedModules.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-xs text-muted-foreground">
            {t("audit.report.recommendedModulesEmpty")}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {report.recommendedModules.map((rm) => (
              <button
                key={rm.moduleId}
                type="button"
                onClick={() => setActiveModule(rm.moduleId)}
                className="group surface-elevated rounded-xl border border-border/60 p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    {t(rm.nameKey)}
                  </h4>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {pickL10n(rm.rationale, locale)}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <ImpactBadge impact={rm.impact} />
                  <span className="text-[10px] text-muted-foreground/80">
                    {rm.evidenceCount} {t("audit.report.evidenceCount")}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Answer evidence table */}
      <section>
        <SectionTitle
          icon={<FileText className="h-3.5 w-3.5" />}
          title={t("audit.report.evidenceTable")}
          sub={t("audit.report.evidenceTableSub")}
          count={evidence.length}
        />
        <div className="overflow-hidden rounded-xl border border-border/60">
          <ScrollArea className="h-96">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className="w-16 text-[11px]">{t("audit.report.reference")}</TableHead>
                  <TableHead className="text-[11px]">{t("audit.report.colQuestion")}</TableHead>
                  <TableHead className="text-[11px]">{t("audit.report.colAnswer")}</TableHead>
                  <TableHead className="text-[11px]">{t("audit.report.colEvidence")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evidence.map((row) => {
                  const cat = CATEGORY_BY_ID[row.categoryId];
                  return (
                    <TableRow key={row.ref}>
                      <TableCell className="font-mono text-[10px]" style={{ color: TONE_COLOR[cat.accent] }}>
                        {row.ref}
                      </TableCell>
                      <TableCell className="max-w-xs text-xs text-foreground">
                        <span className="line-clamp-2">{row.question}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.answerLabel}
                      </TableCell>
                      <TableCell className="max-w-xs text-xs text-muted-foreground">
                        {row.evidence ? (
                          <span className="line-clamp-2">{row.evidence}</span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
        {label}
      </div>
      <div
        className={cn(
          "truncate text-xs font-medium text-foreground",
          mono && "font-mono",
        )}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  sub,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  count?: number;
}) {
  return (
    <div className="mb-2 flex items-end justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {sub ? <p className="text-[11px] text-muted-foreground/80">{sub}</p> : null}
        </div>
      </div>
      {count !== undefined ? (
        <span className="rounded-full border border-border/60 bg-card/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {count}
        </span>
      ) : null}
    </div>
  );
}

function describeAnswer(
  q: Question,
  a: { value: number | boolean | string | string[] } | undefined,
  locale: "hy" | "ru" | "en",
): string {
  if (!a) return "—";
  switch (q.type) {
    case "scale": {
      const v = a.value as number;
      return `${v}/5`;
    }
    case "yesno": {
      const v = a.value;
      const id = v === true || v === "yes" ? "yes" : "no";
      const opt = q.options.find((o) => o.id === id);
      return opt ? pickL10n(opt.label, locale) : String(v);
    }
    case "single": {
      const opt = q.options.find((o) => o.id === a.value);
      return opt ? pickL10n(opt.label, locale) : "—";
    }
    case "multi": {
      const ids = a.value as string[];
      if (!Array.isArray(ids) || ids.length === 0) return "—";
      const labels = ids
        .map((id) => q.options.find((o) => o.id === id))
        .filter(Boolean)
        .map((o) => pickL10n(o!.label, locale));
      return labels.join(", ");
    }
    default:
      return "—";
  }
}
