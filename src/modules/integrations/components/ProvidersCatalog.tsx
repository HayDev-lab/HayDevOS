"use client";

/**
 * ProvidersCatalog — gallery of all available providers.
 *
 * Each card: icon, name, category badge, description, capabilities,
 * auth-type badge, "Connect" button → opens ConnectDialog.
 *
 * Filter by category + free-text search.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Plug, CheckCircle2, ExternalLink } from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Provider, ProviderCategory, AuthType } from "../types";
import {
  ProviderIcon,
  CategoryBadge,
  AuthTypeBadge,
  EmptyState,
} from "../shared";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  providers: Provider[];
  connectedProviderIds: Set<string>;
  onConnect: (provider: Provider) => void;
}

const CATEGORY_FILTERS: ("all" | ProviderCategory)[] = [
  "all",
  "social",
  "messaging",
  "email",
  "webhook",
  "internal",
];

export function ProvidersCatalog({ providers, connectedProviderIds, onConnect }: Props) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | ProviderCategory>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return providers.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.capabilities.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [providers, query, category]);

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {CATEGORY_FILTERS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                category === c
                  ? "border-cyan/40 bg-cyan/10 text-cyan"
                  : "border-border bg-card/40 text-muted-foreground hover:text-foreground",
              )}
            >
              {c === "all" ? t("common.all") : t(`integration.category.${c}`)}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("integration.catalog.search")}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Cards grid */}
      <ScrollArea className="max-h-[680px]">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p, i) => (
            <ProviderCard
              key={p.id}
              provider={p}
              connected={connectedProviderIds.has(p.id)}
              onConnect={() => onConnect(p)}
              index={i}
            />
          ))}
          {filtered.length === 0 && (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyState
                icon={<Plug className="h-5 w-5 text-muted-foreground" />}
                message={t("integration.catalog.empty")}
              />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ProviderCard({
  provider,
  connected,
  onConnect,
  index,
}: {
  provider: Provider;
  connected: boolean;
  onConnect: () => void;
  index: number;
}) {
  const { t } = useLocale();
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: Math.min(index * 0.025, 0.2) }}
    >
      <Card className="surface-elevated h-full py-0">
        <CardContent className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <ProviderIcon provider={provider} size="lg" />
              <div>
                <div className="text-sm font-semibold text-foreground">{provider.name}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1">
                  <CategoryBadge category={provider.category} />
                  <AuthTypeBadge authType={provider.authType} />
                </div>
              </div>
            </div>
            {connected && (
              <span className="inline-flex items-center gap-1 rounded-md border border-lime/30 bg-lime/10 px-1.5 py-0.5 text-[10px] font-medium text-lime">
                <CheckCircle2 className="h-2.5 w-2.5" />
                {t("integration.status.connected")}
              </span>
            )}
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            {provider.description}
          </p>

          <div className="flex flex-wrap gap-1">
            {provider.capabilities.map((cap) => (
              <Badge
                key={cap}
                variant="outline"
                className="border-border bg-background/40 px-1.5 py-0 text-[10px] text-muted-foreground"
              >
                {cap}
              </Badge>
            ))}
          </div>

          {provider.authType === "oauth" && provider.requiredScopes.length > 0 && (
            <div className="rounded-md border border-border bg-background/40 p-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t("integration.connect.scopes")}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {provider.requiredScopes.slice(0, 4).map((s) => (
                  <code
                    key={s}
                    className="font-mono text-[10px] text-cyan"
                  >
                    {s}
                  </code>
                ))}
                {provider.requiredScopes.length > 4 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{provider.requiredScopes.length - 4}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2.5">
            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[11px] text-cyan hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              {t("integration.connect.docs")}
            </a>
            <Button
              size="sm"
              onClick={onConnect}
              disabled={connected}
              className="gap-1.5"
            >
              <Plug className="h-3.5 w-3.5" />
              {connected
                ? t("integration.catalog.connected")
                : t("integration.catalog.connect")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default ProvidersCatalog;
