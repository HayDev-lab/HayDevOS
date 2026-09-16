# HayDev — Software & AI Development Company

> **We build software businesses run on.**

Трёхъязычный (русский / english / հայերեն) одностраничный сайт компании HayDev: custom software development, AI-системы и собственные цифровые продукты.

## Стек

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Tailwind CSS 4** + shadcn/ui (New York) + Lucide icons
- **Prisma ORM** (SQLite) — приём лидов `/api/leads`
- Нативный **WebGL** orbital engine в hero (fallback — SVG)
- Без внешних трекеров и аналитики

## Структура

```
src/
  app/                    # единственный роут "/" (SPA-подход, ?lang= для локали)
    api/leads/            # приём и валидация заявок (+ webhook-форвардинг)
    api/v1/               # HAYDEV LEADOS — demo product API (leads/pipeline/sla/tasks/…)
  components/
    leados/               # HAYDEV LEADOS — in-page demo (intro + workspace)
    sections/             # 13 секций лендинга
    business-audit/       # in-page Business Audit (8 вопросов → карта → форма)
    command-palette.tsx   # Ctrl+K навигация
    site-chrome.tsx       # dots, scroll-progress, mobile CTA, reveal
  data/                   # контент + translations.json (hy/en/ru)
  lib/
    leados/               # бизнес-логика LeadOS (scoring, SLA, lost-detector, seed…)
    i18n, audit-engine, db
```

## Возможности

- Локали **ru / en / hy** — клиентское переключение, `<html lang>` синхронизируется
- **WebGL hero** с четырьмя сценами (CORE / BUILD / AUTOMATE / PRODUCTS) + клавиатура ←/→
- **Business Audit** — интерактивная диагностика, перенос ответов в форму заявки
- **Command Palette** (Ctrl+K / «/») — разделы, язык, сцены, действия
- FAQ-поиск с русским стеммингом + keyword-алиасами, JSON-LD FAQPage
- Фильтр продуктов LIVE / ДЕМО / IN DEVELOPMENT, ранний доступ из карточек
- **HayDev LeadOS demo** — рабочий CRM-продукт прямо на сайте: intro-страница, лиды, пайплайн, SLA, задачи, activity timeline, синтетические демо-данные + reset
- Draft-persistence формы, honeypot, rate-limit, LEADS_WEBHOOK_URL форвардинг
- SEO: OG-изображение, hreflang, sitemap.xml, динамический robots.txt
- Print-стили, prefers-reduced-motion, focus-visible, aria-разметка

## Разработка

```bash
bun run dev      # dev-сервер на :3000
bun run lint     # ESLint
bun run db:push  # применить prisma-схему
```

## Статус

Закрытая демонстрация: `noindex` включён намеренно. Перед публичным запуском — см. «Остаточные риски» в `worklog.md`.
