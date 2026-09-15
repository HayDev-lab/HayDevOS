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

---
Task ID: 3
Agent: main-agent (Z.ai Code)
Task: Оценка статуса проекта, QA через agent-browser, исправление багов, улучшение стиля и добавление новых функций (3-й раунд развития).

Work Log:
- Прочитан worklog (раунды 1–2: репозиционирование выполнено). Проверены dev.log (чисто), lint (чисто), tsc (ошибки только в skills/examples — не наши).
- QA через agent-browser (сессия task-03e363425671): hero, WebGL-сцены (CORE/PRODUCTS переключаются, ноды 10/5), все секции desktop 1440 + mobile 390/360, мобильное меню, переключение языков ru/en/hy, Business Audit (in-page: 8 вопросов → карта → apply в форму; standalone app: полный проход + возврат на сайт), форма контактов (POST /api/leads 201), showcase details.
- НАЙДЕН БАГ: первый клик «Смотреть ERP / CRM» не скроллил к #erp — rAF срабатывал раньше монтирования lazy SystemDetails (Suspense), элемент не находился. ИСПРАВЛЕНО: openShowcase теперь поллит getElementById через rAF до 3 сек.
- VLM-критика (до правок): products — слабейшая секция («boxy», плотно, runt-строки); footer-bottom — вертикальное смещение копирайта; мобильный pipeline-rail скроллится без affordance.
- НОВОЕ: FAQ-секция (07/FAQ, компонент sections/faq.tsx, faqItems в business-os.ts): 5 честных вопросов (цена, сроки, интеграции, владение кодом, после запуска) + faq-cta. Contact перенумерован в 08, process в showcase — в 09.
- НОВОЕ: site-chrome.tsx — ScrollProgress (lime-бар чтения), BackToTop (появляется после 1.2 экрана, safe-area), useReveal (IntersectionObserver → .revealed).
- НОВОЕ: sticky-хедер (blur 14px, тень), anchor-скролл учтён (scroll-padding-top 100px > 74px хедера).
- НОВОЕ: reveal-on-scroll — data-reveal на os-section-heading/build-map/pipeline-rail/pipeline-detail/automation-layout/intelligence-layer/industry-system/products-grid/faq-list/faq-cta; prefers-reduced-motion отключает.
- НОВОЕ: contact «ЧТО ДАЛЬШЕ» — таймлайн 01 Ответ → 02 Обсуждение → 03 Архитектура (в contact-copy).
- RESTYLE: product-card переработаны (top-accent по статусу, hover-glow + тень, features-теги (добавлены в data), foot с CTA/«дата не обещана»); footer-bottom выравнивание + hover; pipeline-rail scroll-snap + mask-fade на mobile; intelligence-selector glow; build-items hover-стрелка; os-hero-subtitle контраст; scene-mode активное состояние.
- ПЕРЕВОДЫ: +41 ключ в hy и en (FAQ Q&A, таймлайн, features, chrome, aria). ru = ключи по умолчанию.
- Верификация после правок: sticky работает, progress-bar scaleX растёт, back-to-top клик → scrollY 0, FAQ аккордеон открывается, showcase скроллит с fresh lazy-загрузкой (erpTop 200), языки en/hy на новых секциях, overflow-тест 390/360 по всем секциям ok, audit + форма 201, lint чист, dev.log без ошибок.

Stage Summary:
- Состояние: производство-готово; позиционирование SOFTWARE + AI + DIGITAL PRODUCTS сохранено; ни одной регрессии.
- Ключевые артефакты: src/components/site-chrome.tsx (новый), src/components/sections/faq.tsx (новый), правки haydev.tsx / haydev-products.tsx / system-details.tsx / what-we-build.tsx / custom-software.tsx / ai-automation.tsx / industry-systems.tsx / business-os.ts / translations.json / globals.css (+120 строк).
- Скриншоты: screenshots/r3-*.png (12 шт.) + qa-*.png.
- Остаточные риски: WebGL на очень старых GPU (есть fallback-картинка); ru-копирайт обновляется ключами (проверять при новых текстах); honeypot-защита формы минимальна (закрытая демо — ок).
- Рекомендации следующего раунда: (1) SEO-метаданные Open Graph + JSON-LD Organization; (2) страница/блок «команда и принципы» или кейсы; (3) email-уведомления о лидах (сейчас только SQLite); (4) лёгкий e2e-дымовой тест (форма + аудит) для регрессий.
