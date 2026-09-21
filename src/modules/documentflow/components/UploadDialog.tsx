"use client";

/**
 * UploadDialog — mock upload experience.
 *
 * Dropzone-style area with a hidden file input. MIME-type validation
 * (pdf, docx, xlsx, csv, txt, png, jpg), 25 MB file size limit warning,
 * sample-file quick-pick buttons, and a per-file progress simulation
 * (Queued → Uploading → Processing). On "Start upload" the dialog creates
 * fresh DocRecords via buildNewDocument and hands them to the parent so the
 * pipeline simulation can take over.
 */

import * as React from "react";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileWarning,
  CheckCircle2,
  Loader2,
  X,
  FileUp,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  type DocRecord,
  type DocType,
  ACCEPTED_MIME_TYPES,
  MAX_FILE_SIZE_MB,
  SAMPLE_FILES,
  buildNewDocument,
  typeFromMime,
} from "../data";
import { FileTypeBadge, formatBytes } from "../shared";

interface PendingFile {
  id: string;
  filename: string;
  mime: string;
  size: number;
  phase: "queued" | "uploading" | "processing";
  progress: number; // 0..100
  error?: "invalid_type" | "invalid_size";
}

type Phase = PendingFile["phase"];

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function extFromMime(mime: string): DocType {
  return typeFromMime(mime);
}

