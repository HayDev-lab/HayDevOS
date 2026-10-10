"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Globe2, Link2, Loader2, Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fetchWithSession } from "@/lib/auth/client-session";
import { auditSourceInputs, type AuditBusinessContext, type AuditSourceResult } from "@/lib/business-audit/context";
import { useLocale } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";

interface Props {
  context: AuditBusinessContext;
  onChange: (context: AuditBusinessContext) => void;
  onCheckingChange: (checking: boolean) => void;
}

export function BusinessContextPanel({ context, onChange, onCheckingChange }: Props) {
  const { t } = useLocale();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => { controller.current?.abort(); }, []);

  function changeLinks(patch: Partial<AuditBusinessContext>) {
    setErrorKey(null);
    onChange({ ...context, ...patch, sources: [] });
  }

  async function checkSources() {
    setErrorKey(null);
    let sources;
    try { sources = auditSourceInputs(context); }
    catch { setErrorKey("audit.context.invalidUrl"); return; }
    if (!sources.length) { setErrorKey("audit.context.addLink"); return; }
    const abort = new AbortController();
    controller.current = abort;
    setChecking(true);
    onCheckingChange(true);
    try {
      const response = await fetchWithSession("/api/audit/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources }),
        signal: AbortSignal.any([abort.signal, AbortSignal.timeout(55_000)]),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorKey(data.error?.code === "AUDIT_SOURCE_INVALID" || response.status === 422
          ? "audit.context.invalidUrl" : response.status === 429 ? "audit.context.rateLimited" : "audit.context.failed");
        return;
      }
      if (!abort.signal.aborted) onChange({ ...context, sources: data.sources as AuditSourceResult[] });
    } catch {
      if (!abort.signal.aborted) setErrorKey("audit.context.failed");
    } finally {
      onCheckingChange(false);
      if (!abort.signal.aborted) setChecking(false);
    }
  }

  const count = (context.website.trim() ? 1 : 0) + context.socialUrls.filter((url) => url.trim()).length;
  return (
    <section className="surface-elevated min-w-0 rounded-xl border border-primary/20">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={`${id}-body`}
        className="flex w-full items-center gap-3 rounded-xl p-4 text-left focus-visible:outline-2 focus-visible:outline-primary">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Globe2 className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{t("audit.context.title")}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {context.name || t("audit.context.subtitle")}{count > 0 ? ` · ${t("audit.context.linkCount", { count })}` : ""}
          </span>
        </span>
        <span className="hidden text-xs text-primary sm:inline">{t(open ? "audit.context.collapse" : count || context.name || context.description ? "audit.context.edit" : "audit.context.add")}</span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>
      {open && (
        <div id={`${id}-body`} className="space-y-4 border-t border-border/60 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">{t("audit.context.help")}</p>
          <fieldset disabled={checking} className="min-w-0 space-y-4 disabled:opacity-70">
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <label className="min-w-0 space-y-1.5 text-xs" htmlFor={`${id}-name`}>
                <span className="block font-medium">{t("audit.context.name")}</span>
                <Input id={`${id}-name`} value={context.name} maxLength={160} autoComplete="organization"
                  onChange={(event) => onChange({ ...context, name: event.target.value })} placeholder={t("audit.context.namePlaceholder")} />
              </label>
              <label className="min-w-0 space-y-1.5 text-xs" htmlFor={`${id}-website`}>
                <span className="block font-medium">{t("audit.context.website")}</span>
                <Input id={`${id}-website`} type="text" inputMode="url" value={context.website} maxLength={2048} autoCapitalize="none" spellCheck={false}
                  onChange={(event) => changeLinks({ website: event.target.value })} placeholder="https://example.com" />
              </label>
            </div>
            <label className="block space-y-1.5 text-xs" htmlFor={`${id}-description`}>
              <span className="block font-medium">{t("audit.context.description")}</span>
              <Textarea id={`${id}-description`} value={context.description} maxLength={4000} rows={3}
                onChange={(event) => onChange({ ...context, description: event.target.value })} placeholder={t("audit.context.descriptionPlaceholder")} />
            </label>
            <div className="space-y-2">
              <p className="text-xs font-medium">{t("audit.context.socials")}</p>
              {context.socialUrls.map((url, index) => (
                <div key={index} className="flex min-w-0 items-center gap-2">
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <Input aria-label={t("audit.context.socialLink", { number: index + 1 })} type="text" inputMode="url" value={url} maxLength={2048}
                    autoCapitalize="none" spellCheck={false} placeholder={t("audit.context.socialPlaceholder")}
                    onChange={(event) => changeLinks({ socialUrls: context.socialUrls.map((value, position) => position === index ? event.target.value : value) })} />
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label={t("audit.context.removeLink", { number: index + 1 })}
                    onClick={() => changeLinks({ socialUrls: context.socialUrls.length > 1 ? context.socialUrls.filter((_, position) => position !== index) : [""] })}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {context.socialUrls.length < 5 && (
                <Button type="button" size="sm" variant="ghost" className="gap-1.5 text-xs text-primary" onClick={() => changeLinks({ socialUrls: [...context.socialUrls, ""] })}>
                  <Plus className="h-3.5 w-3.5" />{t("audit.context.addSocial")}
                </Button>
              )}
            </div>
          </fieldset>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" disabled={checking} onClick={checkSources} className="gap-2">
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {t(checking ? "audit.context.checking" : "audit.context.check")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t("audit.context.toQuestions")}</Button>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">{t("audit.context.publicOnly")}</p>
          {errorKey && <p role="alert" className="text-xs text-destructive">{t(errorKey)}</p>}
          {checking && <p role="status" className="text-xs text-muted-foreground">{t("audit.context.checkingNote")}</p>}
          <SourceResults sources={context.sources} />
        </div>
      )}
    </section>
  );
}

export function BusinessContextSummary({ context }: { context: AuditBusinessContext }) {
  const { t } = useLocale();
  if (!context.name && !context.description && !context.website && !context.socialUrls.some(Boolean)) return null;
  const urls = [context.website, ...context.socialUrls].filter((url) => url.trim());
  return (
    <section className="surface-elevated min-w-0 space-y-3 rounded-xl border border-border/60 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><Globe2 className="h-4 w-4 text-primary" />{t("audit.context.reportTitle")}</h2>
      {context.name && <p className="text-sm font-medium">{context.name}</p>}
      {context.description && <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">{context.description}</p>}
      <div className="flex flex-wrap gap-2">{urls.map((url, index) => {
        let href: string | undefined;
        try { href = auditSourceInputs({ ...context, website: url, socialUrls: [] })[0]?.url; } catch { /* Keep invalid draft links as text. */ }
        return href ? <a key={index} href={href} target="_blank" rel="noopener noreferrer" className="max-w-full break-all text-xs text-primary underline underline-offset-4">{url}</a>
          : <span key={index} className="break-all text-xs text-muted-foreground">{url}</span>;
      })}</div>
      <p className="text-[11px] text-muted-foreground">{t(context.sources.length ? "audit.context.scoreNote" : "audit.context.notChecked")}</p>
      <SourceResults sources={context.sources} />
    </section>
  );
}

function SourceResults({ sources }: { sources: AuditSourceResult[] }) {
  const { t, locale } = useLocale();
  if (!sources.length) return null;
  return (
    <div className="space-y-2" aria-live="polite">
      {sources.map((source) => (
        <article key={`${source.kind}:${source.url}`} className="min-w-0 space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="min-w-0 break-all text-xs text-primary underline underline-offset-4">{source.url}</a>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${source.status === "available" ? "bg-lime/10 text-lime" : "bg-muted text-muted-foreground"}`}>
              {t(`audit.context.status.${source.status}`)}
            </span>
          </div>
          {source.status === "available" ? (
            <>
              {source.title && <p className="break-words text-xs font-medium">{source.title}</p>}
              {source.description && <p className="break-words text-xs leading-relaxed text-muted-foreground">{source.description}</p>}
              {!!source.headings?.length && <p className="break-words text-xs text-muted-foreground">{source.headings.join(" · ")}</p>}
              {!!source.hashtags?.length && <p className="break-words text-xs text-primary">{source.hashtags.join(" ")}</p>}
              {source.excerpt && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer py-1 text-foreground">{t("audit.context.excerpt")}</summary>
                <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed">{source.excerpt}</p>
              </details>}
            </>
          ) : <p className="text-xs text-muted-foreground">{t(`audit.context.help.${source.status}`)}</p>}
          <p className="text-[10px] text-muted-foreground">{t("audit.context.checkedAt")}: {formatDateTime(source.checkedAt, locale)}</p>
        </article>
      ))}
    </div>
  );
}
