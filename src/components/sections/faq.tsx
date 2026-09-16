"use client";
import { useMemo, useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { ArrowUpRight, Search, X } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { faqItems } from "@/data/business-os";

/* --- Minimal Russian stemmer for the live FAQ search ------------------- */

/** Common Russian inflection endings, longest first, stripped once. */
const RU_ENDINGS = [
  "иями", "ями", "ами", "иях", "иям", "ием", "его", "ому", "ему", "ыми", "ими",
  "ая", "яя", "ые", "ие", "ой", "ей", "ом", "ем", "ах", "ях", "ам", "ям", "ов", "ев",
  "ий", "ый", "ую", "юю", "ья", "ье", "ьи", "ешь", "ете",
  "а", "я", "ы", "и", "е", "у", "ю", "о",
];

/** Lowercase, ё→е, strip one inflection ending when the word is long enough. */
function stem(word: string): string {
  const base = word.toLowerCase().replace(/ё/g, "е");
  if (base.length < 5) return base; // short words are kept whole — safer
  for (const ending of RU_ENDINGS) {
    if (base.length - ending.length >= 3 && base.endsWith(ending)) {
      return base.slice(0, base.length - ending.length);
    }
  }
  return base;
}

/** Tokenize text into stemmed search tokens (letters/digits, incl. Armenian). */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/ё/g, "е")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 2)
    .map(stem);
}

/** True when every search token matches somewhere in the haystack tokens. */
function matchesTokens(needle: string[], haystack: string[]): boolean {
  if (needle.length === 0) return true;
  return needle.every((token) =>
    haystack.some((candidate) => candidate === token || (token.length >= 4 && candidate.includes(token))),
  );
}

/** 10 / FAQ — honest answers + live search with Russian stemming + keyword aliases. */
export function FaqSection() {
  const { t, locale } = useLanguage();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const needleTokens = useMemo(() => tokenize(needle).filter(Boolean), [needle]);

  const visible = useMemo(() => {
    if (!needle) return faqItems.map((item) => ({ item, hit: null as string | null }));
    return faqItems
      .map((item) => {
        const question = t(item.q);
        const answer = t(item.a);
        // Full-phrase match keeps the original behaviour for pasted phrases…
        const phraseMatch =
          question.toLowerCase().includes(needle) || answer.toLowerCase().includes(needle);
        // …and the token search (stemmed, with keyword aliases) widens recall
        // so «кода», «цену» or «support» all find the right question.
        const haystack = tokenize(
          `${question} ${answer} ${item.keywords ?? ""}`,
        );
        const tokenMatch = matchesTokens(needleTokens, haystack);
        if (!phraseMatch && !tokenMatch) return null;
        // The question text did not match — surface a one-line snippet from
        // the answer so the user can see why the row is relevant.
        let hit: string | null = null;
        const answerIndex = answer.toLowerCase().indexOf(needle);
        if (!phraseMatch && answerIndex >= 0) {
          const from = Math.max(0, answerIndex - 34);
          hit = (from > 0 ? "…" : "") + answer.slice(from, from + 110).trim() + "…";
        }
        return { item, hit };
      })
      .filter((entry): entry is { item: typeof faqItems[number]; hit: string | null } => entry !== null);
  }, [needle, needleTokens, locale, t]);

  return <section id="faq" className="section container os-faq" aria-labelledby="faq-heading">
    <span className="eyebrow">10 / FAQ</span>
    <div className="os-section-heading">
      <h2 id="faq-heading">{t("Частые вопросы")}<br /><span className="lime-text">{t("до первого разговора")}</span></h2>
      <p>{t("Отвечаем честно: без «средних цен» и обещанных сроков до понимания задачи.")}</p>
    </div>
    <div className="faq-search" data-reveal role="search" aria-label={t("Поиск по вопросам")}>
      <Search size={16} aria-hidden="true" />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("Найти вопрос: цена, сроки, код…")}
        aria-label={t("Поиск по вопросам и ответам")}
        enterKeyHint="search"
      />
      {query && <button type="button" onClick={() => setQuery("")} aria-label={t("Очистить поиск")}><X size={14} /></button>}
      <span className="faq-search-count" aria-live="polite">{needle ? `${visible.length} / ${faqItems.length}` : `${faqItems.length} / ${faqItems.length}`}</span>
    </div>
    {visible.length > 0 ? <Accordion type="single" collapsible className="faq-list" data-reveal>
      {visible.map(({ item, hit }) => (
        <AccordionItem key={item.code} value={item.code}>
          <AccordionTrigger>
            <span className="faq-index">{item.code}</span>
            <span className="faq-question">{t(item.q)}{hit && <em className="faq-hit" aria-hidden="true">{hit}</em>}</span>
          </AccordionTrigger>
          <AccordionContent>
            <p>{t(item.a)}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion> : <div className="faq-empty" data-reveal>
      <span className="faq-empty-code">404</span>
      <p>{t("По этому запросу ничего не нашлось. Формулирующих иначе вопросы можно задать напрямую — без поиска.")}</p>
    </div>}
    <div className="faq-cta" data-reveal>
      <p>{t("Остался вопрос, которого нет в списке?")}</p>
      <a className="text-link" href="#contact">{t("Задайте его напрямую")} <ArrowUpRight size={16} /></a>
    </div>
  </section>;
}
