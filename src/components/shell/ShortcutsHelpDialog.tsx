"use client";

/**
 * ShortcutsHelpDialog — a dialog listing every HayDevOS keyboard shortcut in
 * grouped rows (Navigation / Modules / Actions).
 *
 * Rendered as a centered shadcn Dialog. The open state is driven by
 * `shortcutsOpen` in the app store — pressing `?` (Shift+/) anywhere outside
 * an input/textarea/dialog opens it, and the TopBar help button also opens
 * it (the help button previously opened docs in a new tab; now it opens the
 * shortcuts dialog).
 *
 * Keycaps are styled inline (the shadcn Kbd component isn't installed here);
 * each keycap uses `bg-muted` + `border-border` + `shadow-sm` + monospace
 * font for the key text, mirroring real physical keys.
 *
 * All visible strings flow through `t()`. Switching language updates the
 * dialog instantly (the hook re-renders on locale change).
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store/app-store";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface KeycapProps {
  /** Key text, e.g. "⌘K", "g l", "?". */
  children: string;
  className?: string;
}

function Keycap({ children, className }: KeycapProps) {
  return (
    <kbd
      className={cn(
        "inline-flex h-6 min-w-[1.5rem] items-center justify-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[11px] font-medium text-foreground shadow-sm",
        "[box-shadow:0_1px_0_0_var(--border),0_2px_0_0_var(--border)]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

interface RowProps {
  labelKey: string;
  keys: string[]; // each entry renders as a Keycap
}

function Row({ labelKey, keys }: RowProps) {
  const { t } = useLocale();
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-1.5 odd:bg-muted/20">
      <span className="text-xs text-muted-foreground">{t(labelKey)}</span>
      <span className="flex items-center gap-1">
        {keys.map((k, i) => (
          <Keycap key={`${k}-${i}`}>{k}</Keycap>
        ))}
      </span>
    </li>
  );
}

export function ShortcutsHelpDialog() {
  const { t } = useLocale();
  const { shortcutsOpen, setShortcutsOpen } = useAppStore();

  return (
    <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
      <DialogContent className="glass-strong flex max-h-[88vh] w-[min(96vw,560px)] flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="text-base font-semibold tracking-tight">
            {t("shortcuts.title")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("shortcuts.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-2 py-3">
          {/* Navigation */}
          <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            {t("shortcuts.category.navigation")}
          </p>
          <ul className="mb-3 rounded-lg border border-border bg-card/40">
            <Row labelKey="shortcuts.row.commandPalette" keys={["⌘", "K"]} />
            <Row labelKey="shortcuts.row.ownerAi" keys={["⌘", "J"]} />
            <Row labelKey="shortcuts.row.activity" keys={["⌘", "H"]} />
            <Row labelKey="shortcuts.row.thisHelp" keys={["?"]} />
            <Row labelKey="shortcuts.row.close" keys={["Esc"]} />
            <Row labelKey="shortcuts.row.jumpToModule" keys={["g", "…"]} />
            <Row labelKey="shortcuts.row.focusSearch" keys={["/"]} />
          </ul>

          {/* Modules */}
          <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            {t("shortcuts.category.modules")}
          </p>
          <ul className="mb-3 rounded-lg border border-border bg-card/40">
            <Row labelKey="shortcuts.row.dashboard" keys={["g", "d"]} />
            <Row labelKey="shortcuts.row.leados" keys={["g", "l"]} />
            <Row labelKey="shortcuts.row.quoteflow" keys={["g", "q"]} />
            <Row labelKey="shortcuts.row.docsmart" keys={["g", "o"]} />
            <Row labelKey="shortcuts.row.autopilot" keys={["g", "a"]} />
            <Row labelKey="shortcuts.row.erphub" keys={["g", "e"]} />
            <Row labelKey="shortcuts.row.control" keys={["g", "c"]} />
            <Row labelKey="shortcuts.row.connect" keys={["g", "i"]} />
            <Row labelKey="shortcuts.row.audit" keys={["g", "b"]} />
            <Row labelKey="shortcuts.row.owneraiModule" keys={["g", "u"]} />
            <Row labelKey="shortcuts.row.settings" keys={["g", "s"]} />
          </ul>

          {/* Actions */}
          <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            {t("shortcuts.category.actions")}
          </p>
          <ul className="rounded-lg border border-border bg-card/40">
            <Row labelKey="shortcuts.row.newContextual" keys={["n"]} />
            <Row labelKey="shortcuts.row.refresh" keys={["r"]} />
            <Row labelKey="shortcuts.row.toggleTheme" keys={["t"]} />
            <Row labelKey="shortcuts.row.shortcuts" keys={["?"]} />
          </ul>

          <p className="px-3 pt-4 text-[11px] text-muted-foreground/70">
            {t("shortcuts.tip", { g: "g" })}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShortcutsHelpDialog;
