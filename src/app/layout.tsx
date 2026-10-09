import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/components/core/archive.css";
import "@/components/core/core.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HayDevOS · Ядро управления",
  description:
    "HayDevOS is a multi-tenant enterprise platform unifying lead-to-cash, document AI, automations, ERP, integrations and an AI co-founder.",
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
    description: "The operating system for ambitious teams.",
    siteName: "HayDevOS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HayDevOS",
    description: "The operating system for ambitious teams.",
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
