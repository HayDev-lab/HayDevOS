"use client";

/**
 * ReviewQueueView — human review queue.
 *
 * Stats row (pending / reviewed today / avg confidence), then a list of
 * documents whose fields need review (low confidence, warning / invalid
 * validation, or unreviewed). Each item exposes quick-accept plus an
 * "open in viewer" affordance.
 */

import * as React from "react";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ClipboardCheck,
  CheckCircle2,
  Gauge,
  Clock,
  ExternalLink,
  Inbox as InboxIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

import { type DocRecord, docflowKpis } from "../data";
import {
  FileTypeIcon,
  ClassBadge,
  ValidationPill,
  ConfidenceBar,
  confidenceTone,
} from "../shared";

interface QueueItem {
  doc: DocRecord;
  fieldKey: string;
  fieldValue: string;
  confidence: number;
  validation: "valid" | "warning" | "invalid" | "missing";
}

export function ReviewQueueView({
  documents,
  onOpenViewer,
  onAcceptField,
}: {
  documents: DocRecord[];
  onOpenViewer: (doc: DocRecord) => void;
  onAcceptField: (docId: string, fieldKey: string) => void;
}) {
  const { t } = useLocale();

  const queue = useMemo<QueueItem[]>(() => {
    const out: QueueItem[] = [];
    for (const doc of documents) {
      for (const f of doc.fields) {
        const needsReview =
          !f.reviewed ||
          f.validation === "warning" ||
          f.validation === "invalid" ||
          f.validation === "missing" ||
          f.confidence < 0.9;
        if (needsReview) {
          out.push({
            doc,
            fieldKey: f.key,
            fieldValue: f.correctedValue ?? f.value,
            confidence: f.confidence,
            validation: f.validation,
          });
        }
      }
    }
    // Lowest confidence first
    return out.sort((a, b) => a.confidence - b.confidence);
  }, [documents]);

  const pending = queue.length;
  const reviewedToday = docflowKpis.reviewedToday;
  const avgConfidence = queue.length
    ? queue.reduce((a, q) => a + q.confidence, 0) / queue.length
    : docflowKpis.avgConfidence;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Clock size={16} />}
          label={t("docflow.review.pending")}
          value={String(pending)}
          tone="amber"
        />
        <StatCard
          icon={<CheckCircle2 size={16} />}
          label={t("docflow.review.reviewedToday")}
          value={String(reviewedToday)}
          tone="lime"
        />
        <StatCard
          icon={<Gauge size={16} />}
          label={t("docflow.review.avgConfidence")}
          value={`${Math.round(avgConfidence * 100)}%`}
          tone="cyan"
        />
        <StatCard
          icon={<ClipboardCheck size={16} />}
          label={t("docflow.review.fields")}
          value={String(queue.length)}
          tone="violet"
        />
      </div>

      {/* Queue */}
      <div className="surface-elevated overflow-hidden rounded-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h3 className="text-sm font-medium">{t("docflow.review.fields")}</h3>
          <Badge variant="outline" className="bg-muted text-xs text-muted-foreground">
            {queue.length}
          </Badge>
        </div>

        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <InboxIcon size={32} className="text-lime opacity-60" />
            <p className="text-sm">{t("docflow.review.empty")}</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <ul className="divide-y divide-border">
              {queue.map((item, i) => {
                const tone = confidenceTone(item.confidence);
                return (
                  <motion.li
                    key={`${item.doc.id}-${item.fieldKey}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.012, 0.3) }}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                      <FileTypeIcon type={item.doc.type} size={18} />
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{item.doc.filename}</span>
                        <ClassBadge classification={item.doc.classification} className="hidden sm:inline-flex" />
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs">
                        <span className="font-mono text-muted-foreground">{item.fieldKey}</span>
                        <span className="text-foreground/70">→</span>
                        <span className="truncate font-medium">{item.fieldValue}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="w-24">
                          <ConfidenceBar value={item.confidence} />
                        </div>
                        <ValidationPill validation={item.validation} />
                      </div>
                    </div>

                    <div className="hidden text-right sm:block">
                      <span className={cn(
                        "font-mono text-xs tabular-nums",
                        tone === "lime" ? "text-lime" : tone === "amber" ? "text-amber" : "text-rose",
                      )}>
                        {item.confidence.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 px-2 text-xs text-lime hover:bg-lime/10 hover:text-lime"
                        onClick={() => {
                          onAcceptField(item.doc.id, item.fieldKey);
                          toast.success(t("docflow.toast.fieldAccepted"));
                        }}
                      >
                        <CheckCircle2 size={14} />
                        <span className="hidden md:inline">{t("docflow.review.quickAccept")}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        onClick={() => onOpenViewer(item.doc)}
                        aria-label={t("docflow.review.open")}
                      >
                        <ExternalLink size={14} />
                      </Button>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "lime" | "cyan" | "amber" | "rose" | "violet";
}) {
  const cls: Record<typeof tone, string> = {
    lime: "text-lime bg-lime/10 border-lime/30",
    cyan: "text-cyan bg-cyan/10 border-cyan/30",
    amber: "text-amber bg-amber/10 border-amber/30",
    rose: "text-rose bg-rose/10 border-rose/30",
    violet: "text-violet bg-violet/10 border-violet/30",
  };
  return (
    <Card className="surface-elevated">
      <CardContent className="flex items-center gap-3 p-4">
        <span className={cn("flex size-9 items-center justify-center rounded-lg border", cls[tone])}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-mono text-xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
