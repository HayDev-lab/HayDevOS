# End-to-End Prompt Pack: capability integration without duplication

Дата повторного аудита: 2026-10-09  
Проект: `D:\Projects\HayDev\HayDevOSv1`

Этот pack предназначен для последовательной реализации недостающих возможностей HayDevOS. Он не предлагает переписать систему или собрать рядом второй продукт. Каждый prompt сначала ищет существующую точку расширения, затем добавляет минимальный недостающий слой и останавливается на измеримом gate.

Запускайте prompts по порядку в отдельных задачах Codex. Не объединяйте несколько фаз в один большой рефакторинг. Условные фазы выполняйте только при выполнении их входных критериев.

## 1. Подтверждённая исходная архитектура

Перед реализацией считать источником истины текущий код, а не старые отчёты или GitHub README.

- Next.js 16 App Router, React 19, Prisma 6, PostgreSQL/Supabase Database и приватный Supabase Storage.
- Авторизация собственная, DB-backed. Supabase Auth не является authority и не должен добавляться вторым контуром.
- Tenant boundary уже централизована через server session, `withTenantApi` и domain services.
- В Prisma уже существуют `Automation`, `AutomationRun`, `Integration`, `WebhookEvent`, `DocumentRecord`, `DocumentVersion`, `DocumentField`, `AuditQuestionnaire` и основные ERP/LeadOS/QuoteFlow модели.
- В `src/lib/automations/executor.ts` уже есть маршрутизация к LeadOS, QuoteFlow и ERP executors. Это ядро автоматизаций; заменять его n8n нельзя.
- Secure upload, private storage, SHA-256 и malware scan для документов уже реализованы. Новый parser должен продолжать этот pipeline, а не создавать второй storage/document domain.
- shadcn/Radix pattern и Lucide уже присутствуют. Повторная установка или второй design system не нужны.
- Текущий deployment target — Vercel. Долгоживущего worker-процесса в основном приложении нет.
- Существующий cleanup pack: [`docs/prompt-pack-post-production-cleanup.md`](./prompt-pack-post-production-cleanup.md). Он остаётся отдельным source of truth для очистки и не дублируется здесь.

Подтверждённые риски на момент аудита:

- рабочее дерево сильно изменено;
- локальная ветка и `origin/main` имеют проблемную/несвязанную историю;
- production readiness endpoints отвечают, но Gate 7 не закрыт полностью;
- production dependency audit показывал high/critical проблемы, включая установленный Next.js 16.3.5;
- DB-dependent тесты нельзя считать пройденными без отдельной тестовой `DATABASE_URL`.

## 2. Неподвижные правила для каждого prompt

Вставляйте этот блок в начало каждой задачи вместе с выбранным prompt.

```text
COMMON CONTRACT — HAYDEVOS CAPABILITY INTEGRATION

Работай только в D:\Projects\HayDev\HayDevOSv1.

1. Сначала прочитай AGENTS.md, docs/prompt-pack-capability-integration.md и относящиеся к фазе production-аудиты. До изменения Next.js-кода прочитай релевантные документы из node_modules/next/dist/docs/ для реально установленной версии.
2. Считай рабочее дерево пользовательским и потенциально dirty. Не выполняй reset, checkout --, clean, stash, rebase, force push, массовый formatter или замену чужих файлов. Не коммить и не deploy без явного разрешения.
3. До добавления модели, API, queue, auth, storage, connector framework или UI-компонента найди существующий аналог через rg. Расширяй существующий слой. Если аналог найден, создание второго запрещено.
4. Не меняй auth authority: custom DB-backed session остаётся единственным источником identity. Никогда не доверяй orgId/userId из body, query, header или AI output; получай tenant только из server-side session/context.
5. Не передавай service-role key, database URL, bot token, webhook secret или provider credentials в browser bundle. Не логируй secrets и полный документный payload.
6. Не обходи domain services прямыми Prisma writes. Сохраняй QuoteVersion immutability, inventory ledger, FinanceEvent, AuditLog, idempotency и tenant isolation.
7. Не добавляй Redis, BullMQ, Kafka, vector DB, второй ORM, второй auth, второй document store или второй automation engine без доказанного load/capability gap и отдельного ADR.
8. Не vendor-копируй внешний репозиторий в основной проект. Upstream подключай через pinned package, isolated service/container или узкий HTTP adapter. Зафиксируй tag/commit, license, security state, data egress и rollback.
9. Для каждой мутации должны быть schema validation, authorization, idempotency там, где возможен retry, audit trail и negative tenant tests.
10. Не называй фазу PASS по одному typecheck или HTTP 200. Выполни релевантные unit/integration/security/build/runtime checks. DB-тесты запускай только на изолированной тестовой БД.
11. Не создавай множество отчётов. Создай один docs/capability-integration/IMPLEMENTATION_LEDGER.md и дополняй его по фазам: baseline, изменения, evidence, unresolved risks, rollback, следующий gate. Внешние зависимости веди только в docs/capability-integration/UPSTREAMS.lock.md. Для parser benchmark допускается один отдельный BENCHMARK_RESULTS.md.
12. Статус фазы только PASS, FAIL или BLOCKED. При BLOCKED не маскируй проблему заглушкой и не расширяй scope.
```

