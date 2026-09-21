"use client";

/**
 * IntegrationDetail — Sheet drawer for a single integration.
 *
 * Sections:
 *  - Header: provider icon + label + status badge + auth type + category.
 *  - Status timeline: derived from audit log for this integration.
 *  - Credentials: masked field with reveal-toggle that shows a
 *    "decrypted server-side only" note instead of plaintext.
 *  - Scopes granted (with required → granted diff).
 *  - Capabilities in use.
 *  - Sync history (recent runs for this integration).
 *  - Webhook config (endpoints for this provider).
 *  - Recent events (webhook events for this provider).
 *  - Footer actions: Rotate credential + Revoke.
 */

import { motion } from "framer-motion";
import {
  Activity,
  Lock,
  ShieldCheck,
  RefreshCw,
  RotateCw,
  Trash2,
  CheckCircle2,
  XCircle,
  Webhook,
  Zap,
  History,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn, formatDateTime, relativeTime, toneClasses, statusColor } from "@/lib/utils";
import type {
  Integration,
  Provider,
  Credential,
  SyncRun,
  WebhookEndpoint,
  WebhookEvent,
  IntegrationAuditEntry,
} from "../types";
import {
  StatusBadge,
  AuthTypeBadge,
  CategoryBadge,
  ProviderIcon,
  MaskedField,
  HealthDot,
} from "../shared";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  integration: Integration | null;
  provider: Provider | null;
  credential: Credential | null;
  audit: IntegrationAuditEntry[];
  syncRuns: SyncRun[];
  webhookEndpoints: WebhookEndpoint[];
  webhookEvents: WebhookEvent[];
  onClose: () => void;
  onRotate: () => void;
  onRevoke: () => void;
  onSync: () => void;
  onTest: () => void;
}

