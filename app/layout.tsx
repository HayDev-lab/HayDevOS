import type { Metadata } from "next";
import "./globals.css";
const origin = "https://haydev-growth.ailegalarmenia.chatgpt.site";
export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: "HayDev — ИИ, сайты, ПО и маркетинг в единой системе роста",
  description: "Соединяем ИИ-автоматизацию, разработку сайтов, бизнес-ПО, CRM и рекламу. От аудита процессов до запуска связанной системы для вашего бизнеса.",
  alternates: { canonical: "/" },
  openGraph: { title: "HayDev — ваш бизнес на новой орбите", description: "ИИ, сайты, программы и маркетинг в одной системе. Обсудим вашу задачу и построим понятный маршрут к запуску.", url: origin, siteName: "HayDev", type: "website", locale: "ru_RU" },
  twitter: { card: "summary", title: "HayDev — система роста вашего бизнеса", description: "ИИ-автоматизация, сайты, бизнес-ПО и маркетинг." },
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
