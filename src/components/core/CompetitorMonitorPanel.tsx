"use client";

import { useEffect, useState } from "react";
import { Globe2, Loader2, Play, Plus, RefreshCw, Trash2 } from "lucide-react";

import { useAuth } from "@/components/auth/AuthContext";
import { useLocale } from "@/lib/i18n";

type Monitor = {
  id: string;
  name: string;
  url: string;
  sourceType: "auto" | "webpage" | "rss" | "sitemap" | "json";
  enabled: boolean;
  cadenceDays: number;
  lastCheckedAt: string | null;
  nextCheckAt: string | null;
  lastStatus: string;
  lastError: string | null;
  latestSnapshot: { fetchedAt: string; title: string | null; contentHash: string } | null;
};

type Analysis = {
  id: string;
  periodKey: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  provider: string;
  summary: string;
  details: { themes?: string[]; recommendations?: string[]; changedCount?: number; blockedCount?: number; errorCount?: number };
  error: string | null;
  createdAt: string;
};

const emptyForm = { name: "", url: "", sourceType: "auto" as Monitor["sourceType"] };

export function CompetitorMonitorPanel() {
  const { session } = useAuth();
  const { t } = useLocale();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [monitorResponse, analysisResponse] = await Promise.all([
        fetch("/api/marketing/competitors", { credentials: "same-origin" }),
        fetch("/api/marketing/competitors?analyses=1", { credentials: "same-origin" }),
      ]);
      if (!monitorResponse.ok || !analysisResponse.ok) throw new Error(t("competitors.loadError"));
      const monitorPayload = await monitorResponse.json() as { monitors: Monitor[] };
      const analysisPayload = await analysisResponse.json() as { analyses: Analysis[] };
      setMonitors(monitorPayload.monitors);
      setAnalyses(analysisPayload.analyses);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("competitors.loadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [session.activeOrganization.id]);

  async function addMonitor() {
    if (!form.name.trim() || !form.url.trim() || monitors.length >= 5) return;
    setBusy(true); setMessage(null); setError(null);
    try {
      const response = await fetch("/api/marketing/competitors", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, cadenceDays: 3 }) });
      if (!response.ok) throw new Error(t("competitors.addError"));
      setForm(emptyForm); setMessage(t("competitors.added")); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("competitors.addError")); }
    finally { setBusy(false); }
  }

  async function removeMonitor(id: string) {
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/marketing/competitors?id=${encodeURIComponent(id)}`, { method: "DELETE", credentials: "same-origin" });
      if (!response.ok) throw new Error(t("competitors.removeError"));
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("competitors.removeError")); }
    finally { setBusy(false); }
  }

  async function runNow() {
    setBusy(true); setMessage(null); setError(null);
    try {
      const response = await fetch("/api/marketing/competitors/run", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ force: true }) });
      if (!response.ok) throw new Error(t("competitors.runError"));
      const result = await response.json() as { changed: number; checked: number };
      setMessage(`${t("competitors.checked")}: ${result.checked}, ${t("competitors.changesFound")}: ${result.changed}.`); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("competitors.runError")); }
    finally { setBusy(false); }
  }

  return (
    <div className="ai-creation-dock mt-5" aria-labelledby="competitor-monitor-title">
      <div className="ai-creation-head">
        <div>
          <span className="studio-eyebrow">{t("competitors.eyebrow")}</span>
          <h2 id="competitor-monitor-title">{t("competitors.title")}</h2>
          <p>{t("competitors.subtitle")}</p>
        </div>
        <Globe2 className="text-cyan" />
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_1.5fr_150px_auto]">
        <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder={t("competitors.namePlaceholder")} maxLength={120} />
        <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={form.url} onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))} placeholder={t("competitors.urlPlaceholder")} inputMode="url" maxLength={2048} />
        <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={form.sourceType} onChange={(event) => setForm((current) => ({ ...current, sourceType: event.target.value as Monitor["sourceType"] }))}>
          <option value="auto">{t("competitors.source.auto")}</option><option value="webpage">{t("competitors.source.webpage")}</option><option value="rss">{t("competitors.source.rss")}</option><option value="sitemap">{t("competitors.source.sitemap")}</option><option value="json">{t("competitors.source.json")}</option>
        </select>
        <button type="button" className="studio-gold" disabled={busy || monitors.length >= 5 || !form.name.trim() || !form.url.trim()} onClick={() => void addMonitor()}><Plus size={16} /> {t("competitors.add")}</button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{monitors.length}/5 {t("competitors.sources")}</span>
        <span>·</span><span>{t("competitors.publicOnly")}</span>
        <button type="button" className="studio-ghost ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2" disabled={busy || !monitors.length} onClick={() => void runNow()}><Play size={14} /> {t("competitors.runNow")}</button>
        <button type="button" className="studio-ghost inline-flex items-center gap-2 rounded-lg px-3 py-2" disabled={busy} onClick={() => void load()}><RefreshCw size={14} /> {t("competitors.refresh")}</button>
      </div>

      {loading ? <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" size={16} /> {t("competitors.loading")}</div> : (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {monitors.map((monitor) => <div key={monitor.id} className="rounded-xl border border-border bg-background/30 p-3 text-sm">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block truncate">{monitor.name}</strong><a className="block truncate text-xs text-cyan hover:underline" href={monitor.url} target="_blank" rel="noreferrer">{monitor.url}</a></div><button type="button" className="text-rose-300" aria-label={`${t("competitors.remove")} ${monitor.name}`} disabled={busy} onClick={() => void removeMonitor(monitor.id)}><Trash2 size={15} /></button></div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground"><span className="rounded border border-border px-1.5 py-0.5">{monitor.sourceType}</span><span className="rounded border border-border px-1.5 py-0.5">{monitor.lastStatus}</span>{monitor.nextCheckAt && <span>{t("competitors.next")}: {new Date(monitor.nextCheckAt).toLocaleString()}</span>}</div>
            {monitor.lastError && <p className="mt-2 text-xs text-rose-300">{monitor.lastError}</p>}
          </div>)}
          {!monitors.length && <p className="text-sm text-muted-foreground">{t("competitors.empty")}</p>}
        </div>
      )}

      {message && <p className="mt-3 text-xs text-lime">{message}</p>}
      {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}

      {!!analyses.length && <div className="mt-5 border-t border-border pt-4"><div className="mb-2 flex items-center justify-between"><strong>{t("competitors.latest")}</strong><span className="text-xs text-muted-foreground">{t("competitors.local")}</span></div><div className="grid gap-2">{analyses.slice(0, 3).map((analysis) => <article key={analysis.id} className="rounded-xl border border-border bg-background/20 p-3"><div className="text-xs text-muted-foreground">{new Date(analysis.periodEnd).toLocaleString()} · {analysis.provider}</div><p className="mt-1 text-sm">{analysis.summary}</p>{analysis.details.themes?.length ? <p className="mt-1 text-xs text-cyan">{t("competitors.themes")}: {analysis.details.themes.join(", ")}</p> : null}</article>)}</div></div>}
    </div>
  );
}
