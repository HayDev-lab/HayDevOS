"use client";

import { useWorkspaceSection } from "@/lib/workspace-navigation";

/**
 * BusinessAuditView — top-level view for the Audit module.
 *
 * Tabs: Questionnaire | Report | History | Compare | Automation Map |
 *       Recommendations | Settings.
 *
 * Holds the live in-memory `answers` state so the Questionnaire and Report
 * tabs stay in sync. A "fresh" report is computed deterministically from the
 * answers whenever the user submits the questionnaire; historical reports are
 * loaded from `data.ts` via the History/Compare tabs.
 *
 * The active report (the one shown on the Report / Automation Map /
 * Recommendations tabs) defaults to the latest historical run, then switches
 * to the freshly-computed one once the user submits a new audit.
 */

import { AnimatePresence,motion } from "framer-motion";
import {
ClipboardCheck,
FileCheck2,
GitCompare,
History,
Lightbulb,
Map as MapIcon,
Settings2,
type LucideIcon,
} from "lucide-react";
import { useMemo,useState } from "react";

import {
Tabs,
TabsContent,
TabsList,
TabsTrigger,
} from "@/components/core/WorkspacePages";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { HISTORY_RUNS,freshReport,getRun } from "./data";
import { TOTAL_QUESTIONS } from "./questionnaire";
import { computeScores } from "./scoring";
import {
DEFAULT_AUDIT_SETTINGS,
type AnswerMap,
type AuditReport,
type AuditSettings,
} from "./types";

import { AutomationMapView } from "./components/AutomationMapView";
import { CompareView } from "./components/CompareView";
import { HistoryView } from "./components/HistoryView";
import { QuestionnaireView } from "./components/QuestionnaireView";
import { RecommendationsView } from "./components/RecommendationsView";
import { ReportView } from "./components/ReportView";
import { SettingsView } from "./components/SettingsView";
import { DeterministicBadge } from "./components/shared";

type TabId =
  | "questionnaire"
  | "report"
  | "history"
  | "compare"
  | "automation"
  | "recommendations"
  | "settings";

interface TabDef {
  id: TabId;
  labelKey: string;
  icon: LucideIcon;
}

const TABS: TabDef[] = [
  { id: "questionnaire", labelKey: "audit.tab.questionnaire", icon: ClipboardCheck },
  { id: "report", labelKey: "audit.tab.report", icon: FileCheck2 },
  { id: "history", labelKey: "audit.tab.history", icon: History },
  { id: "compare", labelKey: "audit.tab.compare", icon: GitCompare },
  { id: "automation", labelKey: "audit.tab.automation", icon: MapIcon },
  { id: "recommendations", labelKey: "audit.tab.recommendations", icon: Lightbulb },
  { id: "settings", labelKey: "audit.tab.settings", icon: Settings2 },
];

