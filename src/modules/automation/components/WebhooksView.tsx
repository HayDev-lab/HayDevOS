"use client";

/**
 * WebhooksView — webhook endpoints with URL, masked signing secret,
 * event types, last delivery, success rate, 24h delivery count.
 * "Copy URL" button copies the URL to clipboard.
 */

import { motion } from "framer-motion";
import { Copy, Webhook, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn, relativeTime, toneClasses, statusColor } from "@/lib/utils";
import type { WebhookEndpoint } from "../types";
import { localizeAutomationText } from "../localization";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  endpoints: WebhookEndpoint[];
}

export function WebhooksView({ endpoints }: Props) {
  const { t, locale } = useLocale();

  function copy(url: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => undefined);
    }
    toast.success(t("automation.webhooks.copied"));
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("automation.webhooks.title")}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground/80">{t("automation.webhooks.sub")}</p>
      </div>

      <ScrollArea className="max-h-[680px]">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {endpoints.map((w, i) => {
            const tone = statusColor(w.lastStatus ?? "pending");
            const cls = toneClasses(tone);
            return (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: Math.min(i * 0.03, 0.2) }}
              >
                <Card className="surface-elevated py-0">
                  <CardContent className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan/10 text-cyan">
                          <Webhook className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-foreground">{w.name}</div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {w.deliveries24h} {t("automation.webhooks.col.delivery24h").toLowerCase()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {w.lastStatus && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
                              cls.border,
                              cls.bg,
                              cls.text,
                            )}
                          >
                            {w.lastStatus === "delivered" ? (
                              <CheckCircle2 className="h-2.5 w-2.5" />
                            ) : w.lastStatus === "failed" ? (
                              <XCircle className="h-2.5 w-2.5" />
                            ) : (
                              <Clock className="h-2.5 w-2.5" />
                            )}
                            {localizeAutomationText(w.lastStatus, locale)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* URL */}
                    <div className="rounded-md border border-border bg-background/40 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <code className="truncate font-mono text-[11px] text-foreground">{w.url}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 shrink-0 gap-1 px-2 text-xs"
                          onClick={() => copy(w.url)}
                        >
                          <Copy className="h-3 w-3" />
                          {t("automation.webhooks.copy")}
                        </Button>
                      </div>
                    </div>

                    {/* Signing secret */}
                    <div className="rounded-md border border-border bg-background/40 p-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {t("automation.webhooks.col.secret")}
                      </div>
                      <code className="mt-0.5 block font-mono text-[11px] text-amber">
                        {w.signingSecretMasked}
                      </code>
                    </div>

                    {/* Event types */}
                    <div className="flex flex-wrap items-center gap-1">
                      {w.eventTypes.map((et) => (
                        <Badge
                          key={et}
                          variant="outline"
                          className="border-violet/30 bg-violet/10 px-1.5 py-0 font-mono text-[10px] text-violet"
                        >
                          {et}
                        </Badge>
                      ))}
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center justify-between border-t border-border pt-2 text-[11px]">
                      <div className="text-muted-foreground">
                        {t("automation.webhooks.col.last")}:{" "}
                        <span className="text-foreground">
                          {w.lastDeliveryAt ? relativeTime(w.lastDeliveryAt, locale) : "—"}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "font-medium",
                          w.successRate >= 95
                            ? "text-success"
                            : w.successRate >= 80
                              ? "text-amber"
                              : "text-rose",
                        )}
                      >
                        {t("automation.col.successRate")}: {w.successRate.toFixed(1)}%
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
          {endpoints.length === 0 && (
            <div className="lg:col-span-2 rounded-xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
              {t("automation.webhooks.empty")}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default WebhooksView;
