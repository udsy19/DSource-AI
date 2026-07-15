// Client-side helpers shared by the CAD studio components.
// Geometry is the normalized-unit contract object returned by /api/cad-convert.

export const GRID = 5;
export const CANVAS_MARGIN = 60;

const KIND_TO_KEY = {
  wall: "walls",
  opening: "openings",
  fixture: "fixtures",
  asset: "assets",
  room: "rooms",
};

export const kindKey = (kind) => KIND_TO_KEY[kind];

export const snapToGrid = (value) => Math.round(value / GRID) * GRID;

export const deepClone = (value) => JSON.parse(JSON.stringify(value));

let uidCounter = 0;
export const newUid = () => {
  uidCounter += 1;
  return `cad-el-${uidCounter}`;
};

// The editor addresses elements by array index (the API contract has no ids),
// but React needs stable keys — attach throwaway __id keys to a draft copy
// and strip them again before anything is POSTed back to the API.
export const withIds = (geometry) => {
  const copy = deepClone(geometry || {});
  for (const key of ["walls", "openings", "rooms", "fixtures"]) {
    copy[key] = (copy[key] || []).map((element) => ({
      ...element,
      __id: newUid(),
    }));
  }
  copy.assets = (copy.assets || []).map((element) => ({
    ...element,
    id: element.id || newUid(),
  }));
  copy.dimensions = copy.dimensions || [];
  return copy;
};

const stripUid = ({ __id: _omit, ...rest }) => rest;

export const stripIds = (geometry) => {
  const copy = { ...geometry };
  for (const key of ["walls", "openings", "rooms", "fixtures"]) {
    copy[key] = (copy[key] || []).map(stripUid);
  }
  copy.assets = copy.assets || [];
  copy.dimensions = copy.dimensions || [];
  return copy;
};

// --- Confidence / review helpers ------------------------------------------
// Contract: walls/openings/fixtures may carry source "traced"|"inferred"|"user"
// and confidence 0..1. Below 0.6 an element is flagged for review; a user
// confirm/edit stamps USER_CONFIRMED and the server preserves it.

export const FLAG_CONFIDENCE = 0.6;
export const LOW_CONFIDENCE = 0.45;

export const USER_CONFIRMED = { source: "user", confidence: 1 };

export const isFlagged = (element) =>
  typeof element?.confidence === "number" &&
  element.confidence < FLAG_CONFIDENCE;

// Review tint: red below LOW_CONFIDENCE, amber below FLAG_CONFIDENCE,
// null (= normal styling) otherwise.
export const confidenceTint = (element) => {
  if (!isFlagged(element)) return null;
  return element.confidence < LOW_CONFIDENCE ? "#dc2626" : "#f59e0b";
};

const REVIEW_KINDS = [
  ["wall", "walls"],
  ["opening", "openings"],
  ["fixture", "fixtures"],
];

export const flaggedRefs = (geometry) => {
  const refs = [];
  if (!geometry) return refs;
  for (const [kind, key] of REVIEW_KINDS) {
    (geometry[key] || []).forEach((element, index) => {
      if (isFlagged(element)) refs.push({ kind, index });
    });
  }
  return refs;
};

// --- Segment math -----------------------------------------------------------

export const segmentLength = (segment) =>
  Math.hypot(segment.x2 - segment.x1, segment.y2 - segment.y1);

// Clamped projection of point p onto segment a-b: parametric t in [0,1]
// plus the distance from p to the projected point.
export const projectPointOnSegment = (p, a, b) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t =
    lengthSq === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq),
        );
  const px = a.x + t * dx;
  const py = a.y + t * dy;
  return { t, dist: Math.hypot(p.x - px, p.y - py) };
};

// Openings hosted on a wall (Rayon pattern): captured once at drag start as
// {index, t, len} so every drag frame can re-project them onto the moved wall.
export const hostedOpeningsForWall = (geometry, wallIndex, tolerance = 10) => {
  const wall = geometry?.walls?.[wallIndex];
  if (!wall) return [];
  const a = { x: wall.x1, y: wall.y1 };
  const b = { x: wall.x2, y: wall.y2 };
  const hosted = [];
  (geometry.openings || []).forEach((opening, index) => {
    const mid = {
      x: (opening.x1 + opening.x2) / 2,
      y: (opening.y1 + opening.y2) / 2,
    };
    const { t, dist } = projectPointOnSegment(mid, a, b);
    if (dist <= tolerance)
      hosted.push({ index, t, len: segmentLength(opening) });
  });
  return hosted;
};

