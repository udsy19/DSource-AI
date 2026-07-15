"use client";

/**
 * Shared shell for the auth pages: a centered paper plate on the grain
 * ground — form on the left; on the right, a dark vignette with an engraved
 * entry hall (the studio door, ajar) and a serif line. Pages supply the
 * eyebrow/title/lede, the form as children, and the cross-links as footer.
 */
export default function AuthShell({
  eyebrow,
  title,
  lede,
  aside,
  children,
  footer,
}) {
  return (
    <div className="viz-scope viz-grain flex min-h-svh items-center justify-center px-4 pt-24 pb-14 sm:px-6">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-paper)] shadow-xl lg:grid-cols-2">
        {/* The form side */}
        <div className="px-6 py-10 sm:px-10 sm:py-12">
          <p className="viz-label">{eyebrow}</p>
          <h1 className="viz-serif mt-3 text-3xl sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm text-[var(--viz-muted)]">{lede}</p>
          <div className="mt-8">{children}</div>
          {footer && (
            <div className="mt-8 border-t border-[var(--viz-line)] pt-5 text-sm text-[var(--viz-muted)]">
              {footer}
            </div>
          )}
        </div>

        {/* The studio door */}
        <div className="relative hidden overflow-hidden bg-[var(--viz-well)] lg:block">
          <div
            className="viz-dots-light viz-dots-drift pointer-events-none absolute inset-0"
            aria-hidden="true"
          />
          <svg
            viewBox="0 0 400 520"
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="xMidYMax meet"
            aria-hidden="true"
          >
            <g
              className="viz-draw-paths"
              stroke="#a39a86"
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* floor */}
              <path
                pathLength="1"
                d="M28 452 H372"
                strokeDasharray="1 7"
                opacity=".6"
              />
              {/* door frame + door ajar */}
              <path
                pathLength="1"
                d="M120 452 V96 Q120 84 132 84 H236 Q248 84 248 96 V452"
              />
              <path
                pathLength="1"
                d="M136 452 V104 L216 122 V452 Z"
                opacity=".9"
              />
              <path pathLength="1" d="M204 284 Q209 286 209 292" opacity=".9" />
              {/* light spilling from the opening */}
              <path
                pathLength="1"
                d="M248 452 L318 452 M248 400 L296 436"
                opacity=".35"
              />
              {/* console table with vase, right of the door */}
              <path
                pathLength="1"
                d="M292 452 V392 M348 452 V392 M284 392 H356"
                opacity=".85"
              />
              <path
                pathLength="1"
                d="M312 392 V376 Q312 366 319 366 Q326 366 326 376 V392"
                opacity=".75"
              />
              {/* framed print, left wall */}
              <rect
                pathLength="1"
                x="44"
                y="180"
                width="52"
                height="66"
                rx="1"
                opacity=".85"
              />
              <path pathLength="1" d="M52 232 Q70 200 88 226" opacity=".65" />
              {/* pendant above */}
              <path
                pathLength="1"
                d="M188 28 V56 M176 56 H200 L195 70 H181 Z"
                opacity=".8"
              />
            </g>
          </svg>
          <p className="viz-serif absolute bottom-8 left-8 max-w-[16rem] text-2xl italic text-stone-200">
            {aside}
          </p>
        </div>
      </div>
    </div>
  );
}
