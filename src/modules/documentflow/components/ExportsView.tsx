"use client";

/**
 * ExportsView — list of past exports + new export action.
 *
 * Each row: target, format, records, status, created, by, with Download
 * and Re-run actions. "New export" queues a fresh export (mock) and surfaces
 * a toast.
 */

import * as React from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  RotateCw,
  Plus,
  FileOutput,
  Database,
  Building2,
  FileJson,
  Sheet,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn, relativeTime, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  type DocExport,
  type ExportFormat,
} from "../data";
import { ExportStatusBadge, ExportFormatBadge } from "../shared";

const FORMAT_ICON: Record<ExportFormat, React.ReactNode> = {
  csv: <Sheet size={14} className="text-success" />,
  json: <FileJson size={14} className="text-cyan" />,
  erp_quickbooks: <Building2 size={14} className="text-cyan" />,
  erp_sap: <Building2 size={14} className="text-violet" />,
  erp_dynamics: <Building2 size={14} className="text-violet" />,
};

export function ExportsView({
  exports,
  onQueueExport,
  onRerun,
  onDownload,
}: {
  exports: DocExport[];
  onQueueExport: (format: ExportFormat) => void;
  onRerun: (id: string) => void;
  onDownload: (id: string) => void;
}) {
  const { t, locale } = useLocale();
  const [newFormat, setNewFormat] = useState<ExportFormat>("csv");
  const sorted = [...exports].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="space-y-4">
      {/* New export bar */}
      <div className="surface-elevated flex flex-wrap items-center gap-2 rounded-xl p-3">
        <span className="flex size-9 items-center justify-center rounded-lg border border-lime/30 bg-lime/10 text-lime">
          <FileOutput size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t("docflow.exports.new")}</p>
          <p className="text-xs text-muted-foreground">{t("docflow.exports.subtitle")}</p>
        </div>
        <Select value={newFormat} onValueChange={(v) => setNewFormat(v as ExportFormat)}>
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="csv">CSV</SelectItem>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="erp_quickbooks">QuickBooks Online</SelectItem>
            <SelectItem value="erp_sap">SAP S/4HANA</SelectItem>
            <SelectItem value="erp_dynamics">Microsoft Dynamics</SelectItem>
          </SelectContent>
        </Select>
        <Button
          className="gap-2"
          onClick={() => {
            onQueueExport(newFormat);
            toast.success(t("docflow.toast.exportQueued"));
          }}
        >
          <Plus size={16} />
          {t("docflow.exports.new")}
        </Button>
      </div>

      {/* Exports list */}
      <div className="surface-elevated overflow-hidden rounded-xl">
        <div className="grid grid-cols-[auto_minmax(0,1.4fr)_auto_auto_auto_auto] items-center gap-3 border-b border-border bg-muted/30 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <span>{t("docflow.exports.format")}</span>
          <span>{t("docflow.exports.target")}</span>
          <span className="hidden sm:inline">{t("docflow.exports.records")}</span>
          <span>{t("docflow.inbox.status")}</span>
          <span className="hidden md:inline">{t("docflow.exports.created")}</span>
          <span className="text-right">{t("common.actions")}</span>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <Database size={32} className="opacity-40" />
            <p className="text-sm">{t("docflow.exports.empty")}</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="divide-y divide-border">
              {sorted.map((ex, i) => (
                <motion.div
                  key={ex.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.015, 0.3) }}
                  className="grid grid-cols-[auto_minmax(0,1.4fr)_auto_auto_auto_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                >
                  <span className="flex size-8 items-center justify-center rounded-md border border-border bg-card">
                    {FORMAT_ICON[ex.format]}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{ex.target}</span>
                      <ExportFormatBadge format={ex.format} />
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      by {ex.createdByName}
                    </div>
                  </div>
                  <div className="hidden items-center gap-1 sm:flex">
                    <span className="font-mono text-sm tabular-nums">{ex.records}</span>
                    <span className="text-xs text-muted-foreground">recs</span>
                  </div>
                  <ExportStatusBadge status={ex.status} />
                  <span className="hidden text-xs text-muted-foreground md:inline">
                    {formatDateTime(ex.createdAt, locale)}
                    <span className="ml-1 text-[10px] opacity-70">{relativeTime(ex.createdAt, locale)}</span>
                  </span>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-cyan hover:bg-cyan/10 hover:text-cyan"
                      onClick={() => onDownload(ex.id)}
                      disabled={ex.status !== "success"}
                    >
                      <Download size={14} />
                      <span className="hidden lg:inline">{t("docflow.exports.download")}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-amber hover:bg-amber/10 hover:text-amber"
                      onClick={() => {
                        onRerun(ex.id);
                        toast.success(t("docflow.toast.exportQueued"));
                      }}
                    >
                      <RotateCw size={14} />
                      <span className="hidden lg:inline">{t("docflow.exports.rerun")}</span>
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
