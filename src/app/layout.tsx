import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HayDev — Software & AI Development Company",
  description:
    "Мы создаём программные продукты, на которых работает бизнес: web-платформы, AI-системы, ERP/CRM и автоматизация. Custom software development в Армении — от идеи до работающего продукта.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
