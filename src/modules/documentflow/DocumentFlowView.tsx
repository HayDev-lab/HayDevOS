"use client";

/**
 * DocumentFlowView — main view for the DocumentFlow AI module.
 *
 * Owns the in-memory state (documents, batches, schemas, jobs, exports,
 * workers) and runs the pipeline simulation that advances documents
 * through their stages every 1.5 s. Surfaces 9 tabs:
 *   Inbox · Documents · Batches · Review Queue · Schemas · Jobs ·
 *   Exports · Analytics · Settings.
 *
 * Wired into the module registry under the `docsmart` id (see registry.ts).
 */

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox as InboxIcon,
  FileText,
  Layers,
  ClipboardCheck,
  FileSearch,
  Cpu,
  FileOutput,
  BarChart3,
  Settings as SettingsIcon,
  ScanLine,
} from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  type DocRecord,
  type DocBatch,
  type ExtractionSchema,
  type DocJob,
  type DocExport,
  type DocWorker,
  type DocPipelineStage,
  type DocumentStatus,
  type FieldReviewAction,
  type ExportFormat,
  PIPELINE_STAGES,
  STAGE_PROGRESS,
  stageToStatus,
  classifySample,
  buildSampleFields,
  docflowDocuments,
  docflowBatches,
  docflowSchemas,
  docflowJobs,
  docflowExports,
  docflowWorkers,
} from "./data";
import { InboxView } from "./components/InboxView";
import { UploadDialog } from "./components/UploadDialog";
import { DocumentsView } from "./components/DocumentsView";
import { DocumentViewer } from "./components/DocumentViewer";
import { ReviewQueueView } from "./components/ReviewQueueView";
import { BatchesView } from "./components/BatchesView";
import { SchemasView } from "./components/SchemasView";
import { JobsView } from "./components/JobsView";
import { ExportsView } from "./components/ExportsView";
import { AnalyticsView } from "./components/AnalyticsView";
import { SettingsView } from "./components/SettingsView";

type TabKey =
  | "inbox"
  | "documents"
  | "batches"
  | "reviewQueue"
  | "schemas"
  | "jobs"
  | "exports"
  | "analytics"
  | "settings";

const ACTIVE_STAGES: DocPipelineStage[] = [
  "ingest",
  "parse",
  "ocr",
  "classify",
  "extract",
  "validate",
];

