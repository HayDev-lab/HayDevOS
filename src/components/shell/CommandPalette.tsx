"use client";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAppStore } from "@/lib/store/app-store";
import { useLocale } from "@/lib/i18n";
import { ModuleRegistry } from "@/lib/modules/registry";
import { useWorkspaceCopy } from "@/components/core/copy";

export function CommandPalette() {
  const { t } = useLocale();
  const copy = useWorkspaceCopy();
  const {
    commandOpen,
    setCommandOpen,
    setActiveModule,
    searchQuery,
    setSearchQuery,
  } = useAppStore();
  return (
    <CommandDialog
      open={commandOpen}
      onOpenChange={setCommandOpen}
      title={t("shell.command.title")}
      description={t("shell.command.subtitle")}
      className="core-command-dialog max-h-[76vh] gap-0 p-0"
    >
      <Command>
        <CommandInput
          placeholder={t("shell.search.placeholder")}
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty>{copy.empty}</CommandEmpty>
          <CommandGroup heading={t("shell.settings.modules")}>
            {ModuleRegistry.filter((module) => module.id !== "control").map(
              (module) => (
                <CommandItem
                  key={module.id}
                  value={`${t(module.nameKey)} ${t(`${module.nameKey}.desc`)} ${module.id}`}
                  onSelect={() => {
                    setActiveModule(module.id);
                    setCommandOpen(false);
                    setSearchQuery("");
                  }}
                >
                  <module.icon />
                  <span>{t(module.nameKey)}</span>
                </CommandItem>
              ),
            )}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

export default CommandPalette;
