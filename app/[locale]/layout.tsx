import type { Metadata } from "next";
import "../globals.css";
import { notFound } from "next/navigation";
import { LanguageProvider } from "@/components/language-provider";
import { getMessages, getTranslator, isLocale } from "@/lib/i18n";
const origin = "https://haydev-growth.ailegalarmenia.chatgpt.site";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
 const { locale } = await params; if (!isLocale(locale)) notFound(); const t = getTranslator(locale);
 return {
  metadataBase: new URL(origin),
  title: t("HayDev — ИИ, сайты, ПО и маркетинг в единой системе роста"),
  description: t("Соединяем ИИ-автоматизацию, разработку сайтов, бизнес-ПО, CRM и рекламу. От аудита процессов до запуска связанной системы для вашего бизнеса."),
  alternates: { canonical: `/${locale}`, languages: { hy: "/hy", ru: "/ru", en: "/en", "x-default": "/hy" } },
  openGraph: { title: t("HayDev — ваш бизнес на новой орбите"), description: t("ИИ, сайты, программы и маркетинг в одной системе. Обсудим вашу задачу и построим понятный маршрут к запуску."), url: `${origin}/${locale}`, siteName: "HayDev", type: "website", locale: { hy: "hy_AM", ru: "ru_RU", en: "en_US" }[locale] },
  twitter: { card: "summary", title: t("HayDev — система роста вашего бизнеса"), description: t("ИИ-автоматизация, сайты, бизнес-ПО и маркетинг.") },
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};
}
export default async function RootLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
 const { locale } = await params; if (!isLocale(locale)) notFound();
 return <html lang={locale}><body><LanguageProvider locale={locale} messages={getMessages(locale)}>{children}</LanguageProvider></body></html>;
}
