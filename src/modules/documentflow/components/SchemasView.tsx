"use client";

/**
 * SchemasView — extraction schemas CRUD (mock).
 *
 * Each schema: name, mapped classifications, and a fields table
 * (key, type, required, validation rule). "New schema" creates an inline
 * blank row the user can edit. Save / Delete are wired to local state via
 * onSave / onDelete props and surface a toast.
 */

import * as React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Save,
  X,
  FileSearch,
  CheckCircle2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  type ExtractionSchema,
  type ExtractionSchemaField,
  type SchemaFieldType,
  type DocumentClass,
} from "../data";

const FIELD_TYPES: SchemaFieldType[] = [
  "string",
  "number",
  "date",
  "boolean",
  "currency",
  "email",
  "phone",
];

const CLASSES: DocumentClass[] = [
  "invoice",
  "contract",
  "receipt",
  "id",
  "form",
  "other",
];

function emptySchema(id: string): ExtractionSchema {
  return {
    id,
    orgId: "org_haydev",
    name: "Untitled schema",
    classifications: [],
    fields: [
      { key: "new_field", type: "string", required: false, validation: "" },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function SchemasView({
  schemas,
  onSave,
  onDelete,
}: {
  schemas: ExtractionSchema[];
  onSave: (schema: ExtractionSchema) => void;
  onDelete: (id: string) => void;
}) {
  const { t, locale } = useLocale();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ExtractionSchema | null>(null);

  const startNew = () => {
    const id = "sc_new_" + Math.random().toString(36).slice(2, 6);
    const s = emptySchema(id);
    setDraft(s);
    setEditingId(id);
  };

  const startEdit = (s: ExtractionSchema) => {
    setDraft(JSON.parse(JSON.stringify(s)));
    setEditingId(s.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const commit = () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("Schema name required");
      return;
    }
    onSave({ ...draft, updatedAt: new Date().toISOString() });
    toast.success(t("docflow.toast.schemaSaved"));
    cancelEdit();
  };

  const remove = (id: string) => {
    onDelete(id);
    toast.success(t("docflow.toast.schemaDeleted"));
  };

  const updateField = (idx: number, patch: Partial<ExtractionSchemaField>) => {
    if (!draft) return;
    setDraft({
      ...draft,
      fields: draft.fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    });
  };

  const addField = () => {
    if (!draft) return;
    setDraft({
      ...draft,
      fields: [...draft.fields, { key: "new_field", type: "string", required: false, validation: "" }],
    });
  };

  const removeField = (idx: number) => {
    if (!draft) return;
    setDraft({ ...draft, fields: draft.fields.filter((_, i) => i !== idx) });
  };

  const toggleClassification = (c: DocumentClass) => {
    if (!draft) return;
    setDraft({
      ...draft,
      classifications: draft.classifications.includes(c)
        ? draft.classifications.filter((x) => x !== c)
        : [...draft.classifications, c],
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("docflow.schemas.subtitle")}</p>
        <Button onClick={startNew} className="gap-2">
          <Plus size={16} />
          {t("docflow.schemas.new")}
        </Button>
      </div>

      <ScrollArea className="max-h-[72vh]">
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {schemas.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground"
              >
                {t("docflow.schemas.empty")}
              </motion.div>
            )}
            {schemas.map((schema) => {
              const isEditing = editingId === schema.id && draft;
              return (
                <motion.div
                  key={schema.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                >
                  <Card className="surface-elevated">
                    <CardContent className="p-4">
                      {/* Header */}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <FileSearch size={16} className="text-amber" />
                            {isEditing ? (
                              <Input
                                value={draft!.name}
                                onChange={(e) => setDraft({ ...draft!, name: e.target.value })}
                                className="h-7 w-64 text-sm font-semibold"
                                autoFocus
                              />
                            ) : (
                              <h3 className="text-sm font-semibold">{schema.name}</h3>
                            )}
                            <Badge variant="outline" className="bg-muted text-[10px] font-mono">
                              {schema.fields.length} {t("docflow.schemas.fields").toLowerCase()}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Updated {formatDate(schema.updatedAt, locale)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <Button size="sm" variant="ghost" className="h-8 gap-1.5" onClick={cancelEdit}>
                                <X size={14} />
                                {t("common.cancel")}
                              </Button>
                              <Button size="sm" className="h-8 gap-1.5 bg-lime text-lime-foreground hover:bg-lime/90" onClick={commit}>
                                <Save size={14} />
                                {t("common.save")}
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="ghost" className="h-8 gap-1.5" onClick={() => startEdit(schema)}>
                                <Pencil size={14} />
                                {t("common.edit")}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 gap-1.5 text-rose hover:bg-rose/10 hover:text-rose"
                                onClick={() => remove(schema.id)}
                              >
                                <Trash2 size={14} />
                                {t("docflow.schemas.delete")}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Classifications */}
                      <div className="mt-3">
                        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t("docflow.schemas.classifications")}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {CLASSES.map((c) => {
                            const active = isEditing
                              ? draft!.classifications.includes(c)
                              : schema.classifications.includes(c);
                            return (
                              <button
                                key={c}
                                type="button"
                                disabled={!isEditing}
                                onClick={() => isEditing && toggleClassification(c)}
                                className={cn(
                                  "rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
                                  active
                                    ? "border-amber/30 bg-amber/10 text-amber"
                                    : "border-border bg-muted text-muted-foreground",
                                  isEditing && "cursor-pointer hover:border-amber/40",
                                )}
                              >
                                {t(`docflow.class.${c}`)}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Fields table */}
                      <div className="mt-3 overflow-hidden rounded-lg border border-border">
                        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_minmax(0,1.4fr)_auto] items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          <span>{t("docflow.schemas.fieldKey")}</span>
                          <span>{t("docflow.schemas.fieldType")}</span>
                          <span className="text-center">{t("docflow.schemas.required")}</span>
                          <span>{t("docflow.schemas.validation")}</span>
                          <span />
                        </div>
                        <div className="divide-y divide-border/60">
                          {(isEditing ? draft!.fields : schema.fields).map((f, idx) => (
                            <div
                              key={idx}
                              className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_minmax(0,1.4fr)_auto] items-center gap-2 px-3 py-2 text-xs"
                            >
                              {isEditing ? (
                                <>
                                  <Input
                                    value={f.key}
                                    onChange={(e) => updateField(idx, { key: e.target.value })}
                                    className="h-7 font-mono text-xs"
                                  />
                                  <Select value={f.type} onValueChange={(v) => updateField(idx, { type: v as SchemaFieldType })}>
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {FIELD_TYPES.map((ty) => (
                                        <SelectItem key={ty} value={ty}>
                                          {ty}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <div className="flex justify-center">
                                    <Checkbox
                                      checked={f.required}
                                      onCheckedChange={(v) => updateField(idx, { required: v === true })}
                                    />
                                  </div>
                                  <Input
                                    value={f.validation ?? ""}
                                    onChange={(e) => updateField(idx, { validation: e.target.value })}
                                    className="h-7 font-mono text-xs"
                                    placeholder="e.g. regex ^INV-\\d+$"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-6 text-muted-foreground hover:text-rose"
                                    onClick={() => removeField(idx)}
                                  >
                                    <X size={12} />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <span className="font-mono text-foreground/90">{f.key}</span>
                                  <Badge variant="outline" className="bg-muted font-mono text-[10px] uppercase text-muted-foreground">
                                    {f.type}
                                  </Badge>
                                  <div className="flex justify-center">
                                    {f.required ? (
                                      <CheckCircle2 size={14} className="text-lime" />
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </div>
                                  <span className="font-mono text-[11px] text-muted-foreground">{f.validation ?? "—"}</span>
                                  <span />
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={addField}
                            className="flex w-full items-center gap-2 border-t border-border bg-muted/20 px-3 py-2 text-xs text-cyan hover:bg-cyan/5"
                          >
                            <Plus size={12} />
                            {t("docflow.schemas.addField")}
                          </button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
