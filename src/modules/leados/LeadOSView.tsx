"use client";

import Link from "next/link";
import { workspaceHref } from "@/lib/workspace-routes";

import { useWorkspaceSection } from "@/lib/workspace-navigation";

import { localizeError } from "@/lib/i18n-errors";

/**
 * LeadOS — main module view.
 *
 * Layout:
 *  - Module header (icon + title + subtitle)
 *  - Tabs nav: Dashboard | Leads | Pipeline | Tasks | Sources | Analytics | Team | Settings
 *  - Secondary toolbar (New Lead button → Dialog, search input, export button)
 *  - Content area renders active tab with framer-motion transitions
 *
 * The LeadDetail Sheet is owned here so any tab that selects a lead (e.g. the
 * leads table) can open it.
 */

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Plus,
  Search,
  Download,
  LayoutDashboard,
  Table2,
  KanbanSquare,
  CheckSquare,
  PieChart,
  BarChart3,
  Users,
  Settings,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { fetchWithSession } from "@/lib/auth/client-session";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { asLeadRecord, LEAD_STAGES, LEAD_SOURCES, STAGE_BY_ID, type LeadRecord, type LeadSource, type LeadStage } from "./data";
import { LeadOSDataProvider, useLeadOSData } from "./LeadOSData";
import { LeadsDashboard } from "./components/LeadsDashboard";
import { LeadsTable } from "./components/LeadsTable";
import { PipelineKanban } from "./components/PipelineKanban";
import { LeadDetail } from "./components/LeadDetail";
import { TasksView } from "./components/TasksView";
import { SourcesView } from "./components/SourcesView";
import { AnalyticsView } from "./components/AnalyticsView";
import { TeamView } from "./components/TeamView";
import { SettingsView } from "./components/SettingsView";
import type { LucideIcon } from "lucide-react";

type TabId =
  | "dashboard"
  | "leads"
  | "pipeline"
  | "tasks"
  | "sources"
  | "analytics"
  | "team"
  | "settings";

interface TabDef {
  id: TabId;
  labelKey: string;
  icon: LucideIcon;
}

const TABS: TabDef[] = [
  { id: "dashboard", labelKey: "leados.tabs.dashboard", icon: LayoutDashboard },
  { id: "leads", labelKey: "leados.tabs.leads", icon: Table2 },
  { id: "pipeline", labelKey: "leados.tabs.pipeline", icon: KanbanSquare },
  { id: "tasks", labelKey: "leados.tabs.tasks", icon: CheckSquare },
  { id: "sources", labelKey: "leados.tabs.sources", icon: PieChart },
  { id: "analytics", labelKey: "leados.tabs.analytics", icon: BarChart3 },
  { id: "team", labelKey: "leados.tabs.team", icon: Users },
  { id: "settings", labelKey: "leados.tabs.settings", icon: Settings },
];

export function LeadOSView() {
  const { session } = useAuth();
  return (
    <LeadOSDataProvider key={session.activeOrganization.id}>
      <LeadOSContent />
    </LeadOSDataProvider>
  );
}

