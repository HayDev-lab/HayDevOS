"use client";

/**
 * LeadOS — Pipeline Kanban.
 *
 * 7 columns (New, Contacted, Qualified, Proposal, Negotiation, Won, Lost).
 * Each lead is a card (name, company, value, owner avatar, SLA dot). Drag
 * between columns persists the stage through the tenant-scoped LeadOS API.
 * Columns show count + total value.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn, formatCurrency, formatCompact } from "@/lib/utils";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import {
  asLeadRecord,
  LEAD_STAGES,
  STAGE_BY_ID,
  getSlaStatus,
  type LeadStage,
  type LeadRecord,
} from "../data";
import { useLeadOSData } from "../LeadOSData";
import { OwnerAvatar } from "./shared";

interface PipelineKanbanProps {
  /** Optional: controlled leads (otherwise uses allLeads). */
  leads?: LeadRecord[];
  /** Notify parent of stage change (e.g., to refresh detail). */
  onStageChange?: (leadId: string, newStage: LeadStage) => Promise<void>;
}

export function PipelineKanban({ leads: initialLeads, onStageChange }: PipelineKanbanProps) {
  const { t, locale } = useLocale();
  const { overview, changeStage } = useLeadOSData();
  const sourceLeads = useMemo(
    () => initialLeads ?? (overview?.leads.map(asLeadRecord) ?? []),
    [initialLeads, overview],
  );
  const [activeLead, setActiveLead] = useState<LeadRecord | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const byStage = useMemo(() => {
    const map: Record<LeadStage, LeadRecord[]> = {
      new: [], contacted: [], qualified: [], proposal: [], negotiation: [], won: [], lost: [],
    };
    for (const l of sourceLeads) map[l.stage].push(l);
    return map;
  }, [sourceLeads]);

  function handleDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    const lead = sourceLeads.find((l) => l.id === id);
    setActiveLead(lead ?? null);
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveLead(null);
    const leadId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;
    const newStage = overId.replace("col-", "") as LeadStage;
    if (!LEAD_STAGES.some((s) => s.id === newStage)) return;
    const lead = sourceLeads.find((l) => l.id === leadId);
    if (!lead || lead.stage === newStage) return;
    try {
      if (onStageChange) await onStageChange(leadId, newStage);
      else await changeStage(leadId, { stage: newStage });
      toast.success(t("leados.toast.stageMoved", { name: lead.name, stage: t(STAGE_BY_ID[newStage].labelKey) }));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Stage could not be updated");
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveLead(null)}
    >
      <div className="flex flex-col gap-3">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {t("leados.pipeline.dragHint")} · {t("leados.settings.firstResponseTarget")}: {Math.round((overview?.slaPolicy.firstResponseMinutes ?? 0) / 60)}h
        </p>
        <ScrollArea className="w-full pb-2">
          <div className="flex gap-3 pb-2" style={{ minWidth: "min-content" }}>
            {LEAD_STAGES.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage.id}
                leads={byStage[stage.id]}
                t={t}
                locale={locale}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
        {activeLead ? (
          <div className="rotate-2 opacity-95">
            <LeadCard lead={activeLead} t={t} locale={locale} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Column
// ─────────────────────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  leads,
  t,
  locale,
}: {
  stage: LeadStage;
  leads: LeadRecord[];
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: string;
}) {
  const def = STAGE_BY_ID[stage];
  const { setNodeRef, isOver } = useDroppable({ id: `col-${stage}` });
  const total = leads.reduce((s, l) => s + l.value, 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-[260px] shrink-0 flex-col rounded-xl border bg-card/40 transition-colors",
        isOver ? "border-primary/40 bg-primary/5" : "border-border",
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", def.dot)} />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            {t(def.labelKey)}
          </span>
          <span className="rounded-full bg-muted/60 px-1.5 py-0 text-[10px] text-muted-foreground">
            {leads.length}
          </span>
        </div>
        <span className="text-[10px] font-medium text-muted-foreground">
          {formatCompact(total)}
        </span>
      </div>

      {/* Cards */}
      <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto p-2">
        {leads.map((lead) => (
          <DraggableCard key={lead.id} lead={lead} t={t} locale={locale} />
        ))}
        {leads.length === 0 && (
          <div className="rounded-md border border-dashed border-border/60 px-3 py-6 text-center text-[10px] uppercase tracking-wider text-muted-foreground/60">
            {t("leados.pipeline.empty")}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/70">
        {t("leados.pipeline.total")}: {formatCurrency(total, "USD")}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Draggable card
// ─────────────────────────────────────────────────────────────────────────────

function DraggableCard({
  lead,
  t,
  locale,
}: {
  lead: LeadRecord;
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(isDragging && "opacity-30")}
    >
      <LeadCard lead={lead} t={t} locale={locale} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lead card (visual)
// ─────────────────────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  t,
  locale,
  dragging,
}: {
  lead: LeadRecord;
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: string;
  dragging?: boolean;
}) {
  const sla = getSlaStatus(lead);
  const slaDot =
    sla === "on-track" ? "bg-cyan" : sla === "warning" ? "bg-amber" : "bg-rose";
  void locale;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "group relative cursor-grab rounded-lg border border-border bg-card p-3 transition-shadow hover:border-primary/40 hover:shadow-md active:cursor-grabbing",
        dragging && "shadow-lg",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{lead.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{lead.company ?? "—"}</p>
        </div>
        <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", slaDot)} aria-label={t(`leados.sla.${sla === "on-track" ? "onTrack" : sla === "warning" ? "warning" : "breach"}`)} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <OwnerAvatar ownerId={lead.ownerId} size="xs" />
        <span className="text-xs font-medium text-foreground">
          {formatCurrency(lead.value, lead.currency)}
        </span>
      </div>
    </motion.div>
  );
}
