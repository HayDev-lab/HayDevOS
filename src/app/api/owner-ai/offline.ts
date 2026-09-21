/**
 * Owner AI — offline fallback engine.
 *
 * Used when:
 *  - the LLM SDK is unavailable (no API key, network error, etc.), OR
 *  - the LLM response cannot be parsed.
 *
 * Produces a deterministic, templated answer using the same read tools the
 * LLM would use. The answer clearly labels itself as offline mode so the
 * user knows the LLM was not consulted.
 *
 * The engine uses simple keyword matching to pick the most relevant tool(s)
 * for the user's question. It is intentionally rule-based — no randomness,
 * no LLM dependency — so the panel ALWAYS works for demo.
 */

import { dispatchTool, summarizeToolResult } from "./tools";
import type { OwnerAiMode, ProposedAction, ToolCallRecord } from "./types";
import { addToolCall, proposeAction, type AddToolCallArgs } from "./audit";

export interface OfflineResult {
  content: string;
  toolCalls: ToolCallRecord[];
  proposedActions: ProposedAction[];
}

interface OfflineCtx {
  conversationId: string;
  runId: string;
  mode: OwnerAiMode;
}

/**
 * Produce an offline response for a user message.
 * The user message is the LAST message in the conversation.
 */
export function offlineRespond(
  userMessage: string,
  ctx: OfflineCtx,
): OfflineResult {
  const q = userMessage.toLowerCase();
  const toolCalls: ToolCallRecord[] = [];
  const proposedActions: ProposedAction[] = [];

  // Pick tool(s) by keyword.
  const calls: { name: string; args: Record<string, unknown> }[] = [];

  if (/\b(risk|at[ -]?risk|stale|breach|sla)\b/.test(q)) {
    calls.push({ name: "getRiskLeads", args: {} });
  }
  if (/\bexpir/.test(q) && /\bquote/.test(q)) {
    calls.push({ name: "getExpiringQuotes", args: { days: 7 } });
  } else if (/\bexpir/.test(q)) {
    calls.push({ name: "getExpiringQuotes", args: { days: 7 } });
  }
  if (/\b(pipeline|sales|conversion|deal)\b/.test(q)) {
    calls.push({ name: "getSalesSummary", args: { window: "30d" } });
  }
  if (/\b(attention|today|priorit|urgent|focus|today'?s)\b/.test(q)) {
    calls.push({ name: "getAttentionItems", args: { window: "7d" } });
  }
  if (/\b(snapshot|overview|status|health|executive|summary|kpi)\b/.test(q)) {
    calls.push({ name: "getExecutiveSnapshot", args: { window: "30d" } });
  }
  if (/\b(report|weekly|monthly|quarterly|daily)\b/.test(q)) {
    calls.push({ name: "getExecutiveSnapshot", args: { window: "7d" } });
  }
  if (/\b(document|docsmart|invoice|receipt|contract)\b/.test(q)) {
    calls.push({ name: "getDocumentSummary", args: { window: "30d" } });
  }
  if (/\b(automation|automa|workflow|failed)\b/.test(q)) {
    calls.push({ name: "getAutomationSummary", args: { window: "30d" } });
    if (/\bfailed\b/.test(q)) calls.push({ name: "getFailedAutomations", args: {} });
  }
  if (/\b(finance|invoice|overdue|ar aging|payment|erp)\b/.test(q)) {
    calls.push({ name: "getFinanceSummary", args: { window: "30d" } });
  }
  if (/\b(integration|slack|hubspot|stripe|gmail|quickbooks|connect|sync)\b/.test(q)) {
    calls.push({ name: "getIntegrationHealth", args: { window: "30d" } });
  }
  if (/\b(timeline|activity|recent|history|feed)\b/.test(q)) {
    calls.push({ name: "getTimeline", args: { window: "7d" } });
  }
  if (/\b(search|find|lookup|where is)\b/.test(q)) {
    // Try to extract a query term.
    const m = userMessage.match(/(?:search|find|lookup|where is)\s+(?:for\s+)?(.+)/i);
    const query = m?.[1]?.trim() ?? userMessage;
    calls.push({ name: "searchGlobal", args: { query } });
  }
  if (/\bquote\b/.test(q) && !calls.some((c) => c.name === "getExpiringQuotes")) {
    calls.push({ name: "getQuoteSummary", args: { window: "30d" } });
  }

  // Fallback: if nothing matched, give the executive snapshot.
  if (calls.length === 0) {
    calls.push({ name: "getExecutiveSnapshot", args: { window: "30d" } });
  }

  // De-duplicate by name+args-json.
  const seen = new Set<string>();
  const uniqueCalls = calls.filter((c) => {
    const key = c.name + JSON.stringify(c.args);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Execute the calls.
  for (const c of uniqueCalls) {
    try {
      const { result, durationMs } = dispatchTool(c.name, c.args);
      const { summary, count, preview } = summarizeToolResult(c.name, result);
      const rec = addToolCallRecord({
        conversationId: ctx.conversationId,
        runId: ctx.runId,
        name: c.name,
        args: c.args,
        resultSummary: summary,
        resultPreview: preview,
        resultCount: count,
        durationMs,
      });
      toolCalls.push(rec);
    } catch (e) {
      // Skip failed tool calls in offline mode (rare).
    }
  }

  // Compose the templated answer from the tool results.
  const body = composeOfflineAnswer(userMessage, toolCalls);

  // Propose a safe action if the user asked for a report.
  if (/\breport\b/.test(q) && ctx.mode !== "OBSERVE") {
    const type = /weekly/.test(q) ? "weekly" : /monthly/.test(q) ? "monthly" : /quarterly/.test(q) ? "quarterly" : /daily/.test(q) ? "daily" : "weekly";
    const act = proposeAction({
      conversationId: ctx.conversationId,
      runId: ctx.runId,
      action: "generateReport",
      args: { type, window: "7d" },
    });
    proposedActions.push(act);
  }

  const content = [
    `> ⚠️ **Offline mode** — the LLM provider was unavailable. This answer was generated locally using the read tools. The numbers are real (from your mock data), but the prose is templated.`,
    ``,
    body,
  ].join("\n");

  return { content, toolCalls, proposedActions };
}

// ─────────────────────────────────────────────────────────────────────────────
// Local ToolCallRecord construction (mirrors audit.addToolCall but returns the record)
// ─────────────────────────────────────────────────────────────────────────────

function addToolCallRecord(args: AddToolCallArgs): ToolCallRecord {
  return addToolCall(args);
}

// ─────────────────────────────────────────────────────────────────────────────
// Answer composition
// ─────────────────────────────────────────────────────────────────────────────

function composeOfflineAnswer(userMessage: string, toolCalls: ToolCallRecord[]): string {
  if (toolCalls.length === 0) {
    return "I couldn't find any data for that question. Try asking about pipeline, attention items, expiring quotes, or integrations.";
  }

  const lines: string[] = [];
  lines.push(`**Question:** _${userMessage.trim()}_`);
  lines.push(``);
  lines.push(`**What I checked:**`);

  for (const tc of toolCalls) {
    lines.push(`- \`${tc.name}\` — ${tc.resultSummary} (${tc.durationMs}ms)`);
  }
  lines.push(``);
  lines.push(`**Findings:**`);

  for (const tc of toolCalls) {
    const data = safeParse(tc.resultPreview);
    if (!data) continue;
    switch (tc.name) {
      case "getExecutiveSnapshot": {
        const kpis = (data as { kpis?: { label: string; value: string; deltaPct: number; tone: string; source: string }[] }).kpis ?? [];
        const attention = (data as { attentionTop?: { priority: string; title: string }[] }).attentionTop ?? [];
        lines.push(`- **Executive snapshot** (${kpis.length} KPIs):`);
        for (const k of kpis.slice(0, 6)) {
          lines.push(`  - ${labelFromKey(k.label)}: **${k.value}** (Δ ${k.deltaPct}%, ${k.source})`);
        }
        if (attention.length > 0) {
          lines.push(`- Top attention items:`);
          for (const a of attention.slice(0, 3)) {
            lines.push(`  - [${a.priority}] ${a.title}`);
          }
        }
        break;
      }
      case "getAttentionItems": {
        const items = (data as { items?: { priority: string; title: string; body: string }[] }).items ?? [];
        if (items.length === 0) {
          lines.push(`- ✅ No items need attention right now.`);
        } else {
          lines.push(`- **${items.length} attention items** (sorted by priority):`);
          for (const a of items.slice(0, 5)) {
            lines.push(`  - [${a.priority}] ${a.title} — ${a.body.slice(0, 120)}`);
          }
          if (items.length > 5) lines.push(`  - …and ${items.length - 5} more`);
        }
        break;
      }
      case "getRiskLeads": {
        const leads = (data as { leads?: { name: string; company: string | null; value: number; currency: string; reason: string; owner: string; staleDays: number }[]; count?: number; totalValue?: number }).leads ?? [];
        const total = (data as { totalValue?: number }).totalValue ?? 0;
        if (leads.length === 0) {
          lines.push(`- ✅ No leads at risk right now.`);
        } else {
          lines.push(`- **${leads.length} leads at risk** totaling ${leads[0]?.currency ?? "$"} ${total.toLocaleString()}:`);
          for (const l of leads.slice(0, 5)) {
            lines.push(`  - ${l.name} (${l.company ?? "—"}) — ${l.currency} ${l.value.toLocaleString()} · ${l.reason.replace("_", " ")} · ${l.staleDays}d idle · owner ${l.owner}`);
          }
        }
        break;
      }
      case "getExpiringQuotes": {
        const qs = (data as { quotes?: { number: string; total: number; currency: string; daysLeft: number; status: string }[]; count?: number; days?: number }).quotes ?? [];
        if (qs.length === 0) {
          lines.push(`- ✅ No quotes expiring in the next ${(data as { days?: number }).days ?? 7} days.`);
        } else {
          lines.push(`- **${qs.length} quotes expiring** within ${(data as { days?: number }).days ?? 7} days:`);
          for (const q of qs.slice(0, 5)) {
            lines.push(`  - ${q.number} — ${q.currency} ${q.total.toLocaleString()} · ${q.daysLeft}d left · ${q.status}`);
          }
        }
        break;
      }
      case "getSalesSummary": {
        const kpis = (data as { kpis?: { label: string; value: string; deltaPct: number }[] }).kpis ?? [];
        const deals = (data as { dealsAtRisk?: { name: string; value: number; currency: string; staleDays: number }[] }).dealsAtRisk ?? [];
        lines.push(`- **Sales summary** (30d):`);
        for (const k of kpis.slice(0, 5)) {
          lines.push(`  - ${labelFromKey(k.label)}: **${k.value}** (Δ ${k.deltaPct}%)`);
        }
        if (deals.length > 0) {
          lines.push(`- Deals at risk: ${deals.length}`);
        }
        break;
      }
      case "getQuoteSummary": {
        const kpis = (data as { kpis?: { label: string; value: string }[] }).kpis ?? [];
        lines.push(`- **Quote summary** (30d):`);
        for (const k of kpis.slice(0, 5)) {
          lines.push(`  - ${labelFromKey(k.label)}: **${k.value}**`);
        }
        break;
      }
      case "getDocumentSummary": {
        const kpis = (data as { kpis?: { label: string; value: string }[] }).kpis ?? [];
        const awaiting = (data as { awaitingReview?: unknown[] }).awaitingReview ?? [];
        lines.push(`- **Document summary** (30d):`);
        for (const k of kpis.slice(0, 5)) {
          lines.push(`  - ${labelFromKey(k.label)}: **${k.value}**`);
        }
        if (awaiting.length > 0) lines.push(`- Awaiting review: ${awaiting.length}`);
        break;
      }
      case "getAutomationSummary": {
        const kpis = (data as { kpis?: { label: string; value: string }[] }).kpis ?? [];
        const failing = (data as { failing?: unknown[] }).failing ?? [];
        lines.push(`- **Automation summary** (30d):`);
        for (const k of kpis.slice(0, 5)) {
          lines.push(`  - ${labelFromKey(k.label)}: **${k.value}**`);
        }
        if (failing.length > 0) lines.push(`- Failing automations: ${failing.length}`);
        break;
      }
      case "getFailedAutomations": {
        const autos = (data as { automations?: { name: string; failed: number; total: number; successRate: number }[]; count?: number }).automations ?? [];
        if (autos.length === 0) {
          lines.push(`- ✅ No failing automations.`);
        } else {
          lines.push(`- **${autos.length} failing automations**:`);
          for (const a of autos.slice(0, 5)) {
            lines.push(`  - ${a.name} — ${a.failed}/${a.total} failed · ${a.successRate}% success`);
          }
        }
        break;
      }
      case "getFinanceSummary": {
        const kpis = (data as { kpis?: { label: string; value: string }[] }).kpis ?? [];
        const overdue = (data as { overdueInvoices?: unknown[] }).overdueInvoices ?? [];
        lines.push(`- **Finance summary** (30d):`);
        for (const k of kpis.slice(0, 5)) {
          lines.push(`  - ${labelFromKey(k.label)}: **${k.value}**`);
        }
        if (overdue.length > 0) lines.push(`- Overdue invoices: ${overdue.length}`);
        break;
      }
      case "getIntegrationHealth": {
        const kpis = (data as { kpis?: { label: string; value: string }[] }).kpis ?? [];
        const failing = (data as { failing?: { provider: string; status: string }[] }).failing ?? [];
        lines.push(`- **Integration health** (30d):`);
        for (const k of kpis.slice(0, 5)) {
          lines.push(`  - ${labelFromKey(k.label)}: **${k.value}**`);
        }
        if (failing.length > 0) {
          lines.push(`- Integrations needing attention:`);
          for (const f of failing.slice(0, 5)) {
            lines.push(`  - ${f.provider} — ${f.status.replace("_", " ")}`);
          }
        }
        break;
      }
      case "searchGlobal": {
        const results = (data as { results?: { type: string; label: string; sub?: string }[]; count?: number; query?: string }).results ?? [];
        if (results.length === 0) {
          lines.push(`- No matches found for "${(data as { query?: string }).query ?? "?"}"`);
        } else {
          lines.push(`- Found **${(data as { count?: number }).count ?? results.length} matches** for "${(data as { query?: string }).query ?? "?"}":`);
          for (const r of results.slice(0, 8)) {
            lines.push(`  - [${r.type}] ${r.label}${r.sub ? ` — ${r.sub}` : ""}`);
          }
        }
        break;
      }
      case "getTimeline": {
        const events = (data as { events?: { ts: string; module: string; type: string; label: string; sub?: string }[]; count?: number }).events ?? [];
        if (events.length === 0) {
          lines.push(`- No recent activity in this window.`);
        } else {
          lines.push(`- **${(data as { count?: number }).count ?? events.length} recent events** (top 20):`);
          for (const e of events.slice(0, 10)) {
            lines.push(`  - [${e.module}] ${e.type} — ${e.label}${e.sub ? ` (${e.sub})` : ""}`);
          }
          if (events.length > 10) lines.push(`  - …and ${events.length - 10} more`);
        }
        break;
      }
      default:
        lines.push(`- ${tc.name}: ${tc.resultSummary}`);
    }
  }

  lines.push(``);
  lines.push(`_This response was generated by the offline fallback engine. Switch to online mode (when the LLM provider is available) for natural-language synthesis._`);

  return lines.join("\n");
}

function safeParse(s: string): unknown {
  try {
    // The preview may be truncated with "…(truncated)" — strip that.
    const clean = s.replace(/…\(truncated\)$/, "");
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

function labelFromKey(key: string): string {
  // Convert "control.kpi.revenue" → "Revenue"
  const parts = key.split(".");
  const last = parts[parts.length - 1];
  return last
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}
