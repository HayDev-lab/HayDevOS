"use client";

/**
 * CommandPalette — global Cmd/Ctrl+K palette.
 *
 * Sections: Navigate (modules), Quick Actions (toasts), Search (filtered mock).
 * The Dialog open state is driven by `commandOpen` in the app store.
 *
 * The local `query` is reset to "" each time the palette opens via the
 * `onOpenChange` callback (an event handler, not an effect) so we avoid the
 * react-hooks/set-state-in-effect lint rule.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Plus,
  FileText,
  Upload,
  Workflow,
  FileBarChart,
  CornerDownLeft,
} from "lucide-react";

import { useAppStore } from "@/lib/store/app-store";
import { useLocale } from "@/lib/i18n";
import { ModuleRegistry } from "@/lib/modules/registry";
import { mockLeads, mockQuotes, mockDocuments, mockCustomers } from "@/lib/mock";
import { toast } from "sonner";

interface SearchResult {
  id: string;
  label: string;
  hint: string;
  module: string;
  kind: "lead" | "quote" | "doc" | "customer";
}

export function CommandPalette() {
  const { t } = useLocale();
  const { commandOpen, setCommandOpen, setActiveModule } = useAppStore();
  const [query, setQuery] = useState("");

  // Reset the search box each time the palette opens.
  function handleOpenChange(open: boolean) {
    if (open) setQuery("");
    setCommandOpen(open);
  }

  // Cmd/Ctrl+K toggles the palette.
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commandOpen, setCommandOpen]);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: SearchResult[] = [];
    for (const l of mockLeads) {
      const hay = `${l.name} ${l.company ?? ""} ${l.email ?? ""}`.toLowerCase();
      if (hay.includes(q)) {
        out.push({
          id: l.id,
          label: l.name,
          hint: l.company ?? l.email ?? "—",
          module: "leados",
          kind: "lead",
        });
      }
    }
    for (const qd of mockQuotes) {
      const hay = `${qd.number} $${qd.total}`.toLowerCase();
      if (hay.includes(q)) {
        out.push({
          id: qd.id,
          label: qd.number,
          hint: `$${qd.total.toLocaleString()} · ${qd.status}`,
          module: "quoteflow",
          kind: "quote",
        });
      }
    }
    for (const d of mockDocuments) {
      const hay = `${d.filename} ${d.classification ?? ""}`.toLowerCase();
      if (hay.includes(q)) {
        out.push({
          id: d.id,
          label: d.filename,
          hint: `${d.classification ?? "—"} · ${d.status}`,
          module: "docsmart",
          kind: "doc",
        });
      }
    }
    for (const c of mockCustomers) {
      const hay = `${c.name} ${c.email ?? ""}`.toLowerCase();
      if (hay.includes(q)) {
        out.push({
          id: c.id,
          label: c.name,
          hint: c.email ?? c.type,
          module: "erphub",
          kind: "customer",
        });
      }
    }
    return out.slice(0, 8);
  }, [query]);

  const quickActions = [
    {
      icon: Plus,
      label: t("shell.command.createLead"),
      run: () => {
        toast.success(t("shell.toast.leadCreated"));
        setCommandOpen(false);
      },
    },
    {
      icon: FileText,
      label: t("shell.command.createQuote"),
      run: () => {
        toast.success(t("shell.toast.quoteCreated"));
        setCommandOpen(false);
      },
    },
    {
      icon: Upload,
      label: t("shell.command.uploadDoc"),
      run: () => {
        toast.success(t("shell.toast.docUploaded"));
        setCommandOpen(false);
      },
    },
    {
      icon: Workflow,
      label: t("shell.command.newAutomation"),
      run: () => {
        toast.success(t("shell.toast.automationCreated"));
        setCommandOpen(false);
      },
    },
    {
      icon: FileBarChart,
      label: t("shell.command.generateReport"),
      run: () => {
        toast.success(t("shell.toast.reportQueued"));
        setCommandOpen(false);
      },
    },
  ];

  return (
    <CommandDialog
      open={commandOpen}
      onOpenChange={handleOpenChange}
      title={t("shell.command.title")}
      description={t("shell.command.subtitle")}
      className="glass-strong max-h-[76vh] gap-0 p-0"
      showCloseButton={false}
    >
      <Command className="[&_[cmdk-input]]:text-sm">
        <CommandInput
          placeholder={t("shell.search.placeholder")}
          value={query}
          onValueChange={setQuery}
          autoFocus
        />
        <CommandList className="max-h-[55vh]">
          <CommandEmpty>{t("misc.noResults")}</CommandEmpty>

          {/* Navigate */}
          <CommandGroup heading={t("shell.command.navigate")}>
            {ModuleRegistry.map((m) => {
              const Icon = m.icon;
              return (
                <CommandItem
                  key={m.id}
                  value={`navigate ${m.id} ${t(m.nameKey)}`}
                  onSelect={() => {
                    setActiveModule(m.id);
                    setCommandOpen(false);
                  }}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{t(m.nameKey)}</span>
                  <span className="ml-auto text-[10px] uppercase text-muted-foreground/70">
                    {m.id}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          {/* Quick actions */}
          <CommandGroup heading={t("shell.command.quickActions")}>
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <CommandItem
                  key={a.label}
                  value={`action ${a.label}`}
                  onSelect={() => a.run()}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4 text-lime" />
                  <span className="text-sm text-foreground">{a.label}</span>
                  <CornerDownLeft className="ml-auto h-3 w-3 text-muted-foreground/60" />
                </CommandItem>
              );
            })}
          </CommandGroup>

          {/* Search results */}
          {query.trim().length > 0 && results.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={t("shell.command.search")}>
                {results.map((r) => (
                  <CommandItem
                    key={`${r.kind}-${r.id}`}
                    value={`${r.kind} ${r.label} ${r.hint}`}
                    onSelect={() => {
                      setActiveModule(r.module);
                      setCommandOpen(false);
                    }}
                    className="gap-2"
                  >
                    <span className="text-[10px] uppercase text-muted-foreground/70">
                      {r.kind}
                    </span>
                    <span className="text-sm text-foreground">{r.label}</span>
                    <span className="ml-auto truncate text-xs text-muted-foreground">
                      {r.hint}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>

        {/* Footer hint */}
        <div className="border-t border-border px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground/70">
          {t("shell.command.footer")}
        </div>
      </Command>
    </CommandDialog>
  );
}

export default CommandPalette;

