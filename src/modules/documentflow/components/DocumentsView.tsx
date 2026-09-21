"use client";

/**
 * DocumentsView — full documents table with advanced filters.
 *
 * Columns: filename (icon + name + size), status, class, confidence,
 * uploader, pages, version, created. Filters: status, type, classification,
 * uploader, date range (from/to). Row click → onOpenViewer.
 */

import * as React from "react";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Filter, X, FileSearch } from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { cn, relativeTime, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  type DocRecord,
  type DocType,
  type DocumentStatus,
  type DocumentClass,
} from "../data";
import {
  FileTypeIcon,
  FileTypeBadge,
  StatusBadge,
  ClassBadge,
  ConfidenceBar,
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

const CLASSES: DocumentClass[] = [
  "invoice",
  "contract",
  "receipt",
  "id",
  "form",
  "other",
];

export function DocumentsView({
  documents,
  onOpenViewer,
}: {
  documents: DocRecord[];
  onOpenViewer: (doc: DocRecord) => void;
}) {
  const { t, locale } = useLocale();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<DocumentStatus | "all">("all");
  const [type, setType] = useState<DocType | "all">("all");
  const [cls, setCls] = useState<DocumentClass | "all">("all");
  const [uploader, setUploader] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const uploaders = useMemo(() => {
    const set = new Map<string, string>();
    for (const d of documents) set.set(d.uploadedById, d.uploadedByName);
    return Array.from(set, ([id, name]) => ({ id, name }));
  }, [documents]);

  const filtered = useMemo(() => {
    return documents
      .filter((d) => {
        if (query && !d.filename.toLowerCase().includes(query.toLowerCase())) return false;
        if (status !== "all" && d.status !== status) return false;
        if (type !== "all" && d.type !== type) return false;
        if (cls !== "all" && d.classification !== cls) return false;
        if (uploader !== "all" && d.uploadedById !== uploader) return false;
        if (dateFrom) {
          const from = new Date(dateFrom).getTime();
          if (new Date(d.createdAt).getTime() < from) return false;
        }
        if (dateTo) {
          const to = new Date(dateTo).getTime() + 86400000; // inclusive
          if (new Date(d.createdAt).getTime() > to) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [documents, query, status, type, cls, uploader, dateFrom, dateTo]);

  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setType("all");
    setCls("all");
    setUploader("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasFilters =
    query || status !== "all" || type !== "all" || cls !== "all" || uploader !== "all" || dateFrom || dateTo;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="surface-elevated space-y-3 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Filter size={14} className="text-amber" />
            {t("docflow.documents.filters")}
          </h3>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={clearFilters}>
              <X size={12} />
              {t("docflow.documents.clearFilters")}
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            placeholder={t("common.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9"
          />
          <Select value={status} onValueChange={(v) => setStatus(v as DocumentStatus | "all")}>
            <SelectTrigger className="h-9">
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
          <Select value={type} onValueChange={(v) => setType(v as DocType | "all")}>
            <SelectTrigger className="h-9">
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
          <Select value={cls} onValueChange={(v) => setCls(v as DocumentClass | "all")}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder={t("docflow.inbox.classification")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("docflow.inbox.allTypes")}</SelectItem>
              {CLASSES.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(`docflow.class.${c}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={uploader} onValueChange={setUploader}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder={t("docflow.documents.uploader")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("docflow.inbox.allStatuses")}</SelectItem>
              {uploaders.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9"
              aria-label={t("docflow.documents.dateFrom")}
            />
            <span className="text-xs text-muted-foreground">—</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9"
              aria-label={t("docflow.documents.dateTo")}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="surface-elevated overflow-hidden rounded-xl">
        <div className="grid grid-cols-[minmax(0,2fr)_auto_auto_auto_auto_auto] items-center gap-3 border-b border-border px-4 py-2.5 text-xs font-medium text-muted-foreground">
          <span>{t("docflow.inbox.filename")}</span>
          <span className="hidden md:inline">{t("docflow.inbox.status")}</span>
          <span className="hidden lg:inline">{t("docflow.inbox.classification")}</span>
          <span className="hidden sm:inline">{t("docflow.inbox.confidence")}</span>
          <span className="hidden xl:inline">{t("docflow.inbox.uploadedBy")}</span>
          <span className="text-right">{t("docflow.inbox.uploadedAt")}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <FileSearch size={32} className="opacity-40" />
            <p className="text-sm">{t("misc.noResults")}</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="divide-y divide-border">
              {filtered.map((doc, i) => {
                const avgConf = doc.fields.length
                  ? doc.fields.reduce((a, f) => a + f.confidence, 0) / doc.fields.length
                  : doc.confidence ?? 0;
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.012, 0.3) }}
                    className="grid cursor-pointer grid-cols-[minmax(0,2fr)_auto_auto_auto_auto_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                    onClick={() => onOpenViewer(doc)}
                  >
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
                          <span>{doc.pages} {t("docflow.viewer.pages").toLowerCase()}</span>
                          <span>·</span>
                          <span>v{doc.version}</span>
                        </div>
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <StatusBadge status={doc.status} />
                    </div>
                    <div className="hidden lg:block">
                      <ClassBadge classification={doc.classification} />
                    </div>
                    <div className="hidden sm:block">
                      {doc.confidence !== null ? (
                        <div className="w-24">
                          <ConfidenceBar value={avgConf || doc.confidence} />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="hidden text-xs xl:block">{doc.uploadedByName}</div>
                    <div className="text-right text-xs text-muted-foreground">
                      {formatDate(doc.createdAt, locale)}
                      <div className="text-[10px] opacity-70">{relativeTime(doc.createdAt, locale)}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{t("docflow.documents.results", { n: filtered.length })}</span>
        <span className="hidden sm:inline">{t("docflow.documents.subtitle")}</span>
      </div>
    </div>
  );
}
