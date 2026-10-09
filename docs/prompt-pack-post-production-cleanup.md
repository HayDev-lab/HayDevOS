# Prompt Pack: безопасная post-production очистка

Этот набор разбивает большой cleanup на проверяемые этапы. Запускайте промты по
порядку в одном checkout. Каждый следующий этап должен читать артефакты и вывод
предыдущего, а не начинать аудит заново.

## Общий контракт для всех промтов

Добавляйте этот блок в начало каждого запуска:

```text
Работай только в PROJECT_ROOT=<absolute path>.

Сначала прочитай AGENTS.md и локальную документацию установленного стека.
Не считай технологию присутствующей только потому, что она упомянута в задании.
Неприменимые проверки помечай N/A с доказательством отсутствия стека.

Статусы доказательств: CONFIRMED, UNKNOWN, NOT_RUN, BLOCKED.
Статусы кандидатов: KEEP, DELETE, ARCHIVE, GENERATED, UNKNOWN.
UNKNOWN удалять запрещено.

Не меняй и не стирай чужие незакоммиченные изменения. Не используй reset --hard,
checkout --, branch -D, переписывание history или удаление remote refs без отдельного
явного разрешения. Не печатай секреты. Любое удаление должно иметь recoverable state.

Цикл для каждого изменения:
DISCOVER -> CLASSIFY -> TRACE -> CHANGE -> LINT -> TYPECHECK -> TEST -> BUILD -> REGRESSION.
При ошибке: RESTORE/FIX -> ROOT CAUSE -> RECLASSIFY -> RETEST.

Не объявляй CLEAN по одному успешному build или чистому git status.
В отчёте отделяй подтверждённое от предположений и перечисляй NOT_RUN/BLOCKED.
```

## 00. Оркестратор и адаптация к стеку

```text
Ты — Principal Engineer и Release Maintainer. Подготовь план безопасной
post-production очистки PROJECT_ROOT, но пока ничего не удаляй.

1. Определи фактический стек из manifest/lock/config/source/CI файлов.
2. Найди AGENTS.md и обязательные локальные инструкции фреймворка.
3. Сопоставь master cleanup phases с реальным стеком.
4. Для Rust/Tauri/Electron/installer/mobile/desktop проверок выставь APPLICABLE или
   N/A; N/A разрешён только с evidence.
5. Определи production branch, commit, dirty files, remotes и текущий runtime/deploy.
6. Предложи минимальный порядок этапов и команды проверки без destructive действий.

Вывод: STACK_MATRIX, SCOPE, BASELINE_COMMANDS, RISK_REGISTER, STOP_CONDITIONS.
Не вноси изменения.
```

## 01. Baseline и recoverable checkpoint

```text
Создай read-only baseline для PROJECT_ROOT.

- Зафиксируй git status, branch, HEAD, remotes, tracked/untracked/ignored summary.
- Найди обязательные lint/typecheck/test/build/runtime команды из package manifests и CI.
- Выполни применимые проверки. Не подменяй отсутствующие команды похожими.
- Зафиксируй HTTP/runtime smoke, если сервис можно безопасно запустить локально.
- Создай recoverable branch/tag/stash только если это безопасно для существующего
  dirty tree; не скрывай пользовательские изменения.

Вывод: BASELINE.md-подобный отчёт с точными командами, exit code, PASS/FAIL,
известными исходными дефектами и идентификатором checkpoint. Если baseline FAIL,
не начинай массовую очистку.
```

## 02. Inventory и классификация кандидатов

