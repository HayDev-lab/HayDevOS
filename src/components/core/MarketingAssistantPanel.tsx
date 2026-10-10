"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, FileText, Loader2, Save, Trash2, Upload } from "lucide-react";

import { useAuth } from "@/components/auth/AuthContext";

type AssistantKind = "sales_script" | "support_script" | "brand_voice" | "faq" | "policy" | "other";
type AssistantMode = "draft" | "approval" | "auto";
type AssistantConfig = {
  id: string | null;
  displayName: string;
  systemPrompt: string;
  allowedTopics: string[];
  forbiddenTopics: string[];
  responseRules: string[];
  language: string;
  autoReplyMode: AssistantMode;
  knowledge: Array<{ id: string; title: string; kind: AssistantKind; characters: number; enabled: boolean }>;
};

export interface MarketingAssistantLabels {
  title: string;
  subtitle: string;
  policy: string;
  policyPlaceholder: string;
  allowedTopics: string;
  forbiddenTopics: string;
  responseRules: string;
  listHint: string;
  save: string;
  saved: string;
  scripts: string;
  upload: string;
  titlePlaceholder: string;
  kind: string;
  chooseFile: string;
  noScripts: string;
  remove: string;
  draft: string;
  approval: string;
  auto: string;
  loadError: string;
  saveError: string;
}

const EMPTY: AssistantConfig = {
  id: null,
  displayName: "HayDev Assistent",
  systemPrompt: "",
  allowedTopics: [],
  forbiddenTopics: [],
  responseRules: [],
  language: "ru",
  autoReplyMode: "draft",
  knowledge: [],
};

export function MarketingAssistantPanel({ labels }: { labels: MarketingAssistantLabels }) {
  const { session } = useAuth();
  const [config, setConfig] = useState<AssistantConfig>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<AssistantKind>("sales_script");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setLoading(true); });
    fetch("/api/marketing/assistant", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error(labels.loadError);
        return response.json() as Promise<AssistantConfig>;
      })
      .then((data) => { if (!cancelled) setConfig({ ...EMPTY, ...data }); })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : labels.loadError); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [labels.loadError, session.activeOrganization.id]);

  const listText = (values: string[]) => values.join("\n");
  const parseList = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 100);
  const kindLabel = useMemo(() => ({
    sales_script: "Sales",
    support_script: "Support",
    brand_voice: "Brand voice",
    faq: "FAQ",
    policy: "Policy",
    other: "Other",
  } satisfies Record<AssistantKind, string>), []);

  async function savePolicy() {
    setBusy(true); setError(null); setMessage(null);
    try {
      const response = await fetch("/api/marketing/assistant", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error(labels.saveError);
      setConfig(await response.json() as AssistantConfig);
      setMessage(labels.saved);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : labels.saveError);
    } finally { setBusy(false); }
  }

  async function uploadKnowledge() {
    if (!file) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("title", title.trim() || file.name);
      form.set("kind", kind);
      const response = await fetch("/api/marketing/assistant", { method: "POST", credentials: "same-origin", body: form });
      if (!response.ok) throw new Error(labels.saveError);
      setConfig(await response.json() as AssistantConfig);
      setFile(null); setTitle(""); setMessage(labels.saved);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : labels.saveError);
    } finally { setBusy(false); }
  }

  async function removeKnowledge(id: string) {
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/marketing/assistant?id=${encodeURIComponent(id)}`, { method: "DELETE", credentials: "same-origin" });
      if (!response.ok) throw new Error(labels.saveError);
      setConfig((current) => ({ ...current, knowledge: current.knowledge.filter((item) => item.id !== id) }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : labels.saveError);
    } finally { setBusy(false); }
  }

  if (loading) return <div className="core-studio-links"><div className="studio-card"><Loader2 className="animate-spin" /><strong>{labels.title}</strong></div></div>;

  return (
    <div className="ai-creation-dock mt-5" aria-labelledby="haydev-assistent-title">
      <div className="ai-creation-head">
        <div>
          <span className="studio-eyebrow">{config.displayName}</span>
          <h2 id="haydev-assistent-title">{labels.title}</h2>
          <p>{labels.subtitle}</p>
        </div>
        <BookOpen className="text-lime" />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span>{labels.policy}</span>
          <textarea className="min-h-28 rounded-xl border border-border bg-background/60 p-3" value={config.systemPrompt} onChange={(event) => setConfig((current) => ({ ...current, systemPrompt: event.target.value }))} placeholder={labels.policyPlaceholder} maxLength={12_000} />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{labels.allowedTopics}</span>
          <textarea className="min-h-28 rounded-xl border border-border bg-background/60 p-3" value={listText(config.allowedTopics)} onChange={(event) => setConfig((current) => ({ ...current, allowedTopics: parseList(event.target.value) }))} placeholder={labels.listHint} />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{labels.forbiddenTopics}</span>
          <textarea className="min-h-24 rounded-xl border border-border bg-background/60 p-3" value={listText(config.forbiddenTopics)} onChange={(event) => setConfig((current) => ({ ...current, forbiddenTopics: parseList(event.target.value) }))} placeholder={labels.listHint} />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{labels.responseRules}</span>
          <textarea className="min-h-24 rounded-xl border border-border bg-background/60 p-3" value={listText(config.responseRules)} onChange={(event) => setConfig((current) => ({ ...current, responseRules: parseList(event.target.value) }))} placeholder={labels.listHint} />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-sm">{labels.kind}
          <select className="ml-2 rounded-lg border border-border bg-background px-2 py-1" value={config.autoReplyMode} onChange={(event) => setConfig((current) => ({ ...current, autoReplyMode: event.target.value as AssistantMode }))}>
            <option value="draft">{labels.draft}</option><option value="approval">{labels.approval}</option><option value="auto">{labels.auto}</option>
          </select>
        </label>
        <button type="button" className="studio-gold" disabled={busy} onClick={() => void savePolicy()}>{busy ? <Loader2 className="animate-spin" /> : <Save />} {message ? <><Check />{labels.saved}</> : labels.save}</button>
        {message && <span className="text-xs text-lime">{message}</span>}
        {error && <span className="text-xs text-rose-300">{error}</span>}
      </div>
      <div className="mt-5 border-t border-border pt-4">
        <div className="mb-3 flex items-center gap-2"><FileText className="text-cyan" /><strong>{labels.scripts}</strong></div>
        <div className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
          <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={labels.titlePlaceholder} />
          <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={kind} onChange={(event) => setKind(event.target.value as AssistantKind)}>{(Object.keys(kindLabel) as AssistantKind[]).map((item) => <option key={item} value={item}>{kindLabel[item]}</option>)}</select>
          <label className="studio-ghost flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm"><Upload />{file?.name ?? labels.chooseFile}<input type="file" className="sr-only" accept=".txt,.md,.csv,.json" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
        </div>
        <button type="button" className="studio-gold mt-2" disabled={!file || busy} onClick={() => void uploadKnowledge()}><Upload /> {labels.upload}</button>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {config.knowledge.map((item) => <div key={item.id} className="flex items-center justify-between rounded-lg border border-border bg-background/30 px-3 py-2 text-sm"><span><strong>{item.title}</strong><small className="ml-2 text-muted-foreground">{kindLabel[item.kind]} · {item.characters}</small></span><button type="button" aria-label={labels.remove} className="text-rose-300" onClick={() => void removeKnowledge(item.id)}><Trash2 size={15} /></button></div>)}
          {!config.knowledge.length && <p className="text-sm text-muted-foreground">{labels.noScripts}</p>}
        </div>
      </div>
    </div>
  );
}
