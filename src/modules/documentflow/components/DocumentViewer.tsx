"use client";

/**
 * DocumentViewer — split-pane document detail view.
 *
 * Left panel: a stylised "page" preview that represents the source document
 * (different rendering per type: PDF/DOCX/CSV/text/scan/image), with the
 * filename header, OCR-language badge if applicable, page count, and the
 * faux text excerpt.
 *
 * Right panel: classification banner (with overall doc confidence),
 * extracted fields table (key, value, confidence bar, validation pill,
 * provenance row with page + highlighted excerpt + character offsets),
 * inline review actions (Accept / Correct / Reject / Not found), version
 * history timeline, and Approve / Reject document actions at the bottom.
 *
 * Uses react-resizable-panels so the two panes can be resized.
 */

import * as React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  Pencil,
  Ban,
  HelpCircle,
  CheckCircle2,
  XCircle,
  History,
  Languages,
  FileText,
  ScanLine,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

import {
  type DocRecord,
  type DocFieldEx,
  type FieldReviewAction,
  fauxExcerptFor,
} from "../data";
import {
  FileTypeIcon,
  FileTypeBadge,
  StatusBadge,
  ClassBadge,
  ConfidenceBar,
  ValidationPill,
  confidenceTone,
  ExcerptLine,
  formatOffsetRange,
} from "../shared";

const OCR_LABEL: Record<"hy" | "ru" | "en", string> = {
  hy: "Հայերեն",
  ru: "Русский",
  en: "English",
};

const ACTION_TONE: Record<FieldReviewAction, string> = {
  accept: "text-lime border-lime/30 bg-lime/10",
  correct: "text-cyan border-cyan/30 bg-cyan/10",
  reject: "text-rose border-rose/30 bg-rose/10",
  not_found: "text-muted-foreground border-border bg-muted",
};