function LeadOSContent() {
  const { t } = useLocale();
  const { overview, loading, error, refresh, createLead, changeStage } = useLeadOSData();
  const [tab] = useWorkspaceSection<TabId>("leados", "dashboard");
  const [search, setSearch] = useState("");
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // New lead form state
  const [formName, setFormName] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formValue, setFormValue] = useState("");
  const [formStage, setFormStage] = useState<LeadStage>("new");
  const [formSource, setFormSource] = useState<LeadSource>("web");

  const onSelectLead = useCallback((lead: LeadRecord) => {
    setSelectedLead(lead);
    setDetailOpen(true);
  }, []);

  const onStageChange = useCallback(
    async (leadId: string, newStage: LeadStage) => {
      const updated = await changeStage(leadId, { stage: newStage });
      setSelectedLead((prev) => prev && prev.id === leadId ? asLeadRecord(updated) : prev);
    },
    [changeStage],
  );

  async function submitNewLead() {
    if (!formName.trim()) {
      toast.error(t("common.empty"));
      return;
    }
    try {
      await createLead({
        name: formName,
        company: formCompany || null,
        email: formEmail || null,
        source: formSource,
        stage: formStage,
        value: formValue || "0",
        currency: "USD",
      });
      toast.success(t("leados.toast.leadCreated"));
      setNewLeadOpen(false);
      setFormName("");
      setFormCompany("");
      setFormEmail("");
      setFormValue("");
      setFormStage("new");
      setFormSource("web");
    } catch (cause) {
      toast.error(cause instanceof Error ? localizeError(cause) : t("leados.runtime.createFailed"));
    }
  }

  async function exportLeads() {
    if (exporting) return;
    setExporting(true);
    try {
      const createJob = await fetchWithSession("/api/leados/export", {
        method: "POST",
        cache: "no-store",
      });
      if (!createJob.ok) throw new Error(t("leados.runtime.exportFailedStatus", { status: createJob.status }));
      const created = await createJob.json() as {
        mode?: "legacy";
        job?: { id: string };
        dispatch?: { url: string; token: string };
      };

      // Compatibility path stays available until the Edge function is
      // deployed and SUPABASE_EDGE_EXPORT_URL is configured server-side.
      if (created.mode === "legacy" || !created.job || !created.dispatch) {
        const response = await fetchWithSession("/api/leados/export", { cache: "no-store" });
        if (!response.ok) throw new Error(t("leados.runtime.exportFailedStatus", { status: response.status }));
        const url = URL.createObjectURL(await response.blob());
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `leados-${new Date().toISOString().slice(0, 10)}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
        toast.success(t("leados.toast.exported", { n: overview?.dashboard.totalLeads ?? 0 }));
        return;
      }

      toast.success(t("leados.toast.exportQueued", { n: overview?.dashboard.totalLeads ?? 0 }));
      const dispatch = await fetch(created.dispatch.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: created.job.id, token: created.dispatch.token }),
      });
      if (!dispatch.ok) throw new Error(t("leados.runtime.exportFailedStatus", { status: dispatch.status }));

      for (let attempt = 0; attempt < 80; attempt += 1) {
        if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 750));
        const statusResponse = await fetchWithSession(`/api/leados/export/${encodeURIComponent(created.job.id)}`, { cache: "no-store" });
        if (!statusResponse.ok) throw new Error(t("leados.runtime.exportFailedStatus", { status: statusResponse.status }));
        const statusPayload = await statusResponse.json() as {
          job: { status: string; rowCount?: number | null; errorCode?: string | null };
          download?: { url: string };
        };
        if (statusPayload.job.status === "SUCCEEDED" && statusPayload.download?.url) {
          const fileResponse = await fetch(statusPayload.download.url);
          if (!fileResponse.ok) throw new Error(t("leados.runtime.exportFailedStatus", { status: fileResponse.status }));
          const url = URL.createObjectURL(await fileResponse.blob());
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = `leados-${new Date().toISOString().slice(0, 10)}.csv`;
          anchor.click();
          URL.revokeObjectURL(url);
          toast.success(t("leados.toast.exported", { n: statusPayload.job.rowCount ?? overview?.dashboard.totalLeads ?? 0 }));
          return;
        }
        if (["FAILED", "EXPIRED"].includes(statusPayload.job.status)) {
          throw new Error(t("leados.runtime.exportFailed"));
        }
      }
      throw new Error(t("leados.runtime.exportFailed"));
    } catch (cause) {
      toast.error(cause instanceof Error ? localizeError(cause) : t("leados.runtime.exportFailed"));
    } finally {
      setExporting(false);
    }
  }

  if (loading && !overview) return <div className="p-8 text-sm text-muted-foreground">{t("leados.runtime.loading")}</div>;
  if (error || !overview) return <div className="p-8 text-sm text-destructive">{error ? localizeError(error) : t("leados.runtime.unavailable")} <Button variant="outline" size="sm" onClick={() => void refresh()}>{t("common.retry")}</Button></div>;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Module header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mb-5 flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-lime ring-1 ring-primary/20">
              <Target className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {t("leados.title")}
              </h1>
              <p className="text-xs text-muted-foreground">{t("leados.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" />
            {t("leados.runtime.leadStageSummary", { leads: overview.dashboard.totalLeads, stages: overview.pipelines.flatMap((pipeline) => pipeline.stages).length })}
          </div>
        </div>
      </motion.div>

      {/* Tabs nav */}
      <nav className="mb-4 border-b border-border pb-px">
        <div className="flex flex-wrap items-center gap-1">
          {TABS.map((tabDef) => {
            const Icon = tabDef.icon;
            const isActive = tab === tabDef.id;
            return (
              <Link
                key={tabDef.id}
                href={workspaceHref("leados", tabDef.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", isActive && "text-lime")} />
                <span className="whitespace-nowrap">{t(tabDef.labelKey)}</span>
                {isActive && (
                  <motion.span
                    layoutId="leados-tab-indicator"
                    className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Secondary toolbar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("leados.search.placeholder")}
            className="pl-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label={t("common.close")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={exporting} onClick={() => void exportLeads()}>
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{t("leados.actions.export")}</span>
          </Button>
          <Button size="sm" onClick={() => setNewLeadOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            {t("leados.actions.newLead")}
          </Button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {tab === "dashboard" && <LeadsDashboard />}
          {tab === "leads" && <LeadsTable key={search} onSelectLead={onSelectLead} externalQuery={search} />}
          {tab === "pipeline" && <PipelineKanban onStageChange={onStageChange} />}
          {tab === "tasks" && <TasksView />}
          {tab === "sources" && <SourcesView />}
          {tab === "analytics" && <AnalyticsView />}
          {tab === "team" && <TeamView />}
          {tab === "settings" && <SettingsView />}
        </motion.div>
      </AnimatePresence>

      {/* New Lead Dialog */}
      <Dialog open={newLeadOpen} onOpenChange={setNewLeadOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("leados.actions.newLead")}</DialogTitle>
            <DialogDescription>{t("leados.subtitle")}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nl-name">{t("leados.table.name")}</Label>
              <Input
                id="nl-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("leados.runtime.exampleName")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nl-company">{t("leados.table.company")}</Label>
              <Input
                id="nl-company"
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
                placeholder={t("leados.runtime.exampleCompany")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nl-email">{t("leados.detail.email")}</Label>
              <Input
                id="nl-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="anna@acme.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nl-value">{t("leados.table.value")} (USD)</Label>
              <Input
                id="nl-value"
                type="number"
                min={0}
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                placeholder="25000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nl-stage">{t("leados.table.stage")}</Label>
              <Select value={formStage} onValueChange={(v) => setFormStage(v as LeadStage)}>
                <SelectTrigger id="nl-stage" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STAGES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {t(STAGE_BY_ID[s.id].labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nl-source">{t("leados.table.source")}</Label>
              <Select value={formSource} onValueChange={(v) => setFormSource(v as LeadSource)}>
                <SelectTrigger id="nl-source" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {t(s.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewLeadOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => void submitNewLead()}>
              <Plus className="h-3.5 w-3.5" />
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead detail Sheet */}
      <LeadDetail
        lead={selectedLead}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onStageChange={onStageChange}
      />
    </div>
  );
}

export default LeadOSView;