## 3. Реестр upstream-решений

Это не список «установить всё». Это allowlist решений, которые фазы должны подтвердить свежими tag/commit/license/security данными.

| Возможность | Правильный upstream | Решение сейчас | Интеграционный предел |
|---|---|---|---|
| Document parsing, кандидат A | `docling-project/docling` | BENCHMARK | Только isolated parser worker; pin patched release; отключить ненужные network/backends |
| Document parsing, кандидат B | `opendataloader-project/opendataloader-pdf` | BENCHMARK | Только isolated parser worker; проверить лицензию конкретной версии |
| Конверсия-baseline | `microsoft/markitdown` | BENCHMARK_BASELINE | Не третий production engine; OCR extras подключать только после license review |
| Document structured retrieval | `VectifyAI/PageIndex` | CONDITIONAL | После production parser, page citations и измеренного retrieval gap |
| Telegram connector | `grammyjs/grammY` | SELECT_FIRST_CONNECTOR | Сначала outbound-only; bot token только server-side |
| Connector platform | `ComposioHQ/composio` | DEFER | Рассматривать после минимум трёх реальных connector demands или подтверждённой OAuth-сложности |
| Workflow platform | `n8n-io/n8n` | DEFER | Не заменяет `Automation`/`AutomationRun`; только external non-domain workflows и после license review |
| Agent long-term memory | `vectorize-io/hindsight` | DEFER | Только после retention/deletion/privacy design и tenant negative tests; не вместе с PageIndex |
| GitHub MCP | `github/github-mcp-server` | DEV_ONLY | Operator tooling; read by default, write only with explicit approval; secrets вне repo |
| Component workshop | `storybookjs/storybook` | DEV_ONLY_CONDITIONAL | После стабилизации текущего UI; не runtime dependency |
| Database/storage | `supabase/supabase` | ALREADY_PRESENT | Не добавлять второй Supabase client/auth authority |
| Supabase patterns | `supabase/agent-skills` | REFERENCE_ONLY | Не runtime dependency |
| UI primitives | `shadcn-ui/ui` | ALREADY_PRESENT | Не переинициализировать |
| Icons | `lucide-icons/lucide` | ALREADY_PRESENT | Не ставить второй icon pack без причины |
| OpenAPI catalog | `APIs-guru/openapi-directory` | REFERENCE_ONLY | Не connector runtime и не источник доверенных credentials |
| Agent control-plane patterns | `paperclipai/paperclip` | PATTERN_ONLY | Не добавлять второй approvals/control plane |
| Backup product | `duplicati/duplicati` | DEFER | Сначала доказать native DB/storage backup и restore drill |
| WhatsApp bridge | `evolution-foundation/evolution-api` | DEFER/LEGAL_GATE | Сначала Meta ToS, privacy и official WhatsApp API assessment |
| Helpdesk | `faveosuite/faveo-helpdesk` | DEFER | Только после отдельного product demand; не дублировать LeadOS/tasks |
| Change monitoring | `dgtlmoon/changedetection.io` | DEFER | Только после подтверждённого product use case |

### Правило выбора parser

В production выбирается ровно один parser: Docling **или** OpenDataLoader PDF. MarkItDown используется только как дешёвый baseline. Нельзя одновременно интегрировать три движка «на будущее».

### Правило PageIndex/Hindsight

PageIndex решает retrieval по структуре длинного документа. Hindsight решает долгосрочную память агента. Это разные задачи. Их нельзя внедрять одновременно: сначала document pipeline и измеренный retrieval gap; память агента — отдельный поздний ADR.

### Правило n8n

Существующий domain automation layer остаётся каноническим. n8n не должен исполнять внутренние мутации в обход LeadOS/QuoteFlow/ERP services. Self-hosted использование и сценарий customer-configurable SaaS должны быть отдельно сверены с действующей лицензией n8n: <https://support.n8n.io/article/can-i-use-your-license-for-my-use-case>.