```text
Проведи полный read-only inventory PROJECT_ROOT.

Для каждого потенциального cleanup-кандидата определи:
PATH, TYPE, PURPOSE, REFERENCES, BUILD, RUNTIME, DEPLOY/INSTALLER, CI, DEV,
HISTORICAL, GENERATED, STATUS, EVIDENCE.

Трассируй не только imports, но также package scripts, dynamic imports, route/file
conventions, glob/config references, environment loading, Prisma migrations,
assets, public paths, tests, deploy manifests и runtime-generated lookup.

Отдельно найди:
- dead/duplicate source и obsolete compatibility paths;
- generated/cache/temp/log/report artifacts;
- устаревшие scripts/config/docs/comments;
- unused dependencies;
- крупные tracked files и дубликаты по содержимому;
- пустые/orphan directories;
- Electron/Tauri/Rust следы только если соответствующий стек реально присутствует.

Ничего не удаляй. Вывод: кандидаты DELETE только с подтверждённой цепочкой
доказательств; сомнительные записи остаются UNKNOWN.
```

## 03. Минимальная безопасная очистка

```text
Используй подтверждённый inventory из предыдущего этапа. Удаляй только STATUS=DELETE.

Работай малыми тематическими batches:
1. generated junk и временные artifacts;
2. dead source/assets;
3. obsolete scripts/config;
4. documentation consolidation;
5. empty directories.

После каждого batch запускай форматирование, lint, typecheck, релевантные tests,
production build и минимальный runtime smoke. При любой регрессии восстанови только
проблемный batch, найди root cause и переклассифицируй файл в KEEP или UNKNOWN.

Не удаляй полезные regression/security/integration/E2E тесты. Не делай архитектурный
rewrite и массовые перемещения ради эстетики.

Вывод после каждого batch: CHANGED, DELETED, RESTORED, KEEP_REASON, CHECKS,
REGRESSIONS, REMAINING_UNKNOWN.
```

## 04. Dependencies, scripts и clean install

```text
Проведи доказательный аудит dependencies и canonical commands.

Для каждого package/crate:
- найди source/config/script/runtime usage;
- учти peer/optional/build-time dependencies и framework conventions;
- удаляй только CONFIRMED unused;
- обновляй lockfile штатным package manager проекта;
- после каждого небольшого batch выполняй install, lint, typecheck, tests и build.

Проверь scripts: dev, build, start, lint, typecheck, test, migrate, deploy, backup,
restore и smoke. Удали только подтверждённые one-off/obsolete команды.

Затем выполни clean-install proof в recoverable/safe форме. Не удаляй глобальные
caches или пользовательские данные. Вывод: REMOVED_DEPENDENCIES, RETAINED_REASON,
LOCKFILE_STATUS, CLEAN_INSTALL, BUILD, TESTS.
```

## 05. Tests, docs, artifacts и `.gitignore`

```text
Раздели тестовые материалы на PERMANENT_TEST, TEMPORARY_TEST, GENERATED_ARTIFACT,
INTENTIONAL_FIXTURE и UNKNOWN.

Сохрани unit/integration/E2E/security/regression/release smoke. Удали только
подтверждённые one-off experiments и generated screenshots/videos/logs/traces/
coverage/databases. Проверь, что intentional fixtures не попали под glob удаления.

Консолидируй документацию вокруг текущего runtime. README должен объяснять setup,
dev, tests, production build, deploy и ключевые модули. Исторические сведения
оставляй только если они полезны и явно помечены.

Аудит `.gitignore`: добавь локальные env/secrets, build/cache/log/temp/coverage и OS
junk, но докажи, что правила не скрывают source, migrations, fixtures или runtime
resources. После изменений повтори tests/build.
```

## 06. Secrets, branches и история Git

```text
Выполни read-only Git/security audit.

- Ищи секреты в tracked tree и доступной истории, не печатая значения.
- Для находки сообщай путь/commit/type и ROTATE_REQUIRED; простое удаление файла не
  считается ротацией.
- Получи local/remote branches, tracking, merge-base, unique commits, protected/
  release relevance и доступный PR status.
- Классифицируй ACTIVE, MERGED, STALE, EXPERIMENTAL, UNKNOWN.
- Автоматически разрешён только safe delete ветки MERGED + NOT_PROTECTED + NOT_CURRENT
  + NOT_RELEASE + NO_UNIQUE_REQUIRED_COMMITS.
- Remote delete, force delete, tag delete и history rewrite требуют отдельного
  подтверждения пользователя.

Вывод: SECRETS_FOUND(count only), ROTATION_ACTIONS, BRANCH_MATRIX,
SAFE_DELETE_CANDIDATES, MANUAL_REVIEW. По умолчанию ничего не удаляй.
```