export function DocumentFlowView() {
  const { t } = useLocale();
  const [tab, setTab] = useState<TabKey>("inbox");
  const [documents, setDocuments] = useState<DocRecord[]>(docflowDocuments);
  const [batches] = useState<DocBatch[]>(docflowBatches);
  const [schemas, setSchemas] = useState<ExtractionSchema[]>(docflowSchemas);
  const [jobs] = useState<DocJob[]>(docflowJobs);
  const [exportsList, setExportsList] = useState<DocExport[]>(docflowExports);
  const [workers] = useState<DocWorker[]>(docflowWorkers);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewerDocId, setViewerDocId] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Pipeline simulation — every 1.5 s, advance any document that is in an
  // active pipeline stage. Stop at "review" (awaiting human action) or
  // "export" (terminal). Uses the functional setState form so the interval
  // callback always sees the latest document state.
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setDocuments((prev) => {
        let changed = false;
        const next = prev.map((doc) => {
          if (!ACTIVE_STAGES.includes(doc.stage)) return doc;
          const idx = PIPELINE_STAGES.indexOf(doc.stage);
          const nextStage = PIPELINE_STAGES[idx + 1] as DocPipelineStage | undefined;
          if (!nextStage) return doc;
          changed = true;

          let classification = doc.classification;
          let confidence = doc.confidence;
          let ocrLang = doc.ocrLang;
          let fields = doc.fields;
          let status: DocumentStatus = stageToStatus(nextStage);
          let versions = doc.versions;

          if (nextStage === "classify" && !classification) {
            const sample = classifySample(doc.filename);
            classification = sample.classification;
            confidence = sample.confidence;
            ocrLang = sample.ocrLang ?? ocrLang;
            versions = [
              ...versions,
              {
                version: versions.length + 1,
                editedAt: new Date().toISOString(),
                editedBy: "AI Classifier",
                note: `Classified as ${classification}`,
              },
            ];
          }
          if (nextStage === "extract" && fields.length === 0 && classification) {
            fields = buildSampleFields(classification, doc.filename);
            versions = [
              ...versions,
              {
                version: versions.length + 1,
                editedAt: new Date().toISOString(),
                editedBy: "AI Extractor",
                note: "Initial extraction",
              },
            ];
          }
          if (nextStage === "review") {
            status = "reviewed";
            versions = [
              ...versions,
              {
                version: versions.length + 1,
                editedAt: new Date().toISOString(),
                editedBy: "Pipeline",
                note: "Awaiting human review",
              },
            ];
          }

          return {
            ...doc,
            stage: nextStage,
            status,
            progressPct: STAGE_PROGRESS[nextStage],
            classification,
            confidence,
            ocrLang,
            fields,
            versions,
            updatedAt: new Date().toISOString(),
          };
        });
        return changed ? next : prev;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // The viewer document is derived from `documents` so the viewer always
  // shows the latest pipeline state without needing a sync effect.
  const viewerDoc = viewerDocId
    ? documents.find((d) => d.id === viewerDocId) ?? null
    : null;

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────
  const handleUploaded = useCallback((docs: DocRecord[]) => {
    setDocuments((prev) => [...docs, ...prev]);
    setTab("inbox");
  }, []);

  const updateDoc = useCallback((updated: DocRecord) => {
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  }, []);

  const openViewer = useCallback((doc: DocRecord) => setViewerDocId(doc.id), []);
  const closeViewer = useCallback(() => setViewerDocId(null), []);

  const approveDoc = useCallback((id: string) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status: "approved",
              stage: "export",
              progressPct: 100,
              version: d.version + 1,
              updatedAt: new Date().toISOString(),
              versions: [
                ...d.versions,
                {
                  version: d.version + 1,
                  editedAt: new Date().toISOString(),
                  editedBy: "Aram Hayrapetyan",
                  note: "Approved for export",
                },
              ],
            }
          : d,
      ),
    );
  }, []);

  const rejectDoc = useCallback((id: string) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status: "rejected",
              updatedAt: new Date().toISOString(),
              version: d.version + 1,
              versions: [
                ...d.versions,
                {
                  version: d.version + 1,
                  editedAt: new Date().toISOString(),
                  editedBy: "Aram Hayrapetyan",
                  note: "Rejected",
                },
              ],
            }
          : d,
      ),
    );
  }, []);

  const deleteDoc = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const bulkAction = useCallback(
    (ids: string[], action: "classify" | "extract" | "approve" | "delete") => {
      setDocuments((prev) => {
        if (action === "delete") return prev.filter((d) => !ids.includes(d.id));
        return prev.map((d) => {
          if (!ids.includes(d.id)) return d;
          if (action === "classify") {
            const sample = classifySample(d.filename);
            return {
              ...d,
              classification: sample.classification,
              confidence: sample.confidence,
              ocrLang: sample.ocrLang ?? d.ocrLang,
              stage: "classify" as DocPipelineStage,
              status: "classified" as DocumentStatus,
              progressPct: STAGE_PROGRESS.classify,
              updatedAt: new Date().toISOString(),
            };
          }
          if (action === "extract") {
            const cls = d.classification ?? classifySample(d.filename).classification;
            return {
              ...d,
              classification: cls,
              confidence: d.confidence ?? 0.88,
              fields: d.fields.length ? d.fields : buildSampleFields(cls, d.filename),
              stage: "extract" as DocPipelineStage,
              status: "extracted" as DocumentStatus,
              progressPct: STAGE_PROGRESS.extract,
              updatedAt: new Date().toISOString(),
            };
          }
          if (action === "approve") {
            return {
              ...d,
              status: "approved" as DocumentStatus,
              stage: "export" as DocPipelineStage,
              progressPct: 100,
              updatedAt: new Date().toISOString(),
            };
          }
          return d;
        });
      });
    },
    [],
  );

  const acceptField = useCallback((docId: string, fieldKey: string) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId
          ? {
              ...d,
              fields: d.fields.map((f) =>
                f.key === fieldKey
                  ? {
                      ...f,
                      reviewed: true,
                      reviewAction: "accept" as FieldReviewAction,
                      validation: "valid" as const,
                    }
                  : f,
              ),
              updatedAt: new Date().toISOString(),
            }
          : d,
      ),
    );
  }, []);

  const saveSchema = useCallback((schema: ExtractionSchema) => {
    setSchemas((prev) => {
      const idx = prev.findIndex((s) => s.id === schema.id);
      if (idx === -1) return [...prev, schema];
      return prev.map((s) => (s.id === schema.id ? schema : s));
    });
  }, []);

  const deleteSchema = useCallback((id: string) => {
    setSchemas((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const queueExport = useCallback((format: ExportFormat) => {
    const target =
      format === "csv"
        ? "Finance — CSV bundle"
        : format === "json"
          ? "Data lake (S3)"
          : format === "erp_quickbooks"
            ? "QuickBooks Online"
            : format === "erp_sap"
              ? "SAP S/4HANA"
              : "Microsoft Dynamics";
    const ex: DocExport = {
      id: "ex_" + Math.random().toString(36).slice(2, 6),
      orgId: "org_haydev",
      target,
      format,
      records: 0,
      status: "queued",
      createdAt: new Date().toISOString(),
      createdByName: "Aram Hayrapetyan",
    };
    setExportsList((prev) => [ex, ...prev]);
  }, []);

  const rerunExport = useCallback((id: string) => {
    setExportsList((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, status: "queued", records: 0, createdAt: new Date().toISOString() }
          : e,
      ),
    );
  }, []);

  const downloadExport = useCallback((_id: string) => {
    // Mock — in production this would stream the file from object storage.
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Tab metadata
  // ─────────────────────────────────────────────────────────────────────────
  const TABS: { key: TabKey; icon: typeof InboxIcon; labelKey: string }[] = useMemo(
    () => [
      { key: "inbox", icon: InboxIcon, labelKey: "docflow.tab.inbox" },
      { key: "documents", icon: FileText, labelKey: "docflow.tab.documents" },
      { key: "batches", icon: Layers, labelKey: "docflow.tab.batches" },
      { key: "reviewQueue", icon: ClipboardCheck, labelKey: "docflow.tab.reviewQueue" },
      { key: "schemas", icon: FileSearch, labelKey: "docflow.tab.schemas" },
      { key: "jobs", icon: Cpu, labelKey: "docflow.tab.jobs" },
      { key: "exports", icon: FileOutput, labelKey: "docflow.tab.exports" },
      { key: "analytics", icon: BarChart3, labelKey: "docflow.tab.analytics" },
      { key: "settings", icon: SettingsIcon, labelKey: "docflow.tab.settings" },
    ],
    [],
  );

  const inboxCount = documents.filter(
    (d) => ACTIVE_STAGES.includes(d.stage) || d.status === "pending" || d.status === "processing",
  ).length;
  const reviewCount = documents.filter(
    (d) => d.fields.some((f) => !f.reviewed || f.confidence < 0.9 || f.validation === "warning" || f.validation === "invalid"),
  ).length;
  const queuedJobs = jobs.filter((j) => j.status === "queued" || j.status === "running").length;

  const counts: Partial<Record<TabKey, number>> = {
    inbox: inboxCount,
    reviewQueue: reviewCount,
    jobs: queuedJobs,
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-lg bg-amber/10 text-amber glow-cyan">
              <ScanLine size={20} />
            </span>
            <span className="text-gradient-brand">{t("docflow.title")}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("docflow.subtitle")}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="w-full">
        <div className="overflow-x-auto pb-1">
          <TabsList className="flex h-auto w-max gap-0.5 bg-card/60 p-1">
            {TABS.map((tb) => (
              <TabsTrigger
                key={tb.key}
                value={tb.key}
                className="gap-1.5 px-3 py-1.5 text-xs data-[state=active]:bg-lime/10 data-[state=active]:text-lime"
              >
                <tb.icon size={14} />
                <span className="whitespace-nowrap">{t(tb.labelKey)}</span>
                {counts[tb.key] !== undefined && counts[tb.key]! > 0 && (
                  <span
                    className={cn(
                      "ml-1 rounded px-1.5 py-0 text-[10px] font-mono tabular-nums",
                      tb.key === "reviewQueue"
                        ? "bg-amber/15 text-amber"
                        : tb.key === "jobs"
                          ? "bg-cyan/15 text-cyan"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {counts[tb.key]}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Tab body */}
        <div className="mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              {tab === "inbox" && (
                <InboxView
                  documents={documents}
                  onOpenViewer={openViewer}
                  onOpenUpload={() => setUploadOpen(true)}
                  onApprove={approveDoc}
                  onBulkAction={bulkAction}
                />
              )}
              {tab === "documents" && (
                <DocumentsView documents={documents} onOpenViewer={openViewer} />
              )}
              {tab === "batches" && (
                <BatchesView
                  batches={batches}
                  documents={documents}
                  onOpenViewer={openViewer}
                />
              )}
              {tab === "reviewQueue" && (
                <ReviewQueueView
                  documents={documents}
                  onOpenViewer={openViewer}
                  onAcceptField={acceptField}
                />
              )}
              {tab === "schemas" && (
                <SchemasView schemas={schemas} onSave={saveSchema} onDelete={deleteSchema} />
              )}
              {tab === "jobs" && <JobsView jobs={jobs} workers={workers} />}
              {tab === "exports" && (
                <ExportsView
                  exports={exportsList}
                  onQueueExport={queueExport}
                  onRerun={rerunExport}
                  onDownload={downloadExport}
                />
              )}
              {tab === "analytics" && <AnalyticsView />}
              {tab === "settings" && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </Tabs>

      {/* Upload dialog */}
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={handleUploaded}
        uploaderId="usr_owner"
        uploaderName="Aram Hayrapetyan"
      />

      {/* Document viewer */}
      <DocumentViewer
        doc={viewerDoc}
        onClose={closeViewer}
        onUpdateDoc={updateDoc}
        onApprove={approveDoc}
        onReject={rejectDoc}
      />
    </div>
  );
}