## 4. Последовательность фаз

```text
00 source/baseline
  -> 01 dependency security
  -> 02 truthful product surfaces
  -> 03 automation API + UI
  -> 04 bounded automation runner
  -> 05 parser benchmark
  -> 06 one parser integration
  -> 07 review + citations
  -> 08 Telegram connector
  -> 09 conditional connector expansion
  -> 10 conditional retrieval/memory
  -> 11 optional developer tooling
  -> 12 release certification
```

Фазы 09, 10 и 11 не входят в обязательный MVP. Их пропуск является правильным результатом, если входной gate не выполнен.

---

## Prompt 00 — Source of truth и безопасный baseline

```text
ЦЕЛЬ
Подтвердить, какую рабочую копию можно безопасно развивать, и создать один implementation ledger. Код не менять.

СДЕЛАЙ
1. Выполни read-only inventory: git status --short, branch, HEAD, remotes, merge-base с upstream, последние релизы/теги, изменённые и untracked файлы. Не используй команды, изменяющие index или worktree.
2. Прочитай AGENTS.md, package.json, package-lock.json, prisma/schema.prisma, middleware/auth/tenant helpers, docs/production-gate-7-audit.md, docs/production-gate-7-deployment.md и docs/prompt-pack-post-production-cleanup.md.
3. Проверь фактические версии Node/npm/Next/React/Prisma и доступные scripts. Не полагайся на README.
4. Составь карту существующих extension points для Dashboard/Control, AuditQuestionnaire, Owner AI tools, Automation/AutomationRun, Integration/WebhookEvent и DocumentRecord/Version/Field.
5. Создай только:
   - docs/capability-integration/IMPLEMENTATION_LEDGER.md;
   - docs/capability-integration/UPSTREAMS.lock.md.
6. В lock-файле заведи поля: capability, upstream URL, decision, selected tag, selected commit, license, security notes, integration mode, data egress, rollback, status. На этой фазе не клонируй и не устанавливай upstream.
7. Запиши baseline checks без их фальсификации: typecheck, lint, i18n, unit/security tests, build, npm audit --omit=dev. Если тест требует DATABASE_URL, пометь NOT_RUN и объясни, какая isolated DB нужна.

STOP/GATE
- Если история upstream не связана, источник истины не доказан или dirty changes нельзя отделить от новой работы — статус BLOCKED. Ничего не stash/commit/rebase самостоятельно.
- PASS только когда есть точный HEAD, понятный change ownership и список разрешённых файлов для следующей фазы.

РЕЗУЛЬТАТ
Кратко сообщи статус, evidence-команды, список рисков и точный следующий prompt. Не создавай новый общий аудит проекта.
```

## Prompt 01 — Закрытие dependency security до новых функций

```text
ЦЕЛЬ
Убрать подтверждённые production high/critical dependency vulnerabilities минимальным совместимым обновлением до feature work.

ПРЕДУСЛОВИЕ
Prompt 00 = PASS и определена безопасная линия исходников.

СДЕЛАЙ
1. Перезапусти npm audit и npm audit --omit=dev. Зафиксируй advisory, dependency path, patched range и runtime reachability.
2. Для Next.js сначала прочитай релевантные файлы node_modules/next/dist/docs/. Проверь release/security notes по официальному upstream.
3. Обнови только пакеты, необходимые для закрытия подтверждённых проблем. Не запускай npm audit fix --force и не делай массовое обновление.
4. Если проблема transitively приходит через Next/sharp/source-map-js, выбери минимальную поддерживаемую patched комбинацию и объясни lockfile diff.
5. Убедись, что dependency обновление не добавило второй package manager, duplicate framework или browser polyfills без нужды.
6. Запусти typecheck, lint, i18n check, официальные unit/security tests и production build. Для изменённых upload/image путей добавь/запусти targeted regression tests.
7. Обнови IMPLEMENTATION_LEDGER.md: версии до/после, advisories, команды, результаты, rollback.

STOP/GATE
- FAIL, если остаётся reachable production critical/high без принятого documented exception.
- BLOCKED, если patched версия требует архитектурной миграции вне этой фазы.
- Не переходи к функциям, пока security baseline не PASS.
```

## Prompt 02 — Правдивые Dashboard, Control, Business Audit и Owner AI

