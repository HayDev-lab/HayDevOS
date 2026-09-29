/**
 * HayDevOS Business Audit — versioned questionnaire.
 *
 * `QUESTIONNAIRE_VERSION` is the contract version of the question set. When the
 * question text, options, weights or scoring algorithm change, bump this and the
 * `SCORE_VERSION` in `scoring.ts`. Persisted `AuditReport`s carry the
 * questionnaire + score version they were generated with so historical scores
 * remain interpretable (and immutable — the Owner AI may explain them but never
 * rewrite them).
 *
 * Categories (6): Acquisition, Sales, Operations, Data, Automation, AI Readiness.
 * Each category has 6–7 questions → ~40 total.
 *
 * Each question carries an explicit, normalized 0..1 contribution model so that
 * `scoring.ts` can compute a deterministic 0..100 score without any LLM.
 */

import type { Question, QuestionOption } from "./types";

export const QUESTIONNAIRE_VERSION = "2025.1";

// ─────────────────────────────────────────────────────────────────────────────
// Option builders — keep value scales explicit and consistent.
// ─────────────────────────────────────────────────────────────────────────────

const SCALE_OPTIONS: QuestionOption[] = []; // scale questions have no options

const YES_NO = (yesValue: number, noValue: number): QuestionOption[] => [
  { id: "yes", label: { hy: "Այո", ru: "Да", en: "Yes" }, value: yesValue },
  { id: "no", label: { hy: "Ոչ", ru: "Нет", en: "No" }, value: noValue },
];

// ─────────────────────────────────────────────────────────────────────────────
// ACQUISITION — how leads reach the business
// ─────────────────────────────────────────────────────────────────────────────

