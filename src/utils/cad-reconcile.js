import { createRequire } from "node:module";

// Reconcile extracted floor-plan geometry to its written dimensions: adjust
// wall coordinates so every printed dimension's real-world span equals its
// valueMm exactly (when the dimensions are mutually consistent), preserving
// topology — walls that shared an endpoint keep sharing it, T-junctions stay
// on their wall, axis-aligned walls stay axis-aligned.
//
// Solving is done by @salusoft89/planegcs (FreeCAD's 2D geometric constraint
// solver compiled to WASM): one solver point per wall-endpoint cluster (plus
// virtual on-wall measure points for dimensions that measure a sub-span of a
// wall), p2p_distance constraints from the mapped dimensions, and
// horizontal/vertical constraints pinning axis-aligned walls. planegcs's QR
// rank analysis identifies mutually unsatisfiable dimension constraints;
// those (and dimensions whose enforcement would distort the drawing beyond
// the movement cap) are dropped one at a time, re-solved, and reported as
// conflicting instead of silently mangling the plan.

// Endpoints within this distance (normalized 0-1000 units) are one corner.
// Local copy of the clustering idea from cad-geometry.js snapWallEndpoints
// (a private helper there) — tighter tolerance because sanitized walls have
// already been snapped, so coincident endpoints are near-exact.
const CLUSTER_TOLERANCE = 2;
// A dimension measures a wall only if their directions agree within this...
const PARALLEL_TOLERANCE_DEG = 6;
// ...the wall's projection covers at least this share of the dimension...
const MIN_OVERLAP_RATIO = 0.5;
// ...and the dimension line is offset from the wall by no more than this
// (dimension strings sit right next to what they measure).
const MAX_DIM_OFFSET = 60;
// A corner counts as a dimension's measure point when it sits within this
// distance of the dimension's endpoint along the dimension's own axis.
const ALONG_AXIS_TOLERANCE = 14;
// Virtual on-wall measure points closer than this (on the same wall) merge,
// so chained partial dimensions share their intermediate points.
const VIRTUAL_MERGE_TOLERANCE = 8;
// A dimension endpoint may fall slightly beyond its host wall's extent.
const CONTAIN_MARGIN = 6;
// A wall is treated as axis-aligned within this angle (mirrors the
// sanitizer's ANGLE_SNAP_DEGREES, so anything it snapped stays snapped).
const AXIS_TOLERANCE_DEG = 3;
// Residual thresholds in real millimeters.
const SATISFIED_MM = 5;
const CONFLICT_MM = 20;
// Any corner moving farther than this means the offending dimensions do not
// describe this drawing — they are dropped (reported as conflicting) rather
// than enforced; if the solve cannot get under the cap, reconcile aborts.
const MAX_POINT_MOVE = 60;
// Room vertices / opening endpoints within this distance of a moved corner
// travel with it.
const COINCIDE_TOLERANCE = 2;
// An opening is "on" a wall (for proportional re-projection) within this
// perpendicular distance (matches the sanitizer's OPENING_SNAP_TOLERANCE).
const OPENING_ON_WALL_TOLERANCE = 15;

const SOLVE_STATUS_SUCCESS = 0;

// --- planegcs module (loaded once, lazily) ---
// Same runtime-require + locateFile pattern as clipper2-wasm in
// cad-geometry.js: the bundler never sees the emscripten glue, and the .wasm
// is read from node_modules on disk.
const nodeRequire = createRequire(import.meta.url);
let planegcsModulePromise = null;

const loadPlanegcs = () => {
  if (!planegcsModulePromise) {
    const { init_planegcs_module } = nodeRequire("@salusoft89/planegcs");
    planegcsModulePromise = init_planegcs_module({
      locateFile: (file) =>
        nodeRequire("node:path").join(
          process.cwd(),
          "node_modules/@salusoft89/planegcs/dist/planegcs_dist/",
          file,
        ),
    });
  }
  return planegcsModulePromise;
};

const distance = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

