"use client";

/**
 * Integration Hub — shared UI primitives.
 *
 * StatusBadge / CategoryBadge / AuthTypeBadge — colored pills driven by the
 *   spec's accent mapping (lime/amber/rose/violet).
 * ProviderIcon — wraps the provider.icon LucideIcon in a category-coloured
 *   rounded square so every catalog card / table row looks consistent.
 * MaskedField — monospace "••••••••" + lock icon. The reveal toggle shows a
 *   server-only-decryption note instead of the plaintext (per spec).
 * HealthDot — coloured dot for connected-integration health.
 * EmptyState / SectionHeader — small layout helpers.
 */

import { Lock, EyeOff, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  IntegrationStatus,
  ProviderCategory,
  AuthType,
  Provider,
  CredentialType,
} from "./types";
import { STATUS_ACCENT } from "./types";
import { Badge } from "@/components/ui/badge";

// ─────────────────────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CLASSES: Record<IntegrationStatus, string> = {
  connected: "border-lime/30 bg-lime/10 text-lime",
  degraded: "border-amber/30 bg-amber/10 text-amber",
  reauth_required: "border-amber/30 bg-amber/10 text-amber",
  error: "border-rose/30 bg-rose/10 text-rose",
  disconnected: "border-violet/30 bg-violet/10 text-violet",
};

export function StatusBadge({ status }: { status: IntegrationStatus }) {
  const { t } = useLocale();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        STATUS_CLASSES[status],
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          STATUS_CLASSES[status].split(" ").find((c) => c.startsWith("bg-")) ?? "bg-muted-foreground",
        )}
      />
      {t(`integration.status.${status}`)}
    </span>
  );
}

export function statusAccent(status: IntegrationStatus) {
  return STATUS_ACCENT[status];
}

// ─────────────────────────────────────────────────────────────────────────────
// Category badge
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_CLASSES: Record<ProviderCategory, string> = {
  social: "border-cyan/30 bg-cyan/10 text-cyan",
  messaging: "border-lime/30 bg-lime/10 text-lime",
  email: "border-amber/30 bg-amber/10 text-amber",
  webhook: "border-violet/30 bg-violet/10 text-violet",
  internal: "border-rose/30 bg-rose/10 text-rose",
};

export function CategoryBadge({ category }: { category: ProviderCategory }) {
  const { t } = useLocale();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        CATEGORY_CLASSES[category],
      )}
    >
      {t(`integration.category.${category}`)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth type badge
// ─────────────────────────────────────────────────────────────────────────────

const AUTH_CLASSES: Record<AuthType, string> = {
  oauth: "border-cyan/30 bg-cyan/10 text-cyan",
  api_key: "border-amber/30 bg-amber/10 text-amber",
  webhook: "border-violet/30 bg-violet/10 text-violet",
  none: "border-border bg-muted text-muted-foreground",
};

export function AuthTypeBadge({ authType }: { authType: AuthType }) {
  const { t } = useLocale();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        AUTH_CLASSES[authType],
      )}
    >
      {t(`integration.authType.${authType}`)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider icon
// ─────────────────────────────────────────────────────────────────────────────

export function ProviderIcon({
  provider,
  size = "md",
}: {
  provider: Pick<Provider, "icon" | "category">;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = provider.icon;
  const dims = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-10 w-10" : "h-8 w-8";
  const iconDims = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  const catCls = CATEGORY_CLASSES[provider.category];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-lg border",
        dims,
        catCls,
      )}
    >
      <Icon className={iconDims} />
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Masked field (lock icon + monospace dots + reveal-toggle that NEVER reveals)
// ─────────────────────────────────────────────────────────────────────────────

export function MaskedField({
  label,
  value,
  type = "value",
  showReveal = true,
  compact = false,
}: {
  label?: string;
  value: string;
  type?: "value" | CredentialType;
  showReveal?: boolean;
  compact?: boolean;
}) {
  const { t } = useLocale();
  const [revealed, setRevealed] = useState(false);

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-background/40",
        compact ? "p-1.5" : "p-2.5",
      )}
    >
      {(label || type !== "value") && (
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {label ?? t(`integration.credType.${type}`)}
          </span>
          <ShieldCheck className="h-3 w-3 text-success" />
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <code className="flex items-center gap-1.5 truncate font-mono text-[11px] text-foreground">
          <Lock className="h-3 w-3 text-amber" />
          {value}
        </code>
        {showReveal && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="shrink-0 text-[10px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {revealed ? t("integration.cred.hide") : t("integration.cred.reveal")}
          </button>
        )}
      </div>
      {revealed && (
        <div className="mt-2 flex items-start gap-1.5 rounded border border-amber/30 bg-amber/5 p-2 text-[10px] text-amber">
          <EyeOff className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{t("integration.cred.serverOnlyNote")}</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Health dot
// ─────────────────────────────────────────────────────────────────────────────

export function HealthDot({ score }: { score: number }) {
  const tone =
    score >= 90 ? "bg-success" : score >= 60 ? "bg-amber" : score > 0 ? "bg-rose" : "bg-muted-foreground";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("relative h-2 w-2 rounded-full", tone)}>
        <span
          className={cn(
            "absolute inset-0 rounded-full opacity-60",
            tone,
            score < 90 && score > 0 && "animate-ping",
          )}
        />
      </span>
      <span className="font-mono text-[11px] text-foreground">{score}</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout helpers
// ─────────────────────────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground/80">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function EmptyState({
  icon,
  message,
}: {
  icon?: React.ReactNode;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
      {icon}
      <span>{message}</span>
    </div>
  );
}

/** "No plaintext exposure" badge — security emphasis per spec. */
export function NoPlaintextBadge() {
  const { t } = useLocale();
  return (
    <Badge
      variant="outline"
      className="gap-1 border-success/40 bg-success/10 text-success"
    >
      <ShieldCheck className="h-3 w-3" />
      {t("integration.security.noPlaintext")}
    </Badge>
  );
}
