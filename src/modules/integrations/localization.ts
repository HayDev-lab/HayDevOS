import type { Locale } from "@/lib/i18n";
import type { Provider } from "./types";

/**
 * Provider copy lives next to the integration catalog data because it is
 * domain content rather than reusable application chrome. Canonical provider
 * records remain language-neutral; this helper creates a display-only copy.
 */
const HY_PROVIDER_NAMES: Record<string, string> = {
  facebook: "Facebook Pages",
  instagram: "Instagram Professional",
  email: "Էլ. փոստ (SMTP/IMAP)",
  signed_webhook: "Ստորագրված վեբ ծանուցում",
  automation: "Ավտոմատացման կառուցիչ",
};

const HY_PROVIDER_DESCRIPTIONS: Record<string, string> = {
  facebook:
    "Facebook-ի էջերի հայտեր, Messenger-ի նամակներ, հրապարակումներ և փոխարկումներ։ Մուտքը՝ պաշտոնական Meta OAuth 2.0-ով։",
  instagram:
    "Instagram Professional-ի հրապարակումներ, մեկնաբանություններ, նամակներ և վիճակագրություն։ Մուտքը՝ պաշտոնական Meta OAuth 2.0-ով։",
  meta:
    "Facebook-ի և Instagram-ի հայտեր, Messenger-ի նամակներ ու գովազդային լսարաններ։ Անվտանգ մուտք՝ OAuth 2.0 և PKCE։",
  telegram:
    "Telegram բոտ՝ նոր հայտեր ստանալու, ծանուցումներ ուղարկելու և երկկողմանի զրույց վարելու համար։ Մուտքը՝ բոտի բանալիով։",
  whatsapp:
    "WhatsApp Cloud API՝ կաղապարային ու սովորական հաղորդագրությունների և հաճախորդների սպասարկման համար։ Մուտքը՝ OAuth-ով և հեռախոսահամարի ID-ով։",
  email:
    "Էլ. փոստի միասնական կապ՝ նամակներ ուղարկելու, ստանալու և մշակելու համար։ Մուտքը՝ հավելվածի գաղտնաբառով կամ OAuth-ով։",
  signed_webhook:
    "Ցանկացած ծառայությունից ստորագրված վեբ ծանուցումներ ստանալու անվտանգ հասցե։ HayDevOS-ը ստուգում է HMAC-SHA256 ստորագրությունը։",
  erp:
    "HayDevOS ERP-ի հաճախորդները, պատվերները, հաշիվները և վճարումները։ Արտաքին մուտք պետք չէ․ օգտագործվում է ընկերության ներքին բանալին։",
  leados:
    "HayDevOS-ի հայտից մինչև վաճառք ամբողջ ընթացքը։ Փոխանցում է փուլի փոփոխություններն ու SLA-ի խախտման ազդանշանները։",
  quoteflow:
    "HayDevOS-ի առաջարկների համակարգը։ Փոխանցում է առաջարկի ուղարկման, ընդունման և մերժման իրադարձությունները։",
  documentflow:
    "HayDevOS-ի փաստաթղթերի խելացի մշակում։ Փոխանցում է դասակարգման, տվյալների քաղման և հաստատման արդյունքները։",
  automation:
    "HayDevOS Autopilot-ի ավտոմատացումները։ Փոխանցում է մեկնարկի, հաջող ավարտի, ձախողման և հաստատման իրադարձությունները։",
  slack:
    "Slack-ի աշխատանքային տարածքի կապ՝ ծանուցումների, արագ հրամանների և անձնական հաստատումների համար։ Մուտքը՝ OAuth 2.0-ով։",
  hubspot:
    "HubSpot CRM-ի կոնտակտների, գործարքների և ընկերությունների երկկողմանի թարմացում՝ հակասությունների լուծմամբ։",
  stripe:
    "Stripe-ի վճարումներ և բաժանորդագրություններ՝ վճարման իրադարձություններով, հաշիվներով և հաճախորդի էջով։ Մուտքը՝ OAuth-ով։",
};

