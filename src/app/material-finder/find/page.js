"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import Dossier from "@/components/material-finder/Dossier";
import InputPlate from "@/components/material-finder/InputPlate";
import SearchProgress from "@/components/material-finder/SearchProgress";
import { useMaterialFinder } from "@/components/material-finder/useMaterialFinder";
import { useSpec } from "@/contexts/SpecContext";

/**
 * The Material Finder: one product in, every seller we can verify out.
 *
 * The plate holds the page until there's a result, then hands the space to the
 * dossier — the input isn't worth keeping on screen once its job is done, and
 * the answer deserves the full width.
 */

const MaterialFinderTool = () => {
  const { addProductToSpec } = useSpec();
  const { status, stage, result, error, search, reset } = useMaterialFinder();
  const searchParams = useSearchParams();
  const autoRan = useRef(false);

  // ?url= arrives from the dsource.ai/<product-url> prefix route. Run it once,
  // on arrival — the user already expressed intent by typing our domain in
  // front of theirs; making them press a button again would be theatre.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run exactly once per arrival; search is recreated each render
  useEffect(() => {
    const url = searchParams.get("url");
    if (!url || autoRan.current) return;
    autoRan.current = true;
    search({ url });
  }, [searchParams]);

  const searching = status === "searching";
  const showPlate = status === "idle" || status === "error";

  const addToSpec = (offer) => {
    addProductToSpec(
      {
        title: offer.title ?? result?.identity?.title ?? "Product",
        brand: offer.brand ?? result?.identity?.brand ?? offer.seller,
        color: null,
        image: offer.imageUrl ?? result?.identity?.imageUrl,
        link: offer.url,
      },
      result?.identity?.category ?? "Sourced",
    );
  };

  return (
    <div className="viz-scope w-full">
      <div className="px-4 pt-24 pb-24 sm:px-6 sm:pt-32 md:px-8 lg:px-12">
        {/* Masthead folio: meta line over the ink rule, deck at the baseline */}
        <header>
          <div className="flex items-baseline justify-between gap-4 pb-2">
            <p className="viz-label">DSource Studio</p>
            {status === "done"
              ? <button
                  type="button"
                  onClick={reset}
                  className="viz-label shrink-0 cursor-pointer hover:text-[var(--viz-ink)]"
                >
                  Search again →
                </button>
              : <Link
                  href="/material-finder/tutorial"
                  className="viz-label shrink-0 hover:text-[var(--viz-ink)]"
                >
                  View tutorial →
                </Link>}
          </div>
          <div className="relative pt-5">
            <span
              className="viz-rule absolute top-0 left-0 h-0.5 w-full bg-[var(--viz-ink)]"
              aria-hidden="true"
            />
            <span className="viz-dots-rule" aria-hidden="true" />
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
              <h1 className="viz-serif text-4xl leading-none sm:text-5xl md:text-[3.6rem]">
                Material Finder
              </h1>
              <div className="pb-1 lg:text-right">
                <p className="viz-serif max-w-md text-base italic text-[var(--viz-muted)] sm:text-lg">
                  {result?.offers?.length
                    ? `Found in ${result.offers.length} ${result.offers.length === 1 ? "place" : "places"}. Here's who.`
                    : "Show us the thing. We'll find who sells it."}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-8 sm:mt-10">
          {showPlate && (
            <div className="mx-auto max-w-3xl">
              <InputPlate onSearch={search} disabled={searching} />
              {error && (
                <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          )}

          {searching && (
            <div className="mx-auto max-w-3xl">
              <SearchProgress stage={stage} />
            </div>
          )}

          {status === "done" && result && (
            <Dossier result={result} onAddToSpec={addToSpec} />
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * useSearchParams() opts the tree into client-side bailout, so the page needs
 * a Suspense boundary to stay statically prerenderable.
 */
const MaterialFinderPage = () => (
  <Suspense fallback={null}>
    <MaterialFinderTool />
  </Suspense>
);

export default MaterialFinderPage;
