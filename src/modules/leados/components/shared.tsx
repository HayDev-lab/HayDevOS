"use client";

/**
 * LeadOS — shared small UI primitives (badges, avatar, KPI card).
 * Kept in one file to avoid an explosion of tiny files.
 */

import { cn, initials, toneClasses, type StatusTone } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  STAGE_BY_ID,
  SOURCE_BY_ID,
  getSlaStatus,
  slaStatusTone,
  type SlaStatus,
  type LeadStage,
  type LeadSource,
  type LeadRecord,
} from "../data";
import { useLeadOSData } from "../LeadOSData";

// ─────────────────────────────────────────────────────────────────────────────
// Stage badge — color-coded per LEAD_STAGES tone
// ─────────────────────────────────────────────────────────────────────────────

export function StageBadge({ stage, className }: { stage: LeadStage; className?: string }) {
  const def = STAGE_BY_ID[stage];
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border px-1.5 py-0 text-[10px] font-medium uppercase tracking-wider",
        "border-current/30",
        def.text,
        "bg-current/10",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", def.dot)} />
      <span className="text-foreground/80">{stage}</span>
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Source badge — neutral with subtle accent
// ─────────────────────────────────────────────────────────────────────────────

export function SourceBadge({ source, className }: { source: LeadSource; className?: string }) {
  const def = SOURCE_BY_ID[source];
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-border bg-muted/40 px-1.5 py-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      {def.id}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLA badge — on-track (cyan/lime), warning (amber), breach (rose)
// ─────────────────────────────────────────────────────────────────────────────

const SLA_TONE: Record<SlaStatus, StatusTone> = {
  "on-track": "cyan",
  "warning": "amber",
  "breach": "rose",
};

export function SlaBadge({ status, label, className }: { status: SlaStatus; label: string; className?: string }) {
  const tone = SLA_TONE[status];
  const cls = toneClasses(tone);
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 px-1.5 py-0 text-[10px] font-medium uppercase tracking-wider", cls.border, cls.bg, cls.text, className)}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cls.dot, status !== "on-track" && "animate-pulse-dot")} />
      {label}
    </Badge>
  );
}

/** Convenience: compute SLA badge directly from a lead. */
export function LeadSlaBadge({ lead, label }: { lead: LeadRecord; label: (s: SlaStatus) => string }) {
  const status = getSlaStatus(lead);
  return <SlaBadge status={status} label={label(status)} />;
}

export function slaStatusForLead(lead: LeadRecord): SlaStatus {
  return getSlaStatus(lead);
}

export function slaToneForLead(lead: LeadRecord): StatusTone {
  return slaStatusTone(getSlaStatus(lead));
}

// ─────────────────────────────────────────────────────────────────────────────
// Owner avatar
// ─────────────────────────────────────────────────────────────────────────────

export function OwnerAvatar({
  ownerId,
  size = "sm",
  className,
}: {
  ownerId: string | null;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const { overview } = useLeadOSData();
  const m = overview?.members.find((member) => member.id === ownerId);
  const sizeCls = size === "xs" ? "size-6 text-[10px]" : size === "md" ? "size-9 text-sm" : "size-7 text-xs";
  if (!m) {
    return (
      <Avatar className={cn(sizeCls, className)}>
        <AvatarFallback>?</AvatarFallback>
      </Avatar>
    );
  }
  return (
    <Avatar className={cn(sizeCls, className)}>
      {m.avatarUrl ? <AvatarImage src={m.avatarUrl} alt={m.name} /> : null}
      <AvatarFallback className="bg-muted text-foreground">{initials(m.name)}</AvatarFallback>
    </Avatar>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity type icon helper (returns emoji-ish dot for timeline)
// ─────────────────────────────────────────────────────────────────────────────

export function activityTone(type: LeadRecord["stage"] | string): StatusTone {
  switch (type) {
    case "call":
    case "meeting":
      return "cyan";
    case "email":
      return "lime";
    case "note":
      return "amber";
    case "status_change":
      return "violet";
    case "system":
      return "rose";
    default:
      return "muted";
  }
}
