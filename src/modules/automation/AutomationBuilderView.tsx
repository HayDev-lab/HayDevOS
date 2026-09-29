"use client";

/**
 * AutomationBuilderView — top-level view for the Autopilot module.
 * Tabs: Automations | Builder | Templates | Executions | Failed Jobs |
 *       Approvals | Schedules | Webhooks | Variables | Workers | Analytics |
 *       Settings.
 *
 * Holds the in-memory state of automations + the currently-edited automation
 * id so the list view and the visual builder stay in sync.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Workflow, ShieldCheck, Activity, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import {
  automations as seedAutomations,
  automationRuns,
  approvals as seedApprovals,
  schedules as seedSchedules,
  webhookEndpoints,
  automationVariables as seedVariables,
  workers,
  engineSettings,
  automationTemplates,
} from "./data";
import type {
  Automation,
  AutomationTemplate,
  Approval,
} from "./types";
import {
  localizeApproval,
  localizeAutomation,
  localizeAutomationRun,
  localizeAutomationTemplate,
  localizeSchedule,
  localizeWebhook,
} from "./localization";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import { AutomationsListView } from "./components/AutomationsListView";
import { VisualBuilder } from "./components/VisualBuilder";
import { TemplatesView } from "./components/TemplatesView";
import { ExecutionsView } from "./components/ExecutionsView";
import { FailedJobsView } from "./components/FailedJobsView";
import { ApprovalsView } from "./components/ApprovalsView";
import { SchedulesView } from "./components/SchedulesView";
import { WebhooksView } from "./components/WebhooksView";
import { VariablesView } from "./components/VariablesView";
import { WorkersView } from "./components/WorkersView";
import { AnalyticsView } from "./components/AnalyticsView";
import { SettingsView } from "./components/SettingsView";

type TabId =
  | "automations"
  | "builder"
  | "templates"
  | "executions"
  | "failed"
  | "approvals"
  | "schedules"
  | "webhooks"
  | "variables"
  | "workers"
  | "analytics"
  | "settings";

export function AutomationBuilderView() {
  const { t, locale } = useLocale();
  const [tab, setTab] = useState<TabId>("automations");

  // Shared in-memory state — the list view mutates this; the builder reads it.
  const [automations, setAutomations] = useState<Automation[]>(seedAutomations);
  const [editingId, setEditingId] = useState<string | null>(seedAutomations[0]?.id ?? null);
  const [approvals, setApprovals] = useState<Approval[]>(seedApprovals);
  const [schedules, setSchedules] = useState(seedSchedules);
  const [variables, setVariables] = useState(seedVariables);

  const localizedAutomations = useMemo(
    () => automations.map((item) => localizeAutomation(item, locale)),
    [automations, locale],
  );
  const localizedRuns = useMemo(
    () => automationRuns.map((item) => localizeAutomationRun(item, locale)),
    [locale],
  );
  const localizedApprovals = useMemo(
    () => approvals.map((item) => localizeApproval(item, locale)),
    [approvals, locale],
  );
  const localizedSchedules = useMemo(
    () => schedules.map((item) => localizeSchedule(item, locale)),
    [schedules, locale],
  );
  const localizedTemplates = useMemo(
    () => automationTemplates.map((item) => localizeAutomationTemplate(item, locale)),
    [locale],
  );
  const localizedWebhooks = useMemo(
    () => webhookEndpoints.map((item) => localizeWebhook(item, locale)),
    [locale],
  );

  const editing = useMemo(
    () => localizedAutomations.find((a) => a.id === editingId) ?? null,
    [localizedAutomations, editingId],
  );

  const pendingApprovals = approvals.filter((a) => a.status === "pending").length;
  const failedRuns = automationRuns.filter((r) => r.status === "failed").length;
  const activeAutomations = automations.filter((a) => a.status === "active").length;

  function startNewAutomation() {
    const id = `au_new_${Date.now()}`;
    const blank: Automation = {
      id,
      orgId: "org_haydev",
      name: t("automation.new"),
      description: "",
      trigger: { type: "lead_created", config: {} },
      conditions: [],
      actions: [],
      status: "draft",
      version: 1,
      maxDepth: 3,
      dedupKey: "event:{event.id}",
      reentryPolicy: "block",
      runs: { total: 0, success: 0, failed: 0, lastRunAt: null },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAutomations((prev) => [blank, ...prev]);
    setEditingId(id);
    setTab("builder");
  }

  function openInBuilder(id: string) {
    setEditingId(id);
    setTab("builder");
  }

  function useTemplate(tpl: AutomationTemplate) {
    const id = `au_tpl_${Date.now()}`;
    const newAuto: Automation = {
      id,
      orgId: "org_haydev",
      name: tpl.name,
      description: tpl.description,
      trigger: { ...tpl.trigger, config: { ...tpl.trigger.config } },
      conditions: tpl.conditions.map((c, i) => ({ ...c, id: `c_${i}_${Date.now()}` })),
      actions: tpl.actions.map((a, i) => ({
        ...a,
        id: `a_${i}_${Date.now()}`,
        config: { ...a.config },
      })),
      status: "draft",
      version: 1,
      maxDepth: 3,
      dedupKey: "event:{event.id}",
      reentryPolicy: "block",
      runs: { total: 0, success: 0, failed: 0, lastRunAt: null },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAutomations((prev) => [newAuto, ...prev]);
    setEditingId(id);
    setTab("builder");
    toast.success(t("automation.templates.installed"));
  }

  function patchAutomation(id: string, patch: Partial<Automation>) {
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a)),
    );
  }

  function toggleAutomationStatus(id: string) {
    setAutomations((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const next = a.status === "active" ? "paused" : "active";
        return { ...a, status: next, updatedAt: new Date().toISOString() };
      }),
    );
  }

  function decideApproval(id: string, decision: "approved" | "rejected") {
    setApprovals((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: decision,
              decidedBy: "Aram Hayrapetyan",
              decidedAt: new Date().toISOString(),
            }
          : a,
      ),
    );
    toast.success(
      decision === "approved"
        ? t("automation.approvals.approved")
        : t("automation.approvals.rejected"),
    );
  }

  function retryRun(id: string) {
    toast.success(t("automation.failed.retried"));
    void id;
  }
  function cancelRun(id: string) {
    toast.success(t("automation.failed.cancelled"));
    void id;
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mb-5 flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet/10 text-violet glow-lime">
                <Workflow className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {t("automation.title")}
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t("automation.subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <HeaderStat
              icon={<Activity className="h-3.5 w-3.5" />}
              tone="lime"
              label={t("automation.status.active")}
              value={activeAutomations}
            />
            <HeaderStat
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              tone="amber"
              label={t("automation.tab.approvals")}
              value={pendingApprovals}
            />
            <HeaderStat
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              tone="rose"
              label={t("automation.tab.failed")}
              value={failedRuns}
            />
            <HeaderStat
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
              tone="cyan"
              label={t("automation.tab.workers")}
              value={workers.filter((w) => w.status === "online").length}
            />
          </div>
        </div>
      </motion.div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="gap-4">
        <TabsList className="glass flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl p-1">
          <TabsTrigger value="automations">{t("automation.tab.automations")}</TabsTrigger>
          <TabsTrigger value="builder">{t("automation.tab.builder")}</TabsTrigger>
          <TabsTrigger value="templates">{t("automation.tab.templates")}</TabsTrigger>
          <TabsTrigger value="executions">{t("automation.tab.executions")}</TabsTrigger>
          <TabsTrigger value="failed" className="gap-1.5">
            {t("automation.tab.failed")}
            {failedRuns > 0 && (
              <Badge className="ml-1 h-4 min-w-4 px-1 text-[10px] bg-rose/15 text-rose border-rose/30">
                {failedRuns}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approvals" className="gap-1.5">
            {t("automation.tab.approvals")}
            {pendingApprovals > 0 && (
              <Badge className="ml-1 h-4 min-w-4 px-1 text-[10px] bg-amber/15 text-amber border-amber/30">
                {pendingApprovals}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="schedules">{t("automation.tab.schedules")}</TabsTrigger>
          <TabsTrigger value="webhooks">{t("automation.tab.webhooks")}</TabsTrigger>
          <TabsTrigger value="variables">{t("automation.tab.variables")}</TabsTrigger>
          <TabsTrigger value="workers">{t("automation.tab.workers")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("automation.tab.analytics")}</TabsTrigger>
          <TabsTrigger value="settings">{t("automation.tab.settings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="automations" className="mt-0">
          <AutomationsListView
            automations={localizedAutomations}
            onNew={startNewAutomation}
            onEdit={openInBuilder}
            onToggle={toggleAutomationStatus}
          />
        </TabsContent>
        <TabsContent value="builder" className="mt-0">
          {editing ? (
            <VisualBuilder
              key={`${editing.id}:${locale}`}
              automation={editing}
              onPatch={(patch) => patchAutomation(editing.id, patch)}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
              {t("automation.empty")}
            </div>
          )}
        </TabsContent>
        <TabsContent value="templates" className="mt-0">
          <TemplatesView templates={localizedTemplates} onUse={useTemplate} />
        </TabsContent>
        <TabsContent value="executions" className="mt-0">
          <ExecutionsView runs={localizedRuns} />
        </TabsContent>
        <TabsContent value="failed" className="mt-0">
          <FailedJobsView
            runs={localizedRuns.filter((r) => r.status === "failed")}
            onRetry={retryRun}
            onCancel={cancelRun}
          />
        </TabsContent>
        <TabsContent value="approvals" className="mt-0">
          <ApprovalsView approvals={localizedApprovals} onDecide={decideApproval} />
        </TabsContent>
        <TabsContent value="schedules" className="mt-0">
          <SchedulesView
            schedules={localizedSchedules}
            onUpdate={(next) =>
              setSchedules((current) =>
                current.map((item) => ({
                  ...item,
                  status: next.find((candidate) => candidate.id === item.id)?.status ?? item.status,
                })),
              )
            }
          />
        </TabsContent>
        <TabsContent value="webhooks" className="mt-0">
          <WebhooksView endpoints={localizedWebhooks} />
        </TabsContent>
        <TabsContent value="variables" className="mt-0">
          <VariablesView variables={variables} onChange={setVariables} />
        </TabsContent>
        <TabsContent value="workers" className="mt-0">
          <WorkersView workers={workers} />
        </TabsContent>
        <TabsContent value="analytics" className="mt-0">
          <AnalyticsView runs={localizedRuns} />
        </TabsContent>
        <TabsContent value="settings" className="mt-0">
          <SettingsView initial={engineSettings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HeaderStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "lime" | "amber" | "rose" | "cyan";
}) {
  const toneCls = {
    lime: "border-lime/30 bg-lime/10 text-lime",
    amber: "border-amber/30 bg-amber/10 text-amber",
    rose: "border-rose/30 bg-rose/10 text-rose",
    cyan: "border-cyan/30 bg-cyan/10 text-cyan",
  }[tone];
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${toneCls}`}
    >
      {icon}
      <span className="font-medium text-foreground">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

export default AutomationBuilderView;
