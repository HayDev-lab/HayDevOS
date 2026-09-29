import type { Locale } from "@/lib/i18n";
import type {
  Approval,
  Automation,
  AutomationRun,
  AutomationTemplate,
  Schedule,
  WebhookEndpoint,
} from "./types";

const HY_TEXT: Record<string, string> = {
  "Route inbound leads by region": "Նոր հայտերը բաժանել ըստ տարածաշրջանի",
  "Round-robin assignment of new EU/CIS leads with a 4h SLA.":
    "Եվրոպայից և ԱՊՀ-ից եկած նոր հայտերը հերթով բաժանել աշխատակիցներին՝ 4 ժամ պատասխանելու ժամկետով։",
  "Auto-generate quote from qualified lead": "Որակավորված հայտից ինքնաշխատ առաջարկ ստեղծել",
  "When a lead turns qualified and is worth ≥ $10K, draft a quote.":
    "Երբ հայտը որակավորվում է և արժե առնվազն 10 հազար դոլար, ստեղծել առաջարկի սևագիր։",
  "Escalate SLA breaches to owner": "Պատասխանի ուշացման մասին հայտնել սեփականատիրոջը",
  "Notify the org owner when any open lead breaches response SLA.":
    "Սեփականատիրոջը հայտնել, երբ բաց հայտի պատասխանի ժամկետն անցնում է։",
  "SLA breach auto-escalated to owner.": "Պատասխանի ուշացման մասին ինքնաշխատ հայտնվել է սեփականատիրոջը։",
  "Classify & extract uploaded documents": "Դասակարգել և կարդալ բեռնված փաստաթղթերը",
  "Classify & extract documents": "Դասակարգել և կարդալ փաստաթղթերը",
  "Run DocSmart pipeline on every new PDF/image upload.":
    "Յուրաքանչյուր նոր PDF կամ նկար բեռնելիս գործարկել DocSmart-ի մշակումը։",
  "Invoice on quote accepted": "Ընդունված առաջարկից հաշիվ ստեղծել",
  "When a quote worth ≥ $1K is accepted, draft an invoice and notify finance.":
    "Առնվազն 1 հազար դոլարի առաջարկն ընդունվելուց հետո ստեղծել հաշվի սևագիր և հայտնել ֆինանսների բաժնին։",
  "Weekly pipeline digest (Mon 9:00)": "Վաճառքի շաբաթական ամփոփում՝ երկուշաբթի 09:00-ին",
  "Email a Monday-morning pipeline snapshot to owners and reps.":
    "Երկուշաբթի առավոտյան վաճառքի պատկերը էլ. փոստով ուղարկել սեփականատերերին և վաճառքի աշխատակիցներին։",
  "Notify Slack on big deal won": "Մեծ գործարքի հաղթանակի մասին հայտնել Slack-ում",
  "Celebrate any deal ≥ $100K won — posts to #wins.":
    "Առնվազն 100 հազար դոլարի շահած գործարքի մասին գրառում անել Slack-ի #wins ալիքում։",
  "Approval gate — discounts > 15%": "Հաստատում պահանջել 15%-ից բարձր զեղչի դեպքում",
  "Block quote acceptance on high-discount deals pending owner approval.":
    "Մեծ զեղչով առաջարկը չընդունել, մինչև սեփականատերը չհաստատի։",
  "Re-engage cold leads (no activity 14d)": "Կրկին կապվել 14 օր անգործ հայտերի հետ",
  "Daily sweep — enqueue a re-engage email for leads silent ≥ 14 days.":
    "Ամեն օր գտնել առնվազն 14 օր լուռ մնացած հայտերը և հերթագրել կրկին կապվելու նամակ։",
  "Cold-lead re-engagement queued.": "Անգործ հայտի հետ կրկին կապվելը հերթագրված է։",

  "Auto-assign new leads by source": "Նոր հայտերն ինքնաշխատ բաժանել ըստ աղբյուրի",
  "Round-robin assign every new lead to a regional rep based on its source channel.":
    "Յուրաքանչյուր նոր հայտ հերթով տալ համապատասխան տարածաշրջանի աշխատակցին՝ ըստ աղբյուրի։",
  "Follow-up reminder 3 days after no response": "Հիշեցնել կրկին կապվել, եթե 3 օր պատասխան չկա",
  "Daily sweep — if a lead has been silent for 3+ days, enqueue a follow-up task for the owner.":
    "Ամեն օր գտնել 3 օրից ավելի լուռ մնացած հայտերը և սեփականատիրոջ համար կապվելու առաջադրանք ստեղծել։",
  "Notify on high-value quote accepted": "Հայտնել մեծ արժեքով առաջարկի ընդունման մասին",
  "When a quote ≥ $50K is accepted, post a win to Slack #wins and email the owner.":
    "Առնվազն 50 հազար դոլարի առաջարկն ընդունվելիս գրել Slack-ի #wins ալիքում և նամակ ուղարկել սեփականատիրոջը։",
  "Start document workflow on contract upload": "Պայմանագիր բեռնելիս սկսել փաստաթղթի մշակումը",
  "On any contract-classified upload, kick off the DocSmart review + AI extraction pipeline.":
    "Որպես պայմանագիր դասակարգված ֆայլ բեռնելիս սկսել DocSmart-ի ստուգումն ու AI տվյալների հանումը։",
  "Daily cold-lead re-engagement": "Ամեն օր կրկին կապվել անգործ հայտերի հետ",
  "Sweep leads silent ≥ 14d (not won/lost), enqueue a templated re-engage email.":
    "Գտնել առնվազն 14 օր լուռ մնացած բաց հայտերը և հերթագրել կրկին կապվելու պատրաստի նամակ։",
  "Owner AI digest every morning": "Owner AI-ի ամփոփումն ամեն առավոտ",
  "Run the Owner AI agent at 8:00 to summarise overnight pipeline movement and risks.":
    "Ժամը 08:00-ին գործարկել Owner AI-ը՝ գիշերվա վաճառքի փոփոխություններն ու վտանգներն ամփոփելու համար։",
  "Summarise overnight pipeline + risks.": "Ամփոփիր գիշերվա վաճառքի փոփոխություններն ու վտանգները։",
  "Telegram alert on SLA breach": "Telegram ծանուցում պատասխանի ժամկետն անցնելիս",
  "Notify the owner via Telegram whenever any open lead breaches SLA.":
    "Telegram-ով հայտնել սեփականատիրոջը, երբ որևէ բաց հայտի պատասխանի ժամկետն անցնում է։",
  "Auto-invoice on quote accepted": "Առաջարկն ընդունվելիս ինքնաշխատ հաշիվ ստեղծել",
  "When a quote ≥ $1K is accepted, draft an invoice and email finance for review.":
    "Առնվազն 1 հազար դոլարի առաջարկն ընդունվելիս ստեղծել հաշվի սևագիր և ուղարկել ֆինանսների բաժնին՝ ստուգման։",
  "Follow up with {lead.name}": "Կրկին կապվել {lead.name}-ի հետ",

  "Lead created (web/inbound)": "Նոր հայտ է ստեղծվել (կայք/մուտքային)",
  "Document uploaded (application/pdf)": "PDF փաստաթուղթ է բեռնվել",
  "Document uploaded (image/png)": "PNG նկար է բեռնվել",
  "Lead stage changed → qualified": "Հայտի փուլը փոխվել է → որակավորված",
  "Lead stage changed → won": "Հայտի փուլը փոխվել է → շահած",
  "Quote accepted": "Առաջարկն ընդունվել է",
  "Schedule fired (*/5 * * * *)": "Ժամանակացույցը գործել է (*/5 * * * *)",
  "lead.region in [EU, CIS]": "հայտի տարածաշրջանը՝ Եվրոպա կամ ԱՊՀ",
  "lead.value > 10000": "հայտի արժեքը 10 000-ից մեծ է",
  "lead.value > 100000": "հայտի արժեքը 100 000-ից մեծ է",
  "quote.total > 1000": "առաջարկի գումարը 1 000-ից մեծ է",
  "quote.discountPct > 15": "առաջարկի զեղչը 15%-ից բարձր է",
  "lead.slaBreached equals true": "պատասխանի ժամկետն անցել է",
  "assign_lead (round_robin)": "հայտը հերթով նշանակել աշխատակցին",
  "schedule_followup (+4h)": "կրկին կապվել 4 ժամից",
  "start_document_workflow (docsmart-v2)": "սկսել DocSmart-ի փաստաթղթի մշակումը",
  "create_quote (approval required)": "ստեղծել առաջարկ՝ հաստատումից հետո",
  "send_webhook (#wins)": "ուղարկել Slack-ի #wins ալիք",
  "update_field (invoice.status = draft)": "հաշվի վիճակը դարձնել սևագիր",
  "send_email (finance@haydev.os)": "նամակ ուղարկել finance@haydev.os հասցեին",
  "send_notification (usr_owner)": "ծանուցել սեփականատիրոջը",
  "send_notification (usr_reviewer)": "ծանուցել ստուգողին",
  "update_field (quote.approvalRequired = true)": "առաջարկի համար հաստատում պահանջել",
  "send_telegram (@haydev-owner)": "Telegram հաղորդագրություն ուղարկել սեփականատիրոջը",

  "docsmart-v2 did not respond within 4s": "DocSmart-ը 4 վայրկյանում չի պատասխանել",
  "model_timeout: docsmart-v2 did not respond within 4s":
    "ժամանակը սպառվել է․ DocSmart-ը 4 վայրկյանում չի պատասխանել",
  "telegram_api: 401 Unauthorized — bot token revoked":
    "Telegram-ի կապը մերժվել է․ բոտի բանալին այլևս չի գործում",
  "Conditions evaluated false — no actions executed.":
    "Պայմանները չեն բավարարվել․ որևէ գործողություն չի կատարվել։",
  "Operator cancelled the run mid-flight.": "Աշխատակիցը դադարեցրել է ընթացիկ գործարկումը։",
  "cancelled_by_operator: user aborted before retry":
    "աշխատակիցը դադարեցրել է մինչև կրկին փորձելը",
  "Owner did not approve within 24h — approval expired.":
    "Սեփականատերը 24 ժամում չի հաստատել․ սպասման ժամկետն անցել է։",
  "approval_expired: owner did not respond within 24h":
    "հաստատման ժամկետն անցել է․ սեփականատերը 24 ժամում չի պատասխանել",

  "Automation engine": "Ավտոմատացման համակարգ",
  "Looks great — celebrate!": "Ամեն ինչ կարգին է՝ կարելի է նշել հաղթանակը։",
  "Expired — owner did not respond within 24h.":
    "Ժամկետն անցել է․ սեփականատերը 24 ժամում չի պատասխանել։",
  "False positive — lead was a duplicate.": "Սխալ ազդանշան էր․ հայտը կրկնօրինակ էր։",
  "Slack #wins": "Slack-ի հաղթանակների ալիք",
  "Zapier outbound": "Zapier-ի ելքային կապ",
  "Internal billing pipeline": "Ներքին վճարային հոսք",
  "Partner webhook — Acme": "Գործընկերային արտաքին կանչ — Acme",
  "lead.won": "հայտը շահած է",
  "quote.accepted": "առաջարկն ընդունվել է",
  "lead.created": "հայտը ստեղծվել է",
  "document.uploaded": "փաստաթուղթը բեռնվել է",
  "invoice.created": "հաշիվը ստեղծվել է",
  "payment.received": "վճարումը ստացվել է",

  "Upstream auth/token revoked": "Միացման բանալին այլևս չի գործում",
  "Model timeout": "Մոդելը ժամանակին չի պատասխանել",
  "Approval expired": "Հաստատման ժամկետն անցել է",
  "Condition not met": "Պայմանը չի բավարարվել",
  "Webhook delivery failed": "Արտաքին կանչը չի առաքվել",
  "Cancelled by operator": "Աշխատակիցը չեղարկել է",
  model_timeout: "Մոդելը ժամանակին չի պատասխանել",
  upstream_auth: "Միացման բանալին այլևս չի գործում",
  condition_not_met: "Պայմանը չի բավարարվել",
  cancelled_by_operator: "Աշխատակիցը չեղարկել է",
  approval_expired: "Հաստատման ժամկետն անցել է",
  "Auto-generate quote (qualified)": "Որակավորված հայտից առաջարկ ստեղծել",
  Wed: "Չրք",
  Thu: "Հնգ",
  Fri: "Ուրբ",
  Sat: "Շբթ",
  Sun: "Կիր",
  Mon: "Երկ",
  Tue: "Երք",
  web: "կայք",
  inbound: "մուտքային",
  qualified: "որակավորված",
  won: "շահած",
  contacted: "կապ հաստատված",
  draft: "սևագիր",
  invoice: "հաշիվ",
  lead_created: "Նոր հայտ է ստեղծվել",
  lead_stage_changed: "Հայտի փուլը փոխվել է",
  task_due: "Առաջադրանքի ժամկետը մոտեցել է",
  quote_sent: "Առաջարկն ուղարկվել է",
  quote_accepted: "Առաջարկն ընդունվել է",
  document_uploaded: "Փաստաթուղթ է բեռնվել",
  document_approved: "Փաստաթուղթը հաստատվել է",
  manual: "Ձեռքով գործարկում",
  schedule: "Ժամանակացույցով",
  webhook: "Արտաքին կանչով",
  equals: "հավասար է",
  not_equals: "հավասար չէ",
  contains: "պարունակում է",
  gt: "մեծ է",
  lt: "փոքր է",
  in: "ցանկում է",
  between: "միջակայքում է",
  create_task: "Ստեղծել առաջադրանք",
  assign_lead: "Նշանակել հայտի պատասխանատու",
  set_priority: "Սահմանել կարևորությունը",
  add_note: "Ավելացնել նշում",
  schedule_followup: "Ժամանակ նշանակել կրկին կապվելու համար",
  send_notification: "Ուղարկել ծանուցում",
  send_email: "Ուղարկել էլ. նամակ",
  send_telegram: "Ուղարկել Telegram հաղորդագրություն",
  send_webhook: "Ուղարկել արտաքին կանչ",
  create_quote: "Ստեղծել առաջարկ",
  start_document_workflow: "Սկսել փաստաթղթի մշակումը",
  run_ai_agent: "Գործարկել AI օգնականը",
  update_field: "Փոխել դաշտը",
  delivered: "Առաքված",
  failed: "Ձախողված",
  pending: "Սպասում է",
  "<5m": "<5 ր",
  "5–30m": "5–30 ր",
  "30m–2h": "30 ր–2 ժ",
  "2–8h": "2–8 ժ",
  ">8h": ">8 ժ",
};

