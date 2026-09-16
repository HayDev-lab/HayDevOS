import type { MetadataRoute } from "next";

const SITE_URL = "https://haydev.am"; // TODO: replace with the production domain before launch.

/**
 * Single-page site: one URL, three language variants.
 * Languages are handled via ?lang= query (ru default, en, hy) — mirrored
 * from the hreflang alternates declared in layout.tsx metadata.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: SITE_URL + "/",
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
      alternates: {
        languages: {
          ru: SITE_URL + "/",
          en: SITE_URL + "/?lang=en",
          hy: SITE_URL + "/?lang=hy",
        },
      },
    },
  ];
}