const ACQUISITION: Question[] = [
  {
    id: "q_acq_01",
    category: "acquisition",
    ref: "acq_01",
    type: "single",
    weight: 2,
    text: {
      hy: "Ինչպե՞ս եք հիմա գտնում նոր հաճախորդներ",
      ru: "Как вы сейчас получаете новые лиды?",
      en: "How do you currently acquire new leads?",
    },
    evidencePrompt: {
      hy: "Թվարկեք աղբյուրները՝ գովազդ, խորհուրդներ, միջոցառումներ և այլն",
      ru: "Перечислите источники (Meta, референсы, рекомендации…)",
      en: "List the sources (Meta, referrals, recommendations…)",
    },
    options: [
      { id: "manual", label: { hy: "Միայն անձնական կապերով և խորհուրդներով", ru: "Только вручную / сарафан", en: "Manual / word-of-mouth only" }, value: 0.1 },
      { id: "single_ch", label: { hy: "Մեկ աղբյուրից՝ ձեռքով", ru: "Один канал, ручное управление", en: "Single channel, manual" }, value: 0.35 },
      { id: "multi_ch", label: { hy: "Մի քանի առանձին աղբյուրից", ru: "Несколько каналов, не связаны", en: "Multi-channel, disconnected" }, value: 0.55 },
      { id: "multi_conn", label: { hy: "Մի քանի աղբյուրից՝ մեկ համակարգում", ru: "Несколько каналов в едином CRM", en: "Multi-channel, unified CRM" }, value: 0.8 },
      { id: "attribution", label: { hy: "Մի քանի աղբյուրից՝ արդյունքների հաշվարկով", ru: "Многоканально + атрибуция", en: "Multi-channel + attribution" }, value: 1 },
    ],
    relatedModule: "leados",
    hint: {
      hy: "Բոլոր աղբյուրները մեկտեղ տեսնելը օգնում է հասկանալ՝ որն է արդյունք տալիս։",
      ru: "Объединённые источники дают понимание, что работает.",
      en: "Unified sources let you know what actually works.",
    },
  },
  {
    id: "q_acq_02",
    category: "acquisition",
    ref: "acq_02",
    type: "yesno",
    weight: 1,
    text: {
      hy: "Նոր հայտերը կայքից ինքնաբերաբար գրանցվո՞ւմ են հաճախորդների համակարգում",
      ru: "Лиды автоматически попадают в CRM из форм?",
      en: "Does lead capture flow automatically from form → CRM?",
    },
    evidencePrompt: {
      hy: "Նշեք ինտեգրումը կամ ձեռքով քայլը",
      ru: "Укажите интеграцию или ручной шаг",
      en: "Note the integration or the manual step",
    },
    options: YES_NO(1, 0.15),
    relatedModule: "integrations",
  },
  {
    id: "q_acq_03",
    category: "acquisition",
    ref: "acq_03",
    type: "scale",
    weight: 1,
    text: {
      hy: "Որքանո՞վ եք գոհ նոր հայտերի որակից և համապատասխանությունից",
      ru: "Насколько вы довольны качеством лидов (интент и соответствие)?",
      en: "How satisfied are you with lead quality (intent + fit)?",
    },
    evidencePrompt: {
      hy: "Նշեք փոխակերպման տոկոսը կամ որակի նշանները",
      ru: "Укажите конверсию или маркеры качества",
      en: "Note the conversion % or quality markers",
    },
    scaleLabels: {
      low: { hy: "Շատ ցածր", ru: "Очень низко", en: "Very low" },
      high: { hy: "Գերազանց", ru: "Отлично", en: "Excellent" },
    },
    options: SCALE_OPTIONS,
    relatedModule: "leados",
  },
  {
    id: "q_acq_04",
    category: "acquisition",
    ref: "acq_04",
    type: "multi",
    weight: 1,
    text: {
      hy: "Հաճախորդ գտնելու ո՞ր աղբյուրներն եք օգտագործում և չափում",
      ru: "Какие каналы активны и измеряются?",
      en: "Which channels are active AND measured?",
    },
    evidencePrompt: {
      hy: "Նշեք յուրաքանչյուրի ծախսը վերջին 30 օրում",
      ru: "Укажите бюджет каждого за 30 дней",
      en: "Note the 30-day spend for each",
    },
    options: [
      { id: "meta", label: { hy: "Meta-ի գովազդ", ru: "Meta Lead Ads", en: "Meta Lead Ads" }, value: 0.7 },
      { id: "google", label: { hy: "Google-ի գովազդ", ru: "Google Ads", en: "Google Ads" }, value: 0.7 },
      { id: "organic", label: { hy: "Որոնումից բնական այցելություններ", ru: "Органика SEO", en: "Organic SEO" }, value: 0.6 },
      { id: "referral", label: { hy: "Ուղղորդումներ", ru: "Рефералы", en: "Referrals" }, value: 0.5 },
      { id: "events", label: { hy: "Միջոցառումներ", ru: "Мероприятия", en: "Events" }, value: 0.4 },
      { id: "outbound", label: { hy: "Մեր կողմից ուղիղ կապ", ru: "Outbound", en: "Outbound" }, value: 0.3 },
    ],
    relatedModule: "leados",
  },
  {
    id: "q_acq_05",
    category: "acquisition",
    ref: "acq_05",
    type: "yesno",
    weight: 1,
    text: {
      hy: "Նոր հայտին առաջին անգամ պատասխանելու համար սահմանված ժամկետ կա՞",
      ru: "Есть ли SLA на первый ответ новому лиду?",
      en: "Is there a defined SLA for first response to a new lead?",
    },
    evidencePrompt: {
      hy: "Որքա՞ն ժամանակ է կանոնակարգված",
      ru: "Какое время задано?",
      en: "What is the target response time?",
    },
    options: YES_NO(0.9, 0.2),
    relatedModule: "leados",
  },
  {
    id: "q_acq_06",
    category: "acquisition",
    ref: "acq_06",
    type: "single",
    weight: 1,
    text: {
      hy: "Ինչպե՞ս եք հաշվում մեկ նոր հաճախորդ ձեռք բերելու ծախսը",
      ru: "Как вы считаете CAC?",
      en: "How do you measure CAC?",
    },
    evidencePrompt: {
      hy: "Նշեք թիվը կամ բացակայությունը",
      ru: "Укажите число или отсутствие",
      en: "Note the number or its absence",
    },
    options: [
      { id: "none", label: { hy: "Չենք չափում", ru: "Не считаем", en: "Not measured" }, value: 0 },
      { id: "guess", label: { hy: "Մոտավոր գնահատական", ru: "На глаз", en: "Rough estimate" }, value: 0.3 },
      { id: "channel", label: { hy: "Ըստ յուրաքանչյուր աղբյուրի", ru: "По каналам", en: "Per channel" }, value: 0.7 },
      { id: "cohort", label: { hy: "Ըստ հաճախորդների խմբերի", ru: "По когортам", en: "Cohort-level" }, value: 1 },
    ],
    relatedModule: "control",
  },
  {
    id: "q_acq_07",
    category: "acquisition",
    ref: "acq_07",
    type: "scale",
    weight: 1,
    text: {
      hy: "Որքանո՞վ եք գոհ՝ նոր հայտերից քանիսն են հասնում պայմանավորված հանդիպման",
      ru: "Насколько вы довольны конверсией лид → встреча?",
      en: "How satisfied are you with lead → meeting conversion?",
    },
    evidencePrompt: {
      hy: "Նշեք տոկոսը",
      ru: "Укажите процент",
      en: "Note the percentage",
    },
    scaleLabels: {
      low: { hy: "Շատ թույլ", ru: "Очень слабо", en: "Very weak" },
      high: { hy: "Կայուն բարձր", ru: "Стабильно", en: "Consistent" },
    },
    options: SCALE_OPTIONS,
    relatedModule: "leados",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SALES — pipeline, quotes, closing
// ─────────────────────────────────────────────────────────────────────────────

const SALES: Question[] = [
  {
    id: "q_sal_01",
    category: "sales",
    ref: "sal_01",
    type: "single",
    weight: 2,
    text: {
      hy: "Ինչպե՞ս եք կառավարում վաճառքի ընթացքը",
      ru: "Как вы управляете воронкой продаж?",
      en: "How do you manage the sales pipeline?",
    },
    evidencePrompt: {
      hy: "Նշեք գործիքը",
      ru: "Укажите инструмент",
      en: "Note the tool",
    },
    options: [
      { id: "none", label: { hy: "Հիշողությամբ կամ աղյուսակով", ru: "В голове / Excel", en: "In head / Excel" }, value: 0.1 },
      { id: "sticky", label: { hy: "Թղթե նշումներով կամ էլ. փոստով", ru: "Стикеры / почта", en: "Sticky notes / email" }, value: 0.25 },
      { id: "crm_basic", label: { hy: "Հաճախորդների պարզ համակարգով", ru: "Базовый CRM", en: "Basic CRM" }, value: 0.6 },
      { id: "crm_stages", label: { hy: "Համակարգով՝ փուլերով և ժամկետներով", ru: "CRM + стадии + SLA", en: "CRM + stages + SLA" }, value: 0.85 },
      { id: "crm_forecast", label: { hy: "Համակարգով և վաճառքի կանխատեսմամբ", ru: "CRM + прогноз", en: "CRM + forecasting" }, value: 1 },
    ],
    relatedModule: "leados",
  },
  {
    id: "q_sal_02",
    category: "sales",
    ref: "sal_02",
    type: "yesno",
    weight: 1,
    text: {
      hy: "Առևտրային առաջարկների տարբերակներն ու փոփոխությունների պատմությունը պահվո՞ւմ են",
      ru: "У предложений есть версионность и история?",
      en: "Do quotes have version control + history?",
    },
    evidencePrompt: {
      hy: "Նշեք գործիքը",
      ru: "Укажите инструмент",
      en: "Note the tool",
    },
    options: YES_NO(0.9, 0.2),
    relatedModule: "quoteflow",
  },
  {
    id: "q_sal_03",
    category: "sales",
    ref: "sal_03",
    type: "yesno",
    weight: 1,
    text: {
      hy: "Առաջարկը կարելի՞ է էլեկտրոնային ստորագրությամբ ընդունել",
      ru: "Есть ли e-sign и приём предложений клиентом?",
      en: "Do quotes have e-sign + client acceptance flow?",
    },
    evidencePrompt: {
      hy: "Նշեք սպասվող միջին պտույտի ժամանակը",
      ru: "Укажите среднее время оборота",
      en: "Note the average turnaround time",
    },
    options: YES_NO(0.95, 0.25),
    relatedModule: "quoteflow",
  },
  {
    id: "q_sal_04",
    category: "sales",
    ref: "sal_04",
    type: "scale",
    weight: 1,
    text: {
      hy: "Որքանո՞վ եք գոհ հաջող գործարքների տոկոսից",
      ru: "Насколько довольны win-rate?",
      en: "How satisfied are you with win-rate?",
    },
    evidencePrompt: {
      hy: "Նշեք հաջող գործարքների տոկոսը",
      ru: "Укажите win-rate в процентах",
      en: "Note the win-rate percentage",
    },
    scaleLabels: {
      low: { hy: "Շատ ցածր", ru: "Очень низко", en: "Very low" },
      high: { hy: "Գերազանց", ru: "Отлично", en: "Excellent" },
    },
    options: SCALE_OPTIONS,
    relatedModule: "control",
  },
  {
    id: "q_sal_05",
    category: "sales",
    ref: "sal_05",
    type: "single",
    weight: 1,
    text: {
      hy: "Ինչպե՞ս եք կառավարում գնագոյացման կանոնները",
      ru: "Как вы управляете правилами ценообразования?",
      en: "How do you manage pricing rules?",
    },
    evidencePrompt: {
      hy: "Կա՞ն հաստատված գնացուցակներ",
      ru: "Есть ли price books?",
      en: "Are there price books?",
    },
    options: [
      { id: "manual", label: { hy: "Ձեռքով, անհատական", ru: "Вручную, индивидуально", en: "Manual, ad-hoc" }, value: 0.15 },
      { id: "spreadsheet", label: { hy: "Աղյուսակ", ru: "Таблица", en: "Spreadsheet" }, value: 0.4 },
      { id: "rules_basic", label: { hy: "Հիմնական կանոններ", ru: "Базовые правила", en: "Basic rules" }, value: 0.7 },
      { id: "rules_adv", label: { hy: "Գնացուցակներ, գնային մակարդակներ և հաստատումներ", ru: "Price books + уровни + согласования", en: "Price books + tiering + approvals" }, value: 1 },
    ],
    relatedModule: "quoteflow",
  },
  {
    id: "q_sal_06",
    category: "sales",
    ref: "sal_06",
    type: "yesno",
    weight: 1,
    text: {
      hy: "Կա՞ վաճառքի և սպասվող եկամտի կանխատեսում",
      ru: "Есть ли прогнозирование выручки?",
      en: "Do you have revenue forecasting in place?",
    },
    evidencePrompt: {
      hy: "Որքա՞ն է պատմական ճշգրտությունը",
      ru: "Какова историческая точность?",
      en: "What is the historical accuracy?",
    },
    options: YES_NO(0.85, 0.2),
    relatedModule: "control",
  },
  {
    id: "q_sal_07",
    category: "sales",
    ref: "sal_07",
    type: "multi",
    weight: 1,
    text: {
      hy: "Որ քայլերն են ավտոմատացված վաճառքի հոսքում",
      ru: "Какие шаги автоматизированы в воронке?",
      en: "Which sales-flow steps are automated?",
    },
    evidencePrompt: {
      hy: "Նշեք ավտոմատացման գործիքը",
      ru: "Укажите инструмент автоматизации",
      en: "Note the automation tool",
    },
    options: [
      { id: "assignment", label: { hy: "Լիդի բաշխում", ru: "Маршрутизация лида", en: "Lead routing" }, value: 0.6 },
      { id: "followups", label: { hy: "Հետևողական հիշեցումներ", ru: "Follow-up напоминания", en: "Follow-up reminders" }, value: 0.6 },
      { id: "quotes", label: { hy: "Առաջարկի գեներացում", ru: "Генерация предложения", en: "Quote generation" }, value: 0.7 },
      { id: "approvals", label: { hy: "Հաստատման հոսքեր", ru: "Согласования", en: "Approval flows" }, value: 0.7 },
      { id: "sign", label: { hy: "Էլեկտրոնային ստորագրում", ru: "E-sign поток", en: "E-sign flow" }, value: 0.6 },
    ],
    relatedModule: "automation",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// OPERATIONS — delivery, fulfillment, documents
// ─────────────────────────────────────────────────────────────────────────────

const OPERATIONS: Question[] = [
  {
    id: "q_ops_01",
    category: "operations",
    ref: "ops_01",
    type: "single",
    weight: 2,
    text: {
      hy: "Ինչպե՞ս եք մուտքագրում հաշիվների և պայմանագրերի տվյալները",
      ru: "Как вы управляете вводом документов?",
      en: "How do you manage document intake?",
    },
    evidencePrompt: {
      hy: "Քանի՞ փաստաթուղթ շաբաթական",
      ru: "Сколько документов в неделю?",
      en: "How many docs per week?",
    },
    options: [
      { id: "paper", label: { hy: "Թուղթ + ձեռքով մուտք", ru: "Бумага + ручной ввод", en: "Paper + manual entry" }, value: 0.05 },
      { id: "email", label: { hy: "Էլ. փոստ + ձեռքով պիտակավորում", ru: "Почта + ручная разметка", en: "Email + manual tagging" }, value: 0.3 },
      { id: "ocr", label: { hy: "Տեքստի ավտոմատ ճանաչում և ձեռքով ստուգում", ru: "OCR + ручная проверка", en: "OCR + manual review" }, value: 0.6 },
      { id: "auto_class", label: { hy: "Ավտոմատ դասակարգում և տվյալների դուրսբերում", ru: "Авто-классификация + extraction", en: "Auto-classify + extract" }, value: 0.85 },
      { id: "ai_review", label: { hy: "Արհեստական բանականությամբ մշակում, ստուգվում են միայն բացառությունները", ru: "AI extraction + проверка только исключений", en: "AI extraction + exception-only review" }, value: 1 },
    ],
    relatedModule: "documentflow",
  },
  {
    id: "q_ops_02",
    category: "operations",
    ref: "ops_02",
    type: "yesno",
    weight: 1,
    text: {
      hy: "Ստուգման սպասող փաստաթղթերի առանձին հերթ կա՞",
      ru: "Есть ли очередь ревью документов?",
      en: "Is there a document review queue?",
    },
    evidencePrompt: {
      hy: "Քանի՞ մարդ է ներգրավված",
      ru: "Сколько людей участвует?",
      en: "How many people are involved?",
    },
    options: YES_NO(0.85, 0.2),
    relatedModule: "documentflow",
  },
  {
    id: "q_ops_03",
    category: "operations",
    ref: "ops_03",
    type: "scale",
    weight: 1,
    text: {
      hy: "Որքա՞ն եք բավարարված առաքման ժամկետներից",
      ru: "Насколько довольны сроками исполнения заказов?",
      en: "How satisfied are you with order fulfillment timelines?",
    },
    evidencePrompt: {
      hy: "Միջին առաքման ժամանակը",
      ru: "Средний срок исполнения",
      en: "Average fulfillment time",
    },
    scaleLabels: {
      low: { hy: "Հաճախ ուշացումներ", ru: "Частые задержки", en: "Frequent delays" },
      high: { hy: "Կանոնավոր", ru: "Стабильно", en: "Reliable" },
    },
    options: SCALE_OPTIONS,
    relatedModule: "erp",
  },
  {
    id: "q_ops_04",
    category: "operations",
    ref: "ops_04",
    type: "single",
    weight: 1,
    text: {
      hy: "Ինչպե՞ս եք կառավարում պատվերները և ֆակտուրաները",
      ru: "Как вы управляете заказами и счетами?",
      en: "How do you manage orders and invoices?",
    },
    evidencePrompt: {
      hy: "Նշեք գործիքը",
      ru: "Укажите инструмент",
      en: "Note the tool",
    },
    options: [
      { id: "manual", label: { hy: "Ձեռքով կամ աղյուսակով", ru: "Вручную / Excel", en: "Manual / Excel" }, value: 0.1 },
      { id: "island", label: { hy: "Առանձին համակարգեր, չկապված", ru: "Разрозненные системы", en: "Isolated systems" }, value: 0.35 },
      { id: "erp_basic", label: { hy: "Հաշվառման հիմնական համակարգով", ru: "Базовый ERP", en: "Basic ERP" }, value: 0.65 },
      { id: "erp_integrated", label: { hy: "Հաշվառման, վճարումների և ֆինանսների մեկ համակարգով", ru: "ERP + платежи + финансы", en: "ERP + payments + finance" }, value: 0.9 },
      { id: "erp_automated", label: { hy: "Ավտոմատ հաշիվներով և վճարումների համադրմամբ", ru: "ERP + авто-счета + сверка", en: "ERP + auto-invoicing + reconciliation" }, value: 1 },
    ],
    relatedModule: "erp",
  },
  {
    id: "q_ops_05",
    category: "operations",
    ref: "ops_05",
    type: "yesno",
    weight: 1,
    text: {
      hy: "Արդյո՞ք վճարումների հետևումը միացված է ֆակտուրաներին",
      ru: "Отслеживание платежей связано со счетами?",
      en: "Is payment tracking connected to invoices?",
    },
    evidencePrompt: {
      hy: "Չվճարված ֆակտուրաների տոկոսը",
      ru: "Процент неоплаченных счетов",
      en: "Outstanding invoice %",
    },
    options: YES_NO(0.9, 0.2),
    relatedModule: "erp",
  },
  {
    id: "q_ops_06",
    category: "operations",
    ref: "ops_06",
    type: "multi",
    weight: 1,
    text: {
      hy: "Ո՞ր գործընթացների համար ունեք գրավոր քայլեր և կանոններ",
      ru: "У каких процессов есть задокументированные SOP?",
      en: "Which processes have documented SOPs?",
    },
    evidencePrompt: {
      hy: "Որտե՞ղ են պահվում",
      ru: "Где они хранятся?",
      en: "Where are they stored?",
    },
    options: [
      { id: "onboard", label: { hy: "Նոր հաճախորդի ընդունում", ru: "Онбординг клиента", en: "Client onboarding" }, value: 0.5 },
      { id: "fulfill", label: { hy: "Առաքում / իրականացում", ru: "Исполнение", en: "Fulfillment" }, value: 0.5 },
      { id: "billing", label: { hy: "Ֆակտուրացում", ru: "Выставление счетов", en: "Billing" }, value: 0.5 },
      { id: "support", label: { hy: "Աջակցում", ru: "Поддержка", en: "Support" }, value: 0.5 },
      { id: "offboard", label: { hy: "Հաճախորդի դուրս գալ", ru: "Офбординг", en: "Offboarding" }, value: 0.5 },
    ],
    relatedModule: "control",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DATA — quality, governance, integration
// ─────────────────────────────────────────────────────────────────────────────

const DATA: Question[] = [
  {
    id: "q_dat_01",
    category: "data",
    ref: "dat_01",
    type: "single",
    weight: 2,
    text: {
      hy: "Որքա՞ն է ձեր տվյալները միացված մեկ աղբյուրում",
      ru: "Насколько ваши данные объединены в едином источнике?",
      en: "How unified is your data in a single source of truth?",
    },
    evidencePrompt: {
      hy: "Քանի՞ համակարգ է պարունակում հաճախորդների տվյալներ",
      ru: "В скольких системах хранятся данные клиентов?",
      en: "How many systems hold customer data?",
    },
    options: [
      { id: "silos", label: { hy: "Ամբողջությամբ մեկուսացված", ru: "Полностью разрознены", en: "Fully siloed" }, value: 0.05 },
      { id: "partial", label: { hy: "Մասամբ միացված", ru: "Частично объединены", en: "Partially unified" }, value: 0.4 },
      { id: "central", label: { hy: "Կենտրոնական պահեստ + կրկնօրինակներ", ru: "Центральное хранилище + дубликаты", en: "Central store + duplicates" }, value: 0.65 },
      { id: "ssot", label: { hy: "Տվյալների մեկ վստահելի աղբյուր", ru: "Единый источник (SSOT)", en: "Single source of truth" }, value: 0.9 },
      { id: "governed", label: { hy: "Մեկ վստահելի աղբյուր՝ հստակ կանոններով և պատմությամբ", ru: "SSOT + governance + lineage", en: "SSOT + governance + lineage" }, value: 1 },
    ],
    relatedModule: "erp",
  },
  {
    id: "q_dat_02",
    category: "data",
    ref: "dat_02",
    type: "scale",
    weight: 1,
    text: {
      hy: "Որքա՞ն եք բավարարված տվյալների որակից (ճշգրտություն, թարմություն)",
      ru: "Насколько вы довольны качеством данных?",
      en: "How satisfied are you with data quality (accuracy + freshness)?",
    },
    evidencePrompt: {
      hy: "Մոտավոր սխալների տոկոսը",
      ru: "Оценка процента ошибок",
      en: "Estimated error %",
    },
    scaleLabels: {
      low: { hy: "Շատ սխալներ", ru: "Много ошибок", en: "Many errors" },
      high: { hy: "Հուսալի", ru: "Надёжно", en: "Trustworthy" },
    },
    options: SCALE_OPTIONS,
    relatedModule: "control",
  },
  {
    id: "q_dat_03",
    category: "data",
    ref: "dat_03",
    type: "yesno",
    weight: 1,
    text: {
      hy: "Հաճախորդների տվյալները մաքրելու և կրկնվող գրառումները միացնելու կարգ կա՞",
      ru: "Есть ли процесс очистки и дедупликации клиентов?",
      en: "Is there a customer dedup/cleansing process?",
    },
    evidencePrompt: {
      hy: "Որքա՞ն հաճախականությամբ",
      ru: "Как часто?",
      en: "How often?",
    },
    options: YES_NO(0.8, 0.2),
    relatedModule: "erp",
  },
  {
    id: "q_dat_04",
    category: "data",
    ref: "dat_04",
    type: "multi",
    weight: 1,
    text: {
      hy: "Որ ինտեգրումներն են ակտիվ",
      ru: "Какие интеграции активны?",
      en: "Which integrations are active?",
    },
    evidencePrompt: {
      hy: "Նշեք ծրագրերի միջև կապի կամ արտաքին ծանուցման տեսակը",
      ru: "Укажите тип API / webhook",
      en: "Note API / webhook type",
    },
    options: [
      { id: "crm_erp", label: { hy: "Հաճախորդների համակարգ ↔ հաշվառման համակարգ", ru: "CRM ↔ ERP", en: "CRM ↔ ERP" }, value: 0.7 },
      { id: "marketing", label: { hy: "Մարքեթինգային ալիք", ru: "Маркетинговый канал", en: "Marketing channel" }, value: 0.6 },
      { id: "finance", label: { hy: "Ֆինանսներ / հաշվապահություն", ru: "Финансы / бухгалтерия", en: "Finance / accounting" }, value: 0.7 },
      { id: "messengers", label: { hy: "Telegram / WhatsApp", ru: "Telegram / WhatsApp", en: "Telegram / WhatsApp" }, value: 0.5 },
      { id: "shipping", label: { hy: "Առաքման գործընկեր", ru: "Партнёр по доставке", en: "Shipping partner" }, value: 0.5 },
    ],
    relatedModule: "integrations",
  },
  {
    id: "q_dat_05",
    category: "data",
    ref: "dat_05",
    type: "single",
    weight: 1,
    text: {
      hy: "Ինչպե՞ս եք կառավարում մուտքի իրավունքները տվյալներին",
      ru: "Как вы управляете доступом к данным?",
      en: "How do you manage data access?",
    },
    evidencePrompt: {
      hy: "Կա՞ մեկ ընդհանուր մուտք և դերերով հասանելիություն",
      ru: "Есть ли SSO, роли?",
      en: "Is there SSO, roles?",
    },
    options: [
      { id: "shared", label: { hy: "Համատեղ հաշիվներ", ru: "Общие аккаунты", en: "Shared accounts" }, value: 0.1 },
      { id: "per_user", label: { hy: "Անձնական մուտք՝ առանց դերերի", ru: "Per-user, без ролей", en: "Per-user, no roles" }, value: 0.4 },
      { id: "rbac", label: { hy: "Մուտքի իրավունքներ ըստ դերի", ru: "Ролевая модель (RBAC)", en: "Role-based (RBAC)" }, value: 0.75 },
      { id: "sso_rbac", label: { hy: "Մեկ մուտք, դերեր և գործողությունների պատմություն", ru: "SSO + RBAC + аудит", en: "SSO + RBAC + audit log" }, value: 1 },
    ],
    relatedModule: "control",
  },
  {
    id: "q_dat_06",
    category: "data",
    ref: "dat_06",
    type: "yesno",
    weight: 1,
    text: {
      hy: "Արդյո՞ք կա տվյալների պահուստավորման և վերականգնման ծրագիր",
      ru: "Есть ли план резервного копирования и восстановления?",
      en: "Is there a data backup + recovery plan?",
    },
    evidencePrompt: {
      hy: "Որքա՞ն հաճախականությամբ և որտեղ",
      ru: "Как часто и где?",
      en: "How often and where?",
    },
    options: YES_NO(0.85, 0.2),
    relatedModule: "control",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// AUTOMATION — workflow engine, approvals
// ─────────────────────────────────────────────────────────────────────────────

const AUTOMATION: Question[] = [
  {
    id: "q_aut_01",
    category: "automation",
    ref: "aut_01",
    type: "single",
    weight: 2,
    text: {
      hy: "Ինչպե՞ս եք ավտոմատացնում կրկնվող գործընթացները",
      ru: "Как вы автоматизируете повторяющиеся процессы?",
      en: "How do you automate repeatable processes?",
    },
    evidencePrompt: {
      hy: "Քանի՞ ակտիվ ավտոմատացում ունեք",
      ru: "Сколько активных автоматизаций?",
      en: "How many active automations?",
    },
    options: [
      { id: "none", label: { hy: "Չունենք", ru: "Нет", en: "None" }, value: 0.05 },
      { id: "scripts", label: { hy: "Առանձին փոքր ծրագրեր", ru: "Ad-hoc скрипты", en: "Ad-hoc scripts" }, value: 0.3 },
      { id: "islands", label: { hy: "Առանձին գործիքներ (Zapier կամ այլն)", ru: "Отдельные инструменты (Zapier и т.д.)", en: "Point tools (Zapier etc.)" }, value: 0.55 },
      { id: "engine", label: { hy: "Ավտոմատացման շարժիչ + հաստատումներ", ru: "Движок + согласования", en: "Engine + approvals" }, value: 0.85 },
      { id: "governed", label: { hy: "Կենտրոնացված համակարգ՝ կրկնափորձերով, պատմությամբ և վերահսկմամբ", ru: "Движок + retries + аудит", en: "Engine + retries + audit + observability" }, value: 1 },
    ],
    relatedModule: "automation",
  },
  {
    id: "q_aut_02",
    category: "automation",
    ref: "aut_02",
    type: "yesno",
    weight: 1,
    text: {
      hy: "Ռիսկային գործողություններից առաջ պարտադիր հաստատում կա՞",
      ru: "Есть ли approval-потоки для рискованных действий?",
      en: "Are there approval flows for risky actions?",
    },
    evidencePrompt: {
      hy: "Որ գործողություններն են պահանջում հաստատում",
      ru: "Какие действия требуют approval?",
      en: "Which actions require approval?",
    },
    options: YES_NO(0.9, 0.2),
    relatedModule: "automation",
  },
  {
    id: "q_aut_03",
    category: "automation",
    ref: "aut_03",
    type: "scale",
    weight: 1,
    text: {
      hy: "Որքա՞ն եք բավարարված ավտոմատացումների հուսալիությունից",
      ru: "Насколько вы довольны надёжностью автоматизаций?",
      en: "How satisfied are you with automation reliability?",
    },
    evidencePrompt: {
      hy: "Չհաջողված գործարքների տոկոսը",
      ru: "Процент неудачных запусков",
      en: "Failed run %",
    },
    scaleLabels: {
      low: { hy: "Հաճախ խափանումներ", ru: "Частые сбои", en: "Frequent failures" },
      high: { hy: "Կայուն", ru: "Стабильно", en: "Stable" },
    },
    options: SCALE_OPTIONS,
    relatedModule: "automation",
  },
  {
    id: "q_aut_04",
    category: "automation",
    ref: "aut_04",
    type: "multi",
    weight: 1,
    text: {
      hy: "Որ ավտոմատացումներն են արդեն գործարկվում",
      ru: "Какие автоматизации уже запускаются?",
      en: "Which automations are already running?",
    },
    evidencePrompt: {
      hy: "Նշեք ամսական գործարքների քանակը",
      ru: "Укажите число запусков в месяц",
      en: "Note monthly run count",
    },
    options: [
      { id: "lead_routing", label: { hy: "Լիդի բաշխում", ru: "Маршрутизация лидов", en: "Lead routing" }, value: 0.5 },
      { id: "followups", label: { hy: "Հետևողական հիշեցումներ", ru: "Follow-up напоминания", en: "Follow-up reminders" }, value: 0.5 },
      { id: "quote_gen", label: { hy: "Առաջարկի գեներացում", ru: "Генерация предложений", en: "Quote generation" }, value: 0.6 },
      { id: "doc_class", label: { hy: "Փաստաթղթերի դասակարգում", ru: "Классификация документов", en: "Document classification" }, value: 0.6 },
      { id: "billing", label: { hy: "Ֆակտուրացման ավտոմատ", ru: "Авто-выставление счетов", en: "Automated billing" }, value: 0.6 },
    ],
    relatedModule: "automation",
  },
  {
    id: "q_aut_05",
    category: "automation",
    ref: "aut_05",
    type: "yesno",
    weight: 1,
    text: {
      hy: "Ավտոմատացումների աշխատանքն ու սխալները տեսնելու ամբողջական պատմություն կա՞",
      ru: "Есть ли история запусков и observability?",
      en: "Is there automation execution history + observability?",
    },
    evidencePrompt: {
      hy: "Որքա՞ն ժամանակ պահվում է պատմությունը",
      ru: "Сколько хранится история?",
      en: "How long is history retained?",
    },
    options: YES_NO(0.85, 0.2),
    relatedModule: "automation",
  },
  {
    id: "q_aut_06",
    category: "automation",
    ref: "aut_06",
    type: "single",
    weight: 1,
    text: {
      hy: "Ինչպե՞ս եք կանխում ավտոմատացման անվերջ կրկնվելը կամ ինքն իրեն նորից գործարկելը",
      ru: "Как вы управляете loop / reentry рисками?",
      en: "How do you manage loop / reentry risks in automations?",
    },
    evidencePrompt: {
      hy: "Կա՞ կրկնվող գործարկումները բացառող բանալի և կանոն",
      ru: "Есть ли dedup-key политика?",
      en: "Is there a dedup-key policy?",
    },
    options: [
      { id: "none", label: { hy: "Չկա", ru: "Нет", en: "None" }, value: 0.1 },
      { id: "manual", label: { hy: "Ձեռքով ստուգում", ru: "Ручная проверка", en: "Manual check" }, value: 0.3 },
      { id: "basic", label: { hy: "Կրկնությունների պարզ արգելք և քայլերի սահման", ru: "Базовый dedup + maxDepth", en: "Basic dedup + maxDepth" }, value: 0.7 },
      { id: "governed", label: { hy: "Կրկնությունների արգելք, քայլերի սահման, վերագործարկման կանոն և պատմություն", ru: "Dedup + maxDepth + reentry + аудит", en: "Dedup + maxDepth + reentry + audit" }, value: 1 },
    ],
    relatedModule: "automation",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// AI READINESS — strategy, hygiene, use cases
// ─────────────────────────────────────────────────────────────────────────────

const AI_READINESS: Question[] = [
  {
    id: "q_ai_01",
    category: "ai_readiness",
    ref: "ai_01",
    type: "single",
    weight: 2,
    text: {
      hy: "Ձեր թիմն ամենօրյա աշխատանքում որքանո՞վ է օգտագործում արհեստական բանականության գործիքներ",
      ru: "Насколько ваша команда применяет AI в операционной работе?",
      en: "How much does your team use AI tools in operational work?",
    },
    evidencePrompt: {
      hy: "Որ գործիքներն են կիրառվում",
      ru: "Какие инструменты используются?",
      en: "Which tools are in use?",
    },
    options: [
      { id: "none", label: { hy: "Չի կիրառվում", ru: "Не используется", en: "Not used" }, value: 0.05 },
      { id: "personal", label: { hy: "Անհատական, ոչ կազմակերպված", ru: "Индивидуально, неорганизованно", en: "Personal, ad-hoc" }, value: 0.3 },
      { id: "team", label: { hy: "Թիմային մակարդակում, սակայն առանց քաղաքականության", ru: "На уровне команды, без политики", en: "Team-level, no policy" }, value: 0.55 },
      { id: "policy", label: { hy: "Թիմ + կազմակերպության քաղաքականություն", ru: "Команда + корпоративная политика", en: "Team + org policy" }, value: 0.85 },
      { id: "embedded", label: { hy: "Ներկառուցված աշխատանքային հոսքերում", ru: "Встроено в рабочие процессы", en: "Embedded in workflows" }, value: 1 },
    ],
    relatedModule: "ownerAi",
  },
  {
    id: "q_ai_02",
    category: "ai_readiness",
    ref: "ai_02",
    type: "yesno",
    weight: 1,
    text: {
      hy: "Արհեստական բանականություն օգտագործելու և տվյալները պաշտպանելու հստակ կանոններ կա՞ն",
      ru: "Есть ли политика использования AI (защита данных)?",
      en: "Is there an AI usage policy (data leakage prevention)?",
    },
    evidencePrompt: {
      hy: "Որտե՞ղ է փաստագրված",
      ru: "Где задокументирована?",
      en: "Where is it documented?",
    },
    options: YES_NO(0.9, 0.2),
    relatedModule: "control",
  },
  {
    id: "q_ai_03",
    category: "ai_readiness",
    ref: "ai_03",
    type: "multi",
    weight: 1,
    text: {
      hy: "Արհեստական բանականության ո՞ր կիրառություններն են արդեն օգտագործվում իրական աշխատանքում",
      ru: "Какие AI-сценарии уже в продакшене?",
      en: "Which AI use-cases are already in production?",
    },
    evidencePrompt: {
      hy: "Նշեք մոդելը և ծավալը",
      ru: "Укажите модель и объём",
      en: "Note model + volume",
    },
    options: [
      { id: "extraction", label: { hy: "Փաստաթղթերի դաշտերի հանում", ru: "Извлечение полей документов", en: "Document field extraction" }, value: 0.7 },
      { id: "summarize", label: { hy: "Զրույցների/փաստաթղթերի ամփոփում", ru: "Саммаризация", en: "Summarization" }, value: 0.6 },
      { id: "drafting", label: { hy: "Առաջարկների և նամակների սևագիծ", ru: "Черновики предложений", en: "Quote/email drafting" }, value: 0.6 },
      { id: "routing", label: { hy: "Լիդերի դասակարգում / ուղղորդում", ru: "Скоринг/маршрутизация лидов", en: "Lead scoring / routing" }, value: 0.6 },
      { id: "assistant", label: { hy: "Սեփականատիրոջ խելացի օգնական", ru: "Owner-AI операционный ассистент", en: "Owner-AI ops assistant" }, value: 0.7 },
    ],
    relatedModule: "ownerAi",
  },
  {
    id: "q_ai_04",
    category: "ai_readiness",
    ref: "ai_04",
    type: "scale",
    weight: 1,
    text: {
      hy: "Որքանո՞վ եք գոհ արհեստական բանականության պատասխանների որակից",
      ru: "Насколько довольны качеством AI-выводов?",
      en: "How satisfied are you with AI output quality?",
    },
    evidencePrompt: {
      hy: "Որքա՞ն է պահանջվում վերանայում",
      ru: "Сколько требуется ревью?",
      en: "How much review is required?",
    },
    scaleLabels: {
      low: { hy: "Մեծ վերանայում", ru: "Много ревью", en: "Heavy review" },
      high: { hy: "Հուսալի ելույթներ", ru: "Надёжные выводы", en: "Reliable output" },
    },
    options: SCALE_OPTIONS,
    relatedModule: "ownerAi",
  },
  {
    id: "q_ai_05",
    category: "ai_readiness",
    ref: "ai_05",
    type: "single",
    weight: 1,
    text: {
      hy: "Ինչպե՞ս եք պահպանում և ստուգում արհեստական բանականության որոշումների պատմությունը",
      ru: "Как вы обеспечиваете traceability AI-решений?",
      en: "How do you ensure AI decision traceability?",
    },
    evidencePrompt: {
      hy: "Հրահանգների տարբերակներն ու փոփոխությունների պատմությունը պահվո՞ւմ են",
      ru: "Есть ли prompt-история, versioning?",
      en: "Is there prompt history, versioning?",
    },
    options: [
      { id: "none", label: { hy: "Չկա", ru: "Нет", en: "None" }, value: 0.1 },
      { id: "ad_hoc", label: { hy: "Առանձին, անկանոն գրառումներ", ru: "Ad-hoc записи", en: "Ad-hoc notes" }, value: 0.35 },
      { id: "logs", label: { hy: "Կանոնավոր տվյալների գրառում", ru: "Регулярное логирование", en: "Regular logging" }, value: 0.65 },
      { id: "versioned", label: { hy: "Հրահանգների ու պատասխանների տարբերակներ և ամբողջական պատմություն", ru: "Versioned prompts + outputs + аудит", en: "Versioned prompts + outputs + audit" }, value: 1 },
    ],
    relatedModule: "control",
  },
  {
    id: "q_ai_06",
    category: "ai_readiness",
    ref: "ai_06",
    type: "yesno",
    weight: 1,
    text: {
      hy: "Ռիսկային որոշումները կատարելուց առաջ մարդը պարտադի՞ր է ստուգում դրանք",
      ru: "Есть ли human-in-the-loop для рискованных AI-решений?",
      en: "Is there a human-in-the-loop for risky AI decisions?",
    },
    evidencePrompt: {
      hy: "Որ որոշումներն են պահանջում մարդկային ստուգում",
      ru: "Какие решения требуют проверки человеком?",
      en: "Which decisions require human review?",
    },
    options: YES_NO(0.9, 0.25),
    relatedModule: "automation",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Aggregate
// ─────────────────────────────────────────────────────────────────────────────

export const QUESTIONS: Question[] = [
  ...ACQUISITION,
  ...SALES,
  ...OPERATIONS,
  ...DATA,
  ...AUTOMATION,
  ...AI_READINESS,
];

export const QUESTIONS_BY_CATEGORY = {
  acquisition: ACQUISITION,
  sales: SALES,
  operations: OPERATIONS,
  data: DATA,
  automation: AUTOMATION,
  ai_readiness: AI_READINESS,
} as const;

export const QUESTION_BY_ID: Record<string, Question> = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, q]),
);

export const QUESTION_BY_REF: Record<string, Question> = Object.fromEntries(
  QUESTIONS.map((q) => [q.ref, q]),
);

export const TOTAL_QUESTIONS = QUESTIONS.length;