const HY_PAYLOAD_KEYS: Record<string, string> = {
  leadId: "հայտի_համար",
  quoteId: "առաջարկի_համար",
  docId: "փաստաթղթի_համար",
  invoiceId: "հաշվի_համար",
  approvalId: "հաստատման_համար",
  notificationId: "ծանուցման_համար",
  messageId: "հաղորդագրության_համար",
  source: "աղբյուր",
  matched: "համապատասխանում_է",
  region: "տարածաշրջան",
  pool: "աշխատակիցների_խումբ",
  assignee: "պատասխանատու",
  delayHours: "սպասման_ժամեր",
  scheduledFor: "նախատեսված_ժամանակ",
  mime: "ֆայլի_տեսակ",
  model: "մոդել",
  extractFields: "հանել_դաշտերը",
  to: "ստացող_կամ_նոր_վիճակ",
  value: "արժեք",
  template: "կաղապար",
  currency: "արժույթ",
  endpoint: "առաքման_հասցե",
  delivered: "առաքված_է",
  httpStatus: "HTTP_վիճակ",
  total: "ընդհանուր_գումար",
  entity: "գրառման_տեսակ",
  field: "դաշտ",
  discountPct: "զեղչի_տոկոս",
  channel: "ուղարկման_ուղի",
  cron: "ժամանակացույց",
  slaBreached: "պատասխանի_ժամկետն_անցել_է",
  chatId: "զրույցի_համար",
  classification: "դասակարգում",
  confidence: "վստահություն",
  stage: "փուլ",
};

