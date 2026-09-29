"use client";

/**
 * QuestionnaireView — interactive audit flow.
 *
 * Layout:
 *  - Top: questionnaire version, progress bar, reset and submit actions.
 *  - Left: category sidebar (6 categories) with per-category progress.
 *  - Right: the active category's questions, each rendered by `QuestionCard`
 *    according to its `type`:
 *      - scale  → 5-point slider with low/high anchors
 *      - yesno  → two-button toggle (Yes / No)
 *      - single → radio cards
 *      - multi  → chip toggles
 *    Each card also exposes a free-text evidence/notes field.
 *
 * All visible strings flow through `t()` for chrome and `pickL10n()` for
 * question text/options. Switching locale in the shell instantly re-renders
 * every question.
 *
 * State is held in the parent `BusinessAuditView` (so the Report tab can reuse
 * the live answers without a re-fetch). This view is purely presentational
 * over the `answers` prop and `onAnswer` callback.
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  TrendingUp,
  Settings2,
  Database,
  Workflow,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Play,
  Save,
  FileCheck2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  CATEGORY_LIST,
  pickL10n,
  type Answer,
  type AnswerMap,
  type CategoryId,
  type Question,
  type QuestionOption,
} from "../types";
import {
  QUESTIONS_BY_CATEGORY,
  QUESTION_BY_ID,
  QUESTIONNAIRE_VERSION,
} from "../questionnaire";
import { categoryProgress, totalProgress } from "../scoring";

const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  acquisition: Target,
  sales: TrendingUp,
  operations: Settings2,
  data: Database,
  automation: Workflow,
  ai_readiness: BrainCircuit,
};

const CATEGORY_ACCENT: Record<CategoryId, string> = {
  acquisition: "var(--accent-lime)",
  sales: "var(--accent-cyan)",
  operations: "var(--accent-amber)",
  data: "var(--accent-violet)",
  automation: "var(--accent-rose)",
  ai_readiness: "var(--accent-lime)",
};

interface Props {
  answers: AnswerMap;
  onAnswer: (questionId: string, value: number | boolean | string | string[], evidence?: string) => void;
  onReset: () => void;
  onSubmit: () => void;
  /** When true, the submit button uses the "primary" emphasis. */
  canSubmit: boolean;
}

