import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HayDev — Business Operating Systems",
  description:
    "Создаём цифровую операционную систему бизнеса: ERP, CRM, сайт, реклама, AI и аналитика. Процессы, склад, продажи и финансы в одном центре управления.",
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
