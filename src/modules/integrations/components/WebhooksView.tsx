"use client";

/**
 * WebhooksView — webhook endpoints + incoming events.
 *
 * Endpoints section: card grid of endpoints (URL with copy, masked signing
 * secret, event types, last delivery status, 24h count, success rate, HMAC
 * verification badge).
 *
 * Events section: table of incoming events (provider, eventId, eventType,
 * received, processed, response code, HMAC valid, status, body bytes,
 * idempotency key). "Replay" button per row.
 *
 * Security emphasis shown in UI: HMAC verification indicator, body-size
 * enforcement, idempotency window, SSRF/private-network blocking.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Webhook,
  Copy,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Lock,
  Search,
  Server,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn, relativeTime } from "@/lib/utils";
import type {
  WebhookEndpoint,
  WebhookEvent,
  Provider,
} from "../types";
import { SectionHeader, EmptyState, NoPlaintextBadge } from "../shared";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  endpoints: WebhookEndpoint[];
  events: WebhookEvent[];
  providers: Provider[];
  onReplay: (event: WebhookEvent) => void;
}

export function WebhooksView({ endpoints, events, providers, onReplay }: Props) {
  const { t, locale } = useLocale();
  const [query, setQuery] = useState("");

  const providerById = useMemo(() => {
    const map = new Map<string, Provider>();
    providers.forEach((p) => map.set(p.id, p));
    return map;
  }, [providers]);

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) =>
        e.eventId.toLowerCase().includes(q) ||
        e.eventType.toLowerCase().includes(q) ||
        (e.providerId ?? "").toLowerCase().includes(q),
    );
  }, [events, query]);

  function copy(text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => undefined);
    }
    toast.success(t("integration.webhooks.copied"));
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Endpoints */}
      <div className="flex flex-col gap-3">
        <SectionHeader
          title={t("integration.webhooks.endpoints")}
          sub={t("integration.webhooks.endpointsSub")}
          right={<NoPlaintextBadge />}
        />

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-violet/30 bg-violet/5 p-2.5 text-[11px] text-violet">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t("integration.webhooks.hmacRequired")}
        </div>

        <ScrollArea className="max-h-[480px]">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {endpoints.map((w, i) => {
              const prov = w.providerId ? providerById.get(w.providerId) : null;
              const lastTone =
                w.lastStatus === "delivered"
                  ? "text-success"
                  : w.lastStatus === "failed"
                    ? "text-rose"
                    : w.lastStatus === "pending"
                      ? "text-amber"
                      : "text-muted-foreground";
              return (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(i * 0.02, 0.15) }}
                >
                  <Card className="surface-elevated py-0">
                    <CardContent className="flex flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-violet/30 bg-violet/10 text-violet">
                            <Webhook className="h-4 w-4" />
                          </span>
                          <div>
                            <div className="text-sm font-semibold text-foreground">
                              {w.name}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              {prov?.name ?? t("integration.webhooks.generic")} · {w.deliveries24h}{" "}
                              {t("integration.webhooks.col.delivery24h")}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge
                            className={cn(
                              "gap-0.5 px-1.5 py-0 text-[9px]",
                              w.hmacVerified
                                ? "bg-success/15 text-success border-success/30"
                                : "bg-rose/15 text-rose border-rose/30",
                            )}
                          >
                            <ShieldCheck className="h-2.5 w-2.5" />
                            {w.hmacVerified ? "HMAC ✓" : "HMAC ✗"}
                          </Badge>
                        </div>
                      </div>

                      {/* URL */}
                      <div className="rounded-md border border-border bg-background/40 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <code className="truncate font-mono text-[11px] text-foreground">
                            {w.url}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 shrink-0 gap-1 px-2 text-xs"
                            onClick={() => copy(w.url)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Signing secret */}
                      <div className="rounded-md border border-border bg-background/40 p-2">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {t("integration.webhooks.col.secret")}
                        </div>
                        <code className="mt-0.5 block font-mono text-[11px] text-amber">
                          <Lock className="mr-1 inline h-3 w-3" />
                          {w.signingSecretMasked}
                        </code>
                      </div>

                      {/* Event types */}
                      <div className="flex flex-wrap gap-1">
                        {w.eventTypes.map((et) => (
                          <code
                            key={et}
                            className="rounded border border-violet/30 bg-violet/10 px-1 py-0 font-mono text-[10px] text-violet"
                          >
                            {et}
                          </code>
                        ))}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between border-t border-border pt-2 text-[11px]">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          {w.lastStatus === "delivered" ? (
                            <CheckCircle2 className="h-3 w-3 text-success" />
                          ) : w.lastStatus === "failed" ? (
                            <XCircle className="h-3 w-3 text-rose" />
                          ) : (
                            <Clock className="h-3 w-3 text-amber" />
                          )}
                          <span className={lastTone}>
                            {w.lastStatus
                              ? t(`integration.webhooks.status.${w.lastStatus}`)
                              : "—"}
                          </span>
                          <span className="text-muted-foreground">
                            · {w.lastDeliveryAt ? relativeTime(w.lastDeliveryAt, locale) : "—"}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "font-medium",
                            w.successRate >= 95
                              ? "text-success"
                              : w.successRate >= 80
                                ? "text-amber"
                                : "text-rose",
                          )}
                        >
                          {w.successRate.toFixed(1)}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Events */}
      <div className="flex flex-col gap-3">
        <SectionHeader
          title={t("integration.webhooks.events")}
          sub={t("integration.webhooks.eventsSub")}
          right={
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-card/40 px-2 py-1 text-[10px] text-muted-foreground">
              <Server className="h-3 w-3" />
              {t("integration.webhooks.idempotencyNote")}
            </div>
          }
        />

        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("integration.webhooks.searchEvents")}
            className="h-8 pl-8 text-xs"
          />
        </div>

        <Card className="surface-elevated overflow-hidden py-0">
          <ScrollArea className="max-h-[560px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t("integration.webhooks.col.provider")}
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t("integration.webhooks.col.eventId")}
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t("integration.webhooks.col.eventType")}
                  </TableHead>
                  <TableHead className="hidden text-[10px] uppercase tracking-wider text-muted-foreground sm:table-cell">
                    {t("integration.webhooks.col.received")}
                  </TableHead>
                  <TableHead className="hidden text-[10px] uppercase tracking-wider text-muted-foreground md:table-cell">
                    {t("integration.webhooks.col.code")}
                  </TableHead>
                  <TableHead className="hidden text-[10px] uppercase tracking-wider text-muted-foreground md:table-cell">
                    HMAC
                  </TableHead>
                  <TableHead className="hidden text-[10px] uppercase tracking-wider text-muted-foreground md:table-cell">
                    {t("integration.webhooks.col.body")}
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t("integration.webhooks.col.status")}
                  </TableHead>
                  <TableHead className="w-12 text-right text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t("common.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((ev) => {
                  const prov = ev.providerId ? providerById.get(ev.providerId) : null;
                  return (
                    <TableRow key={ev.id} className="border-border text-xs hover:bg-primary/5">
                      <TableCell className="py-2 text-[11px] text-foreground">
                        {prov?.name ?? ev.providerId ?? "—"}
                      </TableCell>
                      <TableCell className="py-2">
                        <code className="font-mono text-[10px] text-foreground">
                          {ev.eventId}
                        </code>
                      </TableCell>
                      <TableCell className="py-2">
                        <code className="font-mono text-[10px] text-violet">
                          {ev.eventType}
                        </code>
                      </TableCell>
                      <TableCell className="hidden py-2 text-[11px] text-muted-foreground sm:table-cell">
                        {relativeTime(ev.receivedAt, locale)}
                      </TableCell>
                      <TableCell className="hidden py-2 md:table-cell">
                        <span
                          className={cn(
                            "font-mono text-[10px]",
                            ev.responseCode >= 200 && ev.responseCode < 300
                              ? "text-success"
                              : ev.responseCode === 202
                                ? "text-amber"
                                : "text-rose",
                          )}
                        >
                          {ev.responseCode}
                        </span>
                      </TableCell>
                      <TableCell className="hidden py-2 md:table-cell">
                        {ev.hmacValid ? (
                          <ShieldCheck className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-rose" />
                        )}
                      </TableCell>
                      <TableCell className="hidden py-2 text-[10px] text-muted-foreground md:table-cell">
                        {ev.bodyBytes}b
                      </TableCell>
                      <TableCell className="py-2">
                        <span
                          className={cn(
                            "text-[10px] font-medium uppercase",
                            ev.status === "delivered" || ev.status === "replayed"
                              ? "text-success"
                              : ev.status === "pending"
                                ? "text-amber"
                                : "text-rose",
                          )}
                        >
                          {t(`integration.webhooks.status.${ev.status}`)}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            onReplay(ev);
                            toast.success(t("integration.webhooks.replayed"));
                          }}
                          title={t("integration.webhooks.replay")}
                        >
                          <Play className="h-3 w-3 text-cyan" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filteredEvents.length === 0 && (
              <div className="py-6">
                <EmptyState
                  icon={<Webhook className="h-5 w-5 text-muted-foreground" />}
                  message={t("integration.webhooks.noEvents")}
                />
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}

export default WebhooksView;