```text
ЦЕЛЬ
Убрать ложные product signals: runtime mocks, неперсистентный аудит и AI-инструменты, которые выглядят рабочими, но не выполняют реальную domain operation.

СДЕЛАЙ
1. Через rg найди все mock/demo/sample/fixture данные, используемые production routes и components в Dashboard, Control, Business Audit и Owner AI. Test fixtures и Storybook-like examples не считать production defect.
2. Для Dashboard/Control собери минимальный read model из существующих tenant-scoped LeadOS, QuoteFlow, DocumentFlow и ERP services/queries. Не создавай analytics warehouse, event bus или GraphQL layer.
3. Если метрика пока не поддержана данными, показывай явное unavailable/empty state. Не генерируй реалистичные случайные значения.
4. Сохраняй ответы Business Audit через существующий AuditQuestionnaire. Сохраняй версию вопросника, ответы, score/result и автора. Не добавляй вторую audit table, пока схема не доказана недостаточной.
5. История Business Audit должна читаться только в текущем tenant и быть доступна после нового login/session.
6. Для Owner AI составь allowlist фактически работающих tools. Каждый mutating tool должен вызывать существующий domain service, иметь confirmation/approval, idempotency и audit trail. Нереализованные tools отключи с честным объяснением, а не mock success.
7. Не добавляй Hindsight, PageIndex или новый memory service на этой фазе.
8. Добавь negative tenant tests, authorization tests и UI empty/error/loading states.

ПРИЁМКА
- Никакой production page не импортирует demo dataset.
- Business Audit переживает reload и новый session.
- Owner AI не может объявить success без подтверждённой domain mutation.
- Существующие Quote/ERP invariants не обходятся.
- Typecheck, lint, i18n, targeted tests и build = PASS.

В ledger перечисли удалённые/оставленные mocks по точным путям. Не удаляй fixture, если он нужен тестам.
```

## Prompt 03 — Завершение существующего automation API и UI

```text
ЦЕЛЬ
Сделать существующие Automation и AutomationRun реальным tenant-scoped продуктом без второго workflow engine.

ПЕРЕД КОДОМ
Изучи prisma models Automation/AutomationRun, src/lib/automations/executor.ts, LeadOS/QuoteFlow/ERP automation executors и места создания domain events/runs. Нарисуй фактический lifecycle: trigger -> queued run -> claim -> domain executor -> result/audit.

СДЕЛАЙ
1. Определи единый Zod registry поддерживаемых triggerType/actionType и их config schema. Не разрешай произвольный module/function/script из БД.
2. Добавь/заверши tenant-protected API для list/get/create/update/enable/disable/delete automations и list runs. Используй withTenantApi и server session; orgId не принимать от клиента.
3. Создание/редактирование должно валидировать совместимость trigger/action и optimistic version. Нельзя редактировать активную automation так, чтобы старый queued run сменил смысл.
4. UI должен читать API/DB, а не localStorage/in-memory arrays. Минимум: список, editor только поддержанных схем, enable/disable, run history, понятные errors.
5. Исполнение должно идти только через существующий central executor и domain services. Сохрани инициатора automation, actor, correlation/idempotency key и AuditLog.
6. Не устанавливай n8n, Redis, BullMQ, Temporal или Kafka.
7. Добавь tests: tenant isolation, invalid schema, duplicate idempotency, stale version, disabled automation, permission matrix, successful и failed run visibility.

ПРИЁМКА
- Перезагрузка браузера не удаляет automation.
- Два tenant не видят definitions/runs друг друга.
- Один event с тем же idempotencyKey не выполняет mutation дважды.
- Ни один executor не пишет напрямую в domain tables в обход services.
```

## Prompt 04 — Bounded runner для Vercel без новой инфраструктуры

```text
ЦЕЛЬ
Надёжно исполнять queued AutomationRun в текущем Vercel deployment, сохранив возможность позднее перенести тот же runner на VPS.

СДЕЛАЙ
1. Выдели один framework-neutral drain service: claim small batch -> execute via existing automation executor -> mark terminal/retry state. HTTP route и будущий worker должны вызывать один и тот же service.
2. Claim должен быть атомарным и безопасным при двух параллельных invocations. Учитывай stuck RUNNING lease/timeout и ограниченный retry с backoff.
3. Добавь server-only internal route для Vercel Cron/manual operator drain. Защити dedicated secret/signature; не используй пользовательскую cookie как worker auth.
4. Ограничь batch size и time budget так, чтобы функция завершалась до platform timeout. Следующий invocation продолжает остаток.
5. Не держи in-memory timer/setInterval в Next.js runtime и не обещай exactly-once. Цель — at-least-once delivery + idempotent domain mutation.
6. Добавь structured metrics/logs без secrets: queued count, claimed, success, failed, retry, oldest age, duration, correlation id.
7. Добавь concurrency/idempotency tests на тестовой БД. Документируй, как тот же service запускается будущим VPS worker, но сам VPS сейчас не строй.
8. Не добавляй Redis/BullMQ/Kafka, пока измерения не покажут, что DB queue недостаточна.

ПРИЁМКА
- Параллельные drain calls не выполняют один run дважды на domain уровне.
- Failed run имеет bounded retry и наблюдаемую terminal error.
- Route отклоняет missing/incorrect worker secret.
- Vercel configuration и rollback описаны в ledger.
```