// Re-project hosted openings onto the (moved) wall, preserving each opening's
// fractional position t along the wall and its length.
export const reprojectHostedOpenings = (openings, wall, hosted) => {
  if (!hosted || hosted.length === 0) return openings;
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const len = Math.hypot(dx, dy);
  const ux = len > 0 ? dx / len : 1;
  const uy = len > 0 ? dy / len : 0;
  const byIndex = new Map(hosted.map((host) => [host.index, host]));
  return openings.map((opening, index) => {
    const host = byIndex.get(index);
    if (!host) return opening;
    const mx = wall.x1 + dx * host.t;
    const my = wall.y1 + dy * host.t;
    return {
      ...opening,
      x1: mx - (ux * host.len) / 2,
      y1: my - (uy * host.len) / 2,
      x2: mx + (ux * host.len) / 2,
      y2: my + (uy * host.len) / 2,
    };
  });
};

// Patch that stretches a wall to an exact length along its current direction:
// anchorEnd ("start"|"end") stays fixed, the other endpoint moves.
export const wallLengthPatch = (wall, lengthUnits, anchorEnd = "start") => {
  const anchored = anchorEnd === "end";
  const ax = anchored ? wall.x2 : wall.x1;
  const ay = anchored ? wall.y2 : wall.y1;
  const mx = anchored ? wall.x1 : wall.x2;
  const my = anchored ? wall.y1 : wall.y2;
  const current = Math.hypot(mx - ax, my - ay);
  const ux = current > 0 ? (mx - ax) / current : 1;
  const uy = current > 0 ? (my - ay) / current : 0;
  return anchored
    ? { x1: ax + ux * lengthUnits, y1: ay + uy * lengthUnits }
    : { x2: ax + ux * lengthUnits, y2: ay + uy * lengthUnits };
};

export const geometryBounds = (geometry) => {
  const xs = [];
  const ys = [];
  const segments = [
    ...(geometry?.walls || []),
    ...(geometry?.openings || []),
    ...(geometry?.fixtures || []),
  ];
  for (const segment of segments) {
    xs.push(segment.x1, segment.x2);
    ys.push(segment.y1, segment.y2);
  }
  for (const room of geometry?.rooms || []) {
    for (const point of room.polygon || []) {
      xs.push(point?.[0]);
      ys.push(point?.[1]);
    }
  }
  for (const asset of geometry?.assets || []) {
    xs.push(asset.x);
    ys.push(asset.y);
  }
  const validX = xs.filter(Number.isFinite);
  const validY = ys.filter(Number.isFinite);
  if (validX.length === 0 || validY.length === 0) return null;
  return {
    minX: Math.min(...validX),
    minY: Math.min(...validY),
    maxX: Math.max(...validX),
    maxY: Math.max(...validY),
  };
};

export const polygonBounds = (polygon) => {
  const xs = (polygon || []).map((p) => p?.[0]).filter(Number.isFinite);
  const ys = (polygon || []).map((p) => p?.[1]).filter(Number.isFinite);
  if (xs.length === 0 || ys.length === 0) return null;
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
};

// Vertex mean is accurate enough for placing a room label.
export const polygonCentroid = (polygon) => {
  const points = (polygon || []).filter(
    (p) => Number.isFinite(p?.[0]) && Number.isFinite(p?.[1]),
  );
  if (points.length === 0) return null;
  const sum = points.reduce((acc, [x, y]) => [acc[0] + x, acc[1] + y], [0, 0]);
  return { x: sum[0] / points.length, y: sum[1] / points.length };
};

// Asset w/h of null means "use the symbol defaults" (given in millimeters);
// resolve to geometry units for rendering and editing.
export const resolveAssetSize = (asset, symbol, mmPerUnit) => {
  const mm = Number.isFinite(mmPerUnit) && mmPerUnit > 0 ? mmPerUnit : 1;
  const w =
    Number.isFinite(asset?.w) && asset.w > 0
      ? asset.w
      : (symbol?.defaultWmm || 900) / mm;
  const h =
    Number.isFinite(asset?.h) && asset.h > 0
      ? asset.h
      : (symbol?.defaultHmm || 900) / mm;
  return { w, h };
};

export const FLOOR_PATTERN_OPTIONS = [
  { value: "", label: "None" },
  { value: "tiles", label: "Tiles" },
  { value: "herringbone", label: "Herringbone" },
  { value: "planks", label: "Planks" },
];
