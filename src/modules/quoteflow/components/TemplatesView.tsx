"use client";

/**
 * TemplatesView — list of quote document templates (HY/RU/EN) with preview.
 */

import { useState } from "react";
import {
  LayoutTemplate,
  Plus,
  Eye,
  Check,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn, formatDate, toneClasses } from "@/lib/utils";

import { mockTemplates, type QuoteTemplate } from "../data";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const LANG_LABEL: Record<string, string> = {
  hy: "quoteflow.settings.localeHy",
  ru: "quoteflow.settings.localeRu",
  en: "quoteflow.settings.localeEn",
};

const LANG_TONE: Record<string, "lime" | "cyan" | "amber"> = {
  hy: "lime",
  ru: "cyan",
  en: "amber",
};

export function TemplatesView() {
  const { t, locale } = useLocale();
  const [preview, setPreview] = useState<QuoteTemplate | null>(null);

  const makeDefault = (tpl: QuoteTemplate) => {
    toast.success(`${tpl.name} → ${t("quoteflow.templates.default")}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <LayoutTemplate className="h-4 w-4 text-cyan" />
            {t("quoteflow.templates.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("quoteflow.templates.subtitle")}</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toast.info(`${t("quoteflow.templates.new")} (mock)`)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("quoteflow.templates.new")}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {mockTemplates.map((tpl) => {
          const langTone = LANG_TONE[tpl.language];
          const langCls = toneClasses(langTone);
          return (
            <Card key={tpl.id} className="surface-elevated group flex flex-col">
              <CardContent className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-md bg-cyan/10 text-cyan ring-1 ring-cyan/30">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{tpl.name}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(tpl.updatedAt, locale)}</div>
                    </div>
                  </div>
                  {tpl.isDefault && (
                    <Badge variant="outline" className="border-lime/30 bg-lime/10 text-lime gap-1">
                      <Check className="h-3 w-3" />
                      {t("quoteflow.templates.default")}
                    </Badge>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="outline" className={cn(langCls.text, langCls.bg, langCls.border)}>
                    {t(LANG_LABEL[tpl.language])}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {tpl.sections.length} {t("quoteflow.templates.sections").toLowerCase()}
                  </span>
                </div>

                <div className="mt-3 flex-1 rounded-lg bg-muted/30 p-2.5">
                  <pre className="line-clamp-4 whitespace-pre-wrap font-mono text-[10px] leading-tight text-muted-foreground">
                    {tpl.preview}
                  </pre>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => setPreview(tpl)}>
                    <Eye className="h-3.5 w-3.5" />
                    {t("quoteflow.templates.preview")}
                  </Button>
                  {!tpl.isDefault && (
                    <Button size="sm" variant="ghost" className="gap-1.5 text-lime hover:text-lime" onClick={() => makeDefault(tpl)}>
                      {t("quoteflow.templates.makeDefault")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview dialog */}
      <Dialog open={Boolean(preview)} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
            <DialogDescription>{t("quoteflow.templates.preview")}</DialogDescription>
          </DialogHeader>
          {preview && (
            <ScrollArea className="max-h-[60vh] rounded-lg border border-border bg-background/60 p-4">
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
                {preview.preview}
              </pre>
              <div className="mt-4 border-t border-border pt-3">
                <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("quoteflow.templates.sections")}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {preview.sections.map((s) => (
                    <Badge key={s} variant="outline" className="font-mono text-[10px]">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