export function IntegrationDetail({
  integration,
  provider,
  credential,
  audit,
  syncRuns,
  webhookEndpoints,
  webhookEvents,
  onClose,
  onRotate,
  onRevoke,
  onSync,
  onTest,
}: Props) {
  const { t, locale } = useLocale();
  const open = integration !== null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-xl">
        {integration && provider && (
          <>
            <SheetHeader className="border-b border-border p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <ProviderIcon provider={provider} size="lg" />
                  <div>
                    <SheetTitle className="text-base">{provider.name}</SheetTitle>
                    <SheetDescription className="text-xs">
                      {integration.label}
                    </SheetDescription>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={integration.status} />
                      <AuthTypeBadge authType={integration.authType} />
                      <CategoryBadge category={provider.category} />
                      <HealthDot score={integration.healthScore} />
                    </div>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {integration.id}
                </span>
              </div>
            </SheetHeader>

            <ScrollArea className="max-h-[calc(100vh-220px)]">
              <div className="flex flex-col gap-4 p-5">
                {/* Status timeline */}
                <Section icon={<History className="h-3.5 w-3.5" />} title={t("integration.detail.timeline")}>
                  <div className="flex flex-col gap-2">
                    {audit.slice(0, 5).map((entry, idx) => {
                      const tone = statusColor(entry.action === "sync" ? (entry.message.includes("FAILED") ? "failed" : "success") : "active");
                      const cls = toneClasses(tone);
                      const isLast = idx === Math.min(audit.length - 1, 4);
                      return (
                        <div key={entry.id} className="flex gap-2.5">
                          <div className="flex flex-col items-center">
                            <span className={cn("mt-1 h-2 w-2 rounded-full", cls.dot)} />
                            {!isLast && <span className="w-px flex-1 bg-border" />}
                          </div>
                          <div className="flex-1 pb-2">
                            <div className="text-[11px] font-medium text-foreground">
                              {entry.message}
                            </div>
                            <div className="mt-0.5 text-[10px] text-muted-foreground">
                              {formatDateTime(entry.createdAt, locale)} · {entry.actor} · {entry.ip}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {audit.length === 0 && (
                      <div className="text-xs text-muted-foreground">{t("integration.detail.noTimeline")}</div>
                    )}
                  </div>
                </Section>

                {/* Credentials */}
                <Section
                  icon={<KeyRound className="h-3.5 w-3.5" />}
                  title={t("integration.detail.credentials")}
                  right={
                    <span className="inline-flex items-center gap-1 rounded-md border border-success/40 bg-success/10 px-1.5 py-0.5 text-[10px] text-success">
                      <ShieldCheck className="h-2.5 w-2.5" />
                      {t("integration.security.noPlaintext")}
                    </span>
                  }
                >
                  {credential ? (
                    <MaskedField
                      label={credential.label}
                      value={credential.maskedValue}
                      type={credential.type}
                    />
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {t("integration.detail.noCredential")}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Lock className="h-3 w-3 text-amber" />
                    {t("integration.detail.credNote")}
                  </div>
                </Section>

                {/* Scopes granted */}
                {integration.authType === "oauth" && (
                  <Section icon={<ShieldCheck className="h-3.5 w-3.5" />} title={t("integration.detail.scopes")}>
                    <div className="flex flex-col gap-1">
                      {provider.requiredScopes.map((scope) => {
                        const granted = integration.scopesGranted.includes(scope);
                        return (
                          <div
                            key={scope}
                            className={cn(
                              "flex items-center justify-between gap-2 rounded-md border p-2 text-xs",
                              granted
                                ? "border-lime/30 bg-lime/5"
                                : "border-rose/30 bg-rose/5",
                            )}
                          >
                            <code className="font-mono text-[11px] text-foreground">{scope}</code>
                            {granted ? (
                              <Badge className="bg-lime/15 text-lime border-lime/30 px-1.5 py-0 text-[10px]">
                                <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" />
                                granted
                              </Badge>
                            ) : (
                              <Badge className="bg-rose/15 text-rose border-rose/30 px-1.5 py-0 text-[10px]">
                                <XCircle className="mr-0.5 h-2.5 w-2.5" />
                                missing
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Section>
                )}

                {/* Capabilities in use */}
                <Section icon={<Zap className="h-3.5 w-3.5" />} title={t("integration.detail.capabilities")}>
                  <div className="flex flex-wrap gap-1">
                    {integration.capabilitiesInUse.map((c) => (
                      <Badge
                        key={c}
                        variant="outline"
                        className="border-cyan/30 bg-cyan/10 px-1.5 py-0 text-[10px] text-cyan"
                      >
                        {c}
                      </Badge>
                    ))}
                    {integration.capabilitiesInUse.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        {t("integration.detail.noCapabilities")}
                      </span>
                    )}
                  </div>
                </Section>

                {/* Sync history */}
                <Section icon={<RefreshCw className="h-3.5 w-3.5" />} title={t("integration.detail.syncHistory")}>
                  <div className="flex flex-col gap-1">
                    {syncRuns.slice(0, 4).map((run) => (
                      <div
                        key={run.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 p-2 text-[11px]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-foreground">
                            <StatusPill status={run.status} />
                            <span className="text-[10px] text-muted-foreground">
                              {relativeTime(run.startedAt, locale)} · {run.durationMs}ms
                            </span>
                          </div>
                          {run.error && (
                            <div className="mt-0.5 truncate text-[10px] text-rose">
                              {run.error}
                            </div>
                          )}
                        </div>
                        <div className="text-right text-[10px] text-muted-foreground">
                          {run.recordsIn}→{run.recordsOut}
                        </div>
                      </div>
                    ))}
                    {syncRuns.length === 0 && (
                      <div className="text-xs text-muted-foreground">
                        {t("integration.detail.noSync")}
                      </div>
                    )}
                  </div>
                </Section>

                {/* Webhook config */}
                {webhookEndpoints.length > 0 && (
                  <Section icon={<Webhook className="h-3.5 w-3.5" />} title={t("integration.detail.webhooks")}>
                    <div className="flex flex-col gap-2">
                      {webhookEndpoints.map((wh) => (
                        <div
                          key={wh.id}
                          className="rounded-md border border-border bg-background/40 p-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-foreground">
                              {wh.name}
                            </span>
                            <Badge
                              className={cn(
                                "px-1.5 py-0 text-[10px]",
                                wh.hmacVerified
                                  ? "bg-success/15 text-success border-success/30"
                                  : "bg-rose/15 text-rose border-rose/30",
                              )}
                            >
                              HMAC {wh.hmacVerified ? "verified" : "unverified"}
                            </Badge>
                          </div>
                          <code className="mt-1 block truncate font-mono text-[10px] text-foreground">
                            {wh.url}
                          </code>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {wh.eventTypes.map((et) => (
                              <code
                                key={et}
                                className="font-mono text-[9px] text-violet"
                              >
                                {et}
                              </code>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Recent events */}
                {webhookEvents.length > 0 && (
                  <Section icon={<Activity className="h-3.5 w-3.5" />} title={t("integration.detail.recentEvents")}>
                    <div className="flex flex-col gap-1">
                      {webhookEvents.slice(0, 4).map((ev) => (
                        <div
                          key={ev.id}
                          className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 p-2 text-[11px]"
                        >
                          <div className="min-w-0 flex-1">
                            <code className="font-mono text-[10px] text-foreground">
                              {ev.eventType}
                            </code>
                            <div className="text-[10px] text-muted-foreground">
                              {relativeTime(ev.receivedAt, locale)} · {ev.bodyBytes}b · {ev.responseCode}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "text-[10px] font-medium",
                              ev.status === "delivered" || ev.status === "replayed"
                                ? "text-success"
                                : ev.status === "pending"
                                  ? "text-amber"
                                  : "text-rose",
                            )}
                          >
                            {ev.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </div>
            </ScrollArea>

            <SheetFooter className="border-t border-border p-4">
              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={onTest} className="gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-cyan" />
                    {t("integration.connected.test")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={onSync} className="gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5 text-lime" />
                    {t("integration.connected.sync")}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onRotate();
                      toast.success(t("integration.detail.rotated"));
                    }}
                    className="gap-1.5"
                  >
                    <RotateCw className="h-3.5 w-3.5 text-amber" />
                    {t("integration.detail.rotate")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      onRevoke();
                      toast.success(t("integration.detail.revoked"));
                      onClose();
                    }}
                    className="gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("integration.detail.revoke")}
                  </Button>
                </div>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({
  icon,
  title,
  right,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span className="text-muted-foreground">{icon}</span>
          {title}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: SyncRun["status"] }) {
  const cls =
    status === "success"
      ? "bg-success/15 text-success border-success/30"
      : status === "partial"
        ? "bg-amber/15 text-amber border-amber/30"
        : status === "running"
          ? "bg-cyan/15 text-cyan border-cyan/30"
          : "bg-rose/15 text-rose border-rose/30";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1 py-0 text-[9px] font-medium uppercase",
        cls,
      )}
    >
      {status}
    </span>
  );
}

export default IntegrationDetail;