export function QuestionnaireView({
  answers,
  onAnswer,
  onReset,
  onSubmit,
  canSubmit,
}: Props) {
  const { t, locale } = useLocale();
  const [activeCategory, setActiveCategory] = useState<CategoryId>("acquisition");

  const progress = useMemo(() => totalProgress(answers), [answers]);
  const perCat = useMemo(
    () =>
      CATEGORY_LIST.map((c) => ({
        cat: c,
        p: categoryProgress(c.id, answers),
      })),
    [answers],
  );

  const questions = QUESTIONS_BY_CATEGORY[activeCategory];

  function clearAll() {
    onReset();
    toast.info(t("audit.toast.cleared"));
  }

  return (
    <div className="space-y-4">
      {/* Header strip: version + progress + actions */}
      <section className="surface-elevated rounded-xl border border-border/60 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[11px] text-muted-foreground">
            <span className="font-mono">{t("audit.questionnaire.version")}: {QUESTIONNAIRE_VERSION}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={clearAll}
              className="h-8 gap-1.5 border-border/60 text-muted-foreground hover:text-foreground"
            >
              {t("common.reset")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onSubmit}
              disabled={!canSubmit}
              className="h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              {t("audit.action.submit")}
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">{t("audit.progress.label")}</span>
              <span className="font-medium text-foreground">
                {progress.answered} / {progress.total}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress.fraction * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
          {canSubmit ? (
            <span className="hidden items-center gap-1 text-[11px] text-lime sm:flex">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("audit.progress.ready")}
            </span>
          ) : (
            <span className="hidden text-[11px] text-muted-foreground sm:block">
              {t("audit.progress.notReady")}
            </span>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        {/* Category sidebar */}
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <nav className="surface-elevated rounded-xl border border-border/60 p-2">
            <ul className="space-y-1">
              {perCat.map(({ cat, p }) => {
                const Icon = CATEGORY_ICONS[cat.id];
                const isActive = activeCategory === cat.id;
                const isComplete = p.answered === p.total;
                return (
                  <li key={cat.id}>
                    <button
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn(
                        "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                        isActive
                          ? "bg-muted/60 text-foreground"
                          : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-md border"
                        style={{
                          borderColor: isActive ? CATEGORY_ACCENT[cat.id] : "var(--border)",
                          background: isActive
                            ? `color-mix(in srgb, ${CATEGORY_ACCENT[cat.id]} 12%, transparent)`
                            : "transparent",
                        }}
                      >
                        <Icon
                          className="h-3.5 w-3.5"
                          style={{
                            color: isActive ? CATEGORY_ACCENT[cat.id] : "currentColor",
                          }}
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-medium">
                            {t(cat.nameKey)}
                          </span>
                          {isComplete ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-lime" />
                          ) : null}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${p.fraction * 100}%`,
                                background: CATEGORY_ACCENT[cat.id],
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground/80">
                            {p.answered}/{p.total}
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Active category questions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">
                {t(CATEGORY_LIST.find((c) => c.id === activeCategory)!.nameKey)}
              </h2>
              <span className="text-[11px] text-muted-foreground">
                {t(CATEGORY_LIST.find((c) => c.id === activeCategory)!.descKey)}
              </span>
            </div>
            <CategoryNav
              activeCategory={activeCategory}
              onChange={setActiveCategory}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {questions.map((q, idx) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={idx + 1}
                  answer={answers[q.id]}
                  onAnswer={(value, evidence) => onAnswer(q.id, value, evidence)}
                />
              ))}
            </motion.div>
          </AnimatePresence>

          {/* Footer nav */}
          <div className="flex items-center justify-between gap-2 pt-2">
            <CategoryNav activeCategory={activeCategory} onChange={setActiveCategory} />
            <Button
              type="button"
              size="sm"
              onClick={onSubmit}
              disabled={!canSubmit}
              className="h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Save className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("audit.action.saveContinue")}</span>
              <span className="sm:hidden">{t("audit.action.submit")}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category nav (prev/next)
// ─────────────────────────────────────────────────────────────────────────────

function CategoryNav({
  activeCategory,
  onChange,
}: {
  activeCategory: CategoryId;
  onChange: (id: CategoryId) => void;
}) {
  const { t } = useLocale();
  const idx = CATEGORY_LIST.findIndex((c) => c.id === activeCategory);
  const prev = idx > 0 ? CATEGORY_LIST[idx - 1] : null;
  const next = idx < CATEGORY_LIST.length - 1 ? CATEGORY_LIST[idx + 1] : null;
  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={!prev}
        onClick={() => prev && onChange(prev.id)}
        className="h-8 gap-1 px-2 text-muted-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        <span className="hidden text-xs sm:inline">{t("common.previous")}</span>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={!next}
        onClick={() => next && onChange(next.id)}
        className="h-8 gap-1 px-2 text-muted-foreground"
      >
        <span className="hidden text-xs sm:inline">{t("common.next")}</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QuestionCard — renders by question type
// ─────────────────────────────────────────────────────────────────────────────

function QuestionCard({
  question,
  index,
  answer,
  onAnswer,
}: {
  question: Question;
  index: number;
  answer: Answer | undefined;
  onAnswer: (value: number | boolean | string | string[], evidence?: string) => void;
}) {
  const { t, locale } = useLocale();
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const hasEvidence = Boolean(answer?.evidence);

  const accent = CATEGORY_ACCENT[question.category];

  return (
    <article className="surface-elevated rounded-xl border border-border/60 p-4 transition-colors hover:border-border">
      <header className="mb-3 flex items-start gap-3">
        <span
          className="mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-md border px-1.5 font-mono text-[10px] font-medium"
          style={{
            borderColor: `color-mix(in srgb, ${accent} 35%, transparent)`,
            color: accent,
            background: `color-mix(in srgb, ${accent} 10%, transparent)`,
          }}
        >
          {question.ref}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-foreground">
            <span className="mr-1.5 text-muted-foreground/60">{index}.</span>
            {pickL10n(question.text, locale)}
          </h3>
          {question.hint ? (
            <p className="mt-1 text-[11px] text-muted-foreground/80">
              {pickL10n(question.hint, locale)}
            </p>
          ) : null}
        </div>
      </header>

      {/* Type-specific answer control */}
      <div className="pl-9">
        <QuestionControl
          question={question}
          answer={answer}
          onAnswer={onAnswer}
        />
      </div>

      {/* Evidence */}
      <div className="mt-3 pl-9">
        <button
          type="button"
          onClick={() => setEvidenceOpen((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1 text-[11px] transition-colors",
            hasEvidence
              ? "text-lime hover:text-lime/80"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: hasEvidence ? accent : "var(--muted-foreground)" }} />
          {hasEvidence
            ? t("audit.question.evidence.edit")
            : t("audit.question.evidence.add")}
        </button>
        <AnimatePresence initial={false}>
          {evidenceOpen || hasEvidence ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                {pickL10n(question.evidencePrompt, locale)}
              </p>
              <Textarea
                value={answer?.evidence ?? ""}
                onChange={(e) =>
                  onAnswer(
                    answer?.value ?? defaultForType(question),
                    e.target.value || undefined,
                  )
                }
                placeholder={t("audit.question.evidence.placeholder")}
                rows={2}
                className="mt-1 resize-y text-xs"
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </article>
  );
}

function defaultForType(q: Question): number | boolean | string | string[] {
  switch (q.type) {
    case "scale":
      return 3;
    case "yesno":
      return false;
    case "single":
      return q.options[0]?.id ?? "";
    case "multi":
      return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// QuestionControl — type-specific control
// ─────────────────────────────────────────────────────────────────────────────

function QuestionControl({
  question,
  answer,
  onAnswer,
}: {
  question: Question;
  answer: Answer | undefined;
  onAnswer: (value: number | boolean | string | string[], evidence?: string) => void;
}) {
  const { t, locale } = useLocale();

  switch (question.type) {
    case "scale":
      return (
        <ScaleControl
          question={question}
          value={(answer?.value as number | undefined) ?? undefined}
          onChange={(v) => onAnswer(v, answer?.evidence)}
          locale={locale}
          t={t}
        />
      );
    case "yesno":
      return (
        <YesNoControl
          question={question}
          value={answer?.value as boolean | string | undefined}
          onChange={(v) => onAnswer(v, answer?.evidence)}
          locale={locale}
        />
      );
    case "single":
      return (
        <SingleControl
          question={question}
          value={answer?.value as string | undefined}
          onChange={(v) => onAnswer(v, answer?.evidence)}
          locale={locale}
        />
      );
    case "multi":
      return (
        <MultiControl
          question={question}
          value={(answer?.value as string[] | undefined) ?? []}
          onChange={(v) => onAnswer(v, answer?.evidence)}
          locale={locale}
        />
      );
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ScaleControl
// ─────────────────────────────────────────────────────────────────────────────

function ScaleControl({
  question,
  value,
  onChange,
  locale,
  t,
}: {
  question: Question;
  value: number | undefined;
  onChange: (v: number) => void;
  locale: ReturnType<typeof useLocale>["locale"];
  t: ReturnType<typeof useLocale>["t"];
}) {
  const v = value ?? 0;
  const anchors = question.scaleLabels;
  return (
    <div className="pt-1">
      <div className="mb-2 flex items-center gap-3">
        <span className="text-2xl font-semibold tabular-nums text-foreground">
          {value ? v : "—"}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {t("audit.question.scale.range")}
        </span>
      </div>
      <Slider
        value={value ? [v] : [3]}
        min={1}
        max={5}
        step={1}
        onValueChange={(arr) => onChange(arr[0] ?? 3)}
        className="py-2"
      />
      {anchors ? (
        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground/80">
          <span>1 · {pickL10n(anchors.low, locale)}</span>
          <span>{pickL10n(anchors.high, locale)} · 5</span>
        </div>
      ) : (
        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground/80">
          <span>1</span>
          <span>5</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// YesNoControl
// ─────────────────────────────────────────────────────────────────────────────

function YesNoControl({
  question,
  value,
  onChange,
  locale,
}: {
  question: Question;
  value: boolean | string | undefined;
  onChange: (v: boolean) => void;
  locale: ReturnType<typeof useLocale>["locale"];
}) {
  const boolVal =
    value === undefined ? undefined : value === true || value === "yes";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {question.options.map((opt) => {
        const isYes = opt.id === "yes";
        const active = boolVal === isYes;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(isYes)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              active
                ? isYes
                  ? "border-lime/40 bg-lime/10 text-lime"
                  : "border-rose/40 bg-rose/10 text-rose"
                : "border-border/60 bg-card/40 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
            aria-pressed={active}
          >
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full border",
                active
                  ? isYes
                    ? "border-lime bg-lime/20"
                    : "border-rose bg-rose/20"
                  : "border-border",
              )}
            >
              {active ? (
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isYes ? "bg-lime" : "bg-rose",
                  )}
                />
              ) : null}
            </span>
            {pickL10n(opt.label, locale)}
          </button>
        );
      })}
      {boolVal === undefined ? (
        <span className="ml-2 text-[11px] text-muted-foreground/70">
          {/* not yet answered */}
        </span>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SingleControl (radio cards)
// ─────────────────────────────────────────────────────────────────────────────

function SingleControl({
  question,
  value,
  onChange,
  locale,
}: {
  question: Question;
  value: string | undefined;
  onChange: (v: string) => void;
  locale: ReturnType<typeof useLocale>["locale"];
}) {
  return (
    <div role="radiogroup" className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {question.options.map((opt) => {
        const active = value === opt.id;
        const tone = toneForValue(opt.value);
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              "group flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
              active
                ? "border-primary/40 bg-primary/10 text-foreground"
                : "border-border/60 bg-card/40 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full border",
                active ? "border-primary" : "border-border",
              )}
            >
              {active ? <span className="h-1.5 w-1.5 rounded-full bg-primary" /> : null}
            </span>
            <span className="flex-1 text-sm">{pickL10n(opt.label, locale)}</span>
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                tone,
              )}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MultiControl (chip toggles)
// ─────────────────────────────────────────────────────────────────────────────

function MultiControl({
  question,
  value,
  onChange,
  locale,
}: {
  question: Question;
  value: string[];
  onChange: (v: string[]) => void;
  locale: ReturnType<typeof useLocale>["locale"];
}) {
  const selected = new Set(value);
  function toggle(opt: QuestionOption) {
    const next = new Set(selected);
    if (next.has(opt.id)) next.delete(opt.id);
    else next.add(opt.id);
    onChange(Array.from(next));
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {question.options.map((opt) => {
        const active = selected.has(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggle(opt)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/60 bg-card/40 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
            aria-pressed={active}
          >
            <span
              className={cn(
                "flex h-3.5 w-3.5 items-center justify-center rounded-full border",
                active ? "border-primary bg-primary/20" : "border-border",
              )}
            >
              {active ? (
                <CheckCircle2 className="h-2.5 w-2.5 text-primary" />
              ) : null}
            </span>
            {pickL10n(opt.label, locale)}
          </button>
        );
      })}
      {selected.size > 0 ? (
        <span className="ml-1 self-center text-[10px] text-muted-foreground/70">
          {selected.size} / {question.options.length}
        </span>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tone helpers
// ─────────────────────────────────────────────────────────────────────────────

function toneForValue(v: number): string {
  if (v >= 0.75) return "bg-lime";
  if (v >= 0.5) return "bg-cyan";
  if (v >= 0.25) return "bg-amber";
  return "bg-rose";
}

// Re-export for the parent view.
export { QUESTION_BY_ID };
