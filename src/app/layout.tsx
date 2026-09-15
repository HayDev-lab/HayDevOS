import type { Metadata } from "next";
import "./globals.css";

/**
 * SEO: full Open Graph / Twitter / JSON-LD structure is in place, but the
 * demo is closed, so robots stay noindex. On public launch:
 *   1. Replace metadataBase with the production domain.
 *   2. Set robots to { index: true, follow: true }.
 */
const SITE_URL = "https://haydev.am"; // TODO: replace with the production domain before launch.

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "HayDev — Software & AI Development Company",
    template: "%s — HayDev",
  },
  description:
    "Мы создаём программные продукты, на которых работает бизнес: web-платформы, AI-системы, ERP/CRM и автоматизация. Custom software development в Армении — от идеи до работающего продукта.",
  applicationName: "HayDev",
  keywords: [
    "custom software development Armenia",
    "software development Yerevan",
    "AI development",
    "web application development",
    "ERP development",
    "CRM development",
    "business automation",
    "разработка программного обеспечения Армения",
    "создание сайтов Ереван",
    "AI автоматизация бизнеса",
  ],
  authors: [{ name: "HayDev" }],
  creator: "HayDev",
  publisher: "HayDev",
  formatDetection: { telephone: false, address: false, email: false },
  alternates: {
    canonical: "/",
    languages: {
      ru: "/",
      en: "/?lang=en",
      hy: "/?lang=hy",
      "x-default": "/",
    },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "HayDev",
    title: "HayDev — We build software businesses run on",
    description:
      "Веб-платформы, AI-системы, ERP/CRM и автоматизация — под конкретную задачу вашего бизнеса. От идеи до работающего продукта.",
    locale: "ru_RU",
    alternateLocale: ["en_US", "hy_AM"],
    images: [
      {
        url: "/images/og-cover-1200x630.png",
        width: 1200,
        height: 630,
        alt: "HayDev — Software & AI Development Company",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HayDev — Software & AI Development Company",
    description:
      "Веб-платформы, AI-системы, ERP/CRM и автоматизация. От идеи до работающего продукта.",
    images: ["/images/og-cover-1200x630.png"],
  },
  robots: {
    // Closed demo — previews (OG) still render, indexing is disabled.
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg", apple: "/favicon.svg" },
};

/** Structured data: Organization + WebSite (used once the site goes indexable). */
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "HayDev",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
  description:
    "Software & AI development company. Custom software, web platforms, ERP/CRM and business automation.",
  slogan: "We build software businesses run on",
  areaServed: "AM",
  knowsAbout: [
    "Custom software development",
    "AI systems and automation",
    "ERP and CRM development",
    "Web platforms and digital products",
  ],
  makesOffer: [
    { "@type": "Offer", itemOffered: { "@type": "Service", name: "Custom software development" } },
    { "@type": "Offer", itemOffered: { "@type": "Service", name: "AI systems and automation" } },
    { "@type": "Offer", itemOffered: { "@type": "Service", name: "ERP / CRM development" } },
  ],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "HayDev",
  url: SITE_URL,
  inLanguage: ["ru", "en", "hy"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([organizationJsonLd, websiteJsonLd]) }}
        />
        {children}
      </body>
    </html>
  );
}