export function UploadDialog({
  open,
  onOpenChange,
  onUploaded,
  uploaderId,
  uploaderName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: (docs: DocRecord[]) => void;
  uploaderId: string;
  uploaderName: string;
}) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const validateFile = (file: { name: string; type: string; size: number }): PendingFile["error"] | undefined => {
    // The browser may leave `type` empty for some files; fall back to extension.
    let mime = file.type;
    if (!mime) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const map: Record<string, string> = {
        pdf: "application/pdf",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        csv: "text/csv",
        txt: "text/plain",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
      };
      mime = map[ext] ?? "";
    }
    if (!ACCEPTED_MIME_TYPES.includes(mime)) return "invalid_type";
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) return "invalid_size";
    return undefined;
  };

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const next: PendingFile[] = arr.map((f) => {
      const error = validateFile(f);
      let mime = f.type;
      if (!mime) {
        const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
        const map: Record<string, string> = {
          pdf: "application/pdf",
          docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          csv: "text/csv",
          txt: "text/plain",
          png: "image/png",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
        };
        mime = map[ext] ?? "";
      }
      return {
        id: genId(),
        filename: f.name,
        mime,
        size: f.size,
        phase: "queued",
        progress: 0,
        error,
      };
    });
    setPending((prev) => [...prev, ...next]);
    // Surface validation errors immediately
    for (const p of next) {
      if (p.error) toast.error(`${p.filename}: ${t(`docflow.upload.${p.error}`)}`);
    }
  };

  const addSample = (sample: { filename: string; mime: string; size: number }) => {
    setPending((prev) => [
      ...prev,
      { id: genId(), filename: sample.filename, mime: sample.mime, size: sample.size, phase: "queued", progress: 0 },
    ]);
  };

  const removePending = (id: string) => {
    setPending((prev) => prev.filter((p) => p.id !== id));
  };

  // Simulate per-file upload progress when the user starts the upload.
  const startUpload = () => {
    if (pending.length === 0) return;
    const valid = pending.filter((p) => !p.error);
    if (valid.length === 0) {
      toast.error(t("docflow.upload.invalidType"));
      return;
    }
    toast.info(t("docflow.upload.starting", { n: valid.length }));

    // Walk through each file, advancing phase: queued → uploading → processing
    valid.forEach((file, idx) => {
      // Stagger start by 200ms per file
      setTimeout(() => {
        // uploading
        setPending((prev) =>
          prev.map((p) => (p.id === file.id ? { ...p, phase: "uploading" } : p)),
        );
        const tickMs = 120;
        const totalMs = 900;
        const steps = totalMs / tickMs;
        let step = 0;
        const interval = setInterval(() => {
          step += 1;
          const pct = Math.min(100, Math.round((step / steps) * 100));
          setPending((prev) =>
            prev.map((p) =>
              p.id === file.id ? { ...p, progress: pct } : p,
            ),
          );
          if (step >= steps) {
            clearInterval(interval);
            // processing
            setPending((prev) =>
              prev.map((p) =>
                p.id === file.id ? { ...p, phase: "processing", progress: 100 } : p,
              ),
            );
            // After all files finish, emit
            if (idx === valid.length - 1) {
              setTimeout(() => {
                const docs = valid.map((p) =>
                  buildNewDocument({
                    filename: p.filename,
                    mime: p.mime,
                    size: p.size,
                    uploadedById: uploaderId,
                    uploadedByName: uploaderName,
                    batchId: null,
                  }),
                );
                onUploaded(docs);
                toast.success(t("docflow.upload.done"));
                setPending([]);
                onOpenChange(false);
              }, 500);
            }
          }
        }, tickMs);
      }, idx * 200);
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  };

  const isUploading = pending.some((p) => p.phase !== "queued" && !p.error);

  return (
    <Dialog open={open} onOpenChange={isUploading ? () => {} : onOpenChange}>
      <DialogContent className="max-w-2xl border-border bg-card p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Upload size={18} className="text-lime" />
            {t("docflow.upload.title")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("docflow.upload.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          {/* Dropzone */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
              isDragging
                ? "border-lime bg-lime/5"
                : "border-border bg-muted/30 hover:border-lime/50 hover:bg-lime/5",
            )}
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-lime/10 text-lime">
              <FileUp size={22} />
            </span>
            <p className="text-sm font-medium">{t("docflow.upload.dropzone")}</p>
            <p className="text-xs text-muted-foreground">{t("docflow.upload.dropzoneHint")}</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED_MIME_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </button>

          {/* Size warning */}
          <p className="flex items-center gap-2 text-xs text-amber">
            <FileWarning size={14} />
            {t("docflow.upload.sizeWarning", { limit: MAX_FILE_SIZE_MB })}
          </p>

          {/* Pending list */}
          {pending.length > 0 && (
            <div className="rounded-lg border border-border">
              <ScrollArea className="max-h-44">
                <ul className="divide-y divide-border">
                  <AnimatePresence initial={false}>
                    {pending.map((p) => (
                      <motion.li
                        key={p.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-3 px-3 py-2.5"
                      >
                        <FileTypeBadge type={extFromMime(p.mime)} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium">{p.filename}</span>
                            <span className="text-xs text-muted-foreground">{formatBytes(p.size)}</span>
                          </div>
                          {p.error ? (
                            <div className="mt-1 flex items-center gap-2 text-xs text-rose">
                              <X size={12} />
                              {t(`docflow.upload.${p.error}`)}
                            </div>
                          ) : p.phase === "queued" ? (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {t("docflow.upload.queueing")}
                            </div>
                          ) : (
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    p.phase === "uploading" ? "bg-cyan" : "bg-amber",
                                  )}
                                  style={{ width: `${p.progress}%` }}
                                />
                              </div>
                              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                                {p.progress}%
                              </span>
                              <span className="flex items-center gap-1 text-[11px] text-cyan">
                                {p.phase === "uploading" ? (
                                  <>
                                    <Loader2 size={11} className="animate-spin" />
                                    {t("docflow.upload.uploading")}
                                  </>
                                ) : (
                                  <>
                                    <Loader2 size={11} className="animate-spin" />
                                    {t("docflow.upload.processing")}
                                  </>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                        {!isUploading && !p.error && p.phase === "queued" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose"
                            onClick={() => removePending(p.id)}
                          >
                            <X size={14} />
                          </Button>
                        )}
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </ScrollArea>
            </div>
          )}

          {/* Samples */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t("docflow.upload.samples")}</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_FILES.map((s) => (
                <Button
                  key={s.filename}
                  variant="outline"
                  size="sm"
                  className="h-7 gap-2 px-2 text-xs"
                  onClick={() => addSample(s)}
                  disabled={isUploading}
                >
                  <FileTypeBadge type={extFromMime(s.mime)} />
                  <span className="max-w-[140px] truncate">{s.filename}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-xs text-muted-foreground">
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                {ACCEPTED_MIME_TYPES.length} {t("docflow.upload.accepted")}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isUploading}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={startUpload}
                disabled={pending.length === 0 || isUploading}
                className="gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {t("docflow.upload.starting", { n: pending.filter((p) => !p.error).length })}
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    {t("docflow.upload.start")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