## Prompt 05 — Честный benchmark document parser

```text
ЦЕЛЬ
Выбрать один production parser на данных HayDevOS, а не по GitHub stars.

КАНДИДАТЫ
- Docling: https://github.com/docling-project/docling
- OpenDataLoader PDF: https://github.com/opendataloader-project/opendataloader-pdf
- MarkItDown: https://github.com/microsoft/markitdown — только baseline

ОГРАНИЧЕНИЕ
На этой фазе не меняй product runtime и Prisma schema. Не загружай production/customer документы во внешние SaaS.

СДЕЛАЙ
1. Проверь текущие official releases, license конкретной версии, security advisories/CVEs, runtime requirements и transitive licenses. Заполни UPSTREAMS.lock.md точными tag+commit, не `main`.
2. Собери маленький репрезентативный corpus из разрешённых или синтетических файлов: digital PDF, Armenian/Russian/English scan, mixed-language contract, table, long document, broken/rotated page. Удали PII/secrets.
3. Создай воспроизводимый isolated benchmark вне production bundle. Не vendor-копируй upstream. Зафиксируй команды/container digest и model assets.
4. Для каждого файла измерь: text fidelity, layout/headings, tables, page anchors, OCR hy/ru/en, deterministic repeat, latency, peak memory, cold start, failure behavior и output size.
5. Проверь security: parser получает только CLEAN DocumentVersion, не имеет произвольного outbound network, работает с CPU/memory/time/file-size limits и не исполняет embedded content/macros.
6. Запиши результаты только в docs/capability-integration/BENCHMARK_RESULTS.md.
7. Выбери ровно один production engine. Если ни один не проходит минимальные критерии, статус FAIL и не интегрируй худший вариант «временно».

МИНИМАЛЬНЫЕ КРИТЕРИИ
- приемлемая точность на hy/ru/en corpus;
- page-level anchors для цитирования;
- устойчивый bounded failure на плохом файле;
- допустимая лицензия и отсутствие неприкрытого critical advisory;
- реалистичное размещение в isolated worker, а не в Vercel request bundle.

РЕЗУЛЬТАТ
Один SELECTED parser, один rollback plan, список известных ограничений. Второй кандидат остаётся benchmark evidence, а не runtime fallback.
```

## Prompt 06 — Интеграция одного parser в существующий DocumentFlow

```text
ЦЕЛЬ
Добавить асинхронную extraction pipeline для выбранного parser, переиспользуя DocumentRecord, DocumentVersion и DocumentField.

ПРЕДУСЛОВИЕ
Prompt 05 = PASS и UPSTREAMS.lock.md содержит pinned selected version/commit.

СДЕЛАЙ
1. Проследи существующий lifecycle upload -> scan -> CLEAN -> active DocumentVersion. Extraction разрешена только для CLEAN version.
2. Определи минимальный job contract: orgId берётся server-side, documentId, documentVersionId, parserVersion, input sha256, idempotency key, attempt, status, error code и timestamps.
3. Сначала докажи, нельзя ли хранить lifecycle безопасно в существующей схеме. Новую таблицу DocumentExtraction/Job добавляй только если существующие поля не позволяют историю попыток, version binding и concurrency. Не дублируй extracted fields: итоговые поля остаются DocumentField.
4. Next.js создаёт job и передаёт worker только private object reference или короткоживущий signed access. Никаких public buckets/URLs.
5. Isolated worker проверяет signature, size/hash/content type, resource limits и возвращает normalized versioned result. Raw source никогда не перезаписывается.
6. Result apply должен атомарно проверить orgId, documentVersionId, sha256 и parserVersion. Late result от старой версии не может стать current.
7. Низкая confidence не превращается в подтверждённый факт. Сохрани confidence/page/source anchor; `reviewed=false` до решения человека.
8. Добавь retries только для transient ошибок, dead/failed terminal state, operator-visible retry и audit events.
9. Не добавляй vector DB, PageIndex, Hindsight или второй parser.

ТЕСТЫ
- cross-tenant job/result rejection;
- infected/unscanned/non-current version rejection;
- duplicate callback idempotency;
- stale-version callback;
- hash mismatch;
- parser timeout/oversize/bad PDF;
- successful hy/ru/en extraction;
- source immutability.

ПРИЁМКА
UI показывает queued/running/review/failed честно; исходник можно скачать через прежний secure path; повторный запуск не создаёт дублированные fields.
```

