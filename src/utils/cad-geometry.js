import { createRequire } from "node:module";

import { SYMBOLS } from "./cad-symbols.js";

// All raw geometry lives in a normalized image-space coordinate system:
// origin top-left, x right, y down, longest image side scaled to COORD_RANGE.
// processFloorPlanGeometry converts everything to real millimeters (still y-down).
export const COORD_RANGE = 1000;

const COORD_TOLERANCE = 50; // allow slight model overshoot before dropping
const MIN_WALL_LENGTH = 4;
const ANGLE_SNAP_DEGREES = 3;
const ENDPOINT_SNAP_DISTANCE = 8;
const MIN_WALLS_FOR_PLAN = 3;
const MAX_LABEL_LENGTH = 40;

const DEFAULT_WALL_THICKNESS_MM = 115;
const MIN_WALL_THICKNESS_MM = 50;
const MAX_WALL_THICKNESS_MM = 500;
const GRID_MM = 5;
const OPENING_CUT_MARGIN_MM = 10;
const MM_PER_UNIT_MIN = 1;
const MM_PER_UNIT_MAX = 500;
const SCALE_AGREEMENT_RATIO = 0.15;
const DOOR_HEURISTIC_MM = 850;
const ASSUMED_LONGEST_WALL_MM = 5000;

const toFiniteNumber = (value) => {
  const num = typeof value === "string" ? Number(value) : value;
  return typeof num === "number" && Number.isFinite(num) ? num : null;
};

const inRange = (value) =>
  value >= -COORD_TOLERANCE && value <= COORD_RANGE + COORD_TOLERANCE;

const segmentLength = ({ x1, y1, x2, y2 }) => Math.hypot(x2 - x1, y2 - y1);

const parseSegment = (raw) => {
  const x1 = toFiniteNumber(raw?.x1);
  const y1 = toFiniteNumber(raw?.y1);
  const x2 = toFiniteNumber(raw?.x2);
  const y2 = toFiniteNumber(raw?.y2);
  if ([x1, y1, x2, y2].some((v) => v === null || !inRange(v))) {
    return null;
  }
  const segment = { x1, y1, x2, y2 };
  return segmentLength(segment) >= MIN_WALL_LENGTH ? segment : null;
};

// Rotate a segment about its midpoint onto the nearest axis when it is
// within ANGLE_SNAP_DEGREES of horizontal/vertical — scanned plans are
// rarely pixel-straight, but their walls almost always are.
const snapSegmentAngle = (segment) => {
  const angle =
    (Math.atan2(segment.y2 - segment.y1, segment.x2 - segment.x1) * 180) /
    Math.PI;
  const nearest = Math.round(angle / 90) * 90;
  if (Math.abs(angle - nearest) > ANGLE_SNAP_DEGREES) {
    return segment;
  }
  const midX = (segment.x1 + segment.x2) / 2;
  const midY = (segment.y1 + segment.y2) / 2;
  const half = segmentLength(segment) / 2;
  const horizontal = nearest % 180 === 0;
  return horizontal
    ? { x1: midX - half, y1: midY, x2: midX + half, y2: midY }
    : { x1: midX, y1: midY - half, x2: midX, y2: midY + half };
};

// Greedy-cluster wall endpoints so corners actually meet after snapping.
const snapWallEndpoints = (walls) => {
  const clusters = [];
  const snapPoint = (x, y) => {
    for (const cluster of clusters) {
      if (Math.hypot(cluster.x - x, cluster.y - y) <= ENDPOINT_SNAP_DISTANCE) {
        cluster.x = (cluster.x * cluster.count + x) / (cluster.count + 1);
        cluster.y = (cluster.y * cluster.count + y) / (cluster.count + 1);
        cluster.count += 1;
        return cluster;
      }
    }
    const cluster = { x, y, count: 1 };
    clusters.push(cluster);
    return cluster;
  };

  const snapped = walls.map((wall) => ({
    ...wall,
    start: snapPoint(wall.x1, wall.y1),
    end: snapPoint(wall.x2, wall.y2),
  }));

  return snapped
    .map(({ start, end, ...wall }) => ({
      ...wall,
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
    }))
    .filter((wall) => segmentLength(wall) >= MIN_WALL_LENGTH);
};

const sanitizeLabel = (value) => {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_LABEL_LENGTH);
};

