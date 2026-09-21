"use client";

/**
 * QuoteFlow — main module view.
 *
 * Tabs: Requests | Quotes | Builder | Catalog | Approvals | Analytics | Settings
 * The Catalog tab is itself a Tabs group with Catalog | Price Books | Pricing Rules | Templates.
 *
 * QuoteBuilder is rendered with a `key` derived from the builder seed so the
 * builder fully remounts whenever the user clicks "Create quote from request"
 * or "New quote" — this lets the builder seed its initial state via lazy
 * `useState(() => deriveInitialState(seed))` instead of a useEffect sync.
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText } from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { RequestsView } from "./components/RequestsView";
import { QuotesView } from "./components/QuotesView";
import { QuoteBuilder } from "./components/QuoteBuilder";
import { CatalogView } from "./components/CatalogView";
import { ApprovalsView } from "./components/ApprovalsView";
import { AnalyticsView } from "./components/AnalyticsView";
import { SettingsView } from "./components/SettingsView";

import { mockQuoteRequests } from "./data";

type QuoteFlowTab =
  | "requests"
  | "quotes"
  | "builder"
  | "catalog"
  | "approvals"
  | "analytics"
  | "settings";

const TABS: { id: QuoteFlowTab; key: string }[] = [
  { id: "requests", key: "quoteflow.tab.requests" },
  { id: "quotes", key: "quoteflow.tab.quotes" },
  { id: "builder", key: "quoteflow.tab.builder" },
  { id: "catalog", key: "quoteflow.tab.catalog" },
  { id: "approvals", key: "quoteflow.tab.approvals" },
  { id: "analytics", key: "quoteflow.tab.analytics" },
  { id: "settings", key: "quoteflow.tab.settings" },
];

export interface QuoteFlowViewProps {
  /** Optional initial tab (used by external triggers, e.g. dashboard quick-action). */
  initialTab?: QuoteFlowTab;
  /** Optional initial quote id to open in the builder (e.g. from a request). */
  initialQuoteId?: string;
}

export function QuoteFlowView(props: QuoteFlowViewProps) {
  const { t } = useLocale();
  const [tab, setTab] = useState<QuoteFlowTab>(props.initialTab ?? "quotes");
  // Builder payload — when the user clicks "Create quote from request" or "New quote",
  // we stash a payload and switch to the builder tab.
  const [builderSeed, setBuilderSeed] = useState<{
    requestId?: string;
    leadId?: string;
    customerId?: string;
    products?: { productId: string; qty: number }[];
    budget?: number;
  } | null>(null);

  const openBuilder = useCallback(
    (seed?: {
      requestId?: string;
      leadId?: string;
      customerId?: string;
      products?: { productId: string; qty: number }[];
      budget?: number;
    }) => {
      setBuilderSeed(seed ?? null);
      setTab("builder");
      // Fire the "prefilled" toast here (the builder itself is effect-free).
      if (seed?.requestId) {
        const req = mockQuoteRequests.find((r) => r.id === seed.requestId);
        if (req) {
          toast.info(`${t("quoteflow.requests.newQuote")} — ${req.company}`);
        }
      }
    },
    [t],
  );

  // Stable key forces QuoteBuilder to remount whenever the seed changes,
  // so it can seed its initial state from props without an effect.
  const builderKey = builderSeed
    ? `bld_${builderSeed.requestId ?? "new"}_${builderSeed.leadId ?? ""}_${builderSeed.customerId ?? ""}`
    : "bld_empty";

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan/10 text-cyan ring-1 ring-cyan/30">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {t("quoteflow.title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("quoteflow.subtitle")}</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav
        role="tablist"
        aria-label="QuoteFlow sections"
        className="mb-6 flex flex-wrap gap-1 rounded-xl bg-card p-1 ring-1 ring-border"
      >
        {TABS.map((tabDef) => {
          const active = tab === tabDef.id;
          return (
            <button
              key={tabDef.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(tabDef.id)}
              className={cn(
                "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="quoteflow-tab-pill"
                  className="absolute inset-0 rounded-lg bg-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{t(tabDef.key)}</span>
            </button>
          );
        })}
      </nav>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {tab === "requests" && <RequestsView onCreateQuote={openBuilder} />}
          {tab === "quotes" && <QuotesView onOpenBuilder={openBuilder} />}
          {tab === "builder" && <QuoteBuilder key={builderKey} seed={builderSeed} />}
          {tab === "catalog" && <CatalogView />}
          {tab === "approvals" && <ApprovalsView />}
          {tab === "analytics" && <AnalyticsView />}
          {tab === "settings" && <SettingsView />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default QuoteFlowView;
