import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuditApp } from "@/components/business-audit/audit-app";
import { isLocale } from "@/lib/i18n";

const titles = {
  hy: "HayDev Business Audit — բիզնեսի թվային ախտորոշում",
  ru: "HayDev Business Audit — диагностика цифровой системы бизнеса",
  en: "HayDev Business Audit — digital business diagnostic",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return {
    title: titles[locale],
    description: locale === "hy" ? "Գնահատեք լիդերը, վաճառքը, գործառնությունները, տվյալները, ավտոմատացումը և AI պատրաստվածությունը։" : locale === "en" ? "Assess leads, sales, operations, data, automation and AI readiness." : "Оцените лиды, продажи, операции, данные, автоматизацию и готовность к AI.",
    alternates: { canonical: `/${locale}/audit`, languages: { hy: "/hy/audit", ru: "/ru/audit", en: "/en/audit", "x-default": "/hy/audit" } },
    robots: { index: false, follow: false },
  };
}

export default function BusinessAuditPage() {
  return <AuditApp />;
}