const HY_CAPABILITIES: Record<string, string> = {
  "Lead capture": "Նոր հայտերի ստացում",
  "Messenger inbox": "Messenger-ի նամակներ",
  "Audience sync": "Լսարանի թարմացում",
  "Conversions API": "Փոխարկումների API",
  "Bot inbox": "Բոտի նամակներ",
  "Push notifications": "Արագ ծանուցումներ",
  "Channel broadcast": "Հաղորդագրություն ալիքին",
  "Inline keyboards": "Ներդրված կոճակներ",
  "Template messages": "Կաղապարով հաղորդագրություններ",
  "Session messages": "Զրույցի հաղորդագրություններ",
  "Media exchange": "Ֆայլերի փոխանակում",
  "Webhook receipts": "Ստացման ծանուցումներ",
  "Outbound SMTP": "Ուղարկվող նամակներ",
  "Inbound IMAP": "Ստացվող նամակներ",
  "Template rendering": "Նամակի կաղապարներ",
  "Bounce handling": "Չհասած նամակների մշակում",
  "HMAC verification": "HMAC ստորագրության ստուգում",
  "Idempotent ingress": "Կրկնություններից պաշտպանված ընդունում",
  "Event replay": "Իրադարձության կրկնում",
  "Custom event types": "Անհատական իրադարձությունների տեսակներ",
  "Customer sync": "Հաճախորդների թարմացում",
  "Order webhooks": "Պատվերների ծանուցումներ",
  "Invoice webhooks": "Հաշիվների ծանուցումներ",
  "Payment hooks": "Վճարումների ծանուցումներ",
  "Lead events": "Հայտերի իրադարձություններ",
  "Stage transitions": "Փուլերի փոփոխություններ",
  "SLA breach signals": "SLA խախտման ազդանշաններ",
  "Owner routing": "Պատասխանատուի ընտրություն",
  "Quote events": "Առաջարկների իրադարձություններ",
  "Approval hooks": "Հաստատման ծանուցումներ",
  "E-sign callbacks": "Էլեկտրոնային ստորագրության պատասխաններ",
  "Version pinning": "Տարբերակի ամրագրում",
  "Document events": "Փաստաթղթերի իրադարձություններ",
  "Extraction results": "Քաղված տվյալներ",
  "Review queue hooks": "Ստուգման հերթի ծանուցումներ",
  "Batch signals": "Խմբային ազդանշաններ",
  "Run events": "Գործարկման իրադարձություններ",
  "Failure alerts": "Ձախողման ազդանշաններ",
  "Schedule ticks": "Ժամանակացույցի գործարկումներ",
  "Channel notifications": "Ալիքի ծանուցումներ",
  "Slash commands": "Արագ հրամաններ",
  "DM approvals": "Հաստատումներ անձնական նամակով",
  "Thread replies": "Պատասխաններ շղթայում",
  "Contact sync": "Կոնտակտների թարմացում",
  "Deal sync": "Գործարքների թարմացում",
  "Company sync": "Ընկերությունների թարմացում",
  "Timeline events": "Ժամանակագծի իրադարձություններ",
  "Payment webhooks": "Վճարումների ծանուցումներ",
  "Subscription sync": "Բաժանորդագրությունների թարմացում",
  "Invoice events": "Հաշիվների իրադարձություններ",
};

