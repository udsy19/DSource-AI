"use client";

/**
 * Clickable hotspot dots over detected components. Positioned by the center
 * of each Gemini box_2d ([ymin, xmin, ymax, xmax] in 0-1000) relative to the
 * image element it overlays.
 */
export default function HotspotOverlay({ components, searchingLabel, onPick }) {
  return (
    <>
      {components.map((component, index) => {
        const [ymin, xmin, ymax, xmax] = component.box_2d;
        const left = `${((xmin + xmax) / 2 / 1000) * 100}%`;
        const top = `${((ymin + ymax) / 2 / 1000) * 100}%`;
        const isSearching = searchingLabel === component.label;

        return (
          <button
            key={`${component.label}-${index}`}
            type="button"
            onClick={() => onPick(component)}
            disabled={Boolean(searchingLabel)}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ left, top }}
            title={`Find matches: ${component.label}`}
          >
            <span
              className={`block w-5 h-5 rounded-full border-2 border-black/80 shadow-lg transition-transform ${
                isSearching
                  ? "bg-black animate-pulse"
                  : "bg-white group-hover:scale-125"
              }`}
            />
            <span className="absolute left-6 top-1/2 -translate-y-1/2 hidden group-hover:block bg-black/80 text-white text-xs rounded-md px-2 py-1 whitespace-nowrap">
              {component.label}
            </span>
          </button>
        );
      })}
    </>
  );
}