// --- extraction completion ---------------------------------------------------
// Vision models trace exterior walls reliably but drop implied interior walls,
// leave room outlines drifting off the walls, and place openings slightly off
// their wall. Room polygons are the most reliable extraction output, so they
// are used to heal all three. Applied only to fresh extractions (never to
// client-edited geometry, where re-deriving would fight user deletions).
const ROOM_SNAP_TOLERANCE = 12;
const EDGE_BACKING_TOLERANCE = 10;
const OPENING_SNAP_TOLERANCE = 15;
const MIN_DERIVED_WALL_LENGTH = 15;
const DERIVED_WALL_DEDUPE_DISTANCE = 8;

// Closest point on segment; returns {dist, x, y, t}
const projectOnSegment = (px, py, seg) => {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const lengthSq = dx * dx + dy * dy || 1;
  const t = Math.min(
    1,
    Math.max(0, ((px - seg.x1) * dx + (py - seg.y1) * dy) / lengthSq),
  );
  const x = seg.x1 + t * dx;
  const y = seg.y1 + t * dy;
  return { dist: Math.hypot(px - x, py - y), x, y, t };
};

const snapRoomPolygonsToWalls = (rooms, walls) => {
  for (const room of rooms) {
    room.polygon = room.polygon.map(([x, y]) => {
      let best = null;
      for (const wall of walls) {
        // prefer wall endpoints (corners), then edges
        for (const [ex, ey] of [
          [wall.x1, wall.y1],
          [wall.x2, wall.y2],
        ]) {
          const dist = Math.hypot(x - ex, y - ey);
          if (dist <= ROOM_SNAP_TOLERANCE && (!best || dist < best.dist)) {
            best = { dist: dist * 0.75, x: ex, y: ey }; // bias toward corners
          }
        }
        const proj = projectOnSegment(x, y, wall);
        if (
          proj.dist <= ROOM_SNAP_TOLERANCE &&
          (!best || proj.dist < best.dist)
        ) {
          best = proj;
        }
      }
      return best ? [best.x, best.y] : [x, y];
    });
  }
};

const edgeIsBacked = (x1, y1, x2, y2, walls) => {
  let backed = 0;
  const samples = [0.1, 0.3, 0.5, 0.7, 0.9];
  for (const t of samples) {
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    if (
      walls.some(
        (wall) => projectOnSegment(px, py, wall).dist <= EDGE_BACKING_TOLERANCE,
      )
    ) {
      backed++;
    }
  }
  return backed >= 4;
};

// Room-polygon edges with no wall behind them are missing interior walls.
const deriveWallsFromRooms = (rooms, walls) => {
  const derived = [];
  const sameEndpoints = (a, b) =>
    (Math.hypot(a.x1 - b.x1, a.y1 - b.y1) <= DERIVED_WALL_DEDUPE_DISTANCE &&
      Math.hypot(a.x2 - b.x2, a.y2 - b.y2) <= DERIVED_WALL_DEDUPE_DISTANCE) ||
    (Math.hypot(a.x1 - b.x2, a.y1 - b.y2) <= DERIVED_WALL_DEDUPE_DISTANCE &&
      Math.hypot(a.x2 - b.x1, a.y2 - b.y1) <= DERIVED_WALL_DEDUPE_DISTANCE);
  for (const room of rooms) {
    const points = room.polygon;
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      const candidate = { x1, y1, x2, y2 };
      if (segmentLength(candidate) < MIN_DERIVED_WALL_LENGTH) continue;
      if (edgeIsBacked(x1, y1, x2, y2, walls)) continue;
      if (derived.some((wall) => sameEndpoints(wall, candidate))) continue;
      derived.push({
        ...snapSegmentAngle(candidate),
        thickness: null,
        source: "inferred",
      });
    }
  }
  return derived;
};

// Slide each opening onto its nearest wall's centerline, preserving length.
// Annotates each opening with transient snap evidence — `displacement` (how
// far its midpoint moved) or `offWall` (no wall within tolerance) — which the
// confidence-scoring pass consumes and strips before output.
const snapOpeningsToWalls = (openings, walls) =>
  openings.map((opening) => {
    const midX = (opening.x1 + opening.x2) / 2;
    const midY = (opening.y1 + opening.y2) / 2;
    let best = null;
    for (const wall of walls) {
      const proj = projectOnSegment(midX, midY, wall);
      if (
        proj.dist <= OPENING_SNAP_TOLERANCE &&
        (!best || proj.dist < best.dist)
      ) {
        best = { proj, wall };
      }
    }
    if (!best) return { ...opening, offWall: true };
    const { wall, proj } = best;
    const wallLength = segmentLength(wall) || 1;
    const ux = (wall.x2 - wall.x1) / wallLength;
    const uy = (wall.y2 - wall.y1) / wallLength;
    const half = segmentLength(opening) / 2;
    return {
      ...opening,
      displacement: proj.dist,
      x1: proj.x - ux * half,
      y1: proj.y - uy * half,
      x2: proj.x + ux * half,
      y2: proj.y + uy * half,
    };
  });

