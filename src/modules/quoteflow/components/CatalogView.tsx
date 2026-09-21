"use client";

/**
 * CatalogView — top-level Catalog tab.
 * Internally a Tabs group: Catalog | Price Books | Pricing Rules | Templates.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Boxes, BookOpen, ShieldCheck, LayoutTemplate } from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { CatalogProducts } from "./CatalogProducts";
import { PriceBooksView } from "./PriceBooksView";
import { PricingRulesView } from "./PricingRulesView";
import { TemplatesView } from "./TemplatesView";

type SubTab = "products" | "pricebooks" | "rules" | "templates";

const SUBTABS: { id: SubTab; key: string; icon: typeof Boxes }[] = [
  { id: "products", key: "quoteflow.tab.catalog", icon: Boxes },
  { id: "pricebooks", key: "quoteflow.tab.pricebooks", icon: BookOpen },
  { id: "rules", key: "quoteflow.tab.rules", icon: ShieldCheck },
  { id: "templates", key: "quoteflow.tab.templates", icon: LayoutTemplate },
];

export function CatalogView() {
  const { t } = useLocale();
  const [sub, setSub] = useState<SubTab>("products");

  return (
    <div className="space-y-4">
      <nav
        aria-label="Catalog sections"
        className="flex flex-wrap gap-1 rounded-xl bg-card p-1 ring-1 ring-border"
      >
        {SUBTABS.map((s) => {
          const Icon = s.icon;
          const active = sub === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSub(s.id)}
              className={cn(
                "relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="quoteflow-catalog-pill"
                  className="absolute inset-0 rounded-lg bg-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className="relative z-10 h-3.5 w-3.5" />
              <span className="relative z-10">{t(s.key)}</span>
            </button>
          );
        })}
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={sub}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16 }}
        >
          {sub === "products" && <CatalogProducts />}
          {sub === "pricebooks" && <PriceBooksView />}
          {sub === "rules" && <PricingRulesView />}
          {sub === "templates" && <TemplatesView />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
