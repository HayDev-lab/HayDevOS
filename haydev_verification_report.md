# HayDev — verification report

Проверки выполнены 2026-09-13. PASS означает фактический запуск, а не оценку по исходникам.

## Команды

| Команда | Результат |
|---|---|
| `node /root/.codex/plugins/cache/openai-curated-remote/sites/0.1.62/scripts/configure-execution-profile.mjs` | PASS; managed-linux |
| `node /root/.codex/plugins/cache/openai-curated-remote/sites/0.1.62/scripts/project-setup.mjs` | PASS; новый пустой проект |
| `node /root/.codex/plugins/cache/openai-curated-remote/sites/0.1.62/scripts/install-dependencies.mjs --prefer-pnpm` | PASS; pnpm, 628 reused / 0 downloaded |
| `node node_modules/drizzle-kit/bin.cjs generate` | PASS; 1 таблица, 1 индекс |
| `node /root/.codex/plugins/cache/openai-curated-remote/sites/0.1.62/scripts/build-site.mjs` | PASS; повторная финальная сборка после исправлений, exit 0 |
| `node node_modules/typescript/bin/tsc --noEmit` | Первый FAIL exit 2; исправлено, финальный PASS exit 0 |
| `node node_modules/eslint/bin/eslint.js . --ignore-pattern dist --ignore-pattern .next` | Финальный PASS exit 0, 0 warnings |
| `sites-preview start /workspace/sites/haydev` | PASS; browser smoke выполнен |
| `node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_regular_hedge_knight.sql` | PASS; 2 SQL statements |
| Wrangler SELECT тестовой заявки | PASS; независимо подтверждена 1 сохранённая запись |
| Отдельный `test` script | NOT_AVAILABLE в starter |
| Отдельный `typecheck` script | NOT_AVAILABLE; компилятор запущен напрямую |
| Lighthouse / полевой LCP / INP / CLS / stress load | NOT_RUN; численные оценки не выдумывались |
| Safari, Firefox, физический iPhone/Android | NOT_RUN |
| Реальное переключение системного reduced-motion | NOT_RUN; проверены CSS и pointer guard в исходниках |
| Проверка формы на опубликованном домене | NOT_RUN; успешный локальный E2E и терминальный статус deployment проверяются отдельно |

## Browser behavior

- Desktop hero визуально осмотрен: собственная объёмная графика, ясный оффер и CTA доступны сразу.
- Кнопка «Маркетинг»: aria-pressed=true, обновилось текстовое объяснение.
- Переключатель карты: aria-checked=true; обновлены связи и подписи; проверен также на mobile.
- Accordion «Сайты…»: aria-expanded=true, раскрыт соответствующий текст.
- Этап «04 Запуск»: показан заголовок «Выводим систему в работу».
- Таб «Торговля»: показан соответствующий сценарий; ArrowRight с таба «Услуги» выбирает «Торговля».
- Мобильное меню открывается, ссылка «Система» закрывает его и переводит к нужной секции.
- Все якоря имеют существующие id: brokenAnchors=[]; найден ровно один H1; lang=ru.
- Title, description, canonical фактически найдены в DOM; hero image loaded=true.
- Без согласия форма показывает ошибку. С согласием тестовая заявка сохранена на сервере, показано состояние успеха.
- Правовой Dialog открывается; Escape закрывает его; фокус возвращается к кнопке открытия.
- Mobile screenshots осмотрены при 390 и 320 px. Ни live WebGL, ни внешних шрифтов/видео/трекеров нет.

## Responsive matrix

Временный same-origin iframe давал реальные viewport/media-query размеры. Chrome резервирует 15 px под scrollbar; ниже отдельно показана ширина контента. Это не тест физического мобильного устройства. Harness удалён до итоговой сборки.

| Viewport px | clientWidth | scrollWidth | Status |
|---|---|---|---|
| 320 | 305 | 305 | PASS |
| 360 | 345 | 345 | PASS |
| 375 | 360 | 360 | PASS |
| 390 | 375 | 375 | PASS |
| 414 | 399 | 399 | PASS |
| 768 | 753 | 753 | PASS |
| 1440 | 1425 | 1425 | PASS |
| 1920 | 1905 | 1905 | PASS |

Матрица повторена после исправлений и увеличения основного текста. Это подтверждение отсутствия горизонтального overflow в протестированном состоянии; каждый возможный state на каждой ширине не тестировался.

## API tests — actual HTTP responses in browser

| Check | Expected / actual | Status |
|---|---|---|
| Valid submission | 201 / 201 | PASS |
| Same UUID retry | 200 / 200 | PASS |
| Invalid email | 400 / 400 | PASS |
| Missing consent | 400 / 400 | PASS |
| Honeypot filled | 400 / 400 | PASS |
| Second daily submission | 201 / 201 | PASS |
| Third daily submission | 201 / 201 | PASS |
| Fourth daily submission | 429 / 429 | PASS |
| Malformed JSON | 400 / 400 | PASS |
| Oversize body | 413 / 413 | PASS |
| Wrong content type | 415 / 415 | PASS |

Cross-origin rejection: source inspected, runtime test NOT_RUN. Concurrent load test NOT_RUN. Database outage UI is implemented but not fault-injected. Synthetic test records are local only and are not part of the deployed archive.

## Assets and performance limits

Desktop WebP: 127444 bytes. Mobile WebP: 39030 bytes. No added 3D runtime. Build asset sizes are recorded in `haydev_build_metrics.json`; gzip is computed locally, not measured network transfer or Web Vitals. Above-fold image eager/high priority deliberately; no hidden blocking animation.

## Production-readiness limit

Public release requires verified contacts and complete operator/privacy details. This version is private and noindex. CRM/email notification integrations are not configured. No real-client proof was supplied, so cases remain explicitly illustrative scenarios. See final audit for verdict.
