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

---
Task ID: 4
Agent: main-agent (Z.ai Code)
Task: Раунд 4 — QA-регрессия, SEO-пакет (OG/Twitter/JSON-LD), scrollspy-навигация, полировка hero-стрипа и showcase-тумблера.

Work Log:
- QA-оценка статуса: lint чист, dev.log без ошибок, все секции/языки/flows работают; глубокий QA: 404-роут (Next.js стандарт), Tab-навигация (focus-visible 2px работает), полный скролл с перехватом ошибок JS/fetch — 0 ошибок.
- VLM-аудит двух «слабых» элементов (по раунду 3): hero data-strip и lite-details summary — «сырые, placeholder-вид»; составлен план редизайна.
- SEO (layout.tsx полностью переписан): metadataBase (TODO-домен haydev.am — заменить при запуске), title template, keywords (SEO-направление из брифа: custom software/AI/ERP/CRM/web application/automation Armenia + RU-эквиваленты), alternates canonical + hreflang ru/en/hy + x-default, Open Graph (type, siteName, locale ru_RU + alternateLocale en_US/hy_AM, og:image 1200x630 с dimensions/alt/type), Twitter summary_large_image, formatDetection, apple-icon, robots (noindex сохранён для закрытой демо — переключить при запуске + комментарий в коде).
- JSON-LD: два блока — Organization (name, url, logo, description, slogan, areaServed AM, knowsAbout, makesOffer×3) + WebSite (inLanguage ru/en/hy), рендерятся в <head> через script tag.
- OG-IMAGE: сгенерирован через image-generation (1344x768, lime-орбиты на near-black) → центр-кроп sharp до 1200x630 → public/images/og-cover-1200x630.png. VLM-проверка: «excellent, negative space для текста, без артефактов».
- SCROLLSPY (site-chrome.tsx → useScrollSpy): rAF-throttled, активная секция = offsetTop <= линия (хедер + 28% вьюпорта), у самого низа — последняя секция; подсветка через data-current атрибут + CSS (lime underline scaleX-анимация, hover-хинт 0.4).
- DATA STRIP редизайн (business-core.tsx + CSS): размечен как <strong>слова</strong> + <i>→</i>, градиентный фон-подложка, левый lime-акцент, hover на ключевых словах, aria-label для доступности.
- SHOWCASE TOGGLE редизайн (haydev.tsx + CSS): структура «PRODUCT SHOWCASE» (mono-лейбл) + заголовок + круглый ＋-иконка (rotate 45° при open), левая lime-полоса (opacity .55 → 1 при hover/open), открытый state с фоном; старый селектор rotate исправлен (не задевает новый .lite-details-copy).
- Исправлен lint-warning (неиспользуемый eslint-disable).

