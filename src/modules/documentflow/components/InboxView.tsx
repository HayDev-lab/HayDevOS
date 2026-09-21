"use client";

/**
 * InboxView — recent uploads awaiting processing.
 *
 * List of documents with: filename, type icon, size, uploadedBy, status,
 * classification badge, confidence, and a compact pipeline progress stepper.
 * Supports status/type filters, multi-select with bulk actions (Classify /
 * Extract / Approve / Delete), and an "Upload" button that opens UploadDialog.
 */

import * as React from "react";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  CheckSquare,
  Square,
  Trash2,
  CheckCircle2,
  Sparkles,
  ScanLine,
  Inbox as InboxIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { relativeTime, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  type DocRecord,
  type DocType,
  type DocumentStatus,
} from "../data";
import {
  FileTypeIcon,
  FileTypeBadge,
  StatusBadge,
  ClassBadge,
  ConfidenceBar,
  PipelineStepper,
  formatBytes,
} from "../shared";

const STATUSES: DocumentStatus[] = [
  "pending",
  "processing",
  "classified",
  "extracted",
  "reviewed",
  "approved",
  "rejected",
];

const TYPES: DocType[] = ["pdf", "docx", "xlsx", "csv", "txt", "png", "jpg"];

export function InboxView({
  documents,
  onOpenViewer,
  onOpenUpload,
  onApprove,
  onBulkAction,
}: {
  documents: DocRecord[];
  onOpenViewer: (doc: DocRecord) => void;
  onOpenUpload: () => void;
  onApprove: (id: string) => void;
  onBulkAction: (ids: string[], action: "classify" | "extract" | "approve" | "delete") => void;
}) {
  const { t, locale } = useLocale();
  const [filterStatus, setFilterStatus] = useState<DocumentStatus | "all">("all");
  const [filterType, setFilterType] = useState<DocType | "all">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    return [...documents]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 12);
  }, [documents]);

  const filtered = useMemo(() => {
    return sorted.filter((d) => {
      if (filterStatus !== "all" && d.status !== filterStatus) return false;
      if (filterType !== "all" && d.type !== filterType) return false;
      return true;
    });
  }, [sorted, filterStatus, filterType]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((d) => d.id)));
  };

  const handleBulk = (action: "classify" | "extract" | "approve" | "delete") => {
    if (selected.size === 0) {
      toast.error(t("docflow.toast.noSelection"));
      return;
    }
    onBulkAction(Array.from(selected), action);
    toast.success(t("docflow.toast.bulkAction", { n: selected.size }));
    setSelected(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <Button onClick={onOpenUpload} className="gap-2">
            <Upload size={16} />
            {t("docflow.inbox.upload")}
          </Button>
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as DocumentStatus | "all")}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue placeholder={t("docflow.inbox.filterStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("docflow.inbox.allStatuses")}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`docflow.status.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={(v) => setFilterType(v as DocType | "all")}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder={t("docflow.inbox.filterType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("docflow.inbox.allTypes")}</SelectItem>
              {TYPES.map((ty) => (
                <SelectItem key={ty} value={ty}>
                  <span className="uppercase">{ty}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-lg border border-border bg-card/60 p-1"
          >
            <span className="px-2 text-xs text-muted-foreground">
              {t("docflow.selected", { n: selected.size })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => handleBulk("classify")}
            >
              <Sparkles size={14} className="text-amber" />
              {t("docflow.classify")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => handleBulk("extract")}
            >
              <ScanLine size={14} className="text-cyan" />
              {t("docflow.extract")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => handleBulk("approve")}
            >
              <CheckCircle2 size={14} className="text-lime" />
              {t("docflow.approve")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-rose hover:text-rose"
              onClick={() => handleBulk("delete")}
            >
              <Trash2 size={14} />
              {t("common.delete")}
            </Button>
          </motion.div>
        )}
      </div>

      {/* List */}
      <div className="surface-elevated overflow-hidden rounded-xl">
        {/* Header */}
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1.2fr)_auto] items-center gap-3 border-b border-border px-4 py-2.5 text-xs font-medium text-muted-foreground">
          <button
            onClick={selectAll}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Select all"
          >
            {selected.size === filtered.length && filtered.length > 0 ? (
              <CheckSquare size={16} className="text-lime" />
            ) : (
              <Square size={16} />
            )}
          </button>
          <span>{t("docflow.inbox.filename")}</span>
          <span className="hidden md:inline">{t("docflow.inbox.uploadedAt")}</span>
          <span>{t("docflow.inbox.progress")}</span>
          <span className="text-right">{t("docflow.inbox.confidence")}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <InboxIcon size={32} className="opacity-40" />
            <p className="text-sm">{t("docflow.inbox.empty")}</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="divide-y divide-border">
              {filtered.map((doc, i) => {
                const isSelected = selected.has(doc.id);
                const avgConf = doc.fields.length
                  ? doc.fields.reduce((a, f) => a + f.confidence, 0) / doc.fields.length
                  : doc.confidence ?? 0;
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.015 }}
                    className={cn(
                      "grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1.2fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30",
                      isSelected && "bg-lime/5",
                    )}
                    onClick={() => onOpenViewer(doc)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(doc.id);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Select"
                    >
                      {isSelected ? (
                        <CheckSquare size={16} className="text-lime" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>

                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                        <FileTypeIcon type={doc.type} size={18} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{doc.filename}</span>
                          <FileTypeBadge type={doc.type} className="hidden sm:inline-flex" />
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatBytes(doc.size)}</span>
                          <span>·</span>
                          <span>{doc.uploadedByName}</span>
                          <span className="hidden md:inline">·</span>
                          <span className="hidden md:inline">{relativeTime(doc.createdAt, locale)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="hidden items-center gap-2 md:flex">
                      <StatusBadge status={doc.status} />
                      <ClassBadge classification={doc.classification} />
                    </div>

                    <div className="min-w-0">
                      <PipelineStepper stage={doc.stage} progressPct={doc.progressPct} compact />
                    </div>

                    <div className="flex items-center gap-2">
                      {doc.confidence !== null ? (
                        <div className="w-24">
                          <ConfidenceBar value={avgConf || doc.confidence} />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                      {doc.status === "reviewed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-lime hover:text-lime"
                          onClick={(e) => {
                            e.stopPropagation();
                            onApprove(doc.id);
                          }}
                        >
                          <CheckCircle2 size={14} />
                          <span className="hidden lg:inline">{t("docflow.approve")}</span>
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Footer summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {filtered.length} / {documents.length}
        </span>
        <span className="hidden sm:inline">{t("docflow.inbox.subtitle")}</span>
      </div>
    </div>
  );
}