## Prompt 07 — Human review и цитаты до advanced retrieval

```text
ЦЕЛЬ
Сделать extraction полезной и проверяемой: человек видит источник каждого поля, исправляет его и только затем использует в AI/domain actions.

СДЕЛАЙ
1. Расширь существующий document UI, не создавая отдельное приложение: side-by-side source preview + extracted fields.
2. Для каждого field показывай document version, page/anchor, confidence, parser version и review state.
3. Реализуй approve/edit/reject через tenant API, optimistic concurrency и AuditLog. Сохраняй original extracted value и reviewed value без изменения source file.
4. Owner AI document tools могут читать только tenant-visible CLEAN version. Ответы обязаны возвращать documentId/version/page citations; отсутствие evidence должно быть видно пользователю.
5. Не разрешай AI автоматически помечать field reviewed или выполнять юридически/финансово значимую mutation без существующего approval flow.
6. Измерь retrieval quality на наборе вопросов: точность ответа, citation hit rate, latency, token/cost. Сначала используй простой structured section/page retrieval из parser output.
7. Не добавляй PageIndex, если baseline выполняет критерии. Зафиксируй gap численно, если не выполняет.

ПРИЁМКА
- Пользователь может проверить ответ до источника и конкретной версии.
- Обновление документа не подменяет citations старой версии.
- Cross-tenant document/field/citation tests = PASS.
- Есть измерение, обосновывающее PASS baseline или вход в Prompt 10A.
```

## Prompt 08 — Первый реальный connector: Telegram через grammY

```text
ЦЕЛЬ
Добавить минимальный полезный connector без преждевременной generic OAuth/vault платформы.

UPSTREAM
https://github.com/grammyjs/grammY — зафиксируй точный compatible release/tag/commit и license в UPSTREAMS.lock.md.

SCOPE V1
Только outbound notifications из существующих automation actions. Inbound commands, bot builder и customer-provided bot tokens не входят в V1.

СДЕЛАЙ
1. Используй один server-level TELEGRAM_BOT_TOKEN в deployment secrets. Не сохраняй token в Integration.config и не отправляй его в browser.
2. В существующей Integration модели храни только tenant destination/config: provider=telegram, enabled/status, allowed chat id/destination, safe notification preferences и last sync/test metadata.
3. Добавь tenant-protected configuration/test API с role policy. orgId только из session.
4. Реализуй Telegram adapter с узким interface, timeout, retry classification, rate-limit handling, sanitized errors и provider message id.
5. Подключи send-notification как разрешённый action существующего Automation executor/registry. AutomationRun остаётся source of execution/idempotency; не создавай отдельную delivery queue без доказанной необходимости.
6. Сообщение формируй из allowlisted template fields. Не отправляй документы, secrets, полный AI prompt или произвольный user-controlled HTML.
7. Добавь per-tenant destination isolation, permission tests, duplicate-run idempotency и mocked provider contract tests.
8. Реальный smoke test делай только в явно выделенном test tenant/chat после разрешения. Не отправляй сообщение случайному пользователю.

НЕ ДЕЛАТЬ
- generic credential vault;
- OAuth framework;
- Composio;
- n8n;
- inbound webhook/commands в этой фазе;
- хранение bot token в Prisma или client state.

ПРИЁМКА
Одна domain automation отправляет одно идемпотентное Telegram notification в destination своего tenant; другой tenant не может читать/менять destination.
```

## Prompt 09 — Gate для второго и последующих connectors (условный)

```text
ЦЕЛЬ
Решить на данных, нужен ли прямой adapter или Composio. Ничего не устанавливать до решения.

ВХОДНОЙ GATE
Есть минимум два дополнительных подтверждённых business use cases с владельцем, auth model, scopes, volume, data classes и acceptance criteria. Иначе статус SKIPPED/PASS: преждевременное расширение предотвращено.

СДЕЛАЙ
1. Сравни для каждого provider: direct official SDK/API против Composio. Оцени OAuth lifecycle, token rotation/revocation, webhook verification, tenant account mapping, scopes, audit, data egress, cost, SLA и exit plan.
2. Generic credential vault проектируй только если реально нужны per-tenant credentials. Используй envelope encryption/KMS-style secret reference; Integration.config не должен хранить plaintext secrets.
3. Composio допустим только если снижает измеримую сложность минимум для трёх providers и его security/license/data-processing условия приемлемы.
4. Добавляй providers по одному. Каждый проходит contract, tenant, permission, webhook replay и rate-limit tests до следующего.
5. WebhookEvent переиспользуй для deduplication/processing audit. Проверяй provider signature до parsing/tenant resolution; eventId unique scope уже должен использоваться.
6. Не добавляй n8n как способ скрыть отсутствие domain adapter.

РЕЗУЛЬТАТ
Один ADR: DIRECT, COMPOSIO или DEFER. Если COMPOSIO — pinned upstream, scopes/data flow/exit plan в UPSTREAMS.lock.md. Реализацию выполняй отдельной задачей только после approval ADR.
```

