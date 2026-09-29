"use client";

/**
 * ApprovalsView — pending approvals queue + history.
 * Approve / Reject. Stale-context warning when snapshot > 24h old.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Check, X, Clock, AlertTriangle, Lock, History } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { cn, relativeTime, toneClasses, statusColor } from "@/lib/utils";
import type { Approval } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Props {
  approvals: Approval[];
  onDecide: (id: string, decision: "approved" | "rejected") => void;
}

const STALE_MS = 24 * 3600 * 1000;

export function ApprovalsView({ approvals, onDecide }: Props) {
  const { t, locale } = useLocale();

  const pending = useMemo(() => approvals.filter((a) => a.status === "pending"), [approvals]);
  const history = useMemo(
    () => approvals.filter((a) => a.status !== "pending").slice(0, 8),
    [approvals],
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("automation.approvals.title")}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground/80">{t("automation.approvals.sub")}</p>
      </div>

      {/* Pending queue */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {pending.length === 0 && (
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
              <Check className="mx-auto mb-2 h-5 w-5 text-success" />
              {t("automation.approvals.empty")}
            </div>
          </div>
        )}
        {pending.map((a, i) => {
          const ageMs = Date.now() - new Date(a.requestedAt).getTime();
          const stale = ageMs > STALE_MS;
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.2) }}
            >
              <Card className={cn("surface-elevated py-0", stale && "border-amber/40")}>
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber/10 text-amber">
                        <Lock className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <div className="text-sm font-medium text-foreground">{a.automationName}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {t("automation.approvals.col.requestedBy")}: {a.requestedBy}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-amber/30 bg-amber/10 px-1.5 py-0 text-[10px] uppercase tracking-wider text-amber"
                    >
                      <Clock className="mr-1 h-2.5 w-2.5" />
                      {relativeTime(a.requestedAt, locale)}
                    </Badge>
                  </div>

                  <div className="rounded-md border border-border bg-background/40 p-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t("automation.approvals.col.action")}
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-foreground">{a.actionLabel}</div>
                  </div>

                  <div className="rounded-md border border-border bg-background/40 p-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t("automation.approvals.context")}
                    </div>
                    <pre className="mt-0.5 max-h-28 overflow-auto text-[10px] text-muted-foreground">
                      {JSON.stringify(a.contextSnapshot, null, 2)}
                    </pre>
                  </div>

                  {stale && (
                    <div className="flex items-start gap-2 rounded-md border border-amber/40 bg-amber/10 px-2.5 py-1.5 text-[11px] text-amber">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>{t("automation.approvals.stale")}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => onDecide(a.id, "approved")}
                      className="flex-1 gap-1.5 bg-success text-success-foreground hover:bg-success/90"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {t("automation.approvals.approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDecide(a.id, "rejected")}
                      className="flex-1 gap-1.5 border-rose/30 text-rose hover:bg-rose/10"
                    >
                      <X className="h-3.5 w-3.5" />
                      {t("automation.approvals.reject")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* History */}
      {history.length > 0 && (
        <>
          <Separator className="my-2 bg-border" />
          <div>
            <div className="mb-2 flex items-center gap-2">
              <History className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("automation.approvals.history")}
              </h3>
            </div>
            <Card className="surface-elevated py-0">
              <CardContent className="p-0">
                <ScrollArea className="max-h-80">
                  <ul className="divide-y divide-border">
                    {history.map((a) => {
                      const tone = statusColor(a.status);
                      const cls = toneClasses(tone);
                      return (
                        <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", cls.dot)} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-foreground">{a.automationName}</div>
                            <div className="truncate font-mono text-[10px] text-muted-foreground">
                              {a.actionLabel}
                            </div>
                          </div>
                          <div className="hidden text-muted-foreground sm:block">
                            {a.decidedAt ? relativeTime(a.decidedAt, locale) : "—"}
                          </div>
                          <span
                            className={cn(
                              "rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
                              cls.border,
                              cls.bg,
                              cls.text,
                            )}
                          >
                            {t(`automation.approvals.status.${a.status}`)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default ApprovalsView;
