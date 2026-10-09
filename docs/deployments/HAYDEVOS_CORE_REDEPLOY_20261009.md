# HayDevOS Core: повторный production-деплой

Дата: 2026-10-09, Asia/Yerevan.

## Результат

Новый интерфейс развёрнут в существующем Vercel-проекте `haydevos`
(`prj_zPEjofoObjWSMZT2SK5zvGAoqYKV`). Домены `haydevos.com`,
`www.haydevos.com` и `haydevos.vercel.app` переключены на новую сборку.
Прежний активный production-деплой удалён по запросу пользователя.

| Параметр | Значение |
| --- | --- |
| Исходный коммит | `34c3a9f01c0ea0344235611e1ec05a0301900946` |
| Новый deployment ID | `dpl_25FHzYL7gKuAVB2MBu4RoR4b47Ta` |
| Новый deployment URL | `https://haydevos-1c06289cj-galstyanh992-8644s-projects.vercel.app` |
| Основной сайт | `https://haydevos.com` |
| Удалённый deployment ID | `dpl_6urC5dZatDVYVA6jYto2yvyQNJX2` |
| Коммит удалённой версии | `b255ebbe549879225e6b6821c9b4ff9eb853bb33` |

## Проверки

- TypeScript, ESLint выбранных UI-файлов, i18n: PASS.
- `test:security-structure`: 29 PASS, 0 FAIL, 358 assertions.
- Vercel выполнил свежую production-сборку с `--force`, без build cache:
  Prisma generate, Next.js compilation, TypeScript и подготовка outputs — PASS.
- API Vercel подтвердил project ID и исходный коммит новой сборки.
- Все три перечисленных домена проверены через `vercel inspect`:
  каждый разрешается в новый deployment ID со статусом `READY`.
- В Chrome на новом deployment URL и затем на `haydevos.com` отображается
  новая форма входа; логотипы загружены, renderer Земли — `webgl`.
- На основном домене ошибок и предупреждений приложения не обнаружено.
  Предупреждения стороннего расширения Chrome в эту оценку не включены.
- `vercel remove <old-id> --safe --yes` удалил одну прежнюю версию.
  Повторный inspect старого ID вернул `Can't find the deployment`.

## Состав загрузки и пределы проверки

`.vercelignore` дополнен исключениями для агентских каталогов, локальных
браузерных журналов, скриншотов и прежнего статического WebGL-демо.
Проверенный manifest содержит 416 записей, 19 173 255 байт;
локальные `.env`, резервные копии и тестовые артефакты не включены.
Новая версия загружена обычным способом, без `--archive`.

Проект, его параметры production, база данных и пользовательские аккаунты
не пересоздавались. Удалён только конкретный заменённый deployment.

Реальный вход под пользователем и операции с данными в этой проверке не
выполнялись. Навигация Chrome к `/api/health` на индивидуальном deployment URL
была заблокирована клиентом (`ERR_BLOCKED_BY_CLIENT`), поэтому доступность
зависимостей через health/readiness не утверждается. Публичная форма входа
и запуск WebGL проверены непосредственно на основном домене.

Локальные машинные свидетельства: `.artifacts/redeploy-20261009/`.
