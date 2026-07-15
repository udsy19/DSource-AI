"use client";

/**
 * Single-select option pickers set as type, not boxes. Two forms:
 *
 * - Without `swatches`: a wrapped inline run of the option names — selecting
 *   one fills it with ink, like a highlighted word on a spec sheet.
 * - With `swatches` (option → array of hex stops): a fan-deck list — each
 *   row is a color strip and its name; the selected row's strip is ruled
 *   in ink and its name set bold.
 *
 * Clicking the selected option clears it (every picker here is optional).
 */
export default function ChipGroup({
  label,
  value,
  options,
  onChange,
  swatches = null,
}) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="viz-label p-0">{label}</legend>

      {swatches
        ? <div className="mt-2 flex flex-col">
            {options.map((option) => {
              const selected = value === option;
              // Options without a defined strip still render (name-only row)
              // so a new palette added to params can't break the picker.
              const strip = swatches[option] ?? [];
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange(selected ? null : option)}
                  className="group flex cursor-pointer items-center gap-3 py-1 text-left"
                >
                  <span
                    className={`flex h-4 w-20 shrink-0 overflow-hidden rounded-sm ${
                      selected
                        ? "ring-2 ring-[var(--viz-ink)] ring-offset-1 ring-offset-[var(--viz-paper)]"
                        : "opacity-80 group-hover:opacity-100"
                    } ${strip.length === 0 ? "border border-dashed border-[var(--viz-line)]" : ""}`}
                  >
                    {strip.map((hex) => (
                      <span
                        key={hex}
                        className="h-full flex-1"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </span>
                  <span
                    className={`truncate text-sm ${
                      selected
                        ? "font-semibold"
                        : "text-[var(--viz-muted)] group-hover:text-[var(--viz-ink)]"
                    }`}
                  >
                    {option}
                  </span>
                </button>
              );
            })}
          </div>
        : <div className="mt-1.5 flex flex-wrap gap-x-1 gap-y-1.5">
            {options.map((option) => {
              const selected = value === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange(selected ? null : option)}
                  className={`cursor-pointer rounded-sm px-1.5 py-0.5 text-sm ${
                    selected
                      ? "bg-[var(--viz-ink)] font-medium text-[var(--viz-paper)]"
                      : "text-[var(--viz-muted)] underline decoration-transparent underline-offset-4 transition-colors hover:text-[var(--viz-ink)] hover:decoration-[var(--viz-line)]"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>}
    </fieldset>
  );
}