## 07. Stack-specific runtime regression: Next.js + Prisma + Supabase + Vercel

```text
Применяй этот промт только если repository действительно использует Next.js,
Prisma/PostgreSQL, Supabase Storage и/или Vercel.

1. Прочитай документацию установленной версии Next.js в node_modules перед правками.
2. Проверь lint, typecheck, i18n, unit, integration, security и production build.
3. Для DB mutation tests используй только явно изолированную тестовую PostgreSQL;
   никогда не production DATABASE_URL.
4. Проверь auth cookies, origin/CSRF, tenant isolation, session revocation и RBAC.
5. Проверь business flows, optimistic concurrency, immutable ledgers/history и restart
   persistence.
6. Для Supabase Storage проверь private upload, hash round-trip, signed download,
   anonymous denial и cleanup тестового prefix. Не печатай service credentials.
7. Перед Vercel deploy проверь env scope/type. Deploy не равен READY: дождись READY,
   затем проверь live /api/health, /api/ready, runtime logs и ключевой бизнес-flow.
8. При 5xx немедленно откати production alias на последний подтверждённо healthy
   deployment, затем исправляй причину локально.

Вывод: LOCAL_GATE, DATABASE_GATE, STORAGE_GATE, DEPLOYMENT_GATE, LIVE_GATE,
ROLLBACK_STATE, TEMP_RESOURCE_CLEANUP.
```

## 08. Второй scan и финальный gate

```text
После всех изменений выполни независимый второй scan текущего tree.

- Повтори inventory кандидатов, dead-code/reference search, dependency audit,
  generated artifacts, secrets, large files, branches и gitignore checks.
- Выполни clean install proof, полный применимый test matrix, production build и
  runtime regression.
- Проверь git status/diff/stat; каждый diff должен быть объясним.
- Выведи сокращённое итоговое дерево и назначение основных директорий.
- Посчитай deleted files/directories, dead code, dependencies, temporary tests,
  artifacts, branch actions, large files и secret findings.

Финальный статус CLEAN_PRODUCTION_REPOSITORY разрешён только если все применимые
gates PASS, NEW_SAFE_CLEANUP_CANDIDATES=0 и нет UNKNOWN, влияющих на безопасность
релиза. Неприменимые desktop/Rust/Tauri/installer gates укажи как N/A с evidence,
а не как искусственный FAIL.

Если Git dirty потому, что cleanup ещё не закоммичен, укажи GIT_STATUS=DIRTY
(EXPECTED CHANGES) и не выдавай CLEAN. Не коммить автоматически без разрешения.
```

## 09. Recovery prompt при регрессии

```text
Cleanup вызвал регрессию. Не продолжай удаление.

1. Зафиксируй точную failing command, exit code, route/test и первый causal error.
2. Сопоставь ошибку с последним минимальным batch.
3. Восстанови только требуемый файл/зависимость либо внеси минимальный совместимый fix;
   не откатывай чужой dirty tree.
4. Объясни ошибочную классификацию кандидата.
5. Запусти targeted test, затем полный gate этапа, production build и runtime smoke.
6. Обнови inventory: KEEP с причиной или новый подтверждённый replacement.

Вывод: ROOT_CAUSE, WRONG_CLASSIFICATION, MINIMAL_FIX, TARGETED_VERIFICATION,
FULL_REGRESSION, UPDATED_KEEP_REASON.
```

## Рекомендуемый порядок запуска

`00 -> 01 -> 02 -> 03 -> 04 -> 05 -> 06 -> 07 -> 08`

При любой регрессии запустите `09`, затем вернитесь к этапу, на котором она была
обнаружена. Не объединяйте удаление, Git history rewrite и production deployment в
один необратимый шаг.
