"use client";

/**
 * Live plate label under the canvas — drafting-sheet vernacular. Each cell
 * is a parameter the pipeline enforces; "—" means unset. REV counts the
 * versions in this mode's history. The PROOF cell turns indigo only when
 * the render on the canvas was vision-checked against the brief and every
 * checked parameter passed — it is evidence, not decoration.
 */
export default function TitleBlock({ sheet, rev, cells, verified = null }) {
  const all = [
    { label: "Sheet", value: sheet },
    { label: "Rev", value: String(rev).padStart(2, "0") },
    ...cells,
  ];
  if (verified !== null) {
    all.push({
      label: "Proof",
      value: verified ? "Verified ✓" : null,
      accent: verified,
    });
  }

  return (
    <div className="mt-3 flex flex-wrap gap-px overflow-hidden rounded-lg border border-[var(--viz-line)] bg-[var(--viz-line)]">
      {all.map(({ label, value, accent }) => (
        <div
          key={label}
          className="min-w-24 flex-1 bg-[var(--viz-paper)] px-3 py-1.5"
        >
          <div className="viz-label">{label}</div>
          {/* Keyed by value so a change remounts it and replays the tick. */}
          <div
            key={String(value ?? "—")}
            className={`viz-mono viz-value-tick mt-0.5 truncate text-xs uppercase ${
              accent ? "font-bold text-[var(--viz-blue)]" : ""
            }`}
          >
            {value || "—"}
          </div>
        </div>
      ))}
    </div>
  );
}
