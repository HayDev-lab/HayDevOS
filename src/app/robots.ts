import type { MetadataRoute } from "next";

const SITE_URL = "https://haydev.am"; // TODO: replace with the production domain before launch.

/**
 * Dynamic robots.txt — replaces the former static public/robots.txt.
 *
 * Closed-demo policy: crawlers (incl. social preview bots) may fetch the
 * page, while indexability is controlled by the meta robots tag in
 * layout.tsx (currently noindex). On public launch flip the meta there.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: SITE_URL + "/sitemap.xml",
    host: SITE_URL,
  };
}
