"use client";

/**
 * AuditView — integration-scoped audit log.
 *
 * Filterable by action (connect/disconnect/refresh_auth/rotate_credential/
 * revoke_credential/test/sync/webhook_received/webhook_replayed/config_updated).
 * Each row: action badge (color-coded), provider, actor, IP, timestamp,
 * message. Sticky-header table inside ScrollArea.
 */

import { useMemo, useState } from "react";
import { ClipboardCheck, Search, Globe, User, Clock } from "lucide-react";

import { useLocale } from "@/lib/i18n";
import {
  cn,
  formatDateTime,
  relativeTime,
  toneClasses,
  type StatusTone,
} from "@/lib/utils";
import type { IntegrationAuditEntry, IntegrationAuditAction, Provider } from "../types";
import { SectionHeader, EmptyState } from "../shared";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  audit: IntegrationAuditEntry[];
  providers: Provider[];
}

const ACTION_TONE: Record<IntegrationAuditAction, StatusTone> = {
  connect: "success",
  disconnect: "destructive",
  refresh_auth: "info",
  rotate_credential: "warning",
  revoke_credential: "destructive",
  test: "info",
  sync: "lime",
  webhook_received: "violet",
  webhook_replayed: "cyan",
  config_updated: "warning",
};

export function AuditView({ audit, providers }: Props) {
  const { t, locale } = useLocale();
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const providerById = useMemo(() => {
    const map = new Map<string, Provider>();
    providers.forEach((p) => map.set(p.id, p));
    return map;
  }, [providers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return audit.filter((a) => {
      if (actionFilter !== "all" && a.action !== actionFilter) return false;
      if (!q) return true;
      return (
        a.actor.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q) ||
        a.ip.toLowerCase().includes(q) ||
        a.providerId.toLowerCase().includes(q)
      );
    });
  }, [audit, query, actionFilter]);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title={t("integration.audit.title")}
        sub={t("integration.audit.sub")}
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="h-8 w-[220px] text-xs">
            <SelectValue placeholder={t("integration.audit.filterAction")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="connect">connect</SelectItem>
            <SelectItem value="disconnect">disconnect</SelectItem>
            <SelectItem value="refresh_auth">refresh_auth</SelectItem>
            <SelectItem value="rotate_credential">rotate_credential</SelectItem>
            <SelectItem value="revoke_credential">revoke_credential</SelectItem>
            <SelectItem value="test">test</SelectItem>
            <SelectItem value="sync">sync</SelectItem>
            <SelectItem value="webhook_received">webhook_received</SelectItem>
            <SelectItem value="webhook_replayed">webhook_replayed</SelectItem>
            <SelectItem value="config_updated">config_updated</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("integration.audit.search")}
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
                  {t("integration.audit.col.action")}
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("integration.audit.col.provider")}
                </TableHead>
                <TableHead className="hidden text-[10px] uppercase tracking-wider text-muted-foreground md:table-cell">
                  {t("integration.audit.col.actor")}
                </TableHead>
                <TableHead className="hidden text-[10px] uppercase tracking-wider text-muted-foreground lg:table-cell">
                  {t("integration.audit.col.ip")}
                </TableHead>
                <TableHead className="hidden text-[10px] uppercase tracking-wider text-muted-foreground sm:table-cell">
                  {t("integration.audit.col.timestamp")}
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("integration.audit.col.message")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => {
                const prov = providerById.get(entry.providerId);
                const cls = toneClasses(ACTION_TONE[entry.action]);
                return (
                  <TableRow key={entry.id} className="border-border text-xs align-top hover:bg-primary/5">
                    <TableCell className="py-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                          cls.border,
                          cls.bg,
                          cls.text,
                        )}
                      >
                        {entry.action}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 text-[11px] text-foreground">
                      {prov?.name ?? entry.providerId}
                    </TableCell>
                    <TableCell className="hidden py-2.5 md:table-cell">
                      <div className="flex items-center gap-1.5 text-[11px] text-foreground">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {entry.actor}
                      </div>
                    </TableCell>
                    <TableCell className="hidden py-2.5 lg:table-cell">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                        <Globe className="h-3 w-3" />
                        {entry.ip}
                      </div>
                    </TableCell>
                    <TableCell className="hidden py-2.5 sm:table-cell">
                      <div className="flex flex-col text-[10px]">
                        <span className="text-foreground">
                          {formatDateTime(entry.createdAt, locale)}
                        </span>
                        <span className="flex items-center gap-0.5 text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {relativeTime(entry.createdAt, locale)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-[11px] text-muted-foreground">
                      {entry.message}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <div className="py-6">
              <EmptyState
                icon={<ClipboardCheck className="h-5 w-5 text-muted-foreground" />}
                message={t("integration.audit.empty")}
              />
            </div>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
}

export default AuditView;
