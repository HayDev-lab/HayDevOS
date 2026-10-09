"use client";

import { useState } from "react";
import { Search, ArrowUpRight } from "lucide-react";
import { ModuleRegistry } from "@/lib/modules/registry";
import { useLocale } from "@/lib/i18n";
import Link from "next/link";
import { workspaceHref } from "@/lib/workspace-routes";
import { useWorkspaceCopy } from "./copy";

export function ModulesView() {
  const { t } = useLocale();
  const copy = useWorkspaceCopy();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const modules = ModuleRegistry.filter(
    (module) => !["dashboard", "modules", "control"].includes(module.id),
  );
  const filtered = modules.filter(
    (module) =>
      (category === "all" || module.category === category) &&
      `${t(module.nameKey)} ${t(`${module.nameKey}.desc`)}`
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
  );
  return (
    <section className="workspace-view" aria-labelledby="modules-title">
      <div className="workspace-shell">
        <div className="workspace-topline">
          <div>
            <span className="workspace-eyebrow">ՀայDevOS · {t("brand.ecosystem")}</span>
            <h1 id="modules-title">{copy.all}</h1>
            <p>{copy.subtitle}</p>
          </div>
        </div>
        <div className="workspace-tools">
          <label className="workspace-search">
            <Search />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.search}
              aria-label={copy.search}
            />
          </label>
          <select
            className="core-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label={t("common.filter")}
          >
            {["all", "core", "operations", "intelligence", "integrations"].map(
              (value, i) => (
                <option key={value} value={value}>
                  {copy.categories[i]}
                </option>
              ),
            )}
          </select>
        </div>
        <div className="module-catalog">
          {filtered.map((module) => (
            <Link
              key={module.id}
              className="catalog-card"
              href={workspaceHref(module.id)}
            >
              <span className="catalog-icon">
                <module.icon />
              </span>
              <strong>{t(module.nameKey)}</strong>
              <p>{t(`${module.nameKey}.desc`)}</p>
              <span className="catalog-status">{copy.open}</span>
              <ArrowUpRight className="catalog-open" />
            </Link>
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="module-empty" role="status">
            {copy.empty}
          </p>
        )}
      </div>
    </section>
  );
}