const HY_PARTS: Array<[string, string]> = [
  ["create_quote", "ստեղծել առաջարկ"],
  ["send_webhook", "արտաքին կանչ ուղարկել"],
  ["send_email", "էլ. նամակ ուղարկել"],
  ["update_field", "փոխել դաշտը"],
  ["send_telegram", "Telegram հաղորդագրություն ուղարկել"],
];

export function localizeAutomationText(value: string, locale: Locale): string {
  if (locale !== "hy") return value;
  const exact = HY_TEXT[value];
  if (exact) return exact;
  return HY_PARTS.reduce(
    (translated, [source, replacement]) => translated.replaceAll(source, replacement),
    value,
  );
}

function localizeValue(value: unknown, locale: Locale): unknown {
  if (typeof value === "string") return localizeAutomationText(value, locale);
  if (Array.isArray(value)) return value.map((item) => localizeValue(item, locale));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, localizeValue(item, locale)]),
    );
  }
  return value;
}

function localizeDisplayValue(value: unknown, locale: Locale): unknown {
  if (typeof value === "string") return localizeAutomationText(value, locale);
  if (Array.isArray(value)) return value.map((item) => localizeDisplayValue(item, locale));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        locale === "hy" ? (HY_PAYLOAD_KEYS[key] ?? key) : key,
        localizeDisplayValue(item, locale),
      ]),
    );
  }
  return value;
}