// --- structural confidence -----------------------------------------------
// Per-element confidence is derived purely from structure — what other
// evidence in the drawing corroborates an element — never from model
// self-reports, which are systematically overconfident. Every wall, opening,
// and fixture in sanitized output carries:
//   source: "traced" (model-extracted) | "inferred" (derived from room
//           boundaries) | "user" (editor-created or user-confirmed)
//   confidence: 0..1
const CONFIDENCE_TRACED_WALL = 0.85;
const CONFIDENCE_TRACED_WALL_BACKED = 0.95;
const CONFIDENCE_INFERRED_WALL = 0.35;
const CONFIDENCE_INFERRED_WALL_BACKED = 0.55;
const CONFIDENCE_OPENING = 0.8;
const CONFIDENCE_OPENING_DISPLACED = 0.5;
const CONFIDENCE_WINDOW_OFF_WALL = 0.4;
const CONFIDENCE_FIXTURE = 0.7; // bounding boxes are coarser than segments
const REVIEW_THRESHOLD = 0.6;
const DIMENSION_PARALLEL_DEGREES = 5;
const DIMENSION_LATERAL_TOLERANCE = 12;
const DIMENSION_OVERLAP_RATIO = 0.6;
const OPENING_DISPLACEMENT_LIMIT = 8;

// Provenance already stamped on an incoming element is preserved: "user"
// elements keep confidence 1 exactly (never downgraded), and round-tripped
// "traced"/"inferred" elements keep their previously computed score. Returns
// null for fresh model output, which gets scored structurally instead.
const carriedProvenance = (element) => {
  if (element?.source === "user") {
    return { source: "user", confidence: 1 };
  }
  if (
    (element?.source === "traced" || element?.source === "inferred") &&
    typeof element?.confidence === "number" &&
    Number.isFinite(element.confidence)
  ) {
    return { source: element.source, confidence: element.confidence };
  }
  return null;
};

// A printed dimension corroborates a wall when its segment is parallel to it
// (within DIMENSION_PARALLEL_DEGREES), lies within
// DIMENSION_LATERAL_TOLERANCE units of the wall line, and its projection
// overlaps at least DIMENSION_OVERLAP_RATIO of the wall span.
const dimensionBacksWall = (wall, dimensions) => {
  const wallLength = segmentLength(wall);
  if (!wallLength) return false;
  const ux = (wall.x2 - wall.x1) / wallLength;
  const uy = (wall.y2 - wall.y1) / wallLength;
  const along = (x, y) => (x - wall.x1) * ux + (y - wall.y1) * uy;
  const lateral = (x, y) => Math.abs((y - wall.y1) * ux - (x - wall.x1) * uy);
  return (dimensions ?? []).some((dimension) => {
    const length = segmentLength(dimension);
    if (!length) return false;
    const cos =
      Math.abs(
        (dimension.x2 - dimension.x1) * ux + (dimension.y2 - dimension.y1) * uy,
      ) / length;
    const angle = (Math.acos(Math.min(1, cos)) * 180) / Math.PI;
    if (angle > DIMENSION_PARALLEL_DEGREES) return false;
    if (
      lateral(dimension.x1, dimension.y1) > DIMENSION_LATERAL_TOLERANCE ||
      lateral(dimension.x2, dimension.y2) > DIMENSION_LATERAL_TOLERANCE
    ) {
      return false;
    }
    const t1 = along(dimension.x1, dimension.y1);
    const t2 = along(dimension.x2, dimension.y2);
    const overlap =
      Math.min(wallLength, Math.max(t1, t2)) - Math.max(0, Math.min(t1, t2));
    return overlap >= DIMENSION_OVERLAP_RATIO * wallLength;
  });
};

const FLOOR_PATTERNS = new Set(["tiles", "herringbone", "planks"]);

// Asset sizes are optional; anything larger than this (normalized units) is
// clamped rather than dropped.
const MAX_ASSET_SIZE = 600;

const sanitizeAssetId = (value, index) => {
  const cleaned =
    typeof value === "string"
      ? value.replace(/[^a-zA-Z0-9-]/g, "").slice(0, MAX_LABEL_LENGTH)
      : "";
  return cleaned || `asset-${index}`;
};

/**
 * Validate and clean raw model-extracted geometry.
 * Drops invalid entities (collecting warnings) instead of failing the whole
 * conversion; throws only when too little survives to draw a plan.
 * Returns { geometry: { walls, openings, rooms, dimensions }, warnings }.
 */