// Greedy-cluster wall endpoints into shared corners. Returns clusters
// [{ x, y }] plus, per wall, the start/end cluster indices.
const clusterWallEndpoints = (walls) => {
  const clusters = [];
  const counts = [];
  const indexOf = (x, y) => {
    for (let i = 0; i < clusters.length; i++) {
      const c = clusters[i];
      if (distance(c.x, c.y, x, y) <= CLUSTER_TOLERANCE) {
        c.x = (c.x * counts[i] + x) / (counts[i] + 1);
        c.y = (c.y * counts[i] + y) / (counts[i] + 1);
        counts[i] += 1;
        return i;
      }
    }
    clusters.push({ x, y });
    counts.push(1);
    return clusters.length - 1;
  };
  const wallClusters = walls.map((wall) => ({
    start: indexOf(wall.x1, wall.y1),
    end: indexOf(wall.x2, wall.y2),
  }));
  return { clusters, wallClusters };
};

// Angle between two directions folded into [0, 90] degrees.
const directionAngleDeg = (dx1, dy1, dx2, dy2) => {
  const a1 = Math.atan2(dy1, dx1);
  const a2 = Math.atan2(dy2, dx2);
  let deg = Math.abs(((a1 - a2) * 180) / Math.PI) % 180;
  if (deg > 90) deg = 180 - deg;
  return deg;
};

const perpendicularDistanceToSegment = (px, py, { x1, y1, x2, y2 }) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return distance(px, py, x1, y1);
  const t = Math.min(
    Math.max(((px - x1) * dx + (py - y1) * dy) / lengthSq, 0),
    1,
  );
  return distance(px, py, x1 + t * dx, y1 + t * dy);
};

/**
 * Map every dimension to a pair of measure points. A measure point is either
 * a wall-endpoint cluster or a virtual point pinned onto a wall (for
 * dimensions measuring a sub-span, e.g. wall-to-window measurements) —
 * virtual points on the same wall merge, so chains of partial dimensions
 * share their intermediate points and their sum constrains the full span.
 *
 * Candidate walls run parallel (±PARALLEL_TOLERANCE_DEG) to the dimension,
 * their projection overlaps ≥ MIN_OVERLAP_RATIO of it, and they sit within
 * MAX_DIM_OFFSET of the dimension line. Each dimension endpoint resolves to
 * the candidate cluster nearest along the dimension's axis, or to a virtual
 * point on the candidate wall that spans it; endpoints resolving to nothing
 * (or both to the same point) leave the dimension skipped.
 */
