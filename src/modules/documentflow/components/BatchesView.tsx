"use client";

/**
 * BatchesView — upload batches with expand-to-reveal documents.
 *
 * Each row: batch name, document count, status, progress (avg of doc progress),
 * created date. Expanding reveals the batch's documents with type icon +
 * filename + status; clicking a document opens the viewer.
 */

import * as React from "react";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Layers,
  ExternalLink,
  Calendar,
  Boxes,
} from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { cn, relativeTime, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { type DocBatch, type DocRecord } from "../data";
import {
  FileTypeIcon,
  StatusBadge,
  ClassBadge,
  BatchStatusBadge,
  formatBytes,
} from "../shared";

export function BatchesView({
  batches,
  documents,
  onOpenViewer,
}: {
  batches: DocBatch[];
  documents: DocRecord[];
  onOpenViewer: (doc: DocRecord) => void;
}) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState<Set<string>>(new Set([batches[0]?.id ?? ""]));

  const toggle = (id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const docsByBatch = useMemo(() => {
    const map = new Map<string, DocRecord[]>();
    for (const b of batches) {
      map.set(
        b.id,
        b.docIds
          .map((id) => documents.find((d) => d.id === id))
          .filter((d): d is DocRecord => !!d),
      );
    }
    return map;
  }, [batches, documents]);

  return (
    <div className="surface-elevated overflow-hidden rounded-xl">
      <div className="grid grid-cols-[auto_minmax(0,1.5fr)_auto_auto_auto] items-center gap-3 border-b border-border px-4 py-2.5 text-xs font-medium text-muted-foreground">
        <span />
        <span>{t("docflow.batches.name")}</span>
        <span className="hidden sm:inline">{t("docflow.batches.count")}</span>
        <span>{t("docflow.batches.progress")}</span>
        <span className="text-right">{t("docflow.batches.created")}</span>
      </div>

      {batches.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
          <Boxes size={32} className="opacity-40" />
          <p className="text-sm">{t("docflow.batches.empty")}</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[70vh]">
          <div className="divide-y divide-border">
            {batches.map((batch) => {
              const docs = docsByBatch.get(batch.id) ?? [];
              const avgProgress = docs.length
                ? Math.round(docs.reduce((a, d) => a + d.progressPct, 0) / docs.length)
                : 0;
              const isOpen = open.has(batch.id);
              return (
                <Collapsible key={batch.id} open={isOpen} onOpenChange={() => toggle(batch.id)}>
                  <CollapsibleTrigger asChild>
                    <button
                      className="grid w-full grid-cols-[auto_minmax(0,1.5fr)_auto_auto_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                    >
                      <span className="flex size-6 items-center justify-center text-muted-foreground">
                        <motion.span animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.15 }}>
                          <ChevronRight size={16} />
                        </motion.span>
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Layers size={14} className="text-amber" />
                          <span className="truncate text-sm font-medium">{batch.name}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{batch.createdByName}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {relativeTime(batch.createdAt, locale)}
                          </span>
                        </div>
                      </div>
                      <div className="hidden items-center gap-2 sm:flex">
                        <Badge variant="outline" className="bg-muted text-xs font-mono text-muted-foreground">
                          {docs.length}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <BatchStatusBadge status={batch.status} />
                        <div className="hidden w-20 sm:block">
                          <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                avgProgress >= 100 ? "bg-lime" : avgProgress > 50 ? "bg-cyan" : "bg-amber",
                              )}
                              style={{ width: `${avgProgress}%` }}
                            />
                          </div>
                          <div className="mt-0.5 text-right font-mono text-[10px] text-muted-foreground tabular-nums">
                            {avgProgress}%
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {formatDateTime(batch.createdAt, locale)}
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden bg-background/40"
                        >
                          <ul className="divide-y divide-border/60 border-t border-border/60">
                            {docs.length === 0 ? (
                              <li className="px-4 py-3 text-xs text-muted-foreground">—</li>
                            ) : (
                              docs.map((doc) => (
                                <li
                                  key={doc.id}
                                  className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30"
                                  onClick={() => onOpenViewer(doc)}
                                >
                                  <span className="flex size-7 items-center justify-center rounded border border-border bg-card">
                                    <FileTypeIcon type={doc.type} size={14} />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <span className="truncate text-sm font-medium">{doc.filename}</span>
                                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                      <span>{formatBytes(doc.size)}</span>
                                      <span>·</span>
                                      <span>{doc.uploadedByName}</span>
                                    </div>
                                  </div>
                                  <ClassBadge classification={doc.classification} />
                                  <StatusBadge status={doc.status} />
                                  <ExternalLink size={12} className="text-muted-foreground" />
                                </li>
                              ))
                            )}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