export const sanitizeFloorPlanGeometry = (raw, options = {}) => {
  if (!raw || typeof raw !== "object") {
    throw new Error("Model returned no readable geometry");
  }

  const { completeFromRooms = false } = options;
  const warnings = [];

  const rawWalls = Array.isArray(raw.walls) ? raw.walls : [];
  let walls = rawWalls
    .map((wall) => {
      const segment = parseSegment(wall);
      if (!segment) return null;
      const thickness = toFiniteNumber(wall?.thickness);
      return {
        ...snapSegmentAngle(segment),
        thickness: thickness && thickness > 0 ? Math.min(thickness, 40) : null,
        ...carriedProvenance(wall),
      };
    })
    .filter(Boolean);
  if (walls.length < rawWalls.length) {
    warnings.push(
      `${rawWalls.length - walls.length} wall segment(s) had invalid coordinates and were dropped`,
    );
  }
  walls = snapWallEndpoints(walls);

  if (walls.length < MIN_WALLS_FOR_PLAN) {
    throw new Error(
      "Could not detect enough wall structure to draw a floor plan",
    );
  }

  const rawOpenings = Array.isArray(raw.openings) ? raw.openings : [];
  let openings = rawOpenings
    .map((opening) => {
      const segment = parseSegment(opening);
      if (
        !segment ||
        (opening?.type !== "door" && opening?.type !== "window")
      ) {
        return null;
      }
      return {
        ...segment,
        type: opening.type,
        hingeAtStart:
          typeof opening?.hingeAtStart === "boolean"
            ? opening.hingeAtStart
            : true,
        swingSide: opening?.swingSide === "right" ? "right" : "left",
        ...carriedProvenance(opening),
      };
    })
    .filter(Boolean);
  if (openings.length < rawOpenings.length) {
    warnings.push(
      `${rawOpenings.length - openings.length} door/window marking(s) were unreadable and were dropped`,
    );
  }

  const rawRooms = Array.isArray(raw.rooms) ? raw.rooms : [];
  const rooms = rawRooms
    .map((room) => {
      const points = (Array.isArray(room?.polygon) ? room.polygon : [])
        .map((point) => {
          const x = toFiniteNumber(point?.[0]);
          const y = toFiniteNumber(point?.[1]);
          return x !== null && y !== null && inRange(x) && inRange(y)
            ? [x, y]
            : null;
        })
        .filter(Boolean);
      if (points.length < 3) return null;
      return {
        label: sanitizeLabel(room?.label),
        polygon: points,
        floorPattern: FLOOR_PATTERNS.has(room?.floorPattern)
          ? room.floorPattern
          : null,
      };
    })
    .filter(Boolean);
  if (rooms.length < rawRooms.length) {
    warnings.push(
      `${rawRooms.length - rooms.length} room outline(s) were unreadable and were dropped`,
    );
  }

  // Dimension annotations are optional scale hints — drop bad ones silently.
  const rawDimensions = Array.isArray(raw.dimensions) ? raw.dimensions : [];
  const dimensions = rawDimensions
    .map((dimension) => {
      const segment = parseSegment(dimension);
      const valueMm = toFiniteNumber(dimension?.valueMm);
      if (!segment || valueMm === null || valueMm <= 0) return null;
      return { text: sanitizeLabel(dimension?.text), valueMm, ...segment };
    })
    .filter(Boolean);

  // Fixtures are optional bounding boxes — drop bad ones silently.
  const FIXTURE_TYPES = new Set([
    "stairs",
    "fireplace",
    "sink",
    "counter",
    "closet",
    "appliance",
    "bathroom",
  ]);
  const rawFixtures = Array.isArray(raw.fixtures) ? raw.fixtures : [];
  const fixtures = rawFixtures
    .map((fixture) => {
      const x1 = toFiniteNumber(fixture?.x1);
      const y1 = toFiniteNumber(fixture?.y1);
      const x2 = toFiniteNumber(fixture?.x2);
      const y2 = toFiniteNumber(fixture?.y2);
      if ([x1, y1, x2, y2].some((v) => v === null || !inRange(v))) return null;
      const box = {
        x1: Math.min(x1, x2),
        y1: Math.min(y1, y2),
        x2: Math.max(x1, x2),
        y2: Math.max(y1, y2),
      };
      if (box.x2 - box.x1 < 4 || box.y2 - box.y1 < 4) return null;
      return {
        type: FIXTURE_TYPES.has(fixture?.type) ? fixture.type : "other",
        label: sanitizeLabel(fixture?.label),
        ...box,
        ...(carriedProvenance(fixture) ?? {
          source: "traced",
          confidence: CONFIDENCE_FIXTURE,
        }),
      };
    })
    .filter(Boolean);

  // Placed furniture symbols are optional overlays — drop bad ones silently.
  // w/h stay null when absent or invalid: the symbol's real-mm defaults are
  // applied at processing time (no scale is known yet at this stage).
  const rawAssets = Array.isArray(raw.assets) ? raw.assets : [];
  const assets = rawAssets
    .map((asset, index) => {
      if (!SYMBOLS[asset?.symbol]) return null;
      const x = toFiniteNumber(asset?.x);
      const y = toFiniteNumber(asset?.y);
      if (x === null || y === null || !inRange(x) || !inRange(y)) return null;
      const parseSize = (value) => {
        const size = toFiniteNumber(value);
        return size !== null && size > 0
          ? Math.min(size, MAX_ASSET_SIZE)
          : null;
      };
      const rotation = toFiniteNumber(asset?.rotation);
      return {
        id: sanitizeAssetId(asset?.id, index),
        symbol: asset.symbol,
        x,
        y,
        w: parseSize(asset?.w),
        h: parseSize(asset?.h),
        rotation: rotation === null ? 0 : ((rotation % 360) + 360) % 360,
      };
    })
    .filter(Boolean);

  if (completeFromRooms && rooms.length > 0) {
    snapRoomPolygonsToWalls(rooms, walls);
    const derived = deriveWallsFromRooms(rooms, walls);
    if (derived.length > 0) {
      walls = snapWallEndpoints([...walls, ...derived]);
      warnings.push(
        `${derived.length} interior wall(s) inferred from room boundaries`,
      );
    }
    openings = snapOpeningsToWalls(openings, walls);
  }

  // Score fresh elements structurally; elements whose provenance was carried
  // through parsing (user-confirmed or round-tripped) already have a numeric
  // confidence and are left untouched.
  for (const wall of walls) {
    if (typeof wall.confidence === "number") continue;
    const inferred = wall.source === "inferred";
    const backed = dimensionBacksWall(wall, dimensions);
    wall.source = inferred ? "inferred" : "traced";
    wall.confidence = inferred
      ? backed
        ? CONFIDENCE_INFERRED_WALL_BACKED
        : CONFIDENCE_INFERRED_WALL
      : backed
        ? CONFIDENCE_TRACED_WALL_BACKED
        : CONFIDENCE_TRACED_WALL;
  }
  openings = openings.map(({ displacement, offWall, ...opening }) => {
    if (typeof opening.confidence === "number") return opening;
    opening.source = "traced";
    opening.confidence =
      opening.type === "window" && offWall
        ? CONFIDENCE_WINDOW_OFF_WALL
        : displacement > OPENING_DISPLACEMENT_LIMIT
          ? CONFIDENCE_OPENING_DISPLACED
          : CONFIDENCE_OPENING;
    return opening;
  });

  return {
    geometry: { walls, openings, rooms, dimensions, fixtures, assets },
    warnings,
  };
};

