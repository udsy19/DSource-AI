"use client";

const CREATIVITY_LABELS = ["Precise", "Balance", "Creative"];

/**
 * Bottom action bar (per Figma): optional AI creativity slider + the
 * generate/convert button.
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
    <div className="mt-4 border-1 border-gray-300 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
      {showCreativity
        ? <div className="flex-1 bg-gray-100 rounded-xl px-4 py-3">
            <div className="text-sm font-semibold">AI Creativity Level</div>
            <input
              type="range"
              min={0}
              max={2}
              step={1}
              value={creativityIndex}
              onChange={(e) => onCreativityChange(Number(e.target.value))}
              className="w-full mt-2 accent-black"
              aria-label="AI creativity level"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              {CREATIVITY_LABELS.map((label, i) => (
                <span
                  key={label}
                  className={i === creativityIndex ? "font-bold" : ""}
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
        className={`rounded-full px-10 py-3 text-sm font-semibold ${
          disabled
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-black text-white cursor-pointer hover:bg-gray-800"
        }`}
      >
        ✦ {actionLabel}
      </button>
    </div>
  );
}