export function BusinessAuditView() {
  const { t } = useLocale();
  const [tab, setTab] = useWorkspaceSection<TabId>("audit", "questionnaire");
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [activeReport, setActiveReport] = useState<AuditReport | null>(null);
  const [settings, setSettings] = useState<AuditSettings>(DEFAULT_AUDIT_SETTINGS);

  const progress = useMemo(() => {
    const answered = Object.keys(answers).length;
    const total = TOTAL_QUESTIONS;
    const fraction = total > 0 ? answered / total : 0;
    return { answered, total, fraction };
  }, [answers]);

  const canSubmit = progress.answered >= 8; // require at least a partial

  function handleAnswer(
    questionId: string,
    value: number | boolean | string | string[],
    evidence?: string,
  ) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { questionId, value, evidence },
    }));
  }

  function handleReset() {
    setAnswers({});
  }

  function handleSubmit() {
    // Compute the deterministic report from the live answers. If too few
    // answers are present, we still compute — `computeScores` handles missing
    // answers gracefully (treats them as zero contribution).
    const report = freshReport(answers, "current");
    setActiveReport(report);
    setTab("report");
  }

  function handleSelectHistoryRun(id: string) {
    const run = getRun(id);
    if (run) {
      setActiveReport(run);
      setTab("report");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Module header stays in the document flow so it never covers content. */}
      <header className="mb-4 rounded-xl border border-border/60 bg-card/40 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose/40 bg-rose/10">
              <ClipboardCheck className="h-4 w-4 text-rose" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
                {t("module.audit")}
              </h1>
              <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                {t("audit.subtitle")}
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <DeterministicBadge />
            <span className="hidden text-[11px] text-muted-foreground sm:block">
              {t("audit.history.runs")}: <span className="font-mono">{HISTORY_RUNS.length}</span>
            </span>
          </div>
        </div>
      </header>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as TabId)}
        className="space-y-4"
      >
        <TabsList className="flex h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto rounded-xl border border-border/60 bg-card/40 p-1 [scrollbar-width:thin]">
          {TABS.map((tabDef) => {
            const Icon = tabDef.icon;
            const count =
              tabDef.id === "history" ? HISTORY_RUNS.length : undefined;
            return (
              <TabsTrigger
                key={tabDef.id}
                value={tabDef.id}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium data-[state=active]:bg-rose/15 data-[state=active]:text-rose",
                  "transition-colors",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t(tabDef.labelKey)}</span>
                <span className="sm:hidden">{t(tabDef.labelKey)}</span>
                {count !== undefined ? (
                  <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose/20 px-1 text-[10px] font-semibold text-rose">
                    {count}
                  </span>
                ) : null}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.18 }}
          >
            <TabsContent value="questionnaire" className="mt-0 focus-visible:outline-none">
              <QuestionnaireView
                answers={answers}
                onAnswer={handleAnswer}
                onReset={handleReset}
                onSubmit={handleSubmit}
                canSubmit={canSubmit}
              />
            </TabsContent>
            <TabsContent value="report" className="mt-0 focus-visible:outline-none">
              {activeReport ? (
                <ReportView
                  report={activeReport}
                  onOpenCompare={() => setTab("compare")}
                />
              ) : (
                <EmptyReport onStart={() => setTab("questionnaire")} />
              )}
            </TabsContent>
            <TabsContent value="history" className="mt-0 focus-visible:outline-none">
              <HistoryView
                onSelect={handleSelectHistoryRun}
                onStartNew={() => setTab("questionnaire")}
              />
            </TabsContent>
            <TabsContent value="compare" className="mt-0 focus-visible:outline-none">
              <CompareView />
            </TabsContent>
            <TabsContent value="automation" className="mt-0 focus-visible:outline-none">
              {activeReport ? (
                <AutomationMapView report={activeReport} />
              ) : (
                <EmptyReport onStart={() => setTab("questionnaire")} />
              )}
            </TabsContent>
            <TabsContent value="recommendations" className="mt-0 focus-visible:outline-none">
              {activeReport ? (
                <RecommendationsView report={activeReport} />
              ) : (
                <EmptyReport onStart={() => setTab("questionnaire")} />
              )}
            </TabsContent>
            <TabsContent value="settings" className="mt-0 focus-visible:outline-none">
              <SettingsView
                settings={settings}
                onSettingsChange={setSettings}
              />
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}

function EmptyReport({ onStart }: { onStart: () => void }) {
  const { t } = useLocale();
  return (
    <div className="surface-elevated flex flex-col items-center justify-center rounded-xl border border-border/60 p-10 text-center">
      <ClipboardCheck className="h-8 w-8 text-rose/60" />
      <h3 className="mt-3 text-sm font-semibold text-foreground">
        {t("audit.empty.title")}
      </h3>
      <p className="mt-1 max-w-md text-xs text-muted-foreground">
        {t("audit.empty.body")}
      </p>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onStart}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t("audit.action.startNew")}
        </button>
      </div>
    </div>
  );
}

// Re-export computeScores so Owner AI can call into the
// deterministic engine to explain a historical score without re-running it.
export { computeScores };
