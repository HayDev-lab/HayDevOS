import type { Locale } from "@/lib/i18n";

export type AuditLocaleText = Record<Locale, string>;
export type AuditState = "ok" | "manual" | "fragmented" | "missing";
export type AuditDomain =
  | "Acquisition"
  | "Sales"
  | "Operations"
  | "Data"
  | "Automation"
  | "AI Readiness";
export type AuditImpact = "high" | "medium";
export type AuditComplexity = "low" | "medium" | "high";

export type AuditChoice = {
  id: string;
  label: AuditLocaleText;
  score: 0 | 1 | 2 | 3;
  state: AuditState;
};

export type AuditQuestion = {
  id: string;
  mapLabel: AuditLocaleText;
  prompt: AuditLocaleText;
  hint: AuditLocaleText;
  domains: AuditDomain[];
  choices: AuditChoice[];
  recommendation: {
    title: AuditLocaleText;
    rationale: AuditLocaleText;
    impact: AuditImpact;
    complexity: AuditComplexity;
    connectsTo: Array<"CRM" | "LeadOS" | "HayDev Control" | "ERP" | "AI">;
  };
};

const tx = (ru: string, hy: string, en: string): AuditLocaleText => ({ ru, hy, en });
const choice = (
  id: string,
  label: AuditLocaleText,
  score: 0 | 1 | 2 | 3,
  state: AuditState,
): AuditChoice => ({ id, label, score, state });

export const auditDomains: AuditDomain[] = [
  "Acquisition",
  "Sales",
  "Operations",
  "Data",
  "Automation",
  "AI Readiness",
];

export const auditDomainLabels: Record<AuditDomain, AuditLocaleText> = {
  Acquisition: tx("Привлечение", "Ներգրավում", "Acquisition"),
  Sales: tx("Продажи", "Վաճառք", "Sales"),
  Operations: tx("Операции", "Գործառնություններ", "Operations"),
  Data: tx("Данные", "Տվյալներ", "Data"),
  Automation: tx("Автоматизация", "Ավտոմատացում", "Automation"),
  "AI Readiness": tx("Готовность к AI", "AI պատրաստվածություն", "AI Readiness"),
};

export const auditStateLabels: Record<AuditState, AuditLocaleText> = {
  ok: tx("OK", "ԼԱՎ", "OK"),
  manual: tx("Вручную", "Ձեռքով", "Manual"),
  fragmented: tx("Разрознено", "Մասնատված", "Fragmented"),
  missing: tx("Отсутствует", "Բացակայում է", "Missing"),
};

