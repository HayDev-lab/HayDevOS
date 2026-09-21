"use client";

/**
 * DocumentFlow AI — shared UI helpers (icons, badges, bars, steppers).
 * Used across every sub-view to keep the premium dark enterprise aesthetic
 * consistent: graphite surfaces, lime = approved/valid, cyan = info,
 * amber = pending review / low confidence, rose = rejected / failed / invalid.
 */

import * as React from "react";
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  File as FileIcon,
  FileType2,
  Sheet,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";

import type {
  DocType,
  DocumentStatus,
  DocumentClass,
  DocPipelineStage,
  FieldValidation,
  JobStatus,
  JobType,
  BatchStatus,
  ExportFormat,
  ExportStatus,
} from "./data";

// ─────────────────────────────────────────────────────────────────────────────
// File type icon
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<DocType, LucideIcon> = {
  pdf: FileText,
  docx: FileType2,
  xlsx: FileSpreadsheet,
  csv: Sheet,
  txt: FileIcon,
  png: FileImage,
  jpg: ImageIcon,
};

const TYPE_BG: Record<DocType, string> = {
  pdf: "bg-rose/10 text-rose border-rose/30",
  docx: "bg-cyan/10 text-cyan border-cyan/30",
  xlsx: "bg-success/10 text-success border-success/30",
  csv: "bg-success/10 text-success border-success/30",
  txt: "bg-muted text-muted-foreground border-border",
  png: "bg-violet/10 text-violet border-violet/30",
  jpg: "bg-amber/10 text-amber border-amber/30",
};

export function FileTypeIcon({
  type,
  className,
  size = 16,
}: {
  type: DocType;
  className?: string;
  size?: number;
}) {
  const Icon = TYPE_ICON[type] ?? FileIcon;
  return <Icon className={cn(className)} size={size} aria-hidden />;
}

export function FileTypeBadge({ type, className }: { type: DocType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        TYPE_BG[type],
        className,
      )}
    >
      <FileTypeIcon type={type} size={12} />
      <span className="uppercase tracking-wide">{type}</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status / class / stage badges
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_TONE: Record<DocumentStatus, "lime" | "cyan" | "amber" | "rose" | "muted"> = {
  pending: "muted",
  processing: "cyan",
  classified: "cyan",
  extracted: "amber",
  reviewed: "lime",
  approved: "lime",
  rejected: "rose",
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const { t } = useLocale();
  const tone = STATUS_TONE[status];
  const cls: Record<typeof tone, string> = {
    lime: "bg-lime/10 text-lime border-lime/30",
    cyan: "bg-cyan/10 text-cyan border-cyan/30",
    amber: "bg-amber/10 text-amber border-amber/30",
    rose: "bg-rose/10 text-rose border-rose/30",
    muted: "bg-muted text-muted-foreground border-border",
  };
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", cls[tone])}>
      <span className={cn("size-1.5 rounded-full", `bg-current`)} />
      {t(`docflow.status.${status}`)}
    </Badge>
  );
}

const CLASS_TONE: Record<DocumentClass, string> = {
  invoice: "bg-cyan/10 text-cyan border-cyan/30",
  contract: "bg-violet/10 text-violet border-violet/30",
  receipt: "bg-amber/10 text-amber border-amber/30",
  id: "bg-lime/10 text-lime border-lime/30",
  form: "bg-info/10 text-info border-info/30",
  other: "bg-muted text-muted-foreground border-border",
};

export function ClassBadge({
  classification,
  className,
}: {
  classification: DocumentClass | null;
  className?: string;
}) {
  const { t } = useLocale();
  if (!classification) {
    return (
      <Badge variant="outline" className={cn("bg-muted text-muted-foreground border-border", className)}>
        {t("docflow.class.unknown")}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("font-medium", CLASS_TONE[classification], className)}>
      {t(`docflow.class.${classification}`)}
    </Badge>
  );
}

