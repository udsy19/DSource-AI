import { notFound, redirect } from "next/navigation";
import {
  normalizePrefixSegments,
  urlFromSegments,
} from "@/utils/finder/prefix-url";

/**
 * dsource.ai/<any product url> — the prefix trick.
 *
 * Standing on ikea.com/gb/en/p/billy-bookcase-white-00263850? Type
 * "dsource.ai/" in front of it and land here, with that product already
 * loading in the finder.
 *
 * THIS IS A ROOT CATCH-ALL, which is the same shape as the bug this app used
 * to have (a directory named `[ai-material-finder]`, so `/anything` rendered
 * the finder instead of 404ing). Next gives static routes priority, so real
 * pages are never reached by this. The remaining risk is TYPOS — /pricng must
 * 404, not become a product search — which is why urlFromSegments() only
 * accepts something unmistakably a hostname and everything else falls to
 * notFound(). When in doubt we 404: a wrong 404 confuses for a second, a
 * wrong search looks like it worked.
 */

export const dynamic = "force-dynamic";

const Prefixed = async ({ params, searchParams }) => {
  const { target } = await params;
  const query = await searchParams;

  const url = urlFromSegments(normalizePrefixSegments(target), query);
  if (!url) notFound();

  // Hand off to the real tool rather than rendering here: it owns auth,
  // rate limiting and the dossier, and the canonical URL should be the
  // tool's, not a mirror of someone else's product page.
  redirect(`/material-finder/find?url=${encodeURIComponent(url)}`);
};

export default Prefixed;