/**
 * Count sanitized elements needing human review: walls, openings, and
 * fixtures whose structural confidence is below the review threshold.
 * Returns { flagged, total }.
 */
export const reviewSummary = (geometry) => {
  const elements = [
    ...(geometry?.walls ?? []),
    ...(geometry?.openings ?? []),
    ...(geometry?.fixtures ?? []),
  ];
  return {
    flagged: elements.filter((element) => element.confidence < REVIEW_THRESHOLD)
      .length,
    total: elements.length,
  };
};

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

/**
 * Determine millimeters per normalized unit for a sanitized geometry.
 * Prefers explicit dimension annotations, then door widths, then a
 * longest-wall assumption. Returns { mmPerUnit, source, confidence, samples }.
 */
export const solveScale = (geometry) => {
  const dimensions = Array.isArray(geometry?.dimensions)
    ? geometry.dimensions
    : [];
  const samples = dimensions
    .map((dimension) => dimension.valueMm / segmentLength(dimension))
    .filter(
      (value) =>
        Number.isFinite(value) &&
        value >= MM_PER_UNIT_MIN &&
        value <= MM_PER_UNIT_MAX,
    );

  if (samples.length > 0) {
    const mmPerUnit = median(samples);
    const agreeing = samples.filter(
      (value) =>
        Math.abs(value - mmPerUnit) <= SCALE_AGREEMENT_RATIO * mmPerUnit,
    ).length;
    return {
      mmPerUnit,
      source: "dimensions",
      confidence: agreeing >= 2 ? 0.9 : 0.6,
      samples: samples.length,
    };
  }

  const doorLengths = (geometry?.openings ?? [])
    .filter((opening) => opening.type === "door")
    .map(segmentLength);
  if (doorLengths.length > 0) {
    return {
      mmPerUnit: DOOR_HEURISTIC_MM / median(doorLengths),
      source: "door-heuristic",
      confidence: 0.4,
      samples: 0,
    };
  }

  const longestWall = Math.max(...geometry.walls.map(segmentLength));
  return {
    mmPerUnit: ASSUMED_LONGEST_WALL_MM / longestWall,
    source: "assumed",
    confidence: 0.1,
    samples: 0,
  };
};