const mapDimensions = ({
  dimensions,
  walls,
  wallClusters,
  clusters,
  mmPerUnit,
}) => {
  const virtuals = []; // { wall, x, y }
  const mappings = []; // { dimIndex, a: point-ref, b: point-ref, target }
  let skipped = 0;

  for (let di = 0; di < dimensions.length; di++) {
    const dim = dimensions[di];
    const target = dim.valueMm / mmPerUnit;
    const dLen = distance(dim.x1, dim.y1, dim.x2, dim.y2);
    if (!(target > 0) || !(dLen > 0)) {
      skipped += 1;
      continue;
    }
    const dx = (dim.x2 - dim.x1) / dLen;
    const dy = (dim.y2 - dim.y1) / dLen;
    const project = (x, y) => (x - dim.x1) * dx + (y - dim.y1) * dy;

    const candidates = [];
    for (let w = 0; w < walls.length; w++) {
      const wall = walls[w];
      const angle = directionAngleDeg(
        wall.x2 - wall.x1,
        wall.y2 - wall.y1,
        dx,
        dy,
      );
      if (angle > PARALLEL_TOLERANCE_DEG) continue;
      const t1 = project(wall.x1, wall.y1);
      const t2 = project(wall.x2, wall.y2);
      const lo = Math.min(t1, t2);
      const hi = Math.max(t1, t2);
      if (Math.min(hi, dLen) - Math.max(lo, 0) < MIN_OVERLAP_RATIO * dLen) {
        continue;
      }
      const midX = (wall.x1 + wall.x2) / 2 - dim.x1;
      const midY = (wall.y1 + wall.y2) / 2 - dim.y1;
      if (Math.abs(midX * dy - midY * dx) > MAX_DIM_OFFSET) continue;
      candidates.push({ w, lo, hi });
    }

    const resolveEndpoint = (ex, ey, tEnd) => {
      let best = -1;
      let bestAlong = ALONG_AXIS_TOLERANCE;
      for (const { w } of candidates) {
        for (const ci of [wallClusters[w].start, wallClusters[w].end]) {
          const along = Math.abs(
            project(clusters[ci].x, clusters[ci].y) - tEnd,
          );
          if (along < bestAlong) {
            bestAlong = along;
            best = ci;
          }
        }
      }
      if (best >= 0) return { cluster: best };
      const host = candidates.find(
        (c) => tEnd >= c.lo - CONTAIN_MARGIN && tEnd <= c.hi + CONTAIN_MARGIN,
      );
      if (!host) return null;
      // Project the dimension endpoint onto the host wall's line.
      const wall = walls[host.w];
      const wdx = wall.x2 - wall.x1;
      const wdy = wall.y2 - wall.y1;
      const lengthSq = wdx * wdx + wdy * wdy;
      const t = ((ex - wall.x1) * wdx + (ey - wall.y1) * wdy) / lengthSq;
      const vx = wall.x1 + t * wdx;
      const vy = wall.y1 + t * wdy;
      for (let vi = 0; vi < virtuals.length; vi++) {
        const v = virtuals[vi];
        if (
          v.wall === host.w &&
          distance(v.x, v.y, vx, vy) <= VIRTUAL_MERGE_TOLERANCE
        ) {
          return { virtual: vi };
        }
      }
      virtuals.push({ wall: host.w, x: vx, y: vy });
      return { virtual: virtuals.length - 1 };
    };

    const a = resolveEndpoint(dim.x1, dim.y1, 0);
    const b = resolveEndpoint(dim.x2, dim.y2, dLen);
    const samePoint =
      a &&
      b &&
      ((a.cluster !== undefined && a.cluster === b.cluster) ||
        (a.virtual !== undefined && a.virtual === b.virtual));
    if (!a || !b || samePoint) {
      skipped += 1;
      continue;
    }
    mappings.push({ dimIndex: di, a, b, target });
  }

  return { virtuals, mappings, skipped };
};

const pointId = (ref) =>
  ref.cluster !== undefined ? `p${ref.cluster}` : `v${ref.virtual}`;