## Prompt 10A — PageIndex pilot только при доказанном retrieval gap (условный)

```text
ЦЕЛЬ
Проверить, улучшает ли PageIndex ответы по длинным документам относительно простого structured retrieval.

ВХОДНОЙ GATE
Prompts 05-07 = PASS, page citations стабильны, и benchmark показывает конкретный недобор quality/latency/cost. Без численного gap фазу пропусти.

UPSTREAM
https://github.com/VectifyAI/PageIndex — проверь актуальные tag/commit/license/security/runtime requirements и pin в UPSTREAMS.lock.md.

СДЕЛАЙ
1. Построй isolated pilot adapter на том же corpus и тех же вопросах. Не меняй source DocumentFlow.
2. Index key обязан включать orgId, documentId, documentVersionId, source hash, parser version и index version.
3. Любой retrieval result перепроверяется server-side на tenant access к current/specified DocumentVersion.
4. Сравни с baseline: answer accuracy, citation hit rate, latency, token/cost, index time/size и deletion behavior.
5. Проверь re-index, stale version isolation, tenant negative tests, document deletion и rollback.
6. Не добавляй Hindsight, вторую vector DB или параллельный retrieval UI.

ПРИЁМКА
Интегрируй только при заранее заданном существенном улучшении. Иначе удали pilot runtime dependencies, оставь benchmark evidence и сохрани baseline.
```

## Prompt 10B — Hindsight decision, не реализация по умолчанию (условный)

```text
ЦЕЛЬ
Решить, нужна ли Owner AI долгосрочная память после завершения truthful tools и document retrieval.

ВХОДНОЙ GATE
Есть документированные пользовательские сценарии, которые не решаются существующими persistent conversations и structured data. PageIndex pilot завершён или сознательно не нужен.

UPSTREAM
https://github.com/vectorize-io/hindsight

СДЕЛАЙ
1. Сначала определи memory classes, retention, user visibility, correction, export, deletion, legal hold, tenant deletion и purpose limitation.
2. Раздели conversation history, business records и inferred memory. Business truth остаётся в domain DB; memory не становится authority.
3. Проведи isolated evaluation на synthetic data: useful recall, false memory, cross-tenant isolation, deletion propagation, prompt injection и cost.
4. Запрети автоматическую запись secrets, raw documents, credentials и неподтверждённых юридических/финансовых выводов.
5. Не внедряй Hindsight, если существующая conversation persistence решает сценарий или governance не закрыт.

РЕЗУЛЬТАТ
Только ADR GO/NO-GO с evidence. Реализация — отдельный явно одобренный prompt. Не объединяй с PageIndex.
```

## Prompt 11 — Developer tooling без влияния на runtime (условный)

```text
ЦЕЛЬ
Добавить инструменты разработки только после стабилизации продукта.

GITHUB MCP
1. Upstream: https://github.com/github/github-mcp-server.
2. Настройка только в локальной/operator среде; credentials и personal config не коммитить.
3. Read-only по умолчанию. Issues/PR/write operations требуют явного подтверждения.
4. Не включать MCP server в production app, browser bundle или customer tenant.
5. До write workflows сначала исправить/reconcile Git lineage отдельным безопасным решением.

STORYBOOK
1. Upstream: https://github.com/storybookjs/storybook.
2. Вводить только если cleanup завершён, shared UI components стабильны и есть владелец visual regression.
3. Подключить к существующим shadcn/Radix/Tailwind tokens. Не создавать второй component library.
4. Stories только для reusable states: default/loading/empty/error/permission-denied; никакого production secret/data.
5. Storybook остаётся devDependency и не попадает в runtime build.

REFERENCE-ONLY
`supabase/agent-skills` и `APIs-guru/openapi-directory` можно использовать как справочник. Не добавляй их в dependencies и не копируй их содержимое в source tree.

ПРИЁМКА
Production bundle/runtime behavior не изменились; npm audit не ухудшился; build и tests = PASS.
```