const HY_DISPLAY_TEXT: Record<string, string> = {
  "Meta — HayDev HQ": "Meta — HayDev կենտրոն",
  "Telegram — Sales Bot": "Telegram — վաճառքի բոտ",
  "WhatsApp — Support Line": "WhatsApp — աջակցության համար",
  "Signed Webhook — Ingress": "Ստորագրված վեբ ծանուցում — մուտք",
  "Stripe — Live Production": "Stripe — գործող համակարգ",
  "Slack — HayDev Workspace": "Slack — HayDev աշխատանքային տարածք",
  "HubSpot — CRM Sync": "HubSpot — CRM տվյալների թարմացում",
  "LeadOS — Internal": "LeadOS — ներքին կապ",
  "ERP Hub — Internal": "ERP կենտրոն — ներքին կապ",
  "Generic Signed Ingress": "Ընդհանուր ստորագրված մուտք",
  "Stripe → HayDevOS": "Stripe → HayDevOS",
  "Meta Lead Ads": "Meta-ի գովազդային հայտեր",
  "WhatsApp Inbound": "WhatsApp-ի մուտքային հաղորդագրություններ",
  "Slack Slash + Interactivity": "Slack-ի հրամաններ և գործողություններ",
  "HubSpot CRM Events": "HubSpot CRM-ի իրադարձություններ",
  "Page Access Token": "էջի մուտքի բանալի",
  "Bot Token": "բոտի բանալի",
  "System User Token": "համակարգային օգտատիրոջ բանալի",
  "SMTP App Password": "SMTP հավելվածի գաղտնաբառ",
  "Secret": "գաղտնիք",
  "Restricted Key": "սահմանափակ բանալի",
  "Bot OAuth Token": "բոտի OAuth բանալի",
  "Private App Token": "մասնավոր հավելվածի բանալի",
  "Service Token": "ծառայության բանալի",
  "Signed Webhook": "Ստորագրված կապ",
};

const HY_SYNC_ERRORS: Record<string, string> = {
  "4 records skipped due to conflict; see conflict log":
    "4 գրառում բաց է թողնվել տվյալների հակասության պատճառով․ տես հակասությունների մատյանը",
  "IMAP auth rejected: invalid app password":
    "IMAP մուտքը մերժվել է․ հավելվածի գաղտնաբառը սխալ է",
  "OAuth token expired; refresh failed (reauth required)":
    "OAuth մուտքի ժամկետն ավարտվել է․ թարմացումը չի հաջողվել, պետք է նորից միացնել հաշիվը",
  "Stripe API key revoked": "Stripe API բանալին չեղարկված է",
};