const JOB_STATUS_TONE: Record<JobStatus, string> = {
  queued: "bg-muted text-muted-foreground border-border",
  running: "bg-cyan/10 text-cyan border-cyan/30",
  success: "bg-lime/10 text-lime border-lime/30",
  failed: "bg-rose/10 text-rose border-rose/30",
  retrying: "bg-amber/10 text-amber border-amber/30",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const { t } = useLocale();
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", JOB_STATUS_TONE[status])}>
      <span className={cn("size-1.5 rounded-full", status === "running" && "animate-pulse-dot")} style={{ backgroundColor: "currentColor" }} />
      {t(`docflow.status.${status}`)}
    </Badge>
  );
}

const BATCH_TONE: Record<BatchStatus, string> = {
  uploading: "bg-cyan/10 text-cyan border-cyan/30",
  processing: "bg-amber/10 text-amber border-amber/30",
  review: "bg-amber/10 text-amber border-amber/30",
  completed: "bg-lime/10 text-lime border-lime/30",
  failed: "bg-rose/10 text-rose border-rose/30",
};

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  const { t } = useLocale();
  const label = status === "uploading"
    ? t("docflow.upload.uploading")
    : status === "processing"
      ? t("docflow.upload.processing")
      : status === "review"
        ? t("docflow.status.reviewed")
        : status === "completed"
          ? t("docflow.status.approved")
          : t("docflow.status.failed");
  return (
    <Badge variant="outline" className={cn("font-medium", BATCH_TONE[status])}>
      {label}
    </Badge>
  );
}

const EXPORT_TONE: Record<ExportStatus, string> = {
  queued: "bg-muted text-muted-foreground border-border",
  running: "bg-cyan/10 text-cyan border-cyan/30",
  success: "bg-lime/10 text-lime border-lime/30",
  failed: "bg-rose/10 text-rose border-rose/30",
};

export function ExportStatusBadge({ status }: { status: ExportStatus }) {
  const { t } = useLocale();
  return (
    <Badge variant="outline" className={cn("font-medium", EXPORT_TONE[status])}>
      {t(`docflow.status.${status}`)}
    </Badge>
  );
}

