"use client";

/**
 * Shared ERP UI primitives:
 *  - AiProtectedBadge — shown on financial tables to indicate AI cannot auto-mutate.
 *  - HighRiskConfirm — AlertDialog requiring explicit confirmation for financial mutations.
 *  - StatusBadge — semantic status pill using statusColor/toneClasses.
 *  - ErpEmptyState — consistent "no data" placeholder.
 *  - ErpTableHeader — sticky table header helper.
 */

import * as React from "react";
import { ShieldCheck, AlertTriangle, ShieldAlert, Inbox } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { cn, statusColor, toneClasses } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";

// ─────────────────────────────────────────────────────────────────────────────
// AI-protected badge — financial tables
// ─────────────────────────────────────────────────────────────────────────────

export function AiProtectedBadge({
  className,
  withTooltip = false,
}: {
  className?: string;
  withTooltip?: boolean;
}) {
  const { t } = useLocale();
  return (
    <Badge
      variant="outline"
      title={withTooltip ? t("erp.aiProtectedTip") : undefined}
      className={cn(
        "gap-1 border-amber/30 bg-amber/10 text-amber",
        className,
      )}
    >
      <ShieldCheck className="h-3 w-3" />
      {t("erp.aiProtected")}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// High-risk confirmation dialog
// ─────────────────────────────────────────────────────────────────────────────

export interface HighRiskConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Specific action being confirmed, e.g. "Cancel invoice INV-2026-0207" */
  actionLabel: string;
  /** Optional extra context shown in the body. */
  details?: React.ReactNode;
  /** Confirm button label override (defaults to t("erp.highRiskConfirm")). */
  confirmLabel?: string;
  /** Tone of the action button. */
  tone?: "destructive" | "primary";
  onConfirm: () => void;
}

export function HighRiskConfirm({
  open,
  onOpenChange,
  actionLabel,
  details,
  confirmLabel,
  tone = "destructive",
  onConfirm,
}: HighRiskConfirmProps) {
  const { t } = useLocale();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-amber/30">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber">
            <ShieldAlert className="h-5 w-5" />
            {t("erp.highRisk")}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p className="text-foreground">
                <span className="font-semibold">{actionLabel}</span>
              </p>
              <p>{t("erp.highRiskDesc")}</p>
              {details ? (
                <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
                  {details}
                </div>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              tone === "destructive"
                ? "bg-destructive text-white hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
              onOpenChange(false);
            }}
          >
            <AlertTriangle className="h-4 w-4" />
            {confirmLabel ?? t("erp.highRiskConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status badge — domain status pill
// ─────────────────────────────────────────────────────────────────────────────

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const tone = statusColor(status);
  const cls = toneClasses(tone);
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 px-1.5 py-0 text-[10px] uppercase tracking-wider font-semibold", cls.border, cls.bg, cls.text, className)}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cls.dot)} aria-hidden />
      {label ?? status}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

export function ErpEmptyState({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  const { t } = useLocale();
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-10 text-sm text-muted-foreground",
        className,
      )}
    >
      <Inbox className="h-5 w-5 text-muted-foreground/60" />
      <span>{label ?? t("erp.common.noData")}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page section header — small heading + optional right-aligned actions
// ─────────────────────────────────────────────────────────────────────────────

export function ErpSectionHeader({
  icon: Icon,
  title,
  subtitle,
  right,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-cyan" /> : null}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-xs text-muted-foreground/80">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {right}
    </div>
  );
}