export const auditQuestions: AuditQuestion[] = [
  {
    id: "lead-sources",
    mapLabel: tx("Источники лидов", "Լիդերի աղբյուրներ", "Lead sources"),
    prompt: tx("Откуда HayDev получает новые обращения?", "Որտեղի՞ց է HayDev-ը ստանում նոր դիմումները։", "Where does HayDev receive new enquiries?"),
    hint: tx("Оцените не количество каналов, а сохранение источника до продажи.", "Գնահատեք ոչ թե ալիքների քանակը, այլ աղբյուրի պահպանումը մինչև վաճառք։", "Assess whether the source stays attached through the sale, not the number of channels."),
    domains: ["Acquisition", "Data"],
    choices: [
      choice("connected", tx("Каналы связаны, источник сохраняется", "Ալիքները կապված են, աղբյուրը պահպանվում է", "Channels are connected and the source is retained"), 3, "ok"),
      choice("partial", tx("Источники видны только в части каналов", "Աղբյուրները տեսանելի են միայն որոշ ալիքներում", "Sources are visible in only some channels"), 2, "fragmented"),
      choice("manual", tx("Источник записывается вручную", "Աղբյուրը գրանցվում է ձեռքով", "The source is recorded manually"), 1, "manual"),
      choice("missing", tx("Источник обычно не фиксируется", "Աղբյուրը սովորաբար չի գրանցվում", "The source is usually not recorded"), 0, "missing"),
    ],
    recommendation: {
      title: tx("Единый захват источников", "Աղբյուրների միասնական հավաքագրում", "Unified source capture"),
      rationale: tx("Передавать источник и кампанию вместе с обращением до CRM.", "Աղբյուրն ու արշավը դիմումի հետ փոխանցել CRM։", "Carry source and campaign data with each enquiry into CRM."),
      impact: "high", complexity: "medium", connectsTo: ["LeadOS", "CRM", "HayDev Control"],
    },
  },
  {
    id: "lead-inbox",
    mapLabel: tx("Входящие заявки", "Մուտքային դիմումներ", "Lead inbox"),
    prompt: tx("Где команда видит все новые заявки?", "Որտե՞ղ է թիմը տեսնում բոլոր նոր դիմումները։", "Where does the team see every new lead?"),
    hint: tx("Учитывайте сайт, Instagram, мессенджеры, звонки и рекомендации.", "Հաշվի առեք կայքը, Instagram-ը, մեսենջերները, զանգերն ու առաջարկությունները։", "Include the website, Instagram, messengers, calls and referrals."),
    domains: ["Acquisition", "Sales"],
    choices: [
      choice("one", tx("В одном входящем списке", "Մեկ մուտքային ցանկում", "In one shared inbox"), 3, "ok"),
      choice("several", tx("В нескольких кабинетах и чатах", "Մի քանի համակարգերում և չաթերում", "Across several tools and chats"), 2, "fragmented"),
      choice("manual", tx("Сотрудник собирает их вручную", "Աշխատակիցը հավաքում է ձեռքով", "A team member collects them manually"), 1, "manual"),
      choice("missing", tx("Единого контроля нет", "Միասնական վերահսկում չկա", "There is no unified control"), 0, "missing"),
    ],
    recommendation: {
      title: tx("Единый inbox для заявок", "Դիմումների միասնական inbox", "Unified lead inbox"),
      rationale: tx("Собирать обращения из сайта и сообщений в одну очередь без копирования.", "Կայքից և հաղորդագրություններից դիմումները հավաքել մեկ հերթում՝ առանց պատճենման։", "Collect website and message enquiries in one queue without copy-paste."),
      impact: "high", complexity: "medium", connectsTo: ["LeadOS", "CRM"],
    },
  },
  {
    id: "crm",
    mapLabel: tx("CRM", "CRM", "CRM"),
    prompt: tx("Как HayDev ведёт клиентов и сделки?", "Ինչպե՞ս է HayDev-ը վարում հաճախորդներին և գործարքները։", "How does HayDev manage customers and deals?"),
    hint: tx("Проверьте, есть ли ответственный, статус и следующий шаг.", "Ստուգեք՝ կա՞ պատասխանատու, կարգավիճակ և հաջորդ քայլ։", "Check whether every record has an owner, status and next step."),
    domains: ["Sales", "Data"],
    choices: [
      choice("connected", tx("CRM связана с каналами и процессами", "CRM-ը կապված է ալիքների և գործընթացների հետ", "CRM is connected to channels and processes"), 3, "ok"),
      choice("isolated", tx("CRM есть, но живёт отдельно", "CRM կա, բայց գործում է առանձին", "CRM exists but works in isolation"), 2, "fragmented"),
      choice("manual", tx("Таблицы, чаты или ручной список", "Աղյուսակներ, չաթեր կամ ձեռքով ցուցակ", "Spreadsheets, chats or a manual list"), 1, "manual"),
      choice("missing", tx("Системы учёта клиентов нет", "Հաճախորդների հաշվառման համակարգ չկա", "There is no customer system"), 0, "missing"),
    ],
    recommendation: {
      title: tx("CRM-контур продаж", "Վաճառքի CRM շղթա", "Connected CRM pipeline"),
      rationale: tx("Фиксировать ответственного, этап и следующий шаг для каждой сделки.", "Յուրաքանչյուր գործարքի համար գրանցել պատասխանատուին, փուլն ու հաջորդ քայլը։", "Track an owner, stage and next action for every deal."),
      impact: "high", complexity: "medium", connectsTo: ["CRM", "LeadOS", "HayDev Control"],
    },
  },
  {
    id: "follow-up",
    mapLabel: tx("Follow-up", "Հետադարձ կապ", "Follow-up"),
    prompt: tx("Как контролируется следующий контакт с лидом?", "Ինչպե՞ս է վերահսկվում լիդի հետ հաջորդ կապը։", "How is the next lead follow-up controlled?"),
    hint: tx("Важен механизм, который замечает просроченное действие.", "Կարևոր է մեխանիզմը, որը նկատում է ուշացած գործողությունը։", "Look for a mechanism that detects an overdue action."),
    domains: ["Sales", "Automation"],
    choices: [
      choice("automatic", tx("Система ставит и проверяет задачи", "Համակարգը դնում և ստուգում է առաջադրանքները", "The system creates and checks tasks"), 3, "ok"),
      choice("crm", tx("Задачи есть, но контроль частичный", "Առաջադրանքներ կան, բայց վերահսկումը մասնակի է", "Tasks exist but control is partial"), 2, "fragmented"),
      choice("memory", tx("Напоминания вручную или по памяти", "Հիշեցումները ձեռքով են կամ հիշողությամբ", "Reminders are manual or memory-based"), 1, "manual"),
      choice("missing", tx("Следующий шаг не фиксируется", "Հաջորդ քայլը չի գրանցվում", "The next step is not tracked"), 0, "missing"),
    ],
    recommendation: {
      title: tx("Контроль забытых лидов", "Մոռացված լիդերի վերահսկում", "Lost-lead control"),
      rationale: tx("Создавать следующий шаг и поднимать просроченные заявки ответственному.", "Ստեղծել հաջորդ քայլը և ուշացած դիմումները բարձրացնել պատասխանատուին։", "Create the next action and surface overdue leads to their owner."),
      impact: "high", complexity: "low", connectsTo: ["LeadOS", "CRM", "HayDev Control"],
    },
  },
  {
    id: "erp",
    mapLabel: tx("ERP / проекты", "ERP / նախագծեր", "ERP / projects"),
    prompt: tx("Где управляются проекты, заказы и исполнение?", "Որտե՞ղ են կառավարվում նախագծերը, պատվերներն ու կատարումը։", "Where are projects, orders and delivery managed?"),
    hint: tx("Смотрите на передачу данных из продажи в исполнение.", "Դիտարկեք տվյալների փոխանցումը վաճառքից կատարման փուլ։", "Assess the hand-off from a won sale into delivery."),
    domains: ["Operations", "Data"],
    choices: [
      choice("connected", tx("В связанной ERP / project-системе", "Կապակցված ERP / նախագծային համակարգում", "In a connected ERP or project system"), 3, "ok"),
      choice("separate", tx("В отдельной системе без связи с CRM", "CRM-ից անջատ համակարգում", "In a separate system disconnected from CRM"), 2, "fragmented"),
      choice("manual", tx("В таблицах, чатах и документах", "Աղյուսակներում, չաթերում և փաստաթղթերում", "In spreadsheets, chats and documents"), 1, "manual"),
      choice("missing", tx("Единого процесса нет", "Միասնական գործընթաց չկա", "There is no unified process"), 0, "missing"),
    ],
    recommendation: {
      title: tx("Передача продажи в исполнение", "Վաճառքից կատարման փոխանցում", "Sales-to-delivery hand-off"),
      rationale: tx("После согласования автоматически создавать проект, владельца и контрольные точки.", "Հաստատումից հետո ավտոմատ ստեղծել նախագիծ, պատասխանատու և վերահսկման կետեր։", "Create the project, owner and checkpoints automatically after approval."),
      impact: "high", complexity: "medium", connectsTo: ["CRM", "ERP", "HayDev Control"],
    },
  },
  {
    id: "inventory",
    mapLabel: tx("Склад / ресурсы", "Պահեստ / ռեսուրսներ", "Inventory / resources"),
    prompt: tx("Как учитываются склад, лицензии или проектные ресурсы?", "Ինչպե՞ս են հաշվառվում պահեստը, լիցենզիաները կամ նախագծային ռեսուրսները։", "How are inventory, licences or project resources tracked?"),
    hint: tx("Для HayDev ресурсом может быть не товар, а доступ, лимит или загрузка команды.", "HayDev-ի համար ռեսուրսը կարող է լինել մուտքը, սահմանաչափը կամ թիմի ծանրաբեռնվածությունը։", "For HayDev, a resource may be access, usage limits or team capacity rather than stock."),
    domains: ["Operations", "Data"],
    choices: [
      choice("connected", tx("Связаны с заказами и проектами", "Կապված են պատվերների և նախագծերի հետ", "Connected to orders and projects"), 3, "ok"),
      choice("separate", tx("Учитываются в отдельных инструментах", "Հաշվառվում են առանձին գործիքներում", "Tracked in separate tools"), 2, "fragmented"),
      choice("manual", tx("Проверяются и обновляются вручную", "Ստուգվում և թարմացվում են ձեռքով", "Checked and updated manually"), 1, "manual"),
      choice("missing", tx("Системного учёта нет", "Համակարգային հաշվառում չկա", "There is no systematic tracking"), 0, "missing"),
    ],
    recommendation: {
      title: tx("Контроль ресурсов и лимитов", "Ռեսուրսների և սահմանաչափերի վերահսկում", "Resource and limit control"),
      rationale: tx("Связать доступные ресурсы с проектами и предупредительными порогами.", "Հասանելի ռեսուրսները կապել նախագծերի և զգուշացման շեմերի հետ։", "Connect available resources to projects and warning thresholds."),
      impact: "medium", complexity: "medium", connectsTo: ["ERP", "HayDev Control"],
    },
  },
  {
    id: "reporting",
    mapLabel: tx("Отчётность", "Հաշվետվություն", "Reporting"),
    prompt: tx("Как руководство получает общую картину бизнеса?", "Ինչպե՞ս է ղեկավարությունը ստանում բիզնեսի ընդհանուր պատկերը։", "How does leadership get a full view of the business?"),
    hint: tx("Оцените время на сбор, сверку и объяснение данных.", "Գնահատեք տվյալների հավաքման, համադրման և բացատրության ժամանակը։", "Consider the effort spent collecting, reconciling and explaining data."),
    domains: ["Data", "Operations"],
    choices: [
      choice("live", tx("Показатели доступны из общих данных", "Ցուցանիշները հասանելի են ընդհանուր տվյալներից", "Metrics are available from shared data"), 3, "ok"),
      choice("several", tx("Есть несколько несвязанных отчётов", "Կան մի քանի չկապակցված հաշվետվություններ", "There are several disconnected reports"), 2, "fragmented"),
      choice("manual", tx("Отчёт собирается вручную", "Հաշվետվությունը հավաքվում է ձեռքով", "The report is assembled manually"), 1, "manual"),
      choice("missing", tx("Регулярной картины нет", "Կանոնավոր պատկեր չկա", "There is no regular overview"), 0, "missing"),
    ],
    recommendation: {
      title: tx("Панель владельца", "Սեփականատիրոջ վահանակ", "Owner control view"),
      rationale: tx("Собирать согласованные показатели из продаж, проектов и затрат в одном экране.", "Վաճառքի, նախագծերի և ծախսերի համաձայնեցված ցուցանիշները հավաքել մեկ էկրանին։", "Bring agreed sales, project and cost metrics into one view."),
      impact: "high", complexity: "medium", connectsTo: ["HayDev Control", "CRM", "ERP"],
    },
  },
  {
    id: "marketing-attribution",
    mapLabel: tx("Реклама → продажа", "Գովազդ → վաճառք", "Ads → sale"),
    prompt: tx("Можно ли связать рекламу с реальной сделкой?", "Հնարավո՞ր է գովազդը կապել իրական գործարքի հետ։", "Can advertising be connected to a real deal?"),
    hint: tx("Клики и заявки — ещё не подтверждённый результат продаж.", "Սեղմումներն ու դիմումները դեռ հաստատված վաճառքի արդյունք չեն։", "Clicks and leads are not yet a confirmed sales result."),
    domains: ["Acquisition", "Data"],
    choices: [
      choice("connected", tx("Да, источник проходит до сделки", "Այո, աղբյուրը հասնում է մինչև գործարք", "Yes, source data reaches the deal"), 3, "ok"),
      choice("partial", tx("Только часть кампаний или каналов", "Միայն որոշ արշավներ կամ ալիքներ", "Only some campaigns or channels"), 2, "fragmented"),
      choice("manual", tx("Связываем вручную по таблицам", "Կապում ենք ձեռքով՝ աղյուսակներով", "We reconcile it manually in spreadsheets"), 1, "manual"),
      choice("missing", tx("Связи рекламы с продажами нет", "Գովազդի և վաճառքի կապ չկա", "There is no ad-to-sale link"), 0, "missing"),
    ],
    recommendation: {
      title: tx("Граф рекламы и выручки", "Գովազդի և հասույթի գրաֆ", "Marketing-to-revenue graph"),
      rationale: tx("Сохранять кампанию в карточке сделки и сверять её с подтверждённым результатом.", "Արշավը պահպանել գործարքի քարտում և համադրել հաստատված արդյունքի հետ։", "Keep campaign data on the deal and reconcile it with the confirmed outcome."),
      impact: "high", complexity: "high", connectsTo: ["CRM", "HayDev Control"],
    },
  },
  {
    id: "data-transfer",
    mapLabel: tx("Передача данных", "Տվյալների փոխանցում", "Data transfer"),
    prompt: tx("Как часто данные переносятся между системами вручную?", "Որքա՞ն հաճախ են տվյալները ձեռքով փոխանցվում համակարգերի միջև։", "How often is data copied manually between systems?"),
    hint: tx("Сюда входят копирование контактов, статусов, сумм и документов.", "Ներառում է կոնտակտների, կարգավիճակների, գումարների և փաստաթղթերի պատճենումը։", "Include contacts, statuses, amounts and documents."),
    domains: ["Automation", "Data", "Operations"],
    choices: [
      choice("automatic", tx("Почти не переносится вручную", "Գրեթե չի փոխանցվում ձեռքով", "Almost never copied manually"), 3, "ok"),
      choice("some", tx("Есть несколько ручных передач", "Կան մի քանի ձեռքով փոխանցումներ", "There are a few manual hand-offs"), 2, "fragmented"),
      choice("often", tx("Перенос — регулярная часть работы", "Փոխանցումը աշխատանքի կանոնավոր մաս է", "Copying is a regular part of work"), 1, "manual"),
      choice("core", tx("Большинство систем держится на копировании", "Համակարգերի մեծ մասը հիմնված է պատճենման վրա", "Most systems depend on copy-paste"), 0, "manual"),
    ],
    recommendation: {
      title: tx("Интеграционный слой", "Ինտեգրման շերտ", "Integration layer"),
      rationale: tx("Определить единый источник данных и убрать повторный ввод между ключевыми системами.", "Սահմանել տվյալների մեկ աղբյուր և վերացնել կրկնակի մուտքագրումը հիմնական համակարգերում։", "Define a source of truth and remove duplicate entry across core systems."),
      impact: "high", complexity: "high", connectsTo: ["CRM", "ERP", "LeadOS", "HayDev Control"],
    },
  },
  {
    id: "documents",
    mapLabel: tx("Документы", "Փաստաթղթեր", "Documents"),
    prompt: tx("Как создаются предложения, договоры и рабочие документы?", "Ինչպե՞ս են ստեղծվում առաջարկները, պայմանագրերն ու աշխատանքային փաստաթղթերը։", "How are proposals, contracts and working documents created?"),
    hint: tx("Учитывайте шаблоны, согласование и перенос данных из сделки.", "Հաշվի առեք ձևանմուշները, հաստատումը և տվյալների փոխանցումը գործարքից։", "Consider templates, approval and data copied from the deal."),
    domains: ["Automation", "Operations"],
    choices: [
      choice("generated", tx("Из шаблона и данных системы", "Համակարգի տվյալներից և ձևանմուշից", "From system data and approved templates"), 3, "ok"),
      choice("templates", tx("Шаблоны есть, заполнение ручное", "Ձևանմուշներ կան, լրացումը ձեռքով է", "Templates exist but are filled manually"), 2, "fragmented"),
      choice("manual", tx("Каждый документ собирается вручную", "Յուրաքանչյուր փաստաթուղթ հավաքվում է ձեռքով", "Each document is assembled manually"), 1, "manual"),
      choice("missing", tx("Нет единого шаблона и процесса", "Միասնական ձևանմուշ և գործընթաց չկա", "There is no shared template or process"), 0, "missing"),
    ],
    recommendation: {
      title: tx("Document Flow", "Փաստաթղթերի հոսք", "Document flow"),
      rationale: tx("Создавать черновики из согласованных шаблонов и данных сделки с проверкой человеком.", "Ստեղծել սևագրեր հաստատված ձևանմուշներից և գործարքի տվյալներից՝ մարդու ստուգմամբ։", "Generate drafts from approved templates and deal data with human review."),
      impact: "medium", complexity: "medium", connectsTo: ["CRM", "ERP", "AI"],
    },
  },
  {
    id: "task-control",
    mapLabel: tx("Задачи и статусы", "Առաջադրանքներ և կարգավիճակներ", "Tasks and status"),
    prompt: tx("Как команда понимает, что делать дальше по проекту?", "Ինչպե՞ս է թիմը հասկանում նախագծի հաջորդ քայլը։", "How does the team know what happens next on a project?"),
    hint: tx("Ищите единый статус, владельца и контрольную дату.", "Փնտրեք միասնական կարգավիճակ, պատասխանատու և վերահսկման ամսաթիվ։", "Look for one status, one owner and a checkpoint date."),
    domains: ["Operations", "Automation"],
    choices: [
      choice("system", tx("Этапы и ответственные видны в системе", "Փուլերն ու պատասխանատուները տեսանելի են համակարգում", "Stages and owners are visible in the system"), 3, "ok"),
      choice("several", tx("Данные распределены между инструментами", "Տվյալները բաշխված են գործիքների միջև", "Information is split across tools"), 2, "fragmented"),
      choice("manual", tx("Через чаты, встречи и ручные напоминания", "Չաթերով, հանդիպումներով և ձեռքով հիշեցումներով", "Through chats, meetings and manual reminders"), 1, "manual"),
      choice("missing", tx("Формального контроля нет", "Պաշտոնական վերահսկում չկա", "There is no formal control"), 0, "missing"),
    ],
    recommendation: {
      title: tx("Событийный контроль проектов", "Նախագծերի իրադարձային վերահսկում", "Event-driven project control"),
      rationale: tx("Создавать задачи и уведомления из изменений статуса заказа или проекта.", "Առաջադրանքներ և ծանուցումներ ստեղծել պատվերի կամ նախագծի կարգավիճակի փոփոխությունից։", "Create tasks and alerts from order or project status changes."),
      impact: "high", complexity: "medium", connectsTo: ["ERP", "HayDev Control"],
    },
  },
  {
    id: "data-quality",
    mapLabel: tx("Качество данных", "Տվյալների որակ", "Data quality"),
    prompt: tx("Насколько можно доверять данным без дополнительной сверки?", "Որքանո՞վ կարելի է վստահել տվյալներին առանց լրացուցիչ ստուգման։", "How trustworthy is the data without extra reconciliation?"),
    hint: tx("Одинаковые названия, обязательные поля и правила доступа важнее красивого дашборда.", "Միասնական անվանումները, պարտադիր դաշտերն ու մուտքի կանոնները կարևոր են գեղեցիկ վահանակից։", "Consistent names, required fields and access rules matter more than a polished dashboard."),
    domains: ["Data", "AI Readiness"],
    choices: [
      choice("trusted", tx("Есть правила и регулярная проверка", "Կան կանոններ և պարբերական ստուգում", "Rules and regular checks are in place"), 3, "ok"),
      choice("partial", tx("Ключевые данные надёжны, остальные нет", "Հիմնական տվյալները վստահելի են, մնացածը՝ ոչ", "Core data is reliable, the rest is not"), 2, "fragmented"),
      choice("manual", tx("Качество зависит от ручной сверки", "Որակը կախված է ձեռքով համադրումից", "Quality depends on manual reconciliation"), 1, "manual"),
      choice("unknown", tx("Правил качества и доступа нет", "Որակի և մուտքի կանոններ չկան", "There are no quality or access rules"), 0, "missing"),
    ],
    recommendation: {
      title: tx("Основа данных", "Տվյալների հիմք", "Data foundation"),
      rationale: tx("Согласовать обязательные поля, владельцев данных, доступ и правила проверки.", "Համաձայնեցնել պարտադիր դաշտերը, տվյալների պատասխանատուներին, մուտքն ու ստուգման կանոնները։", "Define required fields, data owners, access and validation rules."),
      impact: "high", complexity: "medium", connectsTo: ["CRM", "ERP", "AI", "HayDev Control"],
    },
  },
  {
    id: "workflow-automation",
    mapLabel: tx("Автоматизации", "Ավտոմատացումներ", "Automations"),
    prompt: tx("Как управляются уже существующие автоматизации?", "Ինչպե՞ս են կառավարվում առկա ավտոմատացումները։", "How are existing automations managed?"),
    hint: tx("Нужны владелец, журнал ошибок и безопасное ручное продолжение.", "Անհրաժեշտ են պատասխանատու, սխալների մատյան և անվտանգ ձեռքով շարունակություն։", "They need an owner, error log and a safe manual fallback."),
    domains: ["Automation", "AI Readiness"],
    choices: [
      choice("managed", tx("Есть владельцы, мониторинг и fallback", "Կան պատասխանատուներ, մոնիթորինգ և fallback", "Owners, monitoring and fallback are defined"), 3, "ok"),
      choice("scattered", tx("Автоматизации есть, но разрознены", "Ավտոմատացումները կան, բայց մասնատված են", "Automations exist but are fragmented"), 2, "fragmented"),
      choice("manual", tx("Есть отдельные скрипты без контроля", "Կան առանձին սկրիպտներ առանց վերահսկման", "There are isolated scripts without oversight"), 1, "manual"),
      choice("missing", tx("Автоматизаций пока нет", "Ավտոմատացումներ դեռ չկան", "There are no automations yet"), 0, "missing"),
    ],
    recommendation: {
      title: tx("Реестр автоматизаций", "Ավտոմատացումների ռեգիստր", "Automation registry"),
      rationale: tx("Собрать сценарии, владельцев, ошибки и ручной fallback в одном контуре.", "Սցենարները, պատասխանատուներին, սխալներն ու ձեռքով fallback-ը հավաքել մեկ համակարգում։", "Track workflows, owners, errors and manual fallback in one place."),
      impact: "medium", complexity: "low", connectsTo: ["HayDev Control", "AI"],
    },
  },
  {
    id: "ai-knowledge",
    mapLabel: tx("AI и знания", "AI և գիտելիքներ", "AI and knowledge"),
    prompt: tx("На каких данных AI мог бы безопасно помогать команде?", "Ո՞ր տվյալներով կարող է AI-ն անվտանգ օգնել թիմին։", "What data could AI safely use to assist the team?"),
    hint: tx("Не выбирайте AI раньше, чем определены источники, доступ и проверка человеком.", "Մի ընտրեք AI, մինչև չսահմանվեն աղբյուրները, մուտքն ու մարդու ստուգումը։", "Do not choose AI before sources, access and human review are defined."),
    domains: ["AI Readiness", "Data"],
    choices: [
      choice("ready", tx("Источники, доступ и проверка определены", "Աղբյուրները, մուտքն ու ստուգումը սահմանված են", "Sources, access and review are defined"), 3, "ok"),
      choice("partial", tx("Есть знания, но они распределены", "Գիտելիքները կան, բայց բաշխված են", "Knowledge exists but is distributed"), 2, "fragmented"),
      choice("manual", tx("Данные приходится собирать вручную", "Տվյալները պետք է հավաքել ձեռքով", "Data must be assembled manually"), 1, "manual"),
      choice("missing", tx("Нет согласованной базы знаний", "Համաձայնեցված գիտելիքների բազա չկա", "There is no agreed knowledge base"), 0, "missing"),
    ],
    recommendation: {
      title: tx("Управляемая база знаний", "Կառավարվող գիտելիքների բազա", "Governed knowledge base"),
      rationale: tx("Определить документы, права доступа, источники ответа и обязательную проверку.", "Սահմանել փաստաթղթերը, մուտքի իրավունքները, պատասխանի աղբյուրներն ու պարտադիր ստուգումը։", "Define documents, access, answer sources and mandatory review."),
      impact: "medium", complexity: "medium", connectsTo: ["AI", "HayDev Control"],
    },
  },
  {
    id: "ai-use",
    mapLabel: tx("AI-сценарии", "AI սցենարներ", "AI use cases"),
    prompt: tx("Как HayDev выбирает задачи для AI?", "Ինչպե՞ս է HayDev-ը ընտրում AI-ի խնդիրները։", "How does HayDev select work for AI?"),
    hint: tx("Лучший первый сценарий повторяем, проверяем и не требует автономного решения с высоким риском.", "Լավ առաջին սցենարը կրկնվող է, ստուգելի և չի պահանջում բարձր ռիսկի ինքնավար որոշում։", "A good first use case is repeatable, reviewable and avoids high-risk autonomous decisions."),
    domains: ["AI Readiness", "Automation"],
    choices: [
      choice("criteria", tx("Есть критерии, пилоты и проверка", "Կան չափանիշներ, փորձարկումներ և ստուգում", "Criteria, pilots and review are defined"), 3, "ok"),
      choice("experiments", tx("Есть эксперименты без общего процесса", "Կան փորձեր առանց ընդհանուր գործընթացի", "Experiments exist without a shared process"), 2, "fragmented"),
      choice("ad-hoc", tx("AI используется точечно сотрудниками", "AI-ն օգտագործվում է առանձին աշխատակիցների կողմից", "AI is used ad hoc by individuals"), 1, "manual"),
      choice("missing", tx("Подходящих сценариев ещё не выбрали", "Հարմար սցենարներ դեռ չեն ընտրվել", "No suitable use cases have been selected"), 0, "missing"),
    ],
    recommendation: {
      title: tx("Контролируемый AI-пилот", "Վերահսկվող AI փորձարկում", "Controlled AI pilot"),
      rationale: tx("Выбрать один повторяемый сценарий, критерии качества и обязательную проверку человеком.", "Ընտրել մեկ կրկնվող սցենար, որակի չափանիշներ և պարտադիր մարդկային ստուգում։", "Choose one repeatable use case with quality criteria and mandatory human review."),
      impact: "medium", complexity: "low", connectsTo: ["AI", "HayDev Control"],
    },
  },
];

