"use client";

/**
 * SettingsView — audit engine settings.
 *
 * Surfaces:
 *  - Questionnaire version (read-only — the version is part of the deterministic
 *    contract; bumping it would invalidate historical reports).
 *  - Scoring version (derived: `Q<qversion>:S<algorithm>`).
 *  - Gap threshold / good / needs-work thresholds (local state; not persisted
 *    in this iteration, but the UI is wired so the operator can preview bands).
 *  - Demo data reset (clears the local in-memory answers in the parent).
 *  - Export config (toast — mock).
 */

import { useState } from "react";
import { Settings2, ShieldCheck, Download, RotateCcw, Hash } from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";

import {
  DEFAULT_AUDIT_SETTINGS,
  type AuditSettings,
} from "../types";
import {
  QUESTIONNAIRE_VERSION,
  QUESTIONS_BY_CATEGORY,
  TOTAL_QUESTIONS,
} from "../questionnaire";
import { ALGORITHM_VERSION, SCORE_VERSION } from "../scoring";

interface Props {
  settings: AuditSettings;
  onSettingsChange: (s: AuditSettings) => void;
  onResetDemo: () => void;
}

export function SettingsView({ settings, onSettingsChange, onResetDemo }: Props) {
  const { t } = useLocale();

  const [draft, setDraft] = useState<AuditSettings>(settings);

  function applyDraft() {
    onSettingsChange(draft);
    toast.success(t("audit.settings.saved"));
  }

  function resetDefaults() {
    setDraft(DEFAULT_AUDIT_SETTINGS);
    onSettingsChange(DEFAULT_AUDIT_SETTINGS);
    toast.info(t("audit.settings.reset"));
  }

  function exportConfig() {
    const blob = {
      questionnaireVersion: QUESTIONNAIRE_VERSION,
      algorithmVersion: ALGORITHM_VERSION,
      scoreVersion: SCORE_VERSION,
      settings: draft,
      totalQuestions: TOTAL_QUESTIONS,
      categories: Object.fromEntries(
        Object.entries(QUESTIONS_BY_CATEGORY).map(([k, v]) => [k, v.length]),
      ),
    };
    // Mock — we don't actually persist anywhere in this iteration.
    void blob;
    toast.success(t("audit.settings.exported"));
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-rose" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {t("audit.settings.title")}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {t("audit.settings.sub")}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Versioning */}
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center gap-2">
            <Hash className="h-4 w-4 text-cyan" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("audit.settings.versioning")}
            </h3>
          </header>
          <dl className="space-y-2 text-xs">
            <Row
              label={t("audit.settings.questionnaireVersion")}
              value={QUESTIONNAIRE_VERSION}
              hint={t("audit.settings.questionnaireVersionHint")}
              mono
            />
            <Separator className="my-1" />
            <Row
              label={t("audit.settings.algorithmVersion")}
              value={ALGORITHM_VERSION}
              hint={t("audit.settings.algorithmVersionHint")}
              mono
            />
            <Separator className="my-1" />
            <Row
              label={t("audit.settings.scoreVersion")}
              value={SCORE_VERSION}
              hint={t("audit.settings.scoreVersionHint")}
              mono
              prominent
            />
            <Separator className="my-1" />
            <Row
              label={t("audit.settings.totalQuestions")}
              value={TOTAL_QUESTIONS.toString()}
              hint={Object.entries(QUESTIONS_BY_CATEGORY)
                .map(([k, v]) => `${t(`audit.category.${k}`)}: ${v.length}`)
                .join(" · ")}
            />
          </dl>
          <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-lime/30 bg-lime/10 px-2.5 py-1.5 text-[10px] text-lime">
            <ShieldCheck className="h-3 w-3" />
            {t("audit.settings.immutableNote")}
          </div>
        </section>

        {/* Thresholds */}
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-amber" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("audit.settings.thresholds")}
            </h3>
          </header>

          <div className="space-y-4">
            <ThresholdSlider
              label={t("audit.settings.gapThreshold")}
              hint={t("audit.settings.gapThresholdHint")}
              value={draft.gapThreshold}
              onChange={(v) => setDraft({ ...draft, gapThreshold: v })}
              format={(v) => `${Math.round(v * 100)}%`}
              step={0.05}
            />
            <ThresholdSlider
              label={t("audit.settings.needsWorkThreshold")}
              hint={t("audit.settings.needsWorkThresholdHint")}
              value={draft.needsWorkThreshold}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  needsWorkThreshold: Math.min(v, draft.goodThreshold - 5),
                })
              }
              format={(v) => `${Math.round(v)}`}
              step={5}
              min={0}
              max={100}
            />
            <ThresholdSlider
              label={t("audit.settings.goodThreshold")}
              hint={t("audit.settings.goodThresholdHint")}
              value={draft.goodThreshold}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  goodThreshold: Math.max(v, draft.needsWorkThreshold + 5),
                })
              }
              format={(v) => `${Math.round(v)}`}
              step={5}
              min={0}
              max={100}
            />
          </div>

          {/* Band preview */}
          <div className="mt-4 rounded-lg border border-border/60 bg-card/40 p-3">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
              {t("audit.settings.bandPreview")}
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full">
              <div className="absolute inset-0 flex">
                <div
                  className="bg-rose/60"
                  style={{ width: `${draft.needsWorkThreshold}%` }}
                />
                <div
                  className="bg-amber/60"
                  style={{
                    width: `${draft.goodThreshold - draft.needsWorkThreshold}%`,
                  }}
                />
                <div
                  className="bg-lime/60"
                  style={{ width: `${100 - draft.goodThreshold}%` }}
                />
              </div>
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span className="text-rose">{t("audit.band.weak")}</span>
              <span className="text-amber">{t("audit.band.needsWork")}</span>
              <span className="text-lime">{t("audit.band.good")}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={applyDraft}
              className="h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t("audit.settings.save")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={resetDefaults}
              className="h-8 gap-1.5 border-border/60"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t("audit.settings.reset")}
            </Button>
          </div>
        </section>
      </div>

      {/* Danger zone */}
      <section className="surface-elevated rounded-xl border border-rose/30 bg-rose/5 p-4">
        <header className="mb-3 flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-rose" />
          <h3 className="text-sm font-semibold text-foreground">
            {t("audit.settings.dataManagement")}
          </h3>
        </header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-[11px] text-muted-foreground">
            {t("audit.settings.dataManagementHint")}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={exportConfig}
              className="h-8 gap-1.5 border-border/60"
            >
              <Download className="h-3.5 w-3.5" />
              {t("audit.settings.exportConfig")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                onResetDemo();
                toast.success(t("audit.settings.demoReset"));
              }}
              className={cn(
                "h-8 gap-1.5 border-rose/30 text-rose hover:bg-rose/10",
              )}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t("audit.settings.resetDemo")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  hint,
  mono,
  prominent,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
  prominent?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
          {label}
        </div>
        {hint ? <div className="mt-0.5 text-[10px] text-muted-foreground/80">{hint}</div> : null}
      </div>
      <div
        className={cn(
          "shrink-0 text-xs font-medium",
          mono && "font-mono",
          prominent ? "text-lime" : "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ThresholdSlider({
  label,
  hint,
  value,
  onChange,
  format,
  step = 1,
  min = 0,
  max = 1,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="font-mono text-xs text-lime">{format(value)}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(arr) => onChange(arr[0] ?? value)}
      />
      <p className="mt-1 text-[10px] text-muted-foreground/70">{hint}</p>
    </div>
  );
}
