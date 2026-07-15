// Shared SVG bits for the CAD studio: the unit-box primitive renderer used by
// both the asset-library previews and the canvas asset layer, plus the tiny
// chevron icon reused across panels.

const num = (value, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const arcPath = (prim, sx, sy) => {
  if (prim.cx == null && prim.x1 != null) {
    // Endpoint form: {x1,y1,x2,y2,r?} — a simple sweep between two points.
    const x1 = num(prim.x1) * sx;
    const y1 = num(prim.y1) * sy;
    const x2 = num(prim.x2) * sx;
    const y2 = num(prim.y2) * sy;
    const r = num(prim.r, Math.hypot(x2 - x1, y2 - y1) / 2 || 0.5);
    const rx = prim.r != null ? r * sx : r;
    const ry = prim.r != null ? r * sy : r;
    return `M ${x1} ${y1} A ${rx} ${ry} 0 0 ${prim.sweep === 0 ? 0 : 1} ${x2} ${y2}`;
  }
  // Center form: {cx,cy,r,start,end} with angles in degrees, y-down.
  const cx = num(prim.cx, 0.5);
  const cy = num(prim.cy, 0.5);
  const r = num(prim.r, 0.5);
  const start = num(prim.startDeg ?? prim.start ?? prim.a1, 0);
  const end = num(prim.endDeg ?? prim.end ?? prim.a2, 90);
  const rad = (deg) => (deg * Math.PI) / 180;
  const x1 = (cx + r * Math.cos(rad(start))) * sx;
  const y1 = (cy + r * Math.sin(rad(start))) * sy;
  const x2 = (cx + r * Math.cos(rad(end))) * sx;
  const y2 = (cy + r * Math.sin(rad(end))) * sy;
  const large = Math.abs(end - start) > 180 ? 1 : 0;
  const sweep = end >= start ? 1 : 0;
  return `M ${x1} ${y1} A ${r * sx} ${r * sy} 0 ${large} ${sweep} ${x2} ${y2}`;
};

const renderPrimitive = (prim, sx, sy) => {
  const key = `${prim.t}:${JSON.stringify(prim)}`;
  switch (prim.t) {
    case "line":
      return (
        <line
          key={key}
          x1={num(prim.x1) * sx}
          y1={num(prim.y1) * sy}
          x2={num(prim.x2) * sx}
          y2={num(prim.y2) * sy}
        />
      );
    case "rect": {
      const x = num(prim.x ?? prim.x1);
      const y = num(prim.y ?? prim.y1);
      const w = num(prim.w ?? (prim.x2 != null ? prim.x2 - x : 1), 1);
      const h = num(prim.h ?? (prim.y2 != null ? prim.y2 - y : 1), 1);
      return (
        <rect
          key={key}
          x={x * sx}
          y={y * sy}
          width={Math.abs(w) * sx}
          height={Math.abs(h) * sy}
          rx={prim.rx != null ? num(prim.rx) * Math.min(sx, sy) : undefined}
        />
      );
    }
    case "circle":
      return (
        <ellipse
          key={key}
          cx={num(prim.cx, 0.5) * sx}
          cy={num(prim.cy, 0.5) * sy}
          rx={num(prim.r, 0.5) * sx}
          ry={num(prim.r, 0.5) * sy}
        />
      );
    case "arc":
      return <path key={key} d={arcPath(prim, sx, sy)} />;
    default:
      return null;
  }
};

// Maps a symbol's unit-box primitives into a width×height box at the local
// origin. stroke inherits currentColor so callers control it via CSS color.
export const SymbolShapes = ({
  primitives,
  width,
  height,
  strokeWidth = 1,
}) => (
  <g
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {(primitives || []).map((prim) => renderPrimitive(prim, width, height))}
  </g>
);

export const Chevron = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
);

const SymbolPreview = ({ symbol, size = 24 }) => {
  const wmm = symbol?.defaultWmm > 0 ? symbol.defaultWmm : 1;
  const hmm = symbol?.defaultHmm > 0 ? symbol.defaultHmm : 1;
  const inner = 19;
  const w = wmm >= hmm ? inner : (inner * wmm) / hmm;
  const h = wmm >= hmm ? (inner * hmm) / wmm : inner;
  const label = symbol?.label || "CAD symbol";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={label}
      className="shrink-0 text-gray-700"
    >
      <title>{label}</title>
      <g transform={`translate(${(24 - w) / 2} ${(24 - h) / 2})`}>
        <SymbolShapes
          primitives={symbol?.primitives}
          width={w}
          height={h}
          strokeWidth={1.1}
        />
      </g>
    </svg>
  );
};

export default SymbolPreview;