export function ExportFormatBadge({ format }: { format: ExportFormat }) {
  const labels: Record<ExportFormat, string> = {
    csv: "CSV",
    json: "JSON",
    erp_quickbooks: "QuickBooks",
    erp_sap: "SAP S/4",
    erp_dynamics: "Dynamics",
  };
  const cls: Record<ExportFormat, string> = {
    csv: "bg-success/10 text-success border-success/30",
    json: "bg-cyan/10 text-cyan border-cyan/30",
    erp_quickbooks: "bg-cyan/10 text-cyan border-cyan/30",
    erp_sap: "bg-violet/10 text-violet border-violet/30",
    erp_dynamics: "bg-violet/10 text-violet border-violet/30",
  };
  return (
    <Badge variant="outline" className={cn("font-medium", cls[format])}>
      {labels[format]}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Confidence bar (thin) — green > 0.9, amber 0.7–0.9, red < 0.7
// ─────────────────────────────────────────────────────────────────────────────

export function confidenceTone(c: number): "lime" | "amber" | "rose" {
  if (c >= 0.9) return "lime";
  if (c >= 0.7) return "amber";
  return "rose";
}

const CONF_COLOR: Record<"lime" | "amber" | "rose", string> = {
  lime: "bg-lime",
  amber: "bg-amber",
  rose: "bg-rose",
};

const CONF_TEXT: Record<"lime" | "amber" | "rose", string> = {
  lime: "text-lime",
  amber: "text-amber",
  rose: "text-rose",
};

export function ConfidenceBar({
  value,
  className,
  showLabel = true,
}: {
  value: number; // 0..1
  className?: string;
  showLabel?: boolean;
}) {
  const tone = confidenceTone(value);
  const pct = Math.round(value * 100);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", CONF_COLOR[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn("font-mono text-[11px] tabular-nums", CONF_TEXT[tone])}>
          {pct}%
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation pill
// ─────────────────────────────────────────────────────────────────────────────

const VALIDATION_TONE: Record<FieldValidation, string> = {
  valid: "bg-lime/10 text-lime border-lime/30",
  warning: "bg-amber/10 text-amber border-amber/30",
  invalid: "bg-rose/10 text-rose border-rose/30",
  missing: "bg-muted text-muted-foreground border-border",
};

export function ValidationPill({ validation }: { validation: FieldValidation }) {
  const { t } = useLocale();
  return (
    <Badge variant="outline" className={cn("font-medium", VALIDATION_TONE[validation])}>
      {t(`docflow.validation.${validation}`)}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline progress stepper
// ─────────────────────────────────────────────────────────────────────────────

const STAGE_LIST: DocPipelineStage[] = [
  "ingest",
  "parse",
  "ocr",
  "classify",
  "extract",
  "validate",
  "review",
  "export",
];

export function PipelineStepper({
  stage,
  progressPct,
  compact = false,
}: {
  stage: DocPipelineStage;
  progressPct: number;
  compact?: boolean;
}) {
  const { t } = useLocale();
  const currentIndex = STAGE_LIST.indexOf(stage);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-cyan transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {progressPct}%
        </span>
        <span className="text-[11px] text-cyan">{t(`docflow.stage.${stage}`)}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {STAGE_LIST.map((s, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const tone = done
          ? "bg-lime text-lime-foreground"
          : active
            ? "bg-cyan text-cyan-foreground"
            : "bg-muted text-muted-foreground";
        return (
          <div key={s} className="flex items-center gap-1">
            <div
              className={cn(
                "flex h-5 items-center rounded px-1.5 text-[10px] font-medium",
                tone,
              )}
              title={t(`docflow.stage.${s}`)}
            >
              {done ? "✓" : i + 1}
            </div>
            {i < STAGE_LIST.length - 1 && (
              <div className={cn("h-px w-3", done ? "bg-lime/40" : "bg-border")} />
            )}
          </div>
        );
      })}
      <span className="ml-2 font-mono text-[11px] text-muted-foreground tabular-nums">
        {progressPct}%
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Job type pill
// ─────────────────────────────────────────────────────────────────────────────

const JOB_TYPE_TONE: Record<JobType, string> = {
  parse: "bg-cyan/10 text-cyan border-cyan/30",
  ocr: "bg-violet/10 text-violet border-violet/30",
  classify: "bg-amber/10 text-amber border-amber/30",
  extract: "bg-lime/10 text-lime border-lime/30",
  validate: "bg-info/10 text-info border-info/30",
  export: "bg-success/10 text-success border-success/30",
};

export function JobTypePill({ type }: { type: JobType }) {
  return (
    <Badge variant="outline" className={cn("font-mono uppercase tracking-wide", JOB_TYPE_TONE[type])}>
      {type}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Format helpers
// ─────────────────────────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  const rs = Math.round(s % 60);
  return `${m}m ${rs}s`;
}

export function formatOffsetRange(offsets: [number, number]): string {
  return `[${offsets[0]}–${offsets[1]}]`;
}

/** Highlight the matched excerpt substring within its source line. */
export function ExcerptLine({
  excerpt,
  offsets,
  className,
}: {
  excerpt: string;
  offsets?: [number, number];
  className?: string;
}) {
  if (!offsets) {
    return <span className={cn("font-mono text-xs text-foreground/80", className)}>{excerpt}</span>;
  }
  const [start, end] = offsets;
  const safeStart = Math.max(0, Math.min(start, excerpt.length));
  const safeEnd = Math.max(safeStart, Math.min(end, excerpt.length));
  return (
    <span className={cn("font-mono text-xs text-foreground/80", className)}>
      {excerpt.slice(0, safeStart)}
      <mark className="rounded bg-amber/20 px-0.5 text-amber">
        {excerpt.slice(safeStart, safeEnd)}
      </mark>
      {excerpt.slice(safeEnd)}
    </span>
  );
}
