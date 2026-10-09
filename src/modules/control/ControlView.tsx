"use client";

/**
 * Control — top-level view.
 *
 * Executive command center ABOVE all products. NOT another CRM.
 *
 * Layout:
 *  - Sticky module header: icon + title + subtitle + time-window selector
 *    (Today | 7d | 30d | Quarter | Custom) + refresh.
 *  - Tabs: Snapshot | Needs Attention | Sales | Quotes | Documents |
 *          Automations | ERP/Finance | Integrations | SLA/Operations |
 *          AI Insights.
 *  - Content area renders active tab with framer-motion fade transitions.
 *
 * All KPIs are aggregated from foundation mock data via `adapters.ts`.
 * Every KPI/alert drilldown opens the source module via
 * `useAppStore.setActiveModule`.
 */

import { AnimatePresence,motion } from "framer-motion";
import {
Activity,
AlertTriangle,
Boxes,
Calendar,
FileText,
Gauge,
LayoutDashboard,
Plug,
RefreshCw,
ScanLine,
Sparkles,
TrendingUp,
Workflow,
type LucideIcon,
} from "lucide-react";
import { useCallback,useMemo,useState } from "react";

import {
Tabs,
TabsContent,
TabsList,
TabsTrigger,
} from "@/components/ui/tabs";
import { t as translateText,useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import {
getAiInsights,
getAttentionItems,
getAutomationSummary,
getDocumentSummary,
getExecutiveSnapshot,
getFinanceSummary,
getIntegrationHealth,
getQuoteSummary,
getSalesSummary,
getSlaOperations,
} from "./adapters";
import { WINDOW_OPTIONS,type TimeWindow } from "./types";

import { AiInsightsView } from "./components/AiInsightsView";
import { AutomationsView } from "./components/AutomationsView";
import { DocumentsView } from "./components/DocumentsView";
import { ErpFinanceView } from "./components/ErpFinanceView";
import { ExecutiveSnapshot } from "./components/ExecutiveSnapshot";
import { IntegrationsView } from "./components/IntegrationsView";
import { NeedsAttentionView } from "./components/NeedsAttentionView";
import { OwnerCommandHero } from "./components/OwnerCommandHero";
import { QuotesView } from "./components/QuotesView";
import { SalesView } from "./components/SalesView";
import { SlaOperationsView } from "./components/SlaOperationsView";

type TabId =
  | "snapshot"
  | "attention"
  | "sales"
  | "quotes"
  | "documents"
  | "automations"
  | "erp"
  | "integrations"
  | "sla"
  | "ai";

interface TabDef {
  id: TabId;
  labelKey: string;
  icon: LucideIcon;
}

const TABS: TabDef[] = [
  { id: "snapshot", labelKey: "control.tab.snapshot", icon: LayoutDashboard },
  { id: "attention", labelKey: "control.tab.attention", icon: AlertTriangle },
  { id: "sales", labelKey: "control.tab.sales", icon: TrendingUp },
  { id: "quotes", labelKey: "control.tab.quotes", icon: FileText },
  { id: "documents", labelKey: "control.tab.documents", icon: ScanLine },
  { id: "automations", labelKey: "control.tab.automations", icon: Workflow },
  { id: "erp", labelKey: "control.tab.erp", icon: Boxes },
  { id: "integrations", labelKey: "control.tab.integrations", icon: Plug },
  { id: "sla", labelKey: "control.tab.sla", icon: Activity },
  { id: "ai", labelKey: "control.tab.ai", icon: Sparkles },
];

export function ControlView({ ownerHome = false }: { ownerHome?: boolean }) {
  const { locale, t } = useLocale();
  const translate = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translateText(key, locale, params),
    [locale],
  );
  const [tab, setTab] = useState<TabId>("snapshot");
  const [window, setWindow] = useState<TimeWindow>("30d");
  const [refreshKey, setRefreshKey] = useState(0);

  // Re-compute all summaries when window or refresh key changes.
  const snapshot = useMemo(() => getExecutiveSnapshot(window, translate), [window, refreshKey, translate]);
  const attention = useMemo(() => getAttentionItems(window, translate), [window, refreshKey, translate]);
  const sales = useMemo(() => getSalesSummary(window, translate), [window, refreshKey, translate]);
  const quotes = useMemo(() => getQuoteSummary(window, translate), [window, refreshKey, translate]);
  const documents = useMemo(() => getDocumentSummary(window, translate), [window, refreshKey, translate]);
  const automations = useMemo(() => getAutomationSummary(window, translate), [window, refreshKey, translate]);
  const finance = useMemo(() => getFinanceSummary(window, translate), [window, refreshKey, translate]);
  const integrations = useMemo(() => getIntegrationHealth(window, translate), [window, refreshKey, translate]);
  const sla = useMemo(() => getSlaOperations(window, translate), [window, refreshKey, translate]);
  const ai = useMemo(() => getAiInsights(window, translate), [window, refreshKey, translate]);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8",
        ownerHome && "owner-home-control",
      )}
    >
      {ownerHome ? <OwnerCommandHero modules={snapshot.moduleHealth} /> : null}

      {/* Sticky module header */}
      <header
        className={cn(
          "sticky top-0 z-30 -mx-4 mb-4 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8",
          ownerHome && "border-y",
        )}
      >
        <div className="flex flex-wrap items-center gap-3">
          {!ownerHome ? (
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber/40 bg-amber/10">
                <Gauge className="h-4 w-4 text-amber" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
                  {t("module.control")}
                </h1>
                <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                  {t("control.subtitle")}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t("owner.dashboard.period")}
            </p>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* Time window selector */}
            <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 p-1">
              <Calendar className="ml-1 mr-0.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              <div className="flex items-center gap-0.5">
                {WINDOW_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setWindow(opt.id)}
                    className={cn(
                      "rounded-md px-2 py-1 text-[11px] font-medium transition-colors sm:text-xs",
                      window === opt.id
                        ? "bg-amber/15 text-amber"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                    )}
                    aria-pressed={window === opt.id}
                  >
                    {t(opt.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              aria-label={t("common.refresh")}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("common.refresh")}</span>
            </button>
          </div>
        </div>

        {/* Window summary line */}
        <p className="mt-1.5 text-[10px] text-muted-foreground/70">
          {t("control.window.label")}: <span className="font-medium text-muted-foreground">{t(snapshot.window.labelKey)}</span>
          {" · "}
          {t("control.window.range", {
            days: snapshot.window.days,
          })}
        </p>
      </header>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap gap-1 rounded-xl border border-border/60 bg-card/40 p-1">
          {TABS.map((tabDef) => {
            const Icon = tabDef.icon;
            const count =
              tabDef.id === "attention" ? attention.items.length :
              tabDef.id === "ai" ? ai.insights.length :
              undefined;
            return (
              <TabsTrigger
                key={tabDef.id}
                value={tabDef.id}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium data-[state=active]:bg-amber/15 data-[state=active]:text-amber",
                  "transition-colors",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t(tabDef.labelKey)}</span>
                <span className="sm:hidden">{t(tabDef.labelKey)}</span>
                {count !== undefined && count > 0 ? (
                  <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber/20 px-1 text-[10px] font-semibold text-amber">
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
            <TabsContent value="snapshot" className="mt-0 focus-visible:outline-none">
              <ExecutiveSnapshot snapshot={snapshot} />
            </TabsContent>
            <TabsContent value="attention" className="mt-0 focus-visible:outline-none">
              <NeedsAttentionView items={attention.items} />
            </TabsContent>
            <TabsContent value="sales" className="mt-0 focus-visible:outline-none">
              <SalesView summary={sales} />
            </TabsContent>
            <TabsContent value="quotes" className="mt-0 focus-visible:outline-none">
              <QuotesView summary={quotes} />
            </TabsContent>
            <TabsContent value="documents" className="mt-0 focus-visible:outline-none">
              <DocumentsView summary={documents} />
            </TabsContent>
            <TabsContent value="automations" className="mt-0 focus-visible:outline-none">
              <AutomationsView summary={automations} />
            </TabsContent>
            <TabsContent value="erp" className="mt-0 focus-visible:outline-none">
              <ErpFinanceView summary={finance} />
            </TabsContent>
            <TabsContent value="integrations" className="mt-0 focus-visible:outline-none">
              <IntegrationsView summary={integrations} />
            </TabsContent>
            <TabsContent value="sla" className="mt-0 focus-visible:outline-none">
              <SlaOperationsView summary={sla} />
            </TabsContent>
            <TabsContent value="ai" className="mt-0 focus-visible:outline-none">
              <AiInsightsView insights={ai.insights} />
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}
