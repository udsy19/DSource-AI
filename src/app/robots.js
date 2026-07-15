// NOTE: Set NEXT_PUBLIC_SITE_URL to the production origin in prod so the
// sitemap reference resolves to the correct absolute URL.
const base = process.env.NEXT_PUBLIC_SITE_URL || "https://dsource.ai";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/vendor"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