// --- clipper2-wasm (loaded once, lazily) ---

const nodeRequire = createRequire(import.meta.url);
let clipperPromise = null;

const loadClipper = () => {
  if (!clipperPromise) {
    const m = nodeRequire("clipper2-wasm/dist/umd/clipper2z");
    const factory = m.default || m;
    clipperPromise = factory({
      locateFile: (file) =>
        nodeRequire("node:path").join(
          process.cwd(),
          "node_modules/clipper2-wasm/dist/umd/",
          file,
        ),
    });
  }
  return clipperPromise;
};

const snapToGrid = (value) => Math.round(value / GRID_MM) * GRID_MM;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const scaleSegment = (segment, mmPerUnit) => ({
  x1: segment.x1 * mmPerUnit,
  y1: segment.y1 * mmPerUnit,
  x2: segment.x2 * mmPerUnit,
  y2: segment.y2 * mmPerUnit,
});

// Force near-axis segments exactly onto the axis, keeping endpoints on the
// 5mm grid (unlike snapSegmentAngle, which preserves length instead).
const orthogonalizeSegment = (segment) => {
  const angle =
    (Math.atan2(segment.y2 - segment.y1, segment.x2 - segment.x1) * 180) /
    Math.PI;
  const nearest = Math.round(angle / 90) * 90;
  if (Math.abs(angle - nearest) > ANGLE_SNAP_DEGREES) {
    return segment;
  }
  if (nearest % 180 === 0) {
    const y = snapToGrid((segment.y1 + segment.y2) / 2);
    return { x1: segment.x1, y1: y, x2: segment.x2, y2: y };
  }
  const x = snapToGrid((segment.x1 + segment.x2) / 2);
  return { x1: x, y1: segment.y1, x2: x, y2: segment.y2 };
};

const distancePointToSegment = (px, py, { x1, y1, x2, y2 }) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  const t =
    lengthSq === 0
      ? 0
      : clamp(((px - x1) * dx + (py - y1) * dy) / lengthSq, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
};

const nearestWall = (segment, walls) => {
  const midX = (segment.x1 + segment.x2) / 2;
  const midY = (segment.y1 + segment.y2) / 2;
  let best = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const wall of walls) {
    const distance = distancePointToSegment(midX, midY, wall);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = wall;
    }
  }
  return best;
};

const pointInPolygon = ([px, py], polygon) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
};

const pathToPoints = (path) => {
  const points = [];
  for (let i = 0; i < path.size(); i += 1) {
    const point = path.get(i);
    points.push([Number(point.x), Number(point.y)]);
  }
  return points;
};

const pushSegmentPath = (clipper, paths, segment) => {
  paths.push_back(
    clipper.MakePath64([
      Math.round(segment.x1),
      Math.round(segment.y1),
      Math.round(segment.x2),
      Math.round(segment.y2),
    ]),
  );
};

// Inflate a centerline segment into a rectangle of the given half-width.
const inflateSegment = (clipper, segment, halfWidth, target) => {
  const line = new clipper.Paths64();
  pushSegmentPath(clipper, line, segment);
  const rect = clipper.InflatePaths64(
    line,
    Math.round(halfWidth),
    clipper.JoinType.Miter,
    clipper.EndType.Butt,
    2,
    2,
  );
  for (let i = 0; i < rect.size(); i += 1) {
    target.push_back(rect.get(i));
  }
  line.delete();
  rect.delete();
};

