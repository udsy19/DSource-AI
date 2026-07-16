"use client";

import Link from "next/link";

/** "04 renders" — zero-padded, the spec-sheet voice. */
export const renderCountLabel = (count) =>
  `${String(count).padStart(2, "0")} ${count === 1 ? "render" : "renders"}`;

/**
 * One folio on the index: cover plate (or a dot-field placeholder bleeding
 * off the plate's top-right corner), serif name, mono client/city line.
 */
export default function FolioCard({ project }) {
  const metaLine = [project.clientName, project.address]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link href={`/folios/${project.id}`} className="group block">
      <article className="overflow-hidden rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-paper)] transition-colors duration-200 group-hover:border-[var(--viz-ink)]">
        <div className="relative aspect-[4/3] overflow-hidden border-b border-[var(--viz-line)] bg-[var(--viz-ground)]">
          {project.coverUrl
            ? // Signed URLs are short-lived — next/image can't optimize them.
              // biome-ignore lint/performance/noImgElement: signed URLs cannot use next/image
              <img
                src={project.coverUrl}
                alt={`${project.name} cover render`}
                className="h-full w-full object-cover"
              />
            : <>
                <span
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, color-mix(in srgb, var(--viz-ink) 24%, transparent) 1px, transparent 1.3px)",
                    backgroundSize: "7px 7px",
                    maskImage:
                      "linear-gradient(to bottom left, rgb(0 0 0 / 0.6), transparent 62%)",
                    WebkitMaskImage:
                      "linear-gradient(to bottom left, rgb(0 0 0 / 0.6), transparent 62%)",
                  }}
                />
                <span className="viz-serif absolute bottom-4 left-4 max-w-[14rem] text-sm italic text-[var(--viz-muted)]">
                  No renders filed yet.
                </span>
              </>}
        </div>
        <div className="flex items-baseline justify-between gap-3 p-4">
          <div className="min-w-0">
            <h3 className="viz-serif truncate text-xl">{project.name}</h3>
            {metaLine && <p className="viz-label mt-1 truncate">{metaLine}</p>}
          </div>
          <p className="viz-mono shrink-0 text-[11px] text-[var(--viz-muted)]">
            {renderCountLabel(project.renderCount)}
          </p>
        </div>
      </article>
    </Link>
  );
}
