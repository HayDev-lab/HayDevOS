"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archive, Download, FileText, Loader2, RefreshCw, Search, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DocumentDto } from "@/lib/documents/types";
import { t as translateText, useLocale } from "@/lib/i18n";
import { archiveDocumentRequest, fetchDocuments, uploadDocumentFile } from "./api";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ACCEPT = ".pdf,.docx,.xlsx,.csv,.txt,.png,.jpg,.jpeg";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function statusTone(status: string) {
  if (status === "ACTIVE") return "bg-lime/10 text-lime";
  if (status === "FAILED") return "bg-rose/10 text-rose";
  if (status === "ARCHIVED") return "bg-muted text-muted-foreground";
  return "bg-amber/10 text-amber";
}

function DocumentFlowContent() {
  const { session } = useAuth();
  const { locale } = useLocale();
  const t = useCallback((key: string, params?: Record<string, string | number>) => translateText(key, locale, params), [locale]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const page = await fetchDocuments(search);
      setDocuments(page.items);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("docflow.runtime.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    void fetchDocuments().then((page) => {
      if (cancelled) return;
      setDocuments(page.items);
      setError(null);
    }).catch((cause) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : t("docflow.runtime.loadFailed"));
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [t]);

  const canUpload = session.activeOrganization.role !== "VIEWER";
  const canArchive = ["OWNER", "ADMIN", "MANAGER"].includes(session.activeOrganization.role);
  const available = useMemo(() => documents.filter((document) =>
    document.status === "ACTIVE" && ["CLEAN", "NOT_REQUIRED"].includes(document.scanStatus ?? "")), [documents]);

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    if (files.length > 10) { toast.error(t("docflow.runtime.maxFiles")); return; }
    setUploading(true);
    let completed = 0;
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_BYTES) { toast.error(t("docflow.runtime.fileTooLarge", { name: file.name })); continue; }
        try { await uploadDocumentFile(file); completed += 1; }
        catch (cause) { toast.error(`${file.name}: ${cause instanceof Error ? cause.message : t("docflow.runtime.uploadFailed")}`); }
      }
      if (completed) {
        toast.success(t("docflow.runtime.uploadStored", { count: completed }));
        await refresh();
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const archive = async (document: DocumentDto) => {
    try {
      await archiveDocumentRequest(document.id);
      toast.success(t("docflow.runtime.archived", { title: document.title }));
      await refresh();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : t("docflow.runtime.archiveFailed")); }
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-amber/10 text-amber"><FileText /></span>
          <div><h1 className="text-2xl font-semibold text-gradient-brand">DocumentFlow</h1><p className="text-sm text-muted-foreground">{t("docflow.runtime.subtitle")}</p></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw className="mr-2 size-4" />{t("common.refresh")}</Button>
          {canUpload && <Button onClick={() => inputRef.current?.click()} disabled={uploading}><Upload className="mr-2 size-4" />{uploading ? t("docflow.upload.uploading") : t("docflow.inbox.upload")}</Button>}
          <input ref={inputRef} className="hidden" type="file" multiple accept={ACCEPT} onChange={(event) => void uploadFiles(event.target.files)} />
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{t("docflow.runtime.persisted")}</p><p className="mt-1 text-2xl font-semibold">{documents.length}</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{t("docflow.runtime.released")}</p><p className="mt-1 text-2xl font-semibold text-lime">{available.length}</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{t("docflow.runtime.securityBoundary")}</p><p className="mt-2 flex items-center gap-2 text-sm"><ShieldCheck className="size-4 text-cyan" />{session.activeOrganization.name}</p></div>
      </div>

      <form className="relative max-w-lg" onSubmit={(event) => { event.preventDefault(); void refresh(); }}>
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("docflow.runtime.search")} className="pl-9" maxLength={200} />
      </form>

      {error ? <div className="rounded-xl border border-destructive/40 p-6"><p>{error}</p><Button className="mt-3" onClick={() => void refresh()}>{t("common.retry")}</Button></div> : loading ? <div className="grid min-h-52 place-items-center"><Loader2 className="size-7 animate-spin text-cyan" /></div> : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-muted-foreground"><tr><th className="p-3">{t("docflow.runtime.document")}</th><th className="p-3">{t("docflow.runtime.source")}</th><th className="p-3">{t("docflow.viewer.version")}</th><th className="p-3">{t("docflow.runtime.integrity")}</th><th className="p-3">{t("common.status")}</th><th className="p-3 text-right">{t("common.actions")}</th></tr></thead>
            <tbody>{documents.map((document) => {
              const downloadable = document.status === "ACTIVE" && ["CLEAN", "NOT_REQUIRED"].includes(document.scanStatus ?? "");
              return <tr key={document.id} className="border-t border-border align-top">
                <td className="p-3"><p className="max-w-sm truncate font-medium">{document.title}</p><p className="mt-1 text-xs text-muted-foreground">{document.filename} · {formatBytes(document.sizeBytes)}</p></td>
                <td className="p-3"><p>{t(`docflow.runtime.source.${document.sourceType.toLowerCase()}`)}</p><p className="text-xs text-muted-foreground">{document.sourceId ?? t("docflow.runtime.manualUpload")}</p></td>
                <td className="p-3">v{document.currentVersionNumber}</td>
                <td className="p-3 font-mono text-xs">{document.currentVersion?.sha256 ? `${document.currentVersion.sha256.slice(0, 12)}…` : "—"}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs ${statusTone(document.status)}`}>{t(`docflow.status.${document.status.toLowerCase()}`)}</span><p className="mt-1 text-xs text-muted-foreground">{document.scanStatus ? t(`docflow.runtime.scan.${document.scanStatus.toLowerCase()}`) : t("docflow.runtime.noArtifact")}</p></td>
                <td className="p-3"><div className="flex justify-end gap-1">
                  <Button asChild={downloadable} variant="ghost" size="sm" disabled={!downloadable} title={downloadable ? t("docflow.runtime.authorizedDownload") : t("docflow.runtime.notReleased")}>{downloadable ? <a href={`/api/documents/${encodeURIComponent(document.id)}/download`}><Download className="size-4" /></a> : <span><Download className="size-4" /></span>}</Button>
                  {canArchive && <Button variant="ghost" size="sm" onClick={() => void archive(document)} title={t("docflow.runtime.archive")}><Archive className="size-4" /></Button>}
                </div></td>
              </tr>;
            })}</tbody>
          </table>
          {documents.length === 0 && <p className="p-10 text-center text-muted-foreground">{t("docflow.runtime.empty")}</p>}
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t("docflow.runtime.securityHint")}</p>
    </div>
  );
}

export function DocumentFlowView() {
  const { session } = useAuth();
  return <DocumentFlowContent key={session.activeOrganization.id} />;
}

export default DocumentFlowView;