// Union all wall rectangles, subtract opening gaps, and regroup the result
// into outer boundaries with their contained holes.
const buildWallNetwork = (clipper, walls, openings) => {
  const wallRects = new clipper.Paths64();
  for (const wall of walls) {
    inflateSegment(clipper, wall, wall.thickness / 2, wallRects);
  }

  const emptyClip = new clipper.Paths64();
  let network = clipper.Union64(wallRects, emptyClip, clipper.FillRule.NonZero);
  wallRects.delete();
  emptyClip.delete();

  if (openings.length > 0) {
    const gaps = new clipper.Paths64();
    for (const opening of openings) {
      const wall = nearestWall(opening, walls);
      const thickness = wall ? wall.thickness : DEFAULT_WALL_THICKNESS_MM;
      inflateSegment(
        clipper,
        opening,
        thickness / 2 + OPENING_CUT_MARGIN_MM,
        gaps,
      );
    }
    const cut = clipper.Difference64(network, gaps, clipper.FillRule.NonZero);
    network.delete();
    gaps.delete();
    network = cut;
  }

  const outers = [];
  const holes = [];
  for (let i = 0; i < network.size(); i += 1) {
    const path = network.get(i);
    const points = pathToPoints(path);
    // NonZero output orientation: positive area = outer, negative = hole.
    (clipper.AreaPath64(path) > 0 ? outers : holes).push(points);
  }
  network.delete();

  const wallNetwork = outers.map((outer) => ({ outer, holes: [] }));
  for (const hole of holes) {
    const probe = [
      hole.reduce((sum, p) => sum + p[0], 0) / hole.length,
      hole.reduce((sum, p) => sum + p[1], 0) / hole.length,
    ];
    const owner =
      wallNetwork.find((entry) => pointInPolygon(probe, entry.outer)) ??
      wallNetwork[0];
    owner?.holes.push(hole);
  }
  return wallNetwork;
};

const buildDoor = (opening) => {
  const width = segmentLength(opening);
  const hingeX = opening.hingeAtStart ? opening.x1 : opening.x2;
  const hingeY = opening.hingeAtStart ? opening.y1 : opening.y2;
  const freeX = opening.hingeAtStart ? opening.x2 : opening.x1;
  const freeY = opening.hingeAtStart ? opening.y2 : opening.y1;
  const ux = (freeX - hingeX) / width;
  const uy = (freeY - hingeY) / width;
  // Leaf is the opening direction rotated ±90°; the swing arc sweeps the
  // quarter circle from the leaf back to the opening direction.
  const left = opening.swingSide === "left";
  const lx = left ? -uy : uy;
  const ly = left ? ux : -ux;
  const startDeg = (Math.atan2(ly, lx) * 180) / Math.PI;
  return {
    width,
    hinge: [hingeX, hingeY],
    leaf: {
      x1: hingeX,
      y1: hingeY,
      x2: hingeX + lx * width,
      y2: hingeY + ly * width,
    },
    swingArc: {
      cx: hingeX,
      cy: hingeY,
      r: width,
      startDeg,
      endDeg: startDeg + (left ? -90 : 90),
    },
  };
};

const buildWindow = (opening, walls) => {
  const wall = nearestWall(opening, walls);
  const half = (wall ? wall.thickness : DEFAULT_WALL_THICKNESS_MM) / 2;
  const length = segmentLength(opening);
  const nx = (-(opening.y2 - opening.y1) / length) * half;
  const ny = ((opening.x2 - opening.x1) / length) * half;
  const offsetLine = (sign) => ({
    x1: opening.x1 + sign * nx,
    y1: opening.y1 + sign * ny,
    x2: opening.x2 + sign * nx,
    y2: opening.y2 + sign * ny,
  });
  return {
    x1: opening.x1,
    y1: opening.y1,
    x2: opening.x2,
    y2: opening.y2,
    faceLines: [offsetLine(1), offsetLine(-1)],
    glazingLine: {
      x1: opening.x1,
      y1: opening.y1,
      x2: opening.x2,
      y2: opening.y2,
    },
  };
};

/**
 * Convert sanitized normalized geometry into real-millimeter CAD geometry
 * (still y-down image space; renderers handle the y-flip).
 * `scale` is a solveScale() result, or a bare mmPerUnit number.
 */