export function DocumentViewer({
  doc,
  onClose,
  onUpdateDoc,
  onApprove,
  onReject,
}: {
  doc: DocRecord | null;
  onClose: () => void;
  onUpdateDoc: (doc: DocRecord) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const { t, locale } = useLocale();
  const [correctingKey, setCorrectingKey] = useState<string | null>(null);
  const [correctingValue, setCorrectingValue] = useState("");

  if (!doc) return null;

  const avgConf = doc.fields.length
    ? doc.fields.reduce((a, f) => a + f.confidence, 0) / doc.fields.length
    : doc.confidence ?? 0;

  const setFieldAction = (key: string, action: FieldReviewAction, correctedValue?: string) => {
    const updated: DocRecord = {
      ...doc,
      fields: doc.fields.map((f) =>
        f.key === key
          ? {
              ...f,
              reviewAction: action,
              reviewed: true,
              correctedValue: action === "correct" ? (correctedValue ?? f.value) : undefined,
              validation: action === "reject" ? "invalid" : action === "not_found" ? "missing" : "valid",
            }
          : f,
      ),
      updatedAt: new Date().toISOString(),
    };
    onUpdateDoc(updated);
    const msgKey =
      action === "accept"
        ? "docflow.toast.fieldAccepted"
        : action === "correct"
          ? "docflow.toast.fieldCorrected"
          : action === "reject"
            ? "docflow.toast.fieldRejected"
            : "docflow.toast.fieldNotFound";
    toast.success(t(msgKey));
  };

  const startCorrecting = (field: DocFieldEx) => {
    setCorrectingKey(field.key);
    setCorrectingValue(field.correctedValue ?? field.value);
  };

  const commitCorrecting = () => {
    if (correctingKey) {
      setFieldAction(correctingKey, "correct", correctingValue);
    }
    setCorrectingKey(null);
    setCorrectingValue("");
  };

  const excerpt = fauxExcerptFor(doc);

  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-7xl gap-0 overflow-hidden border-border bg-card p-0"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{doc.filename}</DialogTitle>

        {/* Header bar */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
              <FileTypeIcon type={doc.type} size={18} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold">{doc.filename}</span>
                <FileTypeBadge type={doc.type} />
                <StatusBadge status={doc.status} />
                <ClassBadge classification={doc.classification} />
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{doc.uploadedByName}</span>
                <span>·</span>
                <span>{formatDateTime(doc.createdAt, locale)}</span>
                <span>·</span>
                <span>v{doc.version}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-rose/30 text-rose hover:bg-rose/10 hover:text-rose"
              onClick={() => {
                onReject(doc.id);
                toast.success(t("docflow.toast.rejected"));
                onClose();
              }}
            >
              <XCircle size={14} />
              <span className="hidden sm:inline">{t("docflow.viewer.rejectDoc")}</span>
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-lime text-lime-foreground hover:bg-lime/90"
              onClick={() => {
                onApprove(doc.id);
                toast.success(t("docflow.toast.approved"));
                onClose();
              }}
            >
              <CheckCircle2 size={14} />
              <span className="hidden sm:inline">{t("docflow.viewer.approve")}</span>
            </Button>
            <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* Split-pane body */}
        <ResizablePanelGroup direction="horizontal" className="h-[72vh]">
          {/* Left — document preview */}
          <ResizablePanel defaultSize={48} minSize={30}>
            <div className="flex h-full flex-col bg-background/40">
              <div className="flex items-center justify-between border-b border-border px-4 py-2">
                <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <FileText size={14} />
                  {t("docflow.viewer.preview")}
                </span>
                <div className="flex items-center gap-2">
                  {doc.ocrLang && (
                    <Badge variant="outline" className="gap-1 bg-violet/10 text-violet border-violet/30">
                      <Languages size={11} />
                      {OCR_LABEL[doc.ocrLang]}
                    </Badge>
                  )}
                  <Badge variant="outline" className="bg-muted text-muted-foreground">
                    {doc.pages} {t("docflow.viewer.pages").toLowerCase()}
                  </Badge>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 sm:p-6">
                  <PagePreview doc={doc} excerpt={excerpt} />
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right — fields + history */}
          <ResizablePanel defaultSize={52} minSize={35}>
            <div className="flex h-full flex-col">
              {/* Classification banner */}
              <div className="flex items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-lime/5 via-transparent to-cyan/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-lime/10 text-lime">
                    <ScanLine size={16} />
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("docflow.viewer.classification")}</p>
                    <div className="flex items-center gap-2">
                      <ClassBadge classification={doc.classification} />
                      <span className="text-sm font-medium">{doc.filename}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{t("docflow.viewer.confidence")}</p>
                    <p className={cn(
                      "font-mono text-sm font-semibold tabular-nums",
                      avgConf >= 0.9 ? "text-lime" : avgConf >= 0.7 ? "text-amber" : "text-rose",
                    )}>
                      {Math.round(avgConf * 100)}%
                    </p>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-4 p-4">
                  {/* Fields */}
                  <section>
                    <h4 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <ShieldCheck size={12} />
                      {t("docflow.viewer.fields")}
                      <Badge variant="outline" className="ml-auto bg-muted text-xs font-normal text-muted-foreground">
                        {doc.fields.length}
                      </Badge>
                    </h4>

                    {doc.fields.length === 0 ? (
                      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-6 text-sm text-muted-foreground">
                        <Loader2 size={14} className="animate-spin" />
                        {t("docflow.viewer.noFields")}
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {doc.fields.map((field) => (
                          <FieldRow
                            key={field.key}
                            field={field}
                            t={t}
                            correcting={correctingKey === field.key}
                            correctingValue={correctingValue}
                            onCorrectingValueChange={setCorrectingValue}
                            onStartCorrecting={() => startCorrecting(field)}
                            onCommitCorrecting={commitCorrecting}
                            onCancelCorrecting={() => setCorrectingKey(null)}
                            onAction={(a) => setFieldAction(field.key, a)}
                          />
                        ))}
                      </ul>
                    )}
                  </section>

                  {/* Version history */}
                  <section>
                    <h4 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <History size={12} />
                      {t("docflow.viewer.history")}
                    </h4>
                    <ol className="relative space-y-3 border-l border-border pl-4">
                      {[...doc.versions].reverse().map((v, i) => (
                        <li key={v.version} className="relative">
                          <span
                            className={cn(
                              "absolute -left-[1.30rem] flex size-3 items-center justify-center rounded-full border",
                              i === 0
                                ? "border-lime bg-lime/20"
                                : "border-border bg-card",
                            )}
                          />
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-muted text-[10px] font-mono">
                              v{v.version}
                            </Badge>
                            <span className="text-xs font-medium">{v.editedBy}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {formatDateTime(v.editedAt, locale)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{v.note}</p>
                        </li>
                      ))}
                    </ol>
                  </section>
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page preview — stylised "document page" representing the source file.
// ─────────────────────────────────────────────────────────────────────────────

function PagePreview({ doc, excerpt }: { doc: DocRecord; excerpt: string }) {
  const { t } = useLocale();
  return (
    <div className="mx-auto max-w-md">
      <div className="surface-elevated overflow-hidden rounded-lg">
        {/* page header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
          <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
            <FileTypeIcon type={doc.type} size={12} />
            <span className="uppercase tracking-wide">{doc.type}</span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">page 1 / {Math.max(1, doc.pages)}</span>
        </div>
        {/* page body */}
        <pre className="whitespace-pre-wrap break-words bg-background px-4 py-5 font-mono text-[11px] leading-relaxed text-foreground/80">
{excerpt}
        </pre>
        {/* page footer */}
        <div className="border-t border-border bg-muted/30 px-3 py-2 text-[10px] text-muted-foreground">
          {t("docflow.viewer.previewStub")}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Field row — value, confidence, validation, provenance, review actions
// ─────────────────────────────────────────────────────────────────────────────

function FieldRow({
  field,
  t,
  correcting,
  correctingValue,
  onCorrectingValueChange,
  onStartCorrecting,
  onCommitCorrecting,
  onCancelCorrecting,
  onAction,
}: {
  field: DocFieldEx;
  t: (key: string, params?: Record<string, string | number>) => string;
  correcting: boolean;
  correctingValue: string;
  onCorrectingValueChange: (v: string) => void;
  onStartCorrecting: () => void;
  onCommitCorrecting: () => void;
  onCancelCorrecting: () => void;
  onAction: (a: FieldReviewAction) => void;
}) {
  const tone = confidenceTone(field.confidence);
  const displayValue = field.correctedValue ?? field.value;
  const isCorrected = !!field.correctedValue;

  return (
    <motion.li
      layout
      className={cn(
        "rounded-lg border bg-card p-3 transition-colors",
        field.reviewed ? "border-border" : "border-amber/30",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{field.key}</span>
            {field.reviewed && field.reviewAction && (
              <Badge variant="outline" className={cn("text-[10px] uppercase", ACTION_TONE[field.reviewAction])}>
                {field.reviewAction.replace("_", " ")}
              </Badge>
            )}
            {isCorrected && (
              <Badge variant="outline" className="bg-cyan/10 text-[10px] text-cyan border-cyan/30">
                corrected
              </Badge>
            )}
          </div>
          {correcting ? (
            <div className="mt-1.5 flex items-center gap-1.5">
              <Input
                value={correctingValue}
                onChange={(e) => onCorrectingValueChange(e.target.value)}
                className="h-8 font-mono text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCommitCorrecting();
                  if (e.key === "Escape") onCancelCorrecting();
                }}
              />
              <Button size="icon" className="size-8 bg-lime text-lime-foreground hover:bg-lime/90" onClick={onCommitCorrecting}>
                <Check size={14} />
              </Button>
              <Button size="icon" variant="ghost" className="size-8" onClick={onCancelCorrecting}>
                <X size={14} />
              </Button>
            </div>
          ) : (
            <p className="mt-0.5 truncate text-sm font-medium">
              {displayValue || <span className="italic text-muted-foreground">—</span>}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <ValidationPill validation={field.validation} />
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mt-2">
        <ConfidenceBar value={field.confidence} />
      </div>

      {/* Provenance */}
      <div className="mt-2 rounded-md border border-border bg-muted/30 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="font-mono text-foreground/70">{t("docflow.provenance.page")} {field.provenance.page}</span>
          </span>
          <span className="font-mono">offsets {formatOffsetRange(field.provenance.offsets)}</span>
          <span className="font-mono">
            {t("docflow.field.confidence").toLowerCase()}:{" "}
            <span className={cn(
              tone === "lime" ? "text-lime" : tone === "amber" ? "text-amber" : "text-rose",
            )}>
              {field.confidence.toFixed(2)}
            </span>
          </span>
        </div>
        <div className="mt-1.5">
          <ExcerptLine excerpt={field.provenance.excerpt} offsets={field.provenance.offsets} />
        </div>
      </div>

      {/* Review actions */}
      {!correcting && (
        <div className="mt-2 flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 gap-1 px-2 text-xs",
              field.reviewAction === "accept"
                ? "bg-lime/10 text-lime hover:bg-lime/20"
                : "text-muted-foreground hover:text-lime",
            )}
            onClick={() => onAction("accept")}
          >
            <Check size={12} />
            {t("docflow.viewer.accept")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 gap-1 px-2 text-xs",
              field.reviewAction === "correct"
                ? "bg-cyan/10 text-cyan hover:bg-cyan/20"
                : "text-muted-foreground hover:text-cyan",
            )}
            onClick={onStartCorrecting}
          >
            <Pencil size={12} />
            {t("docflow.viewer.correct")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 gap-1 px-2 text-xs",
              field.reviewAction === "reject"
                ? "bg-rose/10 text-rose hover:bg-rose/20"
                : "text-muted-foreground hover:text-rose",
            )}
            onClick={() => onAction("reject")}
          >
            <Ban size={12} />
            {t("docflow.viewer.reject")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 gap-1 px-2 text-xs",
              field.reviewAction === "not_found"
                ? "bg-muted text-muted-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onAction("not_found")}
          >
            <HelpCircle size={12} />
            {t("docflow.viewer.notFound")}
          </Button>
        </div>
      )}
    </motion.li>
  );
}