## Prompt 12 — Финальная сертификация и release gate

```text
ЦЕЛЬ
Доказать, что реализованные capability slices готовы к контролируемому релизу. READY deployment сам по себе не является PASS.

СДЕЛАЙ
1. Повтори source-lineage check: точный commit должен содержать проверенные изменения. Не deploy dirty/unidentified tree.
2. Выполни typecheck, lint, i18n, production build, unit/security/integration tests и DB-dependent tests на isolated DB.
3. Выполни npm audit --omit=dev; каждый exception должен иметь owner, reachability, mitigation и deadline.
4. Проверь tenant/RBAC negative matrix для новых API, automation, documents, audit и integrations.
5. Проверь idempotency/concurrency: duplicate events, parallel runner, stale extraction result, duplicate Telegram send.
6. Проведи backup и реальный restore drill по существующим DB/storage инструкциям. Не добавляй Duplicati вместо доказательства restore.
7. Проверь observability: readiness, queue age/failures, parser failures, provider rate limits, correlation ids, secret redaction и alert ownership.
8. Проверь rollback для dependency upgrade, migrations, parser worker, automation runner и Telegram action.
9. На preview/staging выполни bounded end-to-end scenario:
   - tenant login;
   - real Dashboard/Control data;
   - persisted Business Audit;
   - automation create/enable/trigger/run/history;
   - CLEAN document upload -> extraction -> review -> cited answer;
   - Telegram notification в test destination.
10. Production mutation/smoke выполнять только с отдельным разрешением и в designated tenant.
11. Обнови IMPLEMENTATION_LEDGER.md одним финальным разделом: commit, environment, commands, PASS/FAIL/BLOCKED, residual risks, rollback и deferred upstreams.

RELEASE PASS ТОЛЬКО ЕСЛИ
- проверенный commit однозначен;
- нет необработанного production critical/high;
- все обязательные tenant/auth/idempotency tests проходят;
- backup restore доказан;
- staging E2E проходит;
- monitoring и rollback назначены;
- условные репозитории, не прошедшие gates, не попали в runtime.
```

## Prompt 99 — Recovery после прерванной задачи

```text
Продолжи незавершённую capability-integration работу без повторного старта и без создания нового отчёта.

1. Прочитай AGENTS.md, docs/prompt-pack-capability-integration.md, docs/capability-integration/IMPLEMENTATION_LEDGER.md и UPSTREAMS.lock.md.
2. Проверь git status/diff и фактические последние изменения. Не считай ledger автоматически актуальным — сверяй с кодом.
3. Найди последнюю фазу со статусом не PASS и её unmet acceptance criteria.
4. Не повторяй пройденные дорогостоящие шаги без причины. Сначала выполни самый узкий verification, подтверждающий сохранность результата.
5. Продолжай только эту фазу. Не начинай следующую и не расширяй scope.
6. Если обнаружены чужие overlapping changes, остановись BLOCKED и перечисли точные файлы/конфликт решений; ничего не перезаписывай.
7. После завершения дополни существующий ledger; новый audit/report не создавай.
```

## 5. Anti-overengineering checklist

Перед добавлением каждого package, service, table или route исполнитель обязан ответить «да» на все пункты:

- Есть подтверждённый пользовательский сценарий и acceptance criterion?
- В текущем проекте нет уже существующего слоя, который можно расширить?
- Новая зависимость прошла license/security/version pinning?
- Интеграция не вводит второй auth, queue, storage, ledger, workflow engine или source of truth?
- Tenant boundary и secret boundary определены до кода?
- Есть минимальный rollback без потери domain data?
- Есть тест, который упадёт без этой возможности?
- В scope входит только один новый сложный upstream за фазу?

Если хотя бы один ответ «нет», решение — DEFER или расширение существующего кода, а не новая платформа.

## 6. Проверка понятности pack

Перед передачей следующему агенту попросите его без подсказок ответить:

1. Какой слой является каноническим automation engine и почему n8n его не заменяет?
2. Где живут tenant identity и secrets?
3. Какие существующие document models переиспользуются?
4. Сколько production parsers разрешено после benchmark?
5. Почему PageIndex и Hindsight не внедряются одновременно?
6. Почему Telegram V1 не требует generic OAuth/vault?
7. Какие фазы обязательны, а какие условны?
8. Какие конкретные evidence нужны для release PASS?

Если ответы расходятся с этим документом, сначала уточните prompt. Не разрешайте агенту «интерпретировать» запреты как необязательные рекомендации.
