# HayDev

Русскоязычный сайт студии, которая соединяет ИИ-автоматизацию, сайты, бизнес-ПО, CRM и маркетинг в единую систему роста.

## Стек

Sites Vinext (Next-compatible App Router), React 19, TypeScript, Tailwind 4, существующие Radix/Shadcn primitives, Cloudflare Worker и D1. Пакетный менеджер — pnpm; `pnpm-lock.yaml` является источником версий. Новые runtime-зависимости не добавлялись.

## Где редактировать

- `data/site-content.ts`: навигация, услуги, модули системы, этапы, примеры сценариев.
- `components/haydev.tsx`: секции и интерактивные состояния.
- `components/sections/contact-form.tsx`: форма, клиентская валидация, отправка и статусы.
- `app/globals.css`: цвета, размеры, responsive и reduced motion.
- `app/layout.tsx`: русский язык, title/description, OpenGraph, canonical и noindex закрытой версии.
- `app/api/leads/route.ts`: POST заявки, серверная валидация и ограничения.
- `db/schema.ts`, `drizzle/`: структура и миграции D1.
- `public/images/`: оригинальная 3D-графика в WebP; live WebGL не используется.

## Основной путь

Посетитель изучает роль модулей, переключает карту «без системы / с HayDev», раскрывает решения, выбирает этапы и примеры. Все основные CTA ведут к форме. POST `/api/leads` сохраняет заявку в D1. Успех показывается после успешного ответа сервера. Повтор с тем же UUID не создаёт дубликат. Сервер ограничивает заявки тремя на адрес за 24 часа, проверяет согласие, honeypot и размер тела.

Публичного GET заявок нет. Владелец просматривает таблицу `leads` через управление данными Site. Уведомления на email, Telegram и внешняя CRM не подключены: адреса и учётные данные не предоставлены. Данные формы не отправляются сторонним сервисам и не записываются в localStorage.

## Запуск и сборка

В среде Sites используйте `sites-building`/`sites-hosting`; managed preview только через `sites-preview start /workspace/sites/haydev`. Обычные scripts сохранены: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm db:generate`. Проверка типов: `node node_modules/typescript/bin/tsc --noEmit`. Отдельного test/typecheck script в исходном starter нет.

Для локального D1 сначала соберите проект, затем примените `drizzle/0000_regular_hedge_knight.sql` через Wrangler с `--local --config dist/server/wrangler.json --persist-to .wrangler/state`. При публикации Sites применяет миграции отдельно; локальные тестовые записи не публикуются.

## Граница готовности

Версия предназначена для закрытого просмотра. Перед открытым запуском владелец должен добавить реальные контакты, реквизиты оператора и окончательную политику работы с данными. После этого можно согласовать открытый доступ и индексацию (сейчас noindex). Нет выдуманных клиентов, кейсов, партнёрств или обещаний процентов роста. Примеры явно обозначены как сценарии.

## Проверки и решения

- `haydev_research_matrix.md`: источники, заимствуемые принципы, стоимость и риски.
- `haydev_design_direction.md`: три направления, выбранная метафора, 3D gate и план.
- `haydev_verification_report.md`: команды и фактические результаты.
- `haydev_repair_loop.md`: ошибки, минимальные исправления и повторные проверки.
- `haydev_final_deep_audit.md`: повторный аудит исходников и оставшиеся ограничения.

Hero создан встроенным imagegen специально для этого проекта, без чужих брендов и ассетов. Original PNG 1536×1024 преобразован в desktop WebP 127444 bytes и mobile WebP 39030 bytes. CSS perspective применяется только для мыши и отключается при reduced motion. Временная QA-страница удалена перед итоговой сборкой.

## Languages
Armenian is the default: `/` redirects to `/hy`. `/ru` and `/en` are independently addressable Russian and English versions. The header switch uses accessible links; reloading preserves the locale in the URL. All copy, form states, API validation messages and metadata are translated. Edit `data/translations.json` (Russian source keys), with structured content in `data/site-content.ts`. The selected dictionary is provided by the locale root layout; no translation service or new runtime dependency is used. API locale is selected by the allowlisted `X-Haydev-Locale` header, defaulting to Armenian.

See `haydev_i18n_verification.md` for the language update audit.