export const processFloorPlanGeometry = async (geometry, scale) => {
  const scaleInfo =
    typeof scale === "number"
      ? { mmPerUnit: scale, source: "explicit", confidence: 1, samples: 0 }
      : scale;
  const { mmPerUnit } = scaleInfo;

  const walls = geometry.walls.map((wall) => {
    const scaled = scaleSegment(wall, mmPerUnit);
    const snapped = orthogonalizeSegment({
      x1: snapToGrid(scaled.x1),
      y1: snapToGrid(scaled.y1),
      x2: snapToGrid(scaled.x2),
      y2: snapToGrid(scaled.y2),
    });
    return {
      ...wall, // carries source/confidence through unchanged
      ...snapped,
      thickness:
        wall.thickness == null
          ? DEFAULT_WALL_THICKNESS_MM
          : clamp(
              wall.thickness * mmPerUnit,
              MIN_WALL_THICKNESS_MM,
              MAX_WALL_THICKNESS_MM,
            ),
    };
  });

  const openings = geometry.openings.map((opening) => ({
    ...opening,
    ...scaleSegment(opening, mmPerUnit),
  }));

  const clipper = await loadClipper();
  const wallNetwork = buildWallNetwork(clipper, walls, openings);

  const doors = openings
    .filter((opening) => opening.type === "door")
    .map((opening) => ({
      ...buildDoor(opening),
      source: opening.source,
      confidence: opening.confidence,
    }));
  const windows = openings
    .filter((opening) => opening.type === "window")
    .map((opening) => ({
      ...buildWindow(opening, walls),
      source: opening.source,
      confidence: opening.confidence,
    }));

  // Shoelace area of the mm polygon, in m² — shown to the user per room.
  const polygonAreaM2 = (polygon) => {
    let doubled = 0;
    for (let i = 0; i < polygon.length; i++) {
      const [x1, y1] = polygon[i];
      const [x2, y2] = polygon[(i + 1) % polygon.length];
      doubled += x1 * y2 - x2 * y1;
    }
    return Math.round((Math.abs(doubled / 2) / 1e6) * 10) / 10;
  };

  const rooms = geometry.rooms.map((room) => {
    const polygon = room.polygon.map(([x, y]) => [
      snapToGrid(x * mmPerUnit),
      snapToGrid(y * mmPerUnit),
    ]);
    return {
      label: room.label,
      polygon,
      areaM2: polygonAreaM2(polygon),
      floorPattern: room.floorPattern ?? null,
    };
  });

  // Assets scale like everything else; null sizes fall back to the symbol's
  // real-world defaults, which are already millimeters.
  const assets = (geometry.assets ?? []).map((asset) => {
    const symbol = SYMBOLS[asset.symbol];
    return {
      ...asset,
      x: asset.x * mmPerUnit,
      y: asset.y * mmPerUnit,
      w: asset.w == null ? symbol.defaultWmm : asset.w * mmPerUnit,
      h: asset.h == null ? symbol.defaultHmm : asset.h * mmPerUnit,
    };
  });

  const fixtures = (geometry.fixtures ?? []).map((fixture) => ({
    type: fixture.type,
    label: fixture.label,
    source: fixture.source,
    confidence: fixture.confidence,
    x1: snapToGrid(fixture.x1 * mmPerUnit),
    y1: snapToGrid(fixture.y1 * mmPerUnit),
    x2: snapToGrid(fixture.x2 * mmPerUnit),
    y2: snapToGrid(fixture.y2 * mmPerUnit),
  }));

  const dimensions = (geometry.dimensions ?? []).map((dimension) => ({
    text: dimension.text,
    valueMm: dimension.valueMm,
    ...scaleSegment(dimension, mmPerUnit),
  }));

  const xs = [];
  const ys = [];
  const addPoint = (x, y) => {
    xs.push(x);
    ys.push(y);
  };
  for (const { outer, holes } of wallNetwork) {
    for (const ring of [outer, ...holes]) {
      for (const [x, y] of ring) addPoint(x, y);
    }
  }
  for (const segment of [...walls, ...dimensions]) {
    addPoint(segment.x1, segment.y1);
    addPoint(segment.x2, segment.y2);
  }
  for (const door of doors) {
    addPoint(door.hinge[0], door.hinge[1]);
    addPoint(door.leaf.x2, door.leaf.y2);
  }
  for (const window of windows) {
    for (const face of window.faceLines) {
      addPoint(face.x1, face.y1);
      addPoint(face.x2, face.y2);
    }
  }
  for (const room of rooms) {
    for (const [x, y] of room.polygon) addPoint(x, y);
  }
  for (const fixture of fixtures) {
    addPoint(fixture.x1, fixture.y1);
    addPoint(fixture.x2, fixture.y2);
  }
  for (const asset of assets) {
    const rad = (asset.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    for (const [sx, sy] of [
      [-0.5, -0.5],
      [0.5, -0.5],
      [0.5, 0.5],
      [-0.5, 0.5],
    ]) {
      const dx = sx * asset.w;
      const dy = sy * asset.h;
      addPoint(asset.x + dx * cos - dy * sin, asset.y + dx * sin + dy * cos);
    }
  }

  return {
    scale: scaleInfo,
    wallNetwork,
    walls,
    doors,
    windows,
    rooms,
    fixtures,
    assets,
    dimensions,
    bounds: {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    },
  };
};