// Build the planegcs primitive list: one point per cluster (the highest-
// degree cluster fixed, to anchor the solve), one per virtual measure point
// (pinned to its wall's line), horizontal/vertical constraints for
// axis-aligned walls, point-on-line constraints keeping T-junction corners
// attached to the wall they sit on, and one p2p_distance per mapped
// dimension not currently dropped.
const buildPrimitives = ({
  clusters,
  walls,
  wallClusters,
  virtuals,
  mappings,
  droppedDimIndices,
}) => {
  const degree = clusters.map(() => 0);
  for (const wc of wallClusters) {
    degree[wc.start] += 1;
    degree[wc.end] += 1;
  }
  const anchor = degree.indexOf(Math.max(...degree));

  const primitives = clusters.map((c, i) => ({
    id: `p${i}`,
    type: "point",
    x: c.x,
    y: c.y,
    fixed: i === anchor,
  }));
  for (let i = 0; i < virtuals.length; i++) {
    primitives.push({
      id: `v${i}`,
      type: "point",
      x: virtuals[i].x,
      y: virtuals[i].y,
      fixed: false,
    });
  }

  // Axis constraints, deduped per unordered cluster pair.
  const seenAxis = new Set();
  for (let w = 0; w < walls.length; w++) {
    const { start, end } = wallClusters[w];
    if (start === end) continue;
    const angle = directionAngleDeg(
      walls[w].x2 - walls[w].x1,
      walls[w].y2 - walls[w].y1,
      1,
      0,
    );
    const type =
      angle <= AXIS_TOLERANCE_DEG
        ? "horizontal_pp"
        : angle >= 90 - AXIS_TOLERANCE_DEG
          ? "vertical_pp"
          : null;
    if (!type) continue;
    const key = `${type}:${Math.min(start, end)}:${Math.max(start, end)}`;
    if (seenAxis.has(key)) continue;
    seenAxis.add(key);
    primitives.push({
      id: `axis${seenAxis.size}`,
      type,
      p1_id: `p${start}`,
      p2_id: `p${end}`,
    });
  }

  // T-junctions: a corner sitting mid-span on another wall must stay on it.
  let junctionCount = 0;
  for (let ci = 0; ci < clusters.length; ci++) {
    for (let w = 0; w < walls.length; w++) {
      const { start, end } = wallClusters[w];
      if (start === ci || end === ci || start === end) continue;
      if (
        perpendicularDistanceToSegment(
          clusters[ci].x,
          clusters[ci].y,
          walls[w],
        ) > CLUSTER_TOLERANCE
      ) {
        continue;
      }
      primitives.push({
        id: `tj${junctionCount++}`,
        type: "point_on_line_ppp",
        p_id: `p${ci}`,
        lp1_id: `p${start}`,
        lp2_id: `p${end}`,
      });
      break; // one host wall per junction is enough
    }
  }

  for (let i = 0; i < virtuals.length; i++) {
    const { start, end } = wallClusters[virtuals[i].wall];
    primitives.push({
      id: `onw${i}`,
      type: "point_on_line_ppp",
      p_id: `v${i}`,
      lp1_id: `p${start}`,
      lp2_id: `p${end}`,
    });
  }

  for (const m of mappings) {
    if (droppedDimIndices.has(m.dimIndex)) continue;
    primitives.push({
      id: `dim${m.dimIndex}`,
      type: "p2p_distance",
      p1_id: pointId(m.a),
      p2_id: pointId(m.b),
      distance: m.target,
    });
  }
  return primitives;
};

// Solve, dropping dimensions until the constraint set is consistent AND the
// drawing is not distorted beyond MAX_POINT_MOVE: planegcs-flagged conflicts
// go first, then (if corners still move too far) the active dimension whose
// target disagrees most with the drawn geometry. Returns solved positions
// for all points plus the dropped dimension indices, or null when even the
// fully relaxed system stays over the cap.
const solveWithRelaxation = ({
  mod,
  GcsWrapper,
  clusters,
  walls,
  wallClusters,
  virtuals,
  mappings,
}) => {
  const wrapper = new GcsWrapper(new mod.GcsSystem());
  const droppedDimIndices = new Set();
  const drawnGap = (m) => {
    const a =
      m.a.cluster !== undefined ? clusters[m.a.cluster] : virtuals[m.a.virtual];
    const b =
      m.b.cluster !== undefined ? clusters[m.b.cluster] : virtuals[m.b.virtual];
    return Math.abs(distance(a.x, a.y, b.x, b.y) - m.target);
  };
  const activeByGap = () =>
    mappings
      .filter((m) => !droppedDimIndices.has(m.dimIndex))
      .sort((m1, m2) => drawnGap(m2) - drawnGap(m1));

  try {
    for (let attempt = 0; attempt <= mappings.length; attempt++) {
      wrapper.clear_data();
      wrapper.push_primitives_and_params(
        buildPrimitives({
          clusters,
          walls,
          wallClusters,
          virtuals,
          mappings,
          droppedDimIndices,
        }),
      );
      const status = wrapper.solve();
      const conflicting = wrapper
        .get_gcs_conflicting_constraints()
        .filter((id) => id.startsWith("dim"))
        .map((id) => Number(id.slice(3)))
        .filter((di) => !droppedDimIndices.has(di));
      if (status !== SOLVE_STATUS_SUCCESS && conflicting.length > 0) {
        const worst = activeByGap().find((m) =>
          conflicting.includes(m.dimIndex),
        );
        droppedDimIndices.add(worst.dimIndex);
        continue;
      }

      wrapper.apply_solution();
      const solved = new Map();
      for (const p of wrapper.sketch_index.get_primitives()) {
        if (p.type === "point") solved.set(p.id, { x: p.x, y: p.y });
      }
      // Translation is a free gauge (all constraints are relative) — shift
      // the solution to minimize the largest corner move (Chebyshev center).
      const dxs = clusters.map((c, i) => solved.get(`p${i}`).x - c.x);
      const dys = clusters.map((c, i) => solved.get(`p${i}`).y - c.y);
      const shiftX = (Math.min(...dxs) + Math.max(...dxs)) / 2;
      const shiftY = (Math.min(...dys) + Math.max(...dys)) / 2;
      for (const s of solved.values()) {
        s.x -= shiftX;
        s.y -= shiftY;
      }
      const maxMove = Math.max(
        ...clusters.map((c, i) => {
          const s = solved.get(`p${i}`);
          return distance(c.x, c.y, s.x, s.y);
        }),
      );
      if (maxMove <= MAX_POINT_MOVE) return { solved, droppedDimIndices };

      const worst = activeByGap()[0];
      if (!worst) return null;
      droppedDimIndices.add(worst.dimIndex);
    }
    return null;
  } finally {
    wrapper.destroy_gcs_module();
  }
};