export const haydevDemoAnswers: Record<string, string> = {
  "lead-sources": "partial",
  "lead-inbox": "several",
  crm: "isolated",
  "follow-up": "crm",
  erp: "separate",
  inventory: "separate",
  reporting: "manual",
  "marketing-attribution": "partial",
  "data-transfer": "often",
  documents: "templates",
  "task-control": "several",
  "data-quality": "partial",
  "workflow-automation": "scattered",
  "ai-knowledge": "partial",
  "ai-use": "experiments",
};

export const auditUi = {
  back: tx("На сайт HayDev", "HayDev կայք", "HayDev website"),
  title: tx("Business Audit", "Business Audit", "Business Audit"),
  subtitle: tx("Диагностика цифровой системы бизнеса", "Բիզնեսի թվային համակարգի ախտորոշում", "Digital business system diagnostic"),
  internal: tx("Внутренний режим", "Ներքին ռեժիմ", "Internal mode"),
  public: tx("Публичный preview", "Հանրային preview", "Public preview"),
  current: tx("Текущий бизнес", "Ընթացիկ բիզնես", "Current business"),
  demo: tx("Демо HayDev", "HayDev դեմո", "HayDev demo"),
  demoNotice: tx("Демо-ответы — гипотезы для проверки, а не факты о HayDev.", "Դեմո պատասխանները ստուգման վարկածներ են, ոչ HayDev-ի մասին փաստեր։", "Demo answers are assumptions to review, not facts about HayDev."),
  saved: tx("Черновик сохраняется на этом устройстве", "Սևագիրը պահպանվում է այս սարքում", "Draft saved on this device"),
  restore: tx("Продолжить сохранённый аудит", "Շարունակել պահպանված աուդիտը", "Continue saved audit"),
  reset: tx("Начать заново", "Սկսել նորից", "Start over"),
  progress: tx("Прогресс", "Առաջընթաց", "Progress"),
  question: tx("Вопрос", "Հարց", "Question"),
  of: tx("из", "ից", "of"),
  map: tx("Automation Map", "Automation Map", "Automation Map"),
  live: tx("Живая предварительная карта", "Նախնական կենդանի քարտեզ", "Live preliminary map"),
  unanswered: tx("Нет ответа", "Պատասխան չկա", "Unanswered"),
  previous: tx("Назад", "Հետ", "Back"),
  next: tx("Далее", "Հաջորդը", "Next"),
  showReport: tx("Сформировать отчёт", "Ստեղծել հաշվետվություն", "Build report"),
  overview: tx("Связность системы", "Համակարգի կապակցվածություն", "System connectivity"),
  notEfficiency: tx("Это показатель связности процессов по ответам, а не оценка эффективности или финансовый прогноз.", "Սա պատասխանների հիման վրա գործընթացների կապակցվածության ցուցանիշ է, ոչ արդյունավետության կամ ֆինանսական կանխատեսում։", "This measures process connectivity from the answers, not efficiency or a financial forecast."),
  report: tx("Business Audit Report", "Business Audit Report", "Business Audit Report"),
  reportIntro: tx("Предварительная карта точек, которые стоит проверить перед внедрением.", "Ներդրումից առաջ ստուգման ենթակա կետերի նախնական քարտեզ։", "A preliminary map of areas to verify before implementation."),
  scores: tx("Оценка по направлениям", "Գնահատում ըստ ուղղությունների", "Scores by domain"),
  priorities: tx("Приоритетные автоматизации", "Առաջնահերթ ավտոմատացումներ", "Priority automations"),
  impact: tx("Impact", "Ազդեցություն", "Impact"),
  complexity: tx("Сложность", "Բարդություն", "Complexity"),
  high: tx("Высокий", "Բարձր", "High"),
  medium: tx("Средний", "Միջին", "Medium"),
  low: tx("Низкая", "Ցածր", "Low"),
  complexityHigh: tx("Высокая", "Բարձր", "High"),
  complexityMedium: tx("Средняя", "Միջին", "Medium"),
  complexityLow: tx("Низкая", "Ցածր", "Low"),
  connections: tx("Будущие связи", "Ապագա կապեր", "Future connections"),
  caveat: tx("Результат основан только на выбранных ответах. Перед решением нужны интервью, проверка систем, данных, доступов и ограничений.", "Արդյունքը հիմնված է միայն ընտրված պատասխանների վրա։ Որոշումից առաջ անհրաժեշտ են հարցազրույցներ և համակարգերի, տվյալների, մուտքերի ու սահմանափակումների ստուգում։", "The result uses only the selected answers. Interviews and a review of systems, data, access and constraints are required before decisions."),
  internalCta: tx("Создать план внедрения", "Ստեղծել ներդրման պլան", "Create implementation plan"),
  publicCta: tx("Получить подробный аудит HayDev", "Ստանալ HayDev-ի մանրամասն աուդիտ", "Get a detailed HayDev audit"),
  edit: tx("Изменить ответы", "Փոխել պատասխանները", "Edit answers"),
  plan: tx("Черновик плана внедрения", "Ներդրման պլանի սևագիր", "Implementation plan draft"),
  planIntro: tx("Порядок основан на зависимостях: сначала данные и контроль, затем автоматизация и AI.", "Հերթականությունը հիմնված է կախվածությունների վրա՝ սկզբում տվյալներ և վերահսկում, հետո ավտոմատացում և AI։", "The order follows dependencies: data and control first, then automation and AI."),
  phaseFoundation: tx("01 · Основа", "01 · Հիմք", "01 · Foundation"),
  phaseConnect: tx("02 · Соединение", "02 · Կապակցում", "02 · Connect"),
  phaseAutomate: tx("03 · Автоматизация", "03 · Ավտոմատացում", "03 · Automate"),
  phasePilot: tx("04 · AI-пилот", "04 · AI փորձարկում", "04 · AI pilot"),
  noPromise: tx("Без обещаний экономии: impact и сложность здесь качественные и требуют проверки на реальных данных.", "Առանց խնայողության խոստումների․ ազդեցությունն ու բարդությունը որակական են և պահանջում են ստուգում իրական տվյալներով։", "No savings claims: impact and complexity are qualitative and require validation with real data."),
};

export function auditText(text: AuditLocaleText, locale: Locale) {
  return text[locale];
}
