// NOTE: Set NEXT_PUBLIC_SITE_URL to the production origin in prod so the
// sitemap entries resolve to correct absolute URLs.
const base = process.env.NEXT_PUBLIC_SITE_URL || "https://dsource.ai";

export default function sitemap() {
  const routes = [
    "/",
    "/about",
    "/pricing",
    "/faq",
    "/help-center",
    "/privacy",
    "/terms",
    "/marketplace",
    "/ai-material-finder",
    "/ai-visualizer",
  ];

  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${base}${route === "/" ? "" : route}`,
    lastModified,
  }));
}
