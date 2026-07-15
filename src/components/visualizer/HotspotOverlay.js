"use client";

import { useState } from "react";

/**
 * Clickable hotspot dots over detected components. Positioned by the center
 * of each Gemini box_2d ([ymin, xmin, ymax, xmax] in 0-1000) relative to the
 * image element it overlays. Hovering a dot outlines the exact region that
 * will be searched, so an off-target box is visible before clicking.
 */
export default function HotspotOverlay({ components, searchingLabel, onPick }) {
  const [hovered, setHovered] = useState(null);

  return (
    <>
      {/* Region outline for the hovered/searching component */}
      {components.map((component, index) => {
        const [ymin, xmin, ymax, xmax] = component.box_2d;
        const isActive =
          hovered === index || searchingLabel === component.label;
        if (!isActive) return null;
        return (
          <span
            key={`box-${component.label}-${index}`}
            className="pointer-events-none absolute rounded border-2 border-[var(--viz-blue)] bg-[var(--viz-blue)]/10"
            style={{
              left: `${xmin / 10}%`,
              top: `${ymin / 10}%`,
              width: `${(xmax - xmin) / 10}%`,
              height: `${(ymax - ymin) / 10}%`,
            }}
          />
        );
      })}

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
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
            disabled={Boolean(searchingLabel)}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ left, top }}
            title={`Find matches: ${component.label}`}
          >
            <span
              className={`block w-5 h-5 rounded-full border-2 border-[var(--viz-blue)] shadow-lg transition-transform ${
                isSearching
                  ? "bg-[var(--viz-blue)] animate-pulse"
                  : "bg-white group-hover:scale-125"
              }`}
            />
            <span className="absolute left-6 top-1/2 -translate-y-1/2 hidden group-hover:block bg-[var(--viz-ink)]/90 text-white text-xs rounded-md px-2 py-1 whitespace-nowrap">
              {component.label}
            </span>
          </button>
        );
      })}
    </>
  );
}
