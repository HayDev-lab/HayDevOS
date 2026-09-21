"use client";

/**
 * ConnectedView — table of connected integrations.
 *
 * Columns: provider (icon+name+label), status, auth type, last sync,
 * capabilities in use, health score. Row click → IntegrationDetail drawer.
 * Row actions: Test, Sync, Refresh Auth, Disconnect.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Zap,
  RefreshCw,
  RotateCw,
  Unplug,
  ChevronRight,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn, relativeTime } from "@/lib/utils";
import type { Integration, Provider } from "../types";
import {
  StatusBadge,
  AuthTypeBadge,
  ProviderIcon,
  HealthDot,
  EmptyState,
} from "../shared";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  integrations: Integration[];
  providers: Provider[];
  onSelect: (integration: Integration) => void;
  onTest: (integration: Integration) => void;
  onSync: (integration: Integration) => void;
  onRefreshAuth: (integration: Integration) => void;
  onDisconnect: (integration: Integration) => void;
}

export function ConnectedView({
  integrations,
  providers,
  onSelect,
  onTest,
  onSync,
  onRefreshAuth,
  onDisconnect,
}: Props) {
  const { t, locale } = useLocale();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const providerById = useMemo(() => {
    const map = new Map<string, Provider>();
    providers.forEach((p) => map.set(p.id, p));
    return map;
  }, [providers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return integrations.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (!q) return true;
      const prov = providerById.get(i.providerId);
      return (
        i.label.toLowerCase().includes(q) ||
        (prov?.name.toLowerCase().includes(q) ?? false) ||
        i.capabilitiesInUse.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [integrations, query, statusFilter, providerById]);

  function handleAction(
    action: () => void,
    msg: string,
  ) {
    action();
    toast.success(msg);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[170px] text-xs">
              <SelectValue placeholder={t("integration.connected.filterStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              <SelectItem value="connected">{t("integration.status.connected")}</SelectItem>
              <SelectItem value="degraded">{t("integration.status.degraded")}</SelectItem>
              <SelectItem value="reauth_required">{t("integration.status.reauth_required")}</SelectItem>
              <SelectItem value="error">{t("integration.status.error")}</SelectItem>
              <SelectItem value="disconnected">{t("integration.status.disconnected")}</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-[11px] text-muted-foreground">
            {filtered.length} / {integrations.length} {t("integration.connected.count")}
          </div>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("integration.connected.search")}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <Card className="surface-elevated overflow-hidden py-0">
        <ScrollArea className="max-h-[680px]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("integration.connected.col.provider")}
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("integration.connected.col.status")}
                </TableHead>
                <TableHead className="hidden text-[10px] uppercase tracking-wider text-muted-foreground md:table-cell">
                  {t("integration.connected.col.authType")}
                </TableHead>
                <TableHead className="hidden text-[10px] uppercase tracking-wider text-muted-foreground lg:table-cell">
                  {t("integration.connected.col.capabilities")}
                </TableHead>
                <TableHead className="hidden text-[10px] uppercase tracking-wider text-muted-foreground sm:table-cell">
                  {t("integration.connected.col.lastSync")}
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("integration.connected.col.health")}
                </TableHead>
                <TableHead className="w-10 text-right text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("common.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((integration, i) => {
                const prov = providerById.get(integration.providerId);
                return (
                  <motion.tr
                    key={integration.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15, delay: Math.min(i * 0.02, 0.15) }}
                    onClick={() => onSelect(integration)}
                    className="cursor-pointer border-border transition-colors hover:bg-primary/5"
                  >
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2.5">
                        {prov && <ProviderIcon provider={prov} size="sm" />}
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-foreground">
                            {prov?.name ?? integration.providerId}
                          </div>
                          <div className="truncate text-[10px] text-muted-foreground">
                            {integration.label}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <StatusBadge status={integration.status} />
                    </TableCell>
                    <TableCell className="hidden py-3 md:table-cell">
                      <AuthTypeBadge authType={integration.authType} />
                    </TableCell>
                    <TableCell className="hidden py-3 lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {integration.capabilitiesInUse.slice(0, 2).map((c) => (
                          <Badge
                            key={c}
                            variant="outline"
                            className="border-border bg-background/40 px-1.5 py-0 text-[10px] text-muted-foreground"
                          >
                            {c}
                          </Badge>
                        ))}
                        {integration.capabilitiesInUse.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{integration.capabilitiesInUse.length - 2}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden py-3 text-[11px] text-muted-foreground sm:table-cell">
                      {integration.lastSyncAt ? relativeTime(integration.lastSyncAt, locale) : "—"}
                    </TableCell>
                    <TableCell className="py-3">
                      <HealthDot score={integration.healthScore} />
                    </TableCell>
                    <TableCell className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 text-xs">
                          <DropdownMenuItem
                            onClick={() => handleAction(() => onTest(integration), t("integration.connected.testToast"))}
                          >
                            <Zap className="h-3.5 w-3.5 text-cyan" />
                            {t("integration.connected.test")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleAction(() => onSync(integration), t("integration.connected.syncToast"))}
                          >
                            <RefreshCw className="h-3.5 w-3.5 text-lime" />
                            {t("integration.connected.sync")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleAction(() => onRefreshAuth(integration), t("integration.connected.refreshToast"))}
                          >
                            <RotateCw className="h-3.5 w-3.5 text-amber" />
                            {t("integration.connected.refresh")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-rose focus:text-rose"
                            onClick={() => handleAction(() => onDisconnect(integration), t("integration.connected.disconnectToast"))}
                          >
                            <Unplug className="h-3.5 w-3.5" />
                            {t("integration.connected.disconnect")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <div className="py-6">
              <EmptyState
                icon={<Activity className="h-5 w-5 text-muted-foreground" />}
                message={t("integration.connected.empty")}
              />
            </div>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
}

export default ConnectedView;