/**
 * Adjust wall coordinates so each written dimension's real-world span equals
 * its valueMm, keeping shared corners shared, T-junctions attached, and
 * axis-aligned walls axis-aligned. Rooms, openings, and dimension segments
 * are carried along with the corners they were attached to; fixtures and
 * assets are untouched.
 *
 * @param geometry sanitized geometry (normalized 0-1000 units, y-down) with
 *   walls and dimensions [{ text, valueMm, x1, y1, x2, y2 }]
 * @param mmPerUnit real millimeters per normalized unit
 * @returns { geometry, report } — an adjusted copy (walls keep every field
 *   other than their coordinates untouched) and a report:
 *   - adjusted: number of walls whose coordinates changed
 *   - satisfied: mapped dimensions within ±5mm after solving
 *   - conflicting: [{ text, deltaMm }] mapped dimensions off by more than
 *     ±20mm (mutually inconsistent, or inconsistent with the drawing)
 *   - skipped: dimensions that could not be tied to any wall span
 * @throws when no solution keeps every corner within 60 normalized units of
 *   where it was drawn — the dimensions disagree with the drawing wholesale.
 */
export const reconcileToDimensions = async (geometry, mmPerUnit) => {
  const walls = geometry.walls ?? [];
  const dimensions = geometry.dimensions ?? [];
  const { clusters, wallClusters } = clusterWallEndpoints(walls);
  const { virtuals, mappings, skipped } = mapDimensions({
    dimensions,
    walls,
    wallClusters,
    clusters,
    mmPerUnit,
  });

  // Solved positions default to "nothing moved" when no dimension maps.
  let solved = new Map(clusters.map((c, i) => [`p${i}`, { x: c.x, y: c.y }]));
  const droppedDimIndices = new Set();
  if (mappings.length > 0) {
    const mod = await loadPlanegcs();
    const { GcsWrapper } = nodeRequire("@salusoft89/planegcs");
    const result = solveWithRelaxation({
      mod,
      GcsWrapper,
      clusters,
      walls,
      wallClusters,
      virtuals,
      mappings,
    });
    if (!result) {
      throw new Error(
        "dimensions are inconsistent with the drawing — check the flagged measurements",
      );
    }
    solved = result.solved;
    for (const di of result.droppedDimIndices) droppedDimIndices.add(di);
  }

  const solvedPoint = (ref) => solved.get(pointId(ref));
  const deltas = clusters.map((c, i) => {
    const s = solved.get(`p${i}`);
    return { dx: s.x - c.x, dy: s.y - c.y };
  });

  // Rebuild walls from solved cluster positions; every other field
  // (thickness, ids, confidence annotations from other pipeline stages, ...)
  // is preserved.
  let adjusted = 0;
  const newWalls = walls.map((wall, w) => {
    const start = solved.get(`p${wallClusters[w].start}`);
    const end = solved.get(`p${wallClusters[w].end}`);
    const moved =
      distance(start.x, start.y, wall.x1, wall.y1) > 0.01 ||
      distance(end.x, end.y, wall.x2, wall.y2) > 0.01;
    if (moved) adjusted += 1;
    return { ...wall, x1: start.x, y1: start.y, x2: end.x, y2: end.y };
  });

  const deltaAtCorner = (x, y) => {
    for (let i = 0; i < clusters.length; i++) {
      if (distance(clusters[i].x, clusters[i].y, x, y) <= COINCIDE_TOLERANCE) {
        return deltas[i];
      }
    }
    return null;
  };

  // Rooms: vertices that sat on a moved corner travel with it.
  const newRooms = (geometry.rooms ?? []).map((room) => ({
    ...room,
    polygon: room.polygon.map(([x, y]) => {
      const delta = deltaAtCorner(x, y);
      return delta ? [x + delta.dx, y + delta.dy] : [x, y];
    }),
  }));

  // Openings: endpoints on a moved corner travel with it; otherwise openings
  // sitting on a moved wall re-project proportionally (t-parameter along the
  // original wall preserved on the new wall).
  const movePoint = (x, y) => {
    const delta = deltaAtCorner(x, y);
    if (delta) return { x: x + delta.dx, y: y + delta.dy };
    let bestWall = -1;
    let bestDist = OPENING_ON_WALL_TOLERANCE;
    for (let w = 0; w < walls.length; w++) {
      const d = perpendicularDistanceToSegment(x, y, walls[w]);
      if (d < bestDist) {
        bestDist = d;
        bestWall = w;
      }
    }
    if (bestWall < 0) return { x, y };
    const oldWall = walls[bestWall];
    const newWall = newWalls[bestWall];
    const wdx = oldWall.x2 - oldWall.x1;
    const wdy = oldWall.y2 - oldWall.y1;
    const lengthSq = wdx * wdx + wdy * wdy;
    const t =
      lengthSq === 0
        ? 0
        : ((x - oldWall.x1) * wdx + (y - oldWall.y1) * wdy) / lengthSq;
    return {
      x: newWall.x1 + t * (newWall.x2 - newWall.x1),
      y: newWall.y1 + t * (newWall.y2 - newWall.y1),
    };
  };
  const newOpenings = (geometry.openings ?? []).map((opening) => {
    const p1 = movePoint(opening.x1, opening.y1);
    const p2 = movePoint(opening.x2, opening.y2);
    return { ...opening, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
  });

  // Dimension segments follow their measure points; residuals decide the
  // satisfied / conflicting verdict per dimension.
  const mappingByDim = new Map(mappings.map((m) => [m.dimIndex, m]));
  let satisfied = 0;
  const conflicting = [];
  const newDimensions = dimensions.map((dim, di) => {
    const m = mappingByDim.get(di);
    if (!m) return { ...dim };
    const a = solvedPoint(m.a);
    const b = solvedPoint(m.b);
    const residualMm = distance(a.x, a.y, b.x, b.y) * mmPerUnit - dim.valueMm;
    if (Math.abs(residualMm) <= SATISFIED_MM) satisfied += 1;
    else if (Math.abs(residualMm) > CONFLICT_MM) {
      conflicting.push({ text: dim.text, deltaMm: Math.round(residualMm) });
    }
    const origA =
      m.a.cluster !== undefined ? clusters[m.a.cluster] : virtuals[m.a.virtual];
    const origB =
      m.b.cluster !== undefined ? clusters[m.b.cluster] : virtuals[m.b.virtual];
    return {
      ...dim,
      x1: dim.x1 + (a.x - origA.x),
      y1: dim.y1 + (a.y - origA.y),
      x2: dim.x2 + (b.x - origB.x),
      y2: dim.y2 + (b.y - origB.y),
    };
  });

  return {
    geometry: {
      ...geometry,
      walls: newWalls,
      rooms: newRooms,
      openings: newOpenings,
      dimensions: newDimensions,
    },
    report: { adjusted, satisfied, conflicting, skipped },
  };
};