const HY_AUDIT_MESSAGES: Record<string, string> = {
  "Connected Signed Webhook (HMAC ingress). Generated endpoint + signing secret.":
    "Ստորագրված վեբ ծանուցումը միացվեց։ Ստեղծվեցին մուտքի հասցեն և ստորագրման գաղտնիքը։",
  "Connected Telegram bot. Stored bot token (masked).":
    "Telegram բոտը միացվեց։ Բոտի բանալին պահպանվեց թաքցված տեսքով։",
  "Scheduled sync completed: 21 records in / 21 out (412ms).":
    "Ժամանակացույցով տվյալների փոխանցումն ավարտվեց․ ստացվել և ուղարկվել է 21 գրառում (412 մվ)։",
  "Scheduled sync FAILED: OAuth token expired; refresh failed.":
    "Ժամանակացույցով տվյալների փոխանցումը ձախողվեց․ OAuth մուտքի ժամկետն ավարտվել է, թարմացումը չի հաջողվել։",
  "Rotated signing secret. Previous secret revoked after 24h grace period.":
    "Ստորագրման գաղտնիքը փոխվեց։ Հին արժեքը չեղարկվեց 24-ժամյա անցումային ժամկետից հետո։",
  "Refreshed OAuth tokens (Stripe). Status: REAUTH_REQUIRED (refresh failed).":
    "Stripe-ի OAuth մուտքը թարմացվեց։ Կարգավիճակ՝ հաշիվը պետք է նորից միացնել, քանի որ թարմացումը չի հաջողվել։",
  "Webhook received: invoice.paid (evt_1Na2bc4). HMAC verified.":
    "Ստացվեց invoice.paid վեբ ծանուցումը (evt_1Na2bc4)։ HMAC ստորագրությունը հաստատված է։",
  "Webhook received: leadgen (evt_meta_441). HMAC verified.":
    "Ստացվեց leadgen վեբ ծանուցումը (evt_meta_441)։ HMAC ստորագրությունը հաստատված է։",
  "Replayed event evt_9f2a4c3 (invoice.paid). Result: delivered (200).":
    "evt_9f2a4c3 (invoice.paid) իրադարձությունը կրկնվեց։ Արդյունք՝ առաքված է (200)։",
  "Connectivity test: 200 OK (latency 412ms).":
    "Կապի ստուգումը հաջողվեց՝ 200 OK (ուշացում՝ 412 մվ)։",
  "Updated sync direction: one-way → bi-directional. Conflict policy: last-write-wins.":
    "Տվյալների փոխանցումը փոխվեց միակողմանիից երկկողմանի։ Հակասության դեպքում պահվում է վերջին փոփոխությունը։",
  "Scheduled sync FAILED: IMAP auth rejected (invalid app password).":
    "Ժամանակացույցով տվյալների փոխանցումը ձախողվեց․ IMAP մուտքը մերժվել է՝ հավելվածի գաղտնաբառը սխալ է։",
  "Connected Slack workspace. OAuth scopes granted: 4/5.":
    "Slack-ի աշխատանքային տարածքը միացվեց։ Տրված է OAuth-ի 5 թույլտվությունից 4-ը։",
  "Rotated Stripe restricted key. New key expires in 30 days.":
    "Stripe-ի սահմանափակ բանալին փոխվեց։ Նոր բանալու ժամկետը 30 օր է։",
  "Disconnected stale Meta integration (biz_••••••6c4). Tokens revoked.":
    "Meta-ի հին կապն անջատվեց (biz_••••••6c4)։ Մուտքի բանալիները չեղարկվեցին։",
  "Revoked legacy Meta page token (pre-rotation).":
    "Meta էջի հին մուտքի բանալին չեղարկվեց։",
};

export function localizeProvider(provider: Provider, locale: Locale): Provider {
  if (locale !== "hy") return provider;
  return {
    ...provider,
    name: HY_PROVIDER_NAMES[provider.id] ?? provider.name,
    description: HY_PROVIDER_DESCRIPTIONS[provider.id] ?? provider.description,
    capabilities: provider.capabilities.map(localizeCapabilityHy),
  };
}

export function localizeCapability(value: string, locale: Locale): string {
  return locale === "hy" ? localizeCapabilityHy(value) : value;
}

export function localizeDisplayText(value: string, locale: Locale): string {
  if (locale !== "hy") return value;
  const exact = HY_DISPLAY_TEXT[value];
  if (exact) return exact;

  const separator = " — ";
  if (value.includes(separator)) {
    const [brand, ...rest] = value.split(separator);
    const suffix = rest.join(separator);
    return `${HY_PROVIDER_NAMES[providerIdFromName(brand)] ?? brand}${separator}${HY_DISPLAY_TEXT[suffix] ?? suffix}`;
  }

  return value;
}

export function localizeSyncError(value: string | null, locale: Locale): string | null {
  if (!value || locale !== "hy") return value;
  return HY_SYNC_ERRORS[value] ?? value;
}

export function localizeAuditMessage(value: string, locale: Locale): string {
  return locale === "hy" ? HY_AUDIT_MESSAGES[value] ?? value : value;
}

export function localizeAuditActor(value: string, locale: Locale): string {
  if (locale !== "hy") return value;
  if (value === "schedule") return "ժամանակացույց";
  if (value === "system") return "համակարգ";
  return value;
}

function localizeCapabilityHy(value: string): string {
  return HY_CAPABILITIES[value] ?? value;
}

function providerIdFromName(name: string): string {
  if (name === "Email") return "email";
  if (name === "Signed Webhook") return "signed_webhook";
  if (name === "Automation Builder") return "automation";
  return name.toLowerCase();
}
