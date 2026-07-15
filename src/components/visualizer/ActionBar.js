"use client";

export const CREATIVITY_LABELS = ["Precise", "Balanced", "Creative"];

/**
 * Bottom action bar: optional AI creativity slider + the generate/convert
 * button, styled as the plotter-blue "stamp" of the drawing set.
 */
export default function ActionBar({
  creativityIndex,
  onCreativityChange,
  showCreativity = true,
  actionLabel,
  onAction,
  disabled,
}) {
  return (
    <div className="viz-panel mt-3 flex flex-col items-stretch gap-4 p-4 sm:flex-row sm:items-center">
      {showCreativity
        ? <div className="flex-1">
            <div className="viz-label">AI creativity</div>
            <input
              type="range"
              min={0}
              max={2}
              step={1}
              value={creativityIndex}
              onChange={(e) => onCreativityChange(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--viz-blue)]"
              aria-label="AI creativity level"
            />
            <div className="viz-mono mt-1 flex justify-between text-xs text-[var(--viz-muted)]">
              {CREATIVITY_LABELS.map((label, i) => (
                <span
                  key={label}
                  className={
                    i === creativityIndex
                      ? "font-bold text-[var(--viz-ink)]"
                      : ""
                  }
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        : <div className="flex-1" />}
      <button
        type="button"
        onClick={onAction}
        disabled={disabled}
        className={`viz-btn rounded-full px-9 py-4 ${
          disabled
            ? "cursor-not-allowed bg-[var(--viz-line)] text-[var(--viz-muted)]"
            : "cursor-pointer bg-[var(--viz-ink)] text-[var(--viz-paper)] hover:bg-black"
        }`}
      >
        {actionLabel}
      </button>
    </div>
  );
}