function localizeTriggerSource(value: string, locale: Locale): string {
  const [eventType, ...details] = value.split(" · ");
  const localizedType = localizeAutomationText(eventType, locale);
  return details.length > 0 ? `${localizedType} · ${details.join(" · ")}` : localizedType;
}

export function localizeAutomation(item: Automation, locale: Locale): Automation {
  return {
    ...item,
    name: localizeAutomationText(item.name, locale),
    description: item.description
      ? localizeAutomationText(item.description, locale)
      : item.description,
    trigger: { ...item.trigger, config: localizeValue(item.trigger.config, locale) as Record<string, unknown> },
    actions: item.actions.map((action) => ({
      ...action,
      config: localizeValue(action.config, locale) as Record<string, unknown>,
    })),
  };
}

export function localizeAutomationRun(item: AutomationRun, locale: Locale): AutomationRun {
  return {
    ...item,
    automationName: localizeAutomationText(item.automationName, locale),
    triggerSource: localizeTriggerSource(item.triggerSource, locale),
    errorType: item.errorType
      ? localizeAutomationText(item.errorType, locale)
      : item.errorType,
    errorMessage: item.errorMessage
      ? localizeAutomationText(item.errorMessage, locale)
      : item.errorMessage,
    steps: item.steps.map((step) => ({
      ...step,
      label: localizeAutomationText(step.label, locale),
      error: step.error ? localizeAutomationText(step.error, locale) : step.error,
      input: localizeDisplayValue(step.input, locale) as Record<string, unknown>,
      output: localizeDisplayValue(step.output, locale) as Record<string, unknown>,
    })),
  };
}