Stage Summary:
- Верифицировано: OG/Twitter/JSON-LD/hreflang/canonical рендерятся в DOM (проверено querySelector'ами), og:image резолвится в абсолютный URL; scrollspy корректно подсвечивает build/automation/products/industries (посо settle — smooth-scroll учитывается); data-strip + showcase — VLM «PASS, premium, zero bugs»; mobile 390px — 9 секций без overflow, strip переносится чисто, тач-таргеты ≥44px; язык EN, форма 201 (POST /api/leads), audit-app round-trip — всё работает; lint 0/0, dev.log чист.
- Артефакты: public/images/og-cover-1200x630.png (+ исходник og-cover.png), переписан src/app/layout.tsx, useScrollSpy в site-chrome.tsx, разметка business-core.tsx / haydev.tsx, +40 строк CSS (блок ROUND 4).
- Скриншоты: screenshots/r4-*.png (9 шт.).
- Риски/TODO к запуску: (1) заменить SITE_URL в layout.tsx на прод-домен; (2) переключить robots в index:true при публичном запуске; (3) hreflang указывает на ?lang= query — при прод-архитектуре с /:locale маршрутами заменить на реальные URL.
- Рекомендации раунда 5: (1) блок «Почему HayDev» / принципы (engineering trust уже есть в showcase — вынести в основной поток?); (2) e2e-дымовой тест (форма + аудит + scrollspy) на Playwright; (3) email-уведомления о лидах; (4) favicon/OG-варианты под светлые мессенджеры-превью.

---
Task ID: 5
Agent: main-agent (Z.ai Code)
Task: Раунд 5 — QA-регрессия через agent-browser, исправление бага копирайта, НОВАЯ секция «Why HayDev», lead-qualification chips в форме, копирование email, icon-тайлы продуктов и микродетализация стилей по всем секциям.

Work Log:
- QA-оценка: dev.log чист, lint чист, tsc чист (только examples/skills). agent-browser: все секции desktop 1280 + mobile 390 (overflow нет), WebGL-сцены CORE/BUILD/AUTOMATE/PRODUCTS (узлы 10/6/6/5, frames растут), языки ru/en/hy, форма 201, audit полный проход. VLM-аудит всех секций (2 прогона + mobile): слабые места — продукты «плоские», FAQ без hover-состояний строк, инпуты формы с едва заметным underline, неактивные pills отраслей блёклые, коннекторы pipeline тонкие, audit-секция без визуального якоря, hero EN с грамматической ошибкой.
- БАГ: EN hero «We build software / business runs on.» — неграмматично. ИСПРАВЛЕНО: «businesses run on.» (translations.json).
- НОВАЯ СЕКЦИЯ 05 / WHY HAYDEV (why-haydev.tsx + whyPrinciples в business-os.ts): 4 принципа (Архитектура а не шаблон / Код и данные ваши / Оценки без фантазий / Одна команда на весь цикл), карточки с P-01..P-04, hover-топлайн, why-note. Вставлена между Products и Industries.
- ПЕРЕНУМЕРАЦИЯ: build 01 / custom 02 / automation 03 / products 04 / why 05 / industries 06 / audit 07 / faq 08 / contact 09 / showcase process 10.
- НОВОЕ в CONTACT: project-type chips (6 типов, multi-select, aria-pressed, mono-пилюли, lime-заливка активного) — выбранные типы префиксуются в message при отправке («Тип проекта: CRM / ERP, AI-система») — проверено в SQLite; char-counter «N / 3000» под textarea; textarea 4 rows / 122px; focus-glow lime на инпутах.
- НОВОЕ в FOOTER: CopyEmail — hello@haydev.am + кнопка «Скопировать» (navigator.clipboard → execCommand fallback → «Скопировано» 2.2 сек, aria-live). Реальный клик в headless работает.
- НОВОЕ в PRODUCTS: icon-тайлы lucide (Boxes/ScanSearch/Activity/Inbox/ReceiptText/FileScan) в 42px lime-рамке, код слева, name 22px; hover glow.
- НОВОЕ в AUDIT: facts-стрип «8 вопросов · ~5 минут · 0 регистраций» (dashed-чипы с крупными lime-цифрами).
- RESTYLE: build-categories lime hover-bar слева + pressed-состояние; pipeline-connector 2px с прогресс-градиентом (заполняется ДО текущего шага — проверено матрицами transform), pipeline-code ярче; automation-recipe полная рамка + lime-лево + яркие номера шагов 01-04 + hover-indent действий; industry-desktop pills контрастнее (#c0cec2), industry-builds с lime-тире; FAQ row hover/open фон (#c5f56304/07); мобильные scene-mode pills 40px/11px.
- ПЕРЕВОДЫ: +26 EN и +27 HY ключей (секция why, chips, факты аудита, clipboard-кнопки).
- Верификация: chips → POST → SQLite «Тип проекта: CRM / ERP, AI-система» ✓; копирайт кнопки ✓ (реальный клик); audit 8/8 → карта → apply в форму ✓; WebGL сцены 0-3 ✓; reveal на why-grid ✓; полный скролл 9045px — 0 JS-ошибок, 0 overflow; VLM-проверки новых блоков (why/contact/footer desktop + why/contact/hero mobile) — PASS по всем пунктам; lint 0/0, dev.log чист.

Stage Summary:
- Состояние: производство-готово; все флоу работают; ни одной регрессии; секций теперь 10 (было 9).
- Ключевые артефакты: NEW src/components/sections/why-haydev.tsx; правки haydev.tsx (CopyEmail, порядок, 09), haydev-products.tsx (icons), contact-form.tsx (chips + counter), business-audit.tsx (facts + 07), industry-systems.tsx (06), faq.tsx (08), system-details.tsx (10), business-os.ts (whyPrinciples, projectTypes, productIcons), translations.json (EN hero fix + 53 новых ключа), globals.css (+120 строк, блок ROUND 5).
- Скриншоты: screenshots/r5-*.png (27 шт.).
- Остаточные риски: hello@haydev.am — плейсхолдер до подтверждения прод-ящика; clipboard в headless eval-кликах блокируется (user activation) — в реальном браузере работает; test-лиды QA остались в SQLite (закрытая демо — ок).
- Рекомендации раунда 6: (1) e2e-дымовой тест (форма + аудит + scrollspy) на Playwright; (2) email-уведомления о лидах; (3) favicon/OG-вариант под светлые превью; (4) при открытом запуске — заменить SITE_URL/robots/email; (5) возможно «кейсы» или блок команды.

---
Task ID: 6
Agent: main-agent (Z.ai Code)
Task: Раунд 6 — QA-регрессия через agent-browser, НОВАЯ секция Engagement Models, tech-stack блок, dot-навигация, мобильный sticky CTA, hero-ticker, копирование ответов аудита и детальный стиль-пасс по VLM-критике всех секций.

Work Log:
- QA-оценка статуса: lint чист, dev.log чист, tsc чист. agent-browser: полный скролл 0 JS-ошибок, WebGL-сцены CORE/BUILD/AUTOMATE/PRODUCTS (узлы 10/6/6/5, canvas dataset.scene 0→3, frames растут; при выходе канваса из вью — корректная пауза рендера), языки ru/en/hy (ссылки «Рус/Eng/Հայ»), форма 201, in-page аудит 8 вопросов, мобильное меню, overflow-тест 390/360 — 0 проблем. Багов НЕ найдено (ложная тревога с языками — мой селектор искал «EN» вместо «Eng»).
- VLM-аудит 10 скриншотов секций: слабые места — активная категория в What We Build едва заметна, коннекторы pipeline тонкие, карточки продуктов неровные по низу, статусы LIVE/IN DEVELOPMENT разностильные, Why-карточки монотонные, audit-facts «wireframe»-вид, FAQ-шевроны мелкие, пунктир в contact-next-steps бледный, футер малоконтрастный.
- НОВАЯ СЕКЦИЯ 06 / ENGAGEMENT MODELS (engagement-models.tsx + engagementModels в business-os.ts): M-01 Fixed Scope / M-02 Dedicated Team / M-03 Audit First (accent-карточка), bullets «подходит, если» с Check-иконками, CTA (аудит-CTA открывает полный Business Audit app — проверено round-trip «На сайт HayDev»), models-note. Вставлена между Why и Industries.
- ПЕРЕНУМЕРАЦИЯ: build 01 / custom 02 / automation 03 / products 04 / why 05 / models 06 / industries 07 / audit 08 / faq 09 / contact 10 / showcase process 11.
- НОВОЕ в CUSTOM SOFTWARE: TECH STACK блок — 4 группы (FRONTEND/BACKEND/AI & DATA/INFRASTRUCTURE) по 4-5 чипов (techStack в business-os.ts), топ-акцент, hover-подъём чипов.
- НОВОЕ в HERO: hero-ticker — бесконечный marquee 10 направлений (2 копии, translateX(-50%), пауза на hover, mask-fade по краям, reduced-motion off) + hero-scroll-hint «ЛИСТАЙТЕ» с анимированной каплей (только ≥1100px).
- НОВОЕ: SectionDots (site-chrome.tsx) — вертикальная dot-навигация справа (≥1280px), 11 точек, useActiveSection rAF-scrollspy, label-тултипы слева при hover/focus, lime-glow активной точки, клики скроллят (проверено #models/#faq).
- НОВОЕ: MobileCta (site-chrome.tsx) — sticky-бар снизу (<768px): mail-иконка + кнопка «Начать проект»; появляется после 85% первого экрана, скрывается при #contact/.site-footer в вью (IntersectionObserver Map-логика); safe-area; back-to-top поднят выше бара.
- НОВОЕ в AUDIT: кнопка «Скопировать ответы» в результатах (clipboard API + execCommand fallback, «Скопировано» 2.2с, aria-live) — полный проход 8/8 → копирование проверено; audit-facts переработаны в solid-карточки с иконками (ListChecks/Clock/ShieldCheck) и lime-числами.
- RESTYLE по VLM: глобальные ::selection (lime) + кастомный скроллбар (thin, webkit+firefox); hairline-градиент под хедером; build-categories активное состояние (bg + внутренняя рамка + lime-код); pipeline-connector пульсирующая lime-точка на текущем шаге; automation-actions стрелка сдвигается на hover; product-status единые pill-бейджи с точкой (currentColor glow); product-card-foot разделитель; product-soon = полая точка + mono (намеренный «не LIVE»); why-card h3 крупнее + glow кода + радиальный hover-акцент; FAQ вопрос weight 500 + шеврон 22px lime; contact-next-steps сплошные линии; form-success glow; футер ярче (#a3afa6), boxed «Наверх», hover-ссылки; placeholder инпутов контрастнее (#aeb9a3); char-counter выровнен, textarea resize:none.
- ПЕРЕВОДЫ: +72 ключа en/hy (секция models полностью, stack, chrome, dots, copy-answers, ticker-лейбл). Исправлена опечатка в hy («քարտez» → «քարտեզ»).
- ИНЦИДЕНТ: после append CSS через heredoc Turbopack не подхватил файл (old chunk отдавался без ROUND 6 блока; выявлено проверкой computed styles + curl чанка) — решено touch-строкой в конец файла; после пересборки все стили применены (проверено по computed border/grid-cols/radius).
- Верификация финальная: computed styles всех новых блоков ✓; dots: top=home, models, contact, клики ✓; mobile CTA: top hidden / mid visible / contact+footer hidden / faq visible ✓ (steady-state, instant scroll); VLM-ревью 8 секций desktop: 6 PASS после fixes (products footer-pattern и форма placeholder исправлены, повторный VLM мобильный 3/3 PASS); overflow 390/360 по 11 секциям — 0; полный скролл 0 ошибок, 0 пропущенных reveal; WebGL 0-3; языки en/hy на новых блоках; форма 201; lint 0/0; dev.log чист.

Stage Summary:
- Состояние: производство-готово; секций теперь 11 (+ Engagement Models); все флоу работают; регрессий нет.
- Ключевые артефакты: NEW src/components/sections/engagement-models.tsx; site-chrome.tsx (+SectionDots, +MobileCta, +useActiveSection); business-core.tsx (+ticker, +scroll-hint); custom-software.tsx (+stack-block); business-audit.tsx (переписан: иконки facts, copy-answers, 08); business-os.ts (+engagementModels, +techStack, +heroTicker); haydev.tsx (интеграция, нумерация 10); industry-systems.tsx 07, faq.tsx 09, system-details.tsx 11; translations.json (+72 en/hy); globals.css (+178 строк ROUND 6/6b).
- Скриншоты: screenshots/r6-*.png (18 шт.).
- Остаточные риски: (1) hello@haydev.am — плейсхолдер; (2) при прод-запуске заменить SITE_URL/robots; (3) dot-лейблы частично используют fallback-ключи (Business Audit/FAQ/Custom Software отображаются как есть во всех языках — корректно); (4) marquee в очень старых браузерах без will-change может подтормаживать (reduced-motion отключает).
- Рекомендации раунда 7: (1) кейсы/сценарии «до→после» (без фейковых цифр); (2) email-уведомления о лидах; (3) OG-вариант под светлые превью; (4) страница команды/принципов глубже; (5) лёгкий e2e-дымовой тест.

---
Task ID: 7
Agent: main-agent (Z.ai Code)
Task: Раунд 7 — QA-регрессия через agent-browser, НОВАЯ секция 04 «What Changes» (ДО→ПОСЛЕ flip-карточки), фильтр продуктов, hero cursor spotlight, глобальная depth/glow система + детальный VLM стиль-пасс по всем секциям.

Work Log:
- QA-оценка статуса: dev.log чист (Fast Refresh warning — старая запись), lint 0/0, tsc чист. agent-browser: 11 секций рендерятся, WebGL-сцены CORE/AUTOMATE/PRODUCTS (узлы 10/6/5), языки ru/en/hy, полный скролл 0 JS-ошибок, overflow 390/1440 — нет. Первичный POST /api/leads дал 400 — выяснено: тестовый payload без requestId (uuid) — НЕ баг сайта; с корректным payload 201. Форма через UI (setter + dispatchEvent + Radix checkbox клик по кнопке) → SUCCESS.
- VLM-аудит 8 скриншотов секций (2 прогона): список слабых мест — плоские карточки без depth, активные состояния малозаметны, industries pills как disabled, model CTA как plain text, CTA/products/footer нюансы, pipeline без связи rail→detail, mono-лейблы спорят с заголовками, line-height плотный.
- НОВАЯ СЕКЦИЯ 04 / WHAT CHANGES (scenarios.tsx + transformationScenarios в business-os.ts): 4 честных сценария (Заявки/Учёт/Документы/Отчёты) с интерактивным ДО↔ПОСЛЕ flip: pill-toggle в шапке карточки (aria-pressed, анимированный switch), до = X-иконки + muted, после = Check-иконки + lime-акценты + radial-glow фон, футер MANUAL/SYSTEM + hint «нажмите, чтобы переключить», scenarios-note с CTA в аудит. Вставлена между Automation и Products.
- ПЕРЕНУМЕРАЦИЯ: build 01 / custom 02 / automation 03 / scenarios 04 / products 05 / why 06 / models 07 / industries 08 / audit 09 / faq 10 / contact 11 / showcase process 12. SectionDots: 12 точек (+ «Что меняется»).
- НОВОЕ в PRODUCTS: фильтр-чипы ВСЕ(6)/LIVE(2)/В РАЗРАБОТКЕ(4) — mono-пилюли, активная = solid lime + счётчики, key={filter} ре-маунт сетки с product-in stagger-анимацией карточек.
- НОВОЕ в HERO: cursor spotlight — lime radial glow следует за курсором (CSS vars --spot-x/--spot-y, rAF-throttle, только hover:hover+pointer:fine, reduced-motion → статичный glow). В headless скрыт (нет hover media) — форс-проверка opacity=1 + скриншот: VLM «subtle, natural, PASS».
- RESTYLE по VLM (глобальная depth/glow система): inset top highlight + depth shadow на product/why/model/build-visual/stack/scenario карточках, hover lime-glow; build-items точки-bullets; build-categories ярче active; pipeline-rail прогресс-линия (var --rail-progress = (step+1)/7, анимированная заливка под рейлом) + вертикальный lime-коннектор rail→detail; pipeline-connector position:relative (дот-анимация R6 теперь корректно внутри сегмента); automation-recipe круглые бейджи 01-04 + вертикальная spine-линия; model-cta → ghost-button с рамкой/hover-glow; industries active pill = solid lime + тёмный текст; industry-builds solid рамка; why/model-label приглушены; line-height 1.78; product-card hover lift + lime border.
- ПЕРЕВОДЫ: +55 ключа EN и HY (вся секция scenarios, фильтр, MANUAL/SYSTEM, hint). Исправлена опечатка ключа hy («in переписке» → «в переписке»).
- НАЙДЕН И ИСПРАВЛЕН БАГ (создан этим же раундом, пойман VLM): после смены фильтра сетка продуктов оставалась невидимой — useReveal наблюдал [data-reveal] только на первом монтировании, а key={filter} ре-маунтил сетку → элементы навсегда без .revealed. FIX: (1) data-reveal вынесен на стабильную обёртку вокруг keyed-грида; (2) useReveal усилен MutationObserver'ом — динамические [data-reveal] узлы подхватываются автоматически. Верифицировано: после LIVE→ALL фильтра cards 2/6, opacity 1.
- Верификация финальная: scenarios flip (desktop + mobile 390, тач-таргет 44px), фильтр 6/2/4 + восстановление, spotlight координаты следуют за --spot-x/y, rail progress 14.3%→растёт, круги-бейджи recipe, ghost-CTA, solid active pill — всё подтверждено computed styles + скриншотами; VLM: hero-spotlight/scenarios/products LIVE = 3 PASS; automation/models/industries/products = 3 PASS + 1 FAIL (поймал баг reveal) → после фикса PASS; mobile scenarios before/after = 2 PASS; финальный desktop scenarios = PASS («High polish, no defects»); языки EN/HY на новых блоках ✓; полный скролл 0 JS-ошибок; overflow 390 по 12 секциям — 0; mobile меню 5 ссылок; in-page audit на месте; форма → SUCCESS (POST 201 в логах); lint 0/0; tsc чист; dev.log без новых ошибок.

Stage Summary:
- Состояние: производство-готово; секций теперь 12 (+ What Changes); все флоу работают; найденный в раунде баг reveal исправлен и покрыт регрессионной защитой (MutationObserver).
- Ключевые артефакты: NEW src/components/sections/scenarios.tsx; business-os.ts (+transformationScenarios +ProductStatus экспорт); haydev-products.tsx (переписан: фильтр + счётчики); business-core.tsx (+hero-spotlight, useEffect+useRef); custom-software.tsx (--rail-progress); haydev.tsx (+Scenarios, contact 11); why 06 / models 07 / industries 08 / audit 09 / faq 10 / system-details 12; site-chrome.tsx (+scenarios в dots, useReveal + MutationObserver); translations.json (+55 en, +56 hy); globals.css (+130 строк ROUND 7).
- Скриншоты: screenshots/r7-*.png (17 шт.).
- Остаточные риски: (1) hero spotlight не виден в headless QA (нет hover media) — в реальных десктоп-браузерах работает, проверен форс-методом; (2) hello@haydev.am — плейсхолдер; (3) при прод-запуске заменить SITE_URL/robots; (4) test-лиды QA (qa7@, qa7ui@, qa7final@haydev.test) остались в SQLite — закрытая демо, ок.
- Рекомендации раунда 8: (1) email-уведомления о лидах (консольный fallback уже есть); (2) OG-вариант под светлые превью; (3) e2e-дымовой тест (форма + аудит + фильтр + flip) на Playwright; (4) deeper «команда/подход»; (5) анимация появления products-grid при скролле (сейчас только при смене фильтра).

---
Task ID: 8
Agent: main-agent (Z.ai Code)
Task: Раунд 8 — QA-регрессия, НОВАЯ фича live-поиск по FAQ, hero keyboard-навигация сцен стрелками, products scroll-in stagger + VLM стиль-пас (FAQ бейджи/CTA, contact timeline milestone-маркеры, build lime-bar, hero data-strip).

Work Log:
- QA-оценка статуса: сервер 200, dev.log чист, lint 0/0, tsc чист. agent-browser: 12 секций, WebGL PRODUCTS (узлы 5), полный скролл — 0 JS-ошибок, 0 unrevealed, FAQ-аккордеон работает (первый открыт по умолчанию), языки ru/en/hy, сценарный flip в EN/RU, форма → SUCCESS (POST 201), m390 overflow — 0. Регрессий НЕТ.
- VLM-аудит (hero/build/faq/contact): слабые места — FAQ без hover-индикаций и «сухие» F-бейджи + dashed-CTA, contact timeline скучный + мелкий helper-text, hero data-strip низкий контраст, build активная категория без визуального «якоря».
- НОВАЯ ФИЧА: FAQ LIVE-ПОИСК (faq.tsx переписан) — поле поиска с иконкой/каунтером «N / M» (aria-live), clear-кнопка; фильтрация по переведённым Q&A (useMemo, deps needle/locale/t); сниппет-превью «↳ …» из ответа однострочным ellipsis под вопросом, когда совпал только ответ; пустое состояние «404» с CTA-текстом. Проверено: «код»→1 вопрос, «интеграц»→3 (сниппеты), «xyzнетыакого»→404-панель, clear→5/5; EN «code»→"Who owns the code and data?", «price»→404 (слова нет в EN — корректно), HY placeholder переведён.
- НОВАЯ ФИЧА: HERO KEYBOARD-НАВИГАЦИЯ — стрелки ←/→ листают сцены CORE/BUILD/AUTOMATE/PRODUCTS пока hero в вьюпорте (гвард: input/textarea/contentEditable исключены; preventDefault); mono-хинт «←/→» в scene-mode (только ≥1100px). Проверено: press ArrowRight×2 → сцены 1→2, ArrowLeft → 1.
- ФИЧА (хвост R7): products scroll-in stagger — анимация product-in теперь срабатывает при reveal обёртки ([data-reveal].revealed .product-card + nth-child задержки .06–.3s) и при смене фильтра (грид ре-маунтится под уже revealed-обёрткой). Базовое animation:none убрано с mount-only.
- СТИЛЬ-ПАСС по VLM: FAQ — boxed F-бейджи (рамка+bg, lime при hover/open), hover/open фон строк (#c5f56303/05), faq-cta solid-панель с radial-акцентом; CONTACT — timeline переработан в milestone-маркеры: круглые 36px номера с lime-градиентной рельсовой линией, hover-glow маркеров, разделители li+li убраны (рельс сквозной), form-note контраст+размер; HERO — data-strip strong ярче (#e4efe4→#f2faf0 на hover), стрелки-«i» зеленее, breathing room (subtitle 28px, description 22/26, cta 28); BUILD — lime-бар 3px слева у активной категории (glow), count контрастнее (#93a698).
- ПЕРЕВОДЫ: +5 ключей EN/HY (поиск, placeholder, clear, empty-state).
- Верификация: faq-search input h=52/48(m), счётчик live, сниппеты/empty/clear ✓, стрелки ✓, products animation product-in delay stagger ✓, lime-bar rgb(197,245,99) ✓, timeline 36px круги + gradient rail ✓; VLM: FAQ/Contact/Build = 3/3 PASS; m390 overflow 0; полный скролл 0 ошибок/0 unrevealed; lint 0/0; tsc чист; dev.log чист.

Stage Summary:
- Состояние: производство-готово; 12 секций; новые фичи (FAQ поиск, keyboard-сцены, scroll-stagger) работают во всех локалях; регрессий нет.
- Ключевые артефакты: faq.tsx (переписан: поиск+сниппеты+empty); business-core.tsx (+keydown useEffect, +scene-keyhint); globals.css (+100 строк ROUND 8: faq-search/hit/empty, boxed faq-index, row hover, solid faq-cta, scene-keyhint, products stagger rework, data-strip/hero rhythm, build lime-bar, contact milestone-маркеры); translations.json (+5/+5).
- Скриншоты: screenshots/r8-*.png (9 шт.).
- Остаточные риски: (1) поиск FAQ ищет по подстроке (не по морфологии) — «код» не найдёт «кода»; осознанный компромисс для лендинга; (2) стрелки сцен глобальные — при сфокусированном слайдере/карусели в будущем учесть; (3) hello@haydev.am — плейсхолдер; (4) SITE_URL/robots — при запуске.
- Рекомендации раунда 9: (1) email-уведомления о лидах; (2) e2e-дымовой тест Playwright (форма+аудит+поиск FAQ+фильтр+flip+стрелки); (3) морфологический поиск (минимальный стемминг RU/HY) или поиск по ключевым словам; (4) OG light-вариант; (5) prints styles для PDF-визитки.

---
Task ID: 9
Agent: main-agent (Z.ai Code)
Task: Раунд 9 — QA-регрессия через agent-browser, НОВАЯ фича Command Palette (Ctrl+K), апгрейд FAQ-поиска (русский стемминг + кейворд-алиасы), JSON-LD FAQPage, print-стили, hero-meta строка + VLM-драйвенный детальный стиль-пасс.

Work Log:
- QA-оценка статуса: dev.log чист, lint 0/0, tsc чист (только examples/skills — не наш код). agent-browser: 12 секций, WebGL-сцены 0→3 (якорь — data-scene на .core-network: canvas.dataset обновляется только на кадрах рендера, при паузе вне вьюпорта остаётся старым — это норма движка, не баг), стрелки клавиатуры (сцена 3→wrap→0→1→0 ✓), языки ru/en/hy, FAQ-поиск, фильтр продуктов ALL=6/LIVE=2/DEV=4, flip-тогглы (4 шт), мобильный 390 — 0 overflow, полный скролл ~10471px — 0 JS-ошибок. Функциональных багов НЕТ.
- VLM-аудит 8 скриншотов секций: слабые места — неактивные категории What We Build «плоские/как плейсхолдеры», списки automation без разделителей, FAQ-строки/поиск бледные, подчёркивания инпутов контакта еле видны, hero-левой колонке не хватает визуального баланса. (Часть критики VLM была преувеличена: CTA уже solid-lime, чекбоксы уже 22px.)
- НОВАЯ ФИЧА: COMMAND PALETTE (src/components/command-palette.tsx, на базе shadcn cmdk): открытие Ctrl+K/⌘+K (в любом контексте) и «/» (вне полей ввода); группы «Разделы» (12 секций, счётчик-шорткат 01-12) / «Язык» (Русский/English/Հայերեն) / «Сцена на главном экране» (CORE/BUILD/AUTOMATE/PRODUCTS) / «Действия» (Business Audit, копирование почты с инлайн-фидбеком «Скопировано», mailto, наверх); футер-хинты ↑↓/↵/esc; пустое состояние; кастомный тёмно-лаймовый скин (.command-palette).
- Интеграция палитры: CommandTrigger-чип в хедере (≥1100px, «🔍 Ctrl K»), пункт «Быстрый поиск по сайту» в мобильном меню (<960px), взаимодействие с hero через window-событие 'haydev:scene' (BusinessCore слушает; пейдж скроллится наверх + сцена меняется), язык — через setLocale, аудит — через openAudit. pageSections экспортирован из site-chrome (общий источник для dots + palette).
- НОВАЯ ФИЧА: FAQ-ПОИСК АПГРЕЙД — минимальный русский стеммер (39 окончаний, ё→е, слова ≥5 символов, стем ≥3) + tokenize по \p{L}\p{N} (работает и с армянским) + keyword-алиасы в faqItems (business-os.ts, поле keywords у всех 5 вопросов: цена/цены/стоимость/бюджет/price…); логика — phrase-match (как раньше) ИЛИ token-match (AND по токенам с подстрочным совпадением ≥4 символов). Проверено: «кода»→1 (F-04, закрыт известный пробел R8), «цену»→1, «срокам»→1, «поддержку»→1, «интеграц»→3, «xyzнетакого»→0 (empty-state).
- НОВАЯ ФИЧА: JSON-LD FAQPage (layout.tsx) — генерируется из тех же faqItems через getTranslator('ru'); в head теперь 3 блока: Organization + WebSite + FAQPage (5 вопросов, проверено парсингом).
- НОВАЯ ФИЧА: PRINT-СТИЛИ (@media print в globals.css) — белый фон/тёмный текст, скрыты хедер/dots/mobile-cta/ticker/spotlight/фильтры/поиск/showcase/audit-app/палитра, [data-reveal] всегда видимы, hero в одну колонку без WebGL-сцены, карточки/панели «сплющены» в белые блоки с серыми рамками (важно: скинуты background-image: none!important и тёмные фоны), CTA — белые с чёрной рамкой, break-inside: avoid. Проверено agent-browser pdf → pdftoppm → VLM: обе страницы PASS (после первой итерации — VLM поймал тёмные блоки build-категорий и CTA, исправлено).
- НОВАЯ ДЕТАЛЬ: HERO-META — mono-строка «RU / EN / HY · YEREVAN, AM · ⬤ SOFTWARE · AI · DIGITAL PRODUCTS» под hero-footnote (баланс левой колонки по критике VLM; lime-точка с glow, wrap на мобиле).
- СТИЛЬ-ПАСС по VLM (все верифицированы computed styles): build — неактивные категории: рамка #3a4a41 + inset-top-highlight + hover translateX(3px) translateY(-1px) + подсветка кода/каунта; build-items — lime-точка-анкор (::before, glow на hover) + hover-фон; automation — разделители #33413a сверху/снизу + hover-фон строки + lime-лево-бар у активной; products — p/features контрастнее, активный фильтр-пилл translateY(-1px)+тень; FAQ — рамки items #3d493d (hover/open #4d5c4c), поиск: рамка #43543f + фокус-ринг лайм + паддинг строк 30px; contact — подчёркивания инпутов 2px #7d8766 + placeholder #b0bea4.
- ПЕРЕВОДЫ: +13 ключей EN/HY (палитра: группы, плейсхолдеры, экшены, хинты, мобильный пункт).
- Починены 2 lint-ошибки в новом коде (setState в effect → handleOpenChange; switchScene до объявления → переставлен useEffect) + неверный импорт Locale (из @/lib/i18n).

Stage Summary:
- Состояние: производство-готово; 12 секций; новые фичи (палитра, стемминг-поиск, FAQPage schema, print) работают во всех локалях; регрессий нет.
- Верифицировано: палитра — Ctrl+K/«/»/Esc, фильтрация («продукты»→2 айтема), Enter-переход к секции (scrollY 4667), смена языка EN через айтем (lang=en, h1 «We build software…»), смена сцены BUILD (reactScene=build, скролл наверх), копирование почты («Email copied»), мобильный пункт меню открывает палитру; HY-локаль палитры («Բաժիններ|Լեզու|…»); FAQ-стемминг (см. выше); JSON-LD FAQPage 5 вопросов; print PDF VLM 2/2 PASS; VLM секций: hero PASS, build PASS, automation PASS, products PASS, faq PASS, contact PASS (после 2 итераций фиксов), палитра desktop+mobile PASS; полный скролл 10574px — 0 ошибок/0 unrevealed; форма → POST 201 (prisma INSERT в dev.log); мобайл 390 — 0 overflow; lint 0/0; tsc чист.
- Ключевые артефакты: NEW src/components/command-palette.tsx; site-chrome.tsx (pageSections экспорт); business-core.tsx (+haydev:scene листенер, +hero-meta); haydev.tsx (+CommandTrigger в хедере, +пункт в мобильном меню, +CommandPalette); faq.tsx (переписан поиск: стеммер+токены+keywords); business-os.ts (+keywords у faqItems); layout.tsx (+FAQPage JSON-LD); translations.json (+13/+13 en/hy); globals.css (+120 строк ROUND 9: палитра, hero-meta, стиль-пасс, print).
- Скриншоты: screenshots/r9-*.png (палитра desktop/mobile, print-страницы, до/после секций, финалы — ~15 шт.).
- Остаточные риски: (1) стеммер минимальный — редкие формы («обслуживанием») могут не совпасть; компенсировано keywords; (2) canvas.dataset.scene при паузе вне вьюпорта показывает старую сцену (движок, не баг) — QA-тесты смотреть по .core-network[data-scene]; (3) hello@haydev.am — плейсхолдер; (4) SITE_URL/robots — переключить при публичном запуске; (5) test-лиды QA (qa9@haydev.test) в SQLite — закрытая демо, ок.
- Рекомендации раунду 10: (1) email-уведомления о лидах; (2) OG-вариант под светлые превью мессенджеров; (3) лёгкий e2e-дымовой тест Playwright (форма+аудит+палитра+поиск+фильтр); (4) кейсы/«до→после» глубже или блок команды; (5) при запуске — заменить SITE_URL/robots/email и hreflang.
