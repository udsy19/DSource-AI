"use client";

import { useState } from "react";
import FeaturesShowcase from "@/components/features/FeaturesShowcase";
import NarratedStory from "@/components/features/NarratedStory";

/**
 * Two ways to meet the platform: "Simple" is the scrollable feature catalog;
 * "Story" is a 50-second narrated walkthrough of the end-to-end journey,
 * voiced by Higgsfield. A segmented toggle at the top switches between them.
 */
export default function FeaturesModes() {
  const [mode, setMode] = useState("simple");

  return (
    <div className="viz-scope w-full">
      <div className="flex justify-center px-4 pt-24 sm:pt-28">
        <div
          className="inline-flex rounded-full border border-[var(--viz-line)] bg-[var(--viz-paper)] p-1"
          role="tablist"
          aria-label="How to explore the features"
        >
          {[
            { id: "simple", label: "Simple" },
            { id: "story", label: "Narrated story" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={mode === t.id}
              onClick={() => setMode(t.id)}
              className={`viz-mono rounded-full px-5 py-2 text-xs tracking-[0.08em] uppercase transition-colors ${
                mode === t.id
                  ? "bg-[var(--viz-ink)] text-[var(--viz-paper)]"
                  : "text-[var(--viz-muted)] hover:text-[var(--viz-ink)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Story pins a section, so no transform-based wrapper here — a
          transformed ancestor would break the fixed-position pin. */}
      {mode === "simple" ? <FeaturesShowcase embedded /> : <NarratedStory />}
    </div>
  );
}
