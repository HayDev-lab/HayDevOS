# HayDev Site — Repositioning Worklog

---
Task ID: 1
Agent: main-agent (Z.ai Code)
Task: Репозиционирование сайта HayDev: от "ERP/Business OS компании" к "Software + AI + Digital Products компании" (по детальному брифу пользователя).

Work Log:
- Изучён текущий проект: Next.js 16, App Router, один роут "/", in-page view для Business Audit (AuditApp), i18n через translations.json (hy/en полные, ru = ключи + 249 оверрайдов), WebGL orbital engine, CSS в globals.css (тёмная тема + lime #c5f563).
- Зафиксировано состояние: скриншот screenshots/before-hero.png + VLM-анализ подтверждает проблему: сайт читается как "B2B SaaS/Enterprise ERP Platform / Business Operating Systems".
- Составлен план репозиционирования (см. ниже).

Stage Summary — план реализации:

Новый нарратив страницы:
1. Header: nav = Что мы создаём(#build) / AI и автоматизация(#automation) / Продукты(#products) / Отрасли(#industries); CTA "Начать проект"
2. HERO: "Создаём софт, на котором работает бизнес" + WebGL-сцена с переключателем CORE/BUILD/AUTOMATE/PRODUCTS (ядро = HAYDEV TECHNOLOGY CORE; ERP/CRM — просто ноды среди остальных)
3. 01 WHAT WE BUILD: интерактивная software architecture map (4 категории: Business Software / Digital Products / Customer Products / AI Products)
4. 02 CUSTOM SOFTWARE (BUILD): "Есть идея? Мы превращаем её в продукт." + pipeline IDEA→ARCHITECTURE→DESIGN→DEVELOPMENT→INTEGRATION→LAUNCH→ITERATION
5. 03 AI & AUTOMATION: "AI там, где он действительно полезен" (AutomationSection выносится из аккордеона в основной поток)
6. 04 HAYDEV PRODUCTS: карточки продуктов со статусами LIVE / IN DEVELOPMENT (ERP/CRM, Business Audit, Control, LeadOS, QuoteFlow, Document AI)
7. Сворачиваемый блок: ERP/CRM как product showcase ("Мы создаём свои продукты") + DATA & CONTROL (Mission Control как пример capability) + Как работаем
8. 05 INDUSTRIES: "Что мы можем построить для вашей отрасли"
9. 06 BUSINESS AUDIT: "Не знаете, с чего начать?" (входной инструмент)
10. 07 CONTACT: "Что вы хотите создать?"
11. Footer: обновлённое описание компании

Файлы к изменению:
- src/data/business-os.ts (heroScenes вместо businessNodes/layers; products)
- src/data/site-content.ts (navigation)
- src/components/visuals/orbital-engine.ts (setScene, переменное число портов)
- src/components/visuals/orbital-scene.tsx (проброс scene)
- src/components/sections/business-core.tsx (новый hero + switcher)
- NEW src/components/sections/what-we-build.tsx
- NEW src/components/sections/custom-software.tsx
- NEW src/components/sections/haydev-products.tsx
- src/components/sections/growth-system.tsx → удалить (AutomationSection переносится в ai-automation.tsx)
- src/components/sections/system-details.tsx (без AutomationSection)
- erp-section.tsx, mission-control.tsx, industry-systems.tsx, business-audit.tsx, contact-form.tsx, haydev.tsx (копирайт + порядок секций)
- src/app/layout.tsx (metadata), src/data/translations.json (новые ключи en/hy), src/app/globals.css (стили новых секций)

Принципы: сохранить WebGL, локализацию, Business Audit, дизайн-язык; ERP уменьшить в визуальном весе; никаких фейковых готовых продуктов/метрик.

---
Task ID: 2
Agent: main-agent (Z.ai Code)
Task: Реализация репозиционирования HayDev: SOFTWARE + AI + DIGITAL PRODUCTS вместо ERP/Business OS.

Work Log:
- Данные: business-os.ts переписан (heroScenes: CORE/BUILD/AUTOMATE/PRODUCTS с нодами; products со статусами LIVE/IN DEVELOPMENT; buildCategories; buildPipeline; industries + builds). site-content.ts: новая навигация.
- WebGL: orbital-engine.ts — setScene() + 4 набора портов (10/6/6/5 нод), data-packet и selected-bead адаптированы к числу нод. orbital-scene.tsx пробрасывает scene.
- Hero (business-core.tsx): «Создаём софт, на котором работает бизнес» + подзаголовок «От идеи до работающего продукта», CTA «Обсудить продукт» / «Посмотреть наши продукты» / «Есть задача? Покажите её», переключатель сцен CORE·BUILD·AUTOMATE·PRODUCTS, ядро = HAYDEV TECHNOLOGY CORE, ERP/CRM — просто ноды.
- Новые секции: what-we-build.tsx (01, интерактивная карта 4 категорий), custom-software.tsx (02, pipeline IDEA→ITERATION), ai-automation.tsx (03, вынесена из аккордеона), haydev-products.tsx (04, карточки 6 продуктов со статусами; CTA открывает showcase/audit).
- haydev.tsx: новый порядок секций, nav «Начать проект», contact «Что вы хотите создать?», footer с новым описанием; openShowcase() открывает lite-details и скроллит к #erp.
- Репозиционированы: erp-section (PRODUCT / «Мы построили ERP/CRM сами»), mission-control (DATA & CONTROL / DASHBOARDS), industry-systems («Что мы можем построить для вашей отрасли» + блок «МОЖНО СОБРАТЬ»), business-audit («Не знаете, с чего начать?»), contact-form («Что хотите создать?», submit «Обсудить проект»).
- growth-system.tsx удалён; system-details.tsx без AutomationSection.
- CSS: мобильные правила business-node заскоуплены на [data-scene=core]; добавлен блок стилей (scene-mode, build-map, pipeline-rail, products-grid, industry-builds, hero-task-link) + адаптив.
- translations.json: +154 ключа en/hy (+3 ru оверрайда). metadata: «HayDev — Software & AI Development Company».

Stage Summary:
- Позиционирование подтверждено VLM-критикой: «software development company that builds custom business software, digital products, and AI automation» — НЕ ERP-only.
- Проверено в браузере (agent-browser): переключение сцен (узлы меняются 10/6/6/5, WebGL canvas dataset.scene обновляется, frames растут), клики по нодам, CTA showcase открывает details, Business Audit приложение работает (вход из Products, навигация, возврат «На сайт HayDev»), форма контактов отправляется (POST /api/leads 201, запись в SQLite Lead), локализация ru/en/hy.
- Адаптив: нет horizontal overflow на 375/390/768/1024/1280/1920. lint чист, tsc чист (ошибки только в examples/skills).
- Скриншоты в screenshots/ (before-*, after-*, mobile-*, m-*, showcase, full-desktop).
