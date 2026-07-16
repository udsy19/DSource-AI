"use client";

import Link from "next/link";

/**
 * Image to CAD hands off to the dedicated CAD Studio workspace
 * (/cad-studio): the real pipeline — mm geometry extraction, dimension
 * reconciliation, confidence scoring, and professional DXF export — lives
 * there. The old in-tab style-transfer converter is superseded.
 */
const CAPABILITIES = [
  [
    "Extract",
    "Walls, doors, windows, rooms and fixtures traced from a photo, scan, or hand sketch",
  ],
  [
    "Measure",
    "Printed dimensions read and reconciled into real millimetre geometry",
  ],
  [
    "Edit",
    "A drafting workspace with symbols, snapping, and AI-assisted edits",
  ],
  [
    "Export",
    "Professional DXF with blocks, hatching, dimensions, and a title block",
  ],
];

export default function CadTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
      <aside className="lg:col-span-4">
        <div className="viz-panel p-4 sm:p-5">
          <h2 className="viz-serif text-2xl">Image to CAD</h2>
          <p className="mt-1.5 text-xs text-[var(--viz-muted)]">
            Turn a floor plan photo or sketch into measured, editable CAD
            geometry — then export a professional drawing.
          </p>
          <Link
            href="/cad-studio"
            className="mt-5 inline-block w-full rounded-full bg-[var(--viz-ink)] px-6 py-3 text-center text-sm text-[var(--viz-paper)] transition-colors duration-200 hover:bg-[var(--viz-well)]"
          >
            Open CAD Studio →
          </Link>
        </div>
      </aside>

      <section className="lg:col-span-8">
        <div className="viz-panel p-4 sm:p-6">
          <p className="viz-label">The drafting pipeline</p>
          <ol className="mt-3">
            {CAPABILITIES.map(([title, body], i) => (
              <li
                key={title}
                className="flex items-baseline gap-4 border-b border-[var(--viz-line)] py-4 last:border-b-0"
              >
                <span className="viz-mono text-xs font-bold text-[var(--viz-blue)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="viz-serif text-lg">{title}</h3>
                  <p className="mt-1 text-sm text-[var(--viz-muted)]">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
