import type { Metadata } from "next";
import "../globals.css";
import "../business-os.css";
import "../light-glass.css";
import "../audit.css";
import { notFound } from "next/navigation";
import { LanguageProvider } from "@/components/language-provider";
import { getMessages, getTranslator, isLocale } from "@/lib/i18n";
const origin = "https://haydev-growth.ailegalarmenia.chatgpt.site";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
 const { locale } = await params; if (!isLocale(locale)) notFound(); const t = getTranslator(locale);
 return {
  metadataBase: new URL(origin),
  title: t("HayDev — цифровая операционная система бизнеса в Армении"),
  description: t("Создаём цифровую операционную систему бизнеса: ERP, CRM, сайт, реклама, AI и аналитика. Процессы, склад, продажи и финансы в одном центре управления."),
  alternates: { canonical: `/${locale}`, languages: { hy: "/hy", ru: "/ru", en: "/en", "x-default": "/hy" } },
  openGraph: { title: t("HayDev — цифровая операционная система бизнеса в Армении"), description: t("Сайт, CRM, ERP, AI и реклама в одной системе."), url: `${origin}/${locale}`, siteName: "HayDev", type: "website", locale: { hy: "hy_AM", ru: "ru_RU", en: "en_US" }[locale] },
  twitter: { card: "summary", title: t("HayDev — цифровая операционная система бизнеса в Армении"), description: t("Сайт, CRM, ERP, AI и реклама в одной системе.") },
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};
}
export default async function RootLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
 const { locale } = await params; if (!isLocale(locale)) notFound();
 return <html lang={locale}><body><LanguageProvider locale={locale} messages={getMessages(locale)}>{children}</LanguageProvider></body></html>;
}