export function localizeAutomationTemplate(
  item: AutomationTemplate,
  locale: Locale,
): AutomationTemplate {
  return {
    ...item,
    name: localizeAutomationText(item.name, locale),
    description: localizeAutomationText(item.description, locale),
    trigger: { ...item.trigger, config: localizeValue(item.trigger.config, locale) as Record<string, unknown> },
    actions: item.actions.map((action) => ({
      ...action,
      config: localizeValue(action.config, locale) as Record<string, unknown>,
    })),
  };
}

export function localizeApproval(item: Approval, locale: Locale): Approval {
  return {
    ...item,
    automationName: localizeAutomationText(item.automationName, locale),
    actionLabel: localizeAutomationText(item.actionLabel, locale),
    requestedBy: localizeAutomationText(item.requestedBy, locale),
    notes: item.notes ? localizeAutomationText(item.notes, locale) : item.notes,
    contextSnapshot: localizeDisplayValue(item.contextSnapshot, locale) as Record<string, unknown>,
  };
}

export function localizeSchedule(item: Schedule, locale: Locale): Schedule {
  return {
    ...item,
    automationName: localizeAutomationText(item.automationName, locale),
  };
}

export function localizeWebhook(item: WebhookEndpoint, locale: Locale): WebhookEndpoint {
  return {
    ...item,
    name: localizeAutomationText(item.name, locale),
    eventTypes: item.eventTypes.map((event) => localizeAutomationText(event, locale)),
  };
}
