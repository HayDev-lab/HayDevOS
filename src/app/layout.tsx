import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/components/core/archive.css";
import "@/components/core/core.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { coreLocales } from "@/components/core/locales";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: coreLocales.hy.title,
  description: coreLocales.hy.meta,
  keywords: [
    "HayDevOS",
    "enterprise platform",
    "CRM",
    "ERP",
    "automation",
    "document AI",
    "multi-tenant",
  ],
  authors: [{ name: "HayDevOS" }],
  icons: {
    icon: "/core/haydevos-logo.png",
  },
  openGraph: {
    title: "HayDevOS",
    description: coreLocales.hy.meta,
    siteName: "HayDevOS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HayDevOS",
    description: coreLocales.hy.meta,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hy" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground min-h-screen`}
      >
        <ThemeProvider
          attribute="class"
          forcedTheme="dark"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors closeButton position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
