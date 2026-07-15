import {
  Colors,
  DxfWriter,
  LWPolylineFlags,
  point2d,
  point3d,
  TextHorizontalAlignment,
  Units,
} from "@tarikjabiri/dxf";

import { SYMBOLS } from "./cad-symbols.js";

// Pure renderers: both functions receive fully processed floor-plan geometry
// (see src/utils/cad-geometry.js) with every coordinate in real millimeters,
// y-down image space, and emit an SVG preview / DXF file respectively.

const DIM_OFFSET_MM = 800;
const DIM_TICK_MM = 150;
const DIM_TEXT_HEIGHT_MM = 200;
const SVG_MARGIN_MM = 1200;
const ROOM_TEXT_HEIGHT_MM = 200;

const round = (value) => Math.round(value * 10) / 10;

const escapeXml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Label placement only — vertex average is stable enough for room text.
const polygonCentroid = (points) => {
  const x = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const y = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  return { x, y };
};

const svgPoint = (x, y) => `${round(x)},${round(y)}`;

// Ring → "M x,y L ... Z" subpath (used with fill-rule="evenodd" so holes
// punch through the wall poche).
const ringToSubpath = (ring) =>
  `M ${ring.map(([x, y]) => svgPoint(x, y)).join(" L ")} Z`;

// {cx,cy,r,startDeg,endDeg} in y-down space → SVG elliptical-arc path.
// SVG shares the y-down frame, so angles are used as given; sweep-flag 1
// follows increasing angle in that frame.
const swingArcToPath = ({ cx, cy, r, startDeg, endDeg }) => {
  const toPoint = (deg) => {
    const rad = (deg * Math.PI) / 180;
    return svgPoint(cx + r * Math.cos(rad), cy + r * Math.sin(rad));
  };
  const delta = endDeg - startDeg;
  const largeArc = Math.abs(delta) > 180 ? 1 : 0;
  const sweep = delta > 0 ? 1 : 0;
  return `M ${toPoint(startDeg)} A ${round(r)} ${round(r)} 0 ${largeArc} ${sweep} ${toPoint(endDeg)}`;
};

const svgLine = (seg, stroke, width, extra = "") =>
  `<line x1="${round(seg.x1)}" y1="${round(seg.y1)}" x2="${round(seg.x2)}" y2="${round(seg.y2)}" stroke="${stroke}" stroke-width="${width}"${extra}/>`;

// Drafting palette — hairline gray annotation over near-black wall poche,
// styled after professional CAD/Rayon sheets.
const INK = "#1d1d21";
const ANNO_LINE = "#9ca3af";
const ANNO_TEXT = "#52525b";
const FIXTURE_LINE = "#71717a";
const MUTED_TEXT = "#8e8e93";
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// --- furniture symbol transformation ----------------------------------------
// Symbols are authored in a unit box (see cad-symbols.js). Rather than emit
// SVG transforms — whose non-uniform scale would distort stroke widths — the
// primitives are pre-transformed here into final mm coordinates, shared by
// both renderers. Circles under non-uniform scale become ellipses; arcs keep
// their unit-space angles plus the asset rotation (y-down, like door swings).
const ASSET_LINE = "#3f3f46";
const ASSET_STROKE_MM = 16;

const transformAssetPrimitives = (asset) => {
  const symbol = SYMBOLS[asset.symbol];
  if (!symbol) return [];
  const rad = (asset.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  // unit-box point (centered at 0.5,0.5) → rotated, scaled, translated mm
  const map = (u, v) => {
    const dx = (u - 0.5) * asset.w;
    const dy = (v - 0.5) * asset.h;
    return [asset.x + dx * cos - dy * sin, asset.y + dx * sin + dy * cos];
  };
  const shapes = [];
  for (const prim of symbol.primitives) {
    if (prim.t === "line") {
      const [x1, y1] = map(prim.x1, prim.y1);
      const [x2, y2] = map(prim.x2, prim.y2);
      shapes.push({ t: "line", x1, y1, x2, y2 });
    } else if (prim.t === "rect") {
      shapes.push({
        t: "poly",
        points: [
          map(prim.x, prim.y),
          map(prim.x + prim.w, prim.y),
          map(prim.x + prim.w, prim.y + prim.h),
          map(prim.x, prim.y + prim.h),
        ],
      });
    } else if (prim.t === "circle") {
      const [cx, cy] = map(prim.cx, prim.cy);
      shapes.push({
        t: "ellipse",
        cx,
        cy,
        rx: prim.r * asset.w,
        ry: prim.r * asset.h,
        rotDeg: asset.rotation,
      });
    } else if (prim.t === "arc") {
      const [cx, cy] = map(prim.cx, prim.cy);
      shapes.push({
        t: "arc",
        cx,
        cy,
        rx: prim.r * asset.w,
        ry: prim.r * asset.h,
        rotDeg: asset.rotation,
        startDeg: prim.startDeg,
        endDeg: prim.endDeg,
      });
    }
  }
  return shapes;
};

// Point on a rotated ellipse at parameter angle `deg` (y-down space).
const ellipsePoint = (shape, deg) => {
  const t = (deg * Math.PI) / 180;
  const rot = (shape.rotDeg * Math.PI) / 180;
  const ex = shape.rx * Math.cos(t);
  const ey = shape.ry * Math.sin(t);
  return [
    shape.cx + ex * Math.cos(rot) - ey * Math.sin(rot),
    shape.cy + ex * Math.sin(rot) + ey * Math.cos(rot),
  ];
};

const assetShapeToSvg = (shape) => {
  const style = `fill="none" stroke="${ASSET_LINE}" stroke-width="${ASSET_STROKE_MM}"`;
  switch (shape.t) {
    case "line":
      return svgLine(shape, ASSET_LINE, ASSET_STROKE_MM);
    case "poly":
      return `<path d="${ringToSubpath(shape.points)}" ${style}/>`;
    case "ellipse": {
      const rotate = shape.rotDeg
        ? ` transform="rotate(${round(shape.rotDeg)} ${round(shape.cx)} ${round(shape.cy)})"`
        : "";
      return `<ellipse cx="${round(shape.cx)}" cy="${round(shape.cy)}" rx="${round(shape.rx)}" ry="${round(shape.ry)}" ${style}${rotate}/>`;
    }
    case "arc": {
      const [sx, sy] = ellipsePoint(shape, shape.startDeg);
      const [ex, ey] = ellipsePoint(shape, shape.endDeg);
      const delta = shape.endDeg - shape.startDeg;
      const largeArc = Math.abs(delta) > 180 ? 1 : 0;
      const sweep = delta > 0 ? 1 : 0;
      return `<path d="M ${svgPoint(sx, sy)} A ${round(shape.rx)} ${round(shape.ry)} ${round(shape.rotDeg)} ${largeArc} ${sweep} ${svgPoint(ex, ey)}" ${style}/>`;
    }
    default:
      return "";
  }
};

// Floor pattern tiles (userSpaceOnUse → dimensions are real millimeters).
const FLOOR_PATTERN_DEFS = {
  tiles:
    '<pattern id="floor-tiles" width="300" height="300" patternUnits="userSpaceOnUse">' +
    '<rect width="300" height="300" fill="#faf9f7"/>' +
    '<path d="M 0 0 H 300 M 0 0 V 300" fill="none" stroke="#d6d3ce" stroke-width="8"/>' +
    "</pattern>",
  herringbone:
    '<pattern id="floor-herringbone" width="300" height="300" patternUnits="userSpaceOnUse">' +
    '<rect width="300" height="300" fill="#faf9f7"/>' +
    '<path d="M 0 0 L 300 300 M 300 0 L 0 300" fill="none" stroke="#d6d3ce" stroke-width="8"/>' +
    "</pattern>",
  planks:
    '<pattern id="floor-planks" width="600" height="180" patternUnits="userSpaceOnUse">' +
    '<rect width="600" height="180" fill="#faf9f7"/>' +
    '<path d="M 0 0 H 600" fill="none" stroke="#d6d3ce" stroke-width="8"/>' +
    "</pattern>",
};

// --- annotation collision handling -----------------------------------------
// Greedy text layout: every label registers an axis-aligned box; later labels
// that would collide are nudged to the first clear spot from a small set of
// candidate offsets. Cheap, deterministic, and removes almost all overlap.
const LABEL_PADDING = 60;

const boxesOverlap = (a, b) =>
  a.x - a.w / 2 - LABEL_PADDING < b.x + b.w / 2 &&
  a.x + a.w / 2 + LABEL_PADDING > b.x - b.w / 2 &&
  a.y - a.h / 2 - LABEL_PADDING < b.y + b.h / 2 &&
  a.y + a.h / 2 + LABEL_PADDING > b.y - b.h / 2;

const placeLabel = (placed, box, candidates) => {
  for (const [dx, dy] of candidates) {
    const tryBox = { ...box, x: box.x + dx, y: box.y + dy };
    if (!placed.some((other) => boxesOverlap(tryBox, other))) {
      placed.push(tryBox);
      return tryBox;
    }
  }
  placed.push(box);
  return box;
};

const textBox = (x, y, label, fontSize, vertical) => {
  const w = label.length * 0.62 * fontSize;
  const h = fontSize * 1.2;
  return vertical ? { x, y, w: h, h: w } : { x, y, w, h };
};

// Architectural dimension string along an arbitrary segment: hairline with
// 45° tick strokes at both ends and an upright, collision-dodged label.
const svgDimensionString = (x1, y1, x2, y2, label, placed) => {
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / length;
  const uy = (y2 - y1) / length;
  // normal pointing "up" relative to reading direction
  let nx = uy;
  let ny = -ux;
  let angle = (Math.atan2(uy, ux) * 180) / Math.PI;
  if (angle > 90 || angle <= -90) {
    // keep text upright
    angle += 180;
    nx = -nx;
    ny = -ny;
  }
  const tick = 110;
  const parts = [
    `<line x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}" stroke="${ANNO_LINE}" stroke-width="12"/>`,
  ];
  for (const [px, py] of [
    [x1, y1],
    [x2, y2],
  ]) {
    parts.push(
      `<line x1="${round(px - ((ux + nx) * tick) / 2)}" y1="${round(py - ((uy + ny) * tick) / 2)}" x2="${round(px + ((ux + nx) * tick) / 2)}" y2="${round(py + ((uy + ny) * tick) / 2)}" stroke="${ANNO_TEXT}" stroke-width="14"/>`,
    );
  }
  const size = 230;
  const vertical = Math.abs(ux) < 0.4;
  const baseX = (x1 + x2) / 2 + nx * 170;
  const baseY = (y1 + y2) / 2 + ny * 170;
  // dodge outward along the normal first, then slide along the segment
  const candidates = [
    [0, 0],
    [nx * 300, ny * 300],
    [nx * 600, ny * 600],
    [ux * 450, uy * 450],
    [-ux * 450, -uy * 450],
    [nx * 900, ny * 900],
  ];
  const box = placeLabel(
    placed,
    textBox(baseX, baseY, label, size, vertical),
    candidates,
  );
  parts.push(
    `<text x="${round(box.x)}" y="${round(box.y)}" text-anchor="middle" font-family="${FONT}" font-size="${size}" fill="${ANNO_TEXT}" transform="rotate(${round(angle)} ${round(box.x)} ${round(box.y)})">${escapeXml(label)}</text>`,
  );
  return parts.join("\n    ");
};

// Alternating black/white metric scale bar (0–2 m) with end labels.
const svgScaleBar = (x, y) => {
  const cell = 500;
  const h = 110;
  const cells = [0, 1, 2, 3]
    .map(
      (i) =>
        `<rect x="${round(x + i * cell)}" y="${round(y)}" width="${cell}" height="${h}" fill="${i % 2 === 0 ? INK : "#ffffff"}" stroke="${ANNO_TEXT}" stroke-width="10"/>`,
    )
    .join("");
  const label = (lx, text) =>
    `<text x="${round(lx)}" y="${round(y - 90)}" text-anchor="middle" font-family="${FONT}" font-size="200" fill="${ANNO_TEXT}">${text}</text>`;
  return `${cells}${label(x, "0")}${label(x + 2 * cell, "1")}${label(x + 4 * cell, "2 m")}`;
};

/** Render processed floor-plan geometry to a drafting-quality SVG sheet. */
export const geometryToSvg = (processed) => {
  const {
    wallNetwork = [],
    doors = [],
    windows = [],
    rooms = [],
    fixtures = [],
    assets = [],
    dimensions = [],
    bounds,
  } = processed;

  const planWidth = bounds.maxX - bounds.minX;
  const planHeight = bounds.maxY - bounds.minY;
  // extra room below the plan for the overall dimension + scale bar
  const viewMinX = bounds.minX - SVG_MARGIN_MM - 400;
  const viewMinY = bounds.minY - SVG_MARGIN_MM + 200;
  const viewWidth = planWidth + (SVG_MARGIN_MM + 400) * 2;
  const viewHeight = planHeight + SVG_MARGIN_MM * 2 + 1400;
  const labelFontSize = Math.min(420, Math.max(230, planWidth * 0.045));

  const placedLabels = [];

  const roomShapes = rooms
    .map((room) => {
      const points = room.polygon.map(([x, y]) => svgPoint(x, y)).join(" ");
      const centroid = polygonCentroid(room.polygon);
      // shrink the label until it fits the room's own width (~0.68em/char
      // with letter-spacing); tiny rooms drop the area line
      const xs = room.polygon.map(([x]) => x);
      const roomMinX = Math.min(...xs);
      const roomMaxX = Math.max(...xs);
      const roomWidth = roomMaxX - roomMinX;
      const label = (room.label || "").toUpperCase();
      const fitSize = label
        ? Math.max(
            135,
            Math.min(labelFontSize, (roomWidth * 0.85) / (label.length * 0.68)),
          )
        : labelFontSize;
      // keep the text inside the room's horizontal extent — centroids of
      // L-shaped rooms drift toward a wall and let long labels spill out
      const textWidth = label.length * 0.68 * fitSize;
      const lo = roomMinX + textWidth / 2 + 120;
      const hi = roomMaxX - textWidth / 2 - 120;
      const cx = lo <= hi ? Math.min(Math.max(centroid.x, lo), hi) : centroid.x;
      const name = label
        ? `<text x="${round(cx)}" y="${round(centroid.y)}" text-anchor="middle" dominant-baseline="middle" font-family="${FONT}" font-size="${round(fitSize)}" letter-spacing="${round(fitSize * 0.12)}" fill="#3f3f46">${escapeXml(label)}</text>`
        : "";
      if (label) {
        placedLabels.push(
          textBox(cx, centroid.y, label, fitSize * 1.12, false),
        );
      }
      const showArea = room.areaM2 > 0 && fitSize >= 170;
      const area = showArea
        ? `<text x="${round(cx)}" y="${round(centroid.y + fitSize * 1.25)}" text-anchor="middle" dominant-baseline="middle" font-family="${FONT}" font-size="${round(fitSize * 0.72)}" fill="${MUTED_TEXT}">${room.areaM2} m²</text>`
        : "";
      if (showArea) {
        placedLabels.push(
          textBox(
            cx,
            centroid.y + fitSize * 1.25,
            `${room.areaM2} m2`,
            fitSize * 0.72,
            false,
          ),
        );
      }
      const fill = room.floorPattern
        ? `url(#floor-${room.floorPattern})`
        : "#f6f5f1";
      return `<polygon points="${points}" fill="${fill}" stroke="none"/>${name}${area}`;
    })
    .join("\n    ");

  // Outer ring + holes in one path with even-odd fill → true wall poche.
  const wallShapes = wallNetwork
    .map((poly) => {
      const subpaths = [poly.outer, ...(poly.holes || [])]
        .map(ringToSubpath)
        .join(" ");
      return `<path d="${subpaths}" fill-rule="evenodd" fill="${INK}" stroke="none"/>`;
    })
    .join("\n    ");

  // Emit only the floor patterns actually referenced by a room.
  const usedPatterns = [
    ...new Set(rooms.map((room) => room.floorPattern).filter(Boolean)),
  ];
  const patternDefs = usedPatterns.length
    ? `<defs>\n    ${usedPatterns
        .map((pattern) => FLOOR_PATTERN_DEFS[pattern])
        .join("\n    ")}\n  </defs>`
    : "";

  const assetShapes = assets
    .flatMap((asset) => transformAssetPrimitives(asset).map(assetShapeToSvg))
    .join("\n    ");

  const doorShapes = doors
    .map((door) =>
      [
        svgLine(door.leaf, INK, 20),
        `<path d="${swingArcToPath(door.swingArc)}" stroke="${INK}" stroke-width="10" fill="none"/>`,
      ].join("\n    "),
    )
    .join("\n    ");

  const windowShapes = windows
    .map((win) =>
      [
        ...win.faceLines.map((face) => svgLine(face, INK, 20)),
        svgLine(win.glazingLine, INK, 10),
      ].join("\n    "),
    )
    .join("\n    ");

  const fixtureShapes = fixtures
    .map((fixture) => {
      const w = fixture.x2 - fixture.x1;
      const h = fixture.y2 - fixture.y1;
      const parts = [
        `<rect x="${round(fixture.x1)}" y="${round(fixture.y1)}" width="${round(w)}" height="${round(h)}" fill="none" stroke="${FIXTURE_LINE}" stroke-width="14"/>`,
      ];
      if (fixture.type === "stairs") {
        // treads across the short axis every ~280mm
        const along = w >= h ? "x" : "y";
        const span = Math.max(w, h);
        const steps = Math.max(2, Math.floor(span / 280));
        for (let i = 1; i < steps; i++) {
          const t = (span * i) / steps;
          parts.push(
            along === "x"
              ? `<line x1="${round(fixture.x1 + t)}" y1="${round(fixture.y1)}" x2="${round(fixture.x1 + t)}" y2="${round(fixture.y2)}" stroke="${FIXTURE_LINE}" stroke-width="10"/>`
              : `<line x1="${round(fixture.x1)}" y1="${round(fixture.y1 + t)}" x2="${round(fixture.x2)}" y2="${round(fixture.y1 + t)}" stroke="${FIXTURE_LINE}" stroke-width="10"/>`,
          );
        }
      }
      const label = (fixture.label || fixture.type).toUpperCase();
      // fit the label inside the box; skip it when the box is too small
      const fitSize = Math.min(
        190,
        (Math.max(w, h) * 0.85) / (label.length * 0.62),
      );
      if (label && label !== "OTHER" && fitSize >= 110) {
        const vertical = h > w * 1.4;
        const fx = (fixture.x1 + fixture.x2) / 2;
        const fy = (fixture.y1 + fixture.y2) / 2;
        const rotate = vertical
          ? ` transform="rotate(-90 ${round(fx)} ${round(fy)})"`
          : "";
        placedLabels.push(textBox(fx, fy, label, fitSize, vertical));
        parts.push(
          `<text x="${round(fx)}" y="${round(fy)}" text-anchor="middle" dominant-baseline="middle" font-family="${FONT}" font-size="${round(fitSize)}" letter-spacing="14" fill="${MUTED_TEXT}"${rotate}>${escapeXml(label)}</text>`,
        );
      }
      return parts.join("\n    ");
    })
    .join("\n    ");

  // Printed dimensions from the source plan, re-drawn where they were
  // written; longer spans place their labels first so short in-fill
  // dimensions dodge around them.
  const printedDimensions = [...dimensions]
    .sort(
      (a, b) =>
        Math.hypot(b.x2 - b.x1, b.y2 - b.y1) -
        Math.hypot(a.x2 - a.x1, a.y2 - a.y1),
    )
    .map((dim) =>
      svgDimensionString(
        dim.x1,
        dim.y1,
        dim.x2,
        dim.y2,
        dim.text || `${Math.round(dim.valueMm)} mm`,
        placedLabels,
      ),
    )
    .join("\n    ");

  const overallDimensions = [
    svgDimensionString(
      bounds.minX,
      bounds.maxY + DIM_OFFSET_MM,
      bounds.maxX,
      bounds.maxY + DIM_OFFSET_MM,
      `${Math.round(planWidth)} mm`,
      placedLabels,
    ),
    svgDimensionString(
      bounds.minX - DIM_OFFSET_MM,
      bounds.maxY,
      bounds.minX - DIM_OFFSET_MM,
      bounds.minY,
      `${Math.round(planHeight)} mm`,
      placedLabels,
    ),
  ].join("\n    ");

  const scaleBar = svgScaleBar(bounds.minX, bounds.maxY + DIM_OFFSET_MM + 900);

  const viewBox = `${round(viewMinX)} ${round(viewMinY)} ${round(viewWidth)} ${round(viewHeight)}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
  ${patternDefs}
  <rect x="${round(viewMinX)}" y="${round(viewMinY)}" width="${round(viewWidth)}" height="${round(viewHeight)}" fill="#ffffff"/>
  <g>
    ${roomShapes}
    ${wallShapes}
    ${doorShapes}
    ${windowShapes}
    ${fixtureShapes}
    ${assetShapes}
    ${printedDimensions}
    ${overallDimensions}
    ${scaleBar}
  </g>
</svg>`;
};

/**
 * Render processed floor-plan geometry to a millimeter-unit DXF string with
 * AIA/NCS layers. DXF's y-axis points up while input is y-down, so every
 * coordinate is emitted as y' = -y; arc sweeps from a°→b° become -b°→-a°.
 */
export const geometryToDxf = (processed) => {
  const {
    wallNetwork = [],
    doors = [],
    windows = [],
    rooms = [],
    fixtures = [],
    assets = [],
    dimensions = [],
    bounds,
  } = processed;

  const writer = new DxfWriter();
  writer.setUnits(Units.Millimeters);
  writer.addLayer("A-WALL", Colors.Red, "CONTINUOUS");
  writer.addLayer("A-DOOR", Colors.Cyan, "CONTINUOUS");
  writer.addLayer("A-GLAZ", Colors.Green, "CONTINUOUS");
  writer.addLayer("A-AREA", Colors.Blue, "CONTINUOUS");
  writer.addLayer("A-ROOM-IDEN", Colors.Blue, "CONTINUOUS");
  writer.addLayer("A-FLOR-FIXT", Colors.Magenta, "CONTINUOUS");
  writer.addLayer("A-FURN", Colors.Yellow, "CONTINUOUS");
  writer.addLayer("A-ANNO-DIMS", Colors.White, "CONTINUOUS");

  const addRing = (ring, layerName) =>
    writer.addLWPolyline(
      ring.map(([x, y]) => ({ point: point2d(x, -y) })),
      { flags: LWPolylineFlags.Closed, layerName },
    );

  const addSegment = (seg, layerName) =>
    writer.addLine(point3d(seg.x1, -seg.y1, 0), point3d(seg.x2, -seg.y2, 0), {
      layerName,
    });

  for (const poly of wallNetwork) {
    addRing(poly.outer, "A-WALL");
    for (const hole of poly.holes || []) {
      addRing(hole, "A-WALL");
    }
  }

  for (const door of doors) {
    addSegment(door.leaf, "A-DOOR");
    const { cx, cy, r, startDeg, endDeg } = door.swingArc;
    // Y-flip mirrors orientation: the CCW sweep a°→b° in y-down space is the
    // CCW sweep -b°→-a° in DXF's y-up space.
    writer.addArc(point3d(cx, -cy, 0), r, -endDeg, -startDeg, {
      layerName: "A-DOOR",
    });
  }

  for (const win of windows) {
    for (const face of win.faceLines) {
      addSegment(face, "A-GLAZ");
    }
    addSegment(win.glazingLine, "A-GLAZ");
  }

  for (const room of rooms) {
    addRing(room.polygon, "A-AREA");
    if (room.label) {
      const centroid = polygonCentroid(room.polygon);
      writer.addText(
        point3d(centroid.x, -centroid.y, 0),
        ROOM_TEXT_HEIGHT_MM,
        room.label,
        { layerName: "A-ROOM-IDEN" },
      );
      if (room.areaM2 > 0) {
        writer.addText(
          point3d(centroid.x, -centroid.y - ROOM_TEXT_HEIGHT_MM * 1.5, 0),
          ROOM_TEXT_HEIGHT_MM * 0.75,
          `${room.areaM2} m2`,
          { layerName: "A-ROOM-IDEN" },
        );
      }
    }
  }

  for (const fixture of fixtures) {
    writer.addLWPolyline(
      [
        { point: point2d(fixture.x1, -fixture.y1) },
        { point: point2d(fixture.x2, -fixture.y1) },
        { point: point2d(fixture.x2, -fixture.y2) },
        { point: point2d(fixture.x1, -fixture.y2) },
      ],
      { flags: LWPolylineFlags.Closed, layerName: "A-FLOR-FIXT" },
    );
    if (fixture.type === "stairs") {
      const w = fixture.x2 - fixture.x1;
      const h = fixture.y2 - fixture.y1;
      const span = Math.max(w, h);
      const steps = Math.max(2, Math.floor(span / 280));
      for (let i = 1; i < steps; i++) {
        const t = (span * i) / steps;
        const tread =
          w >= h
            ? {
                x1: fixture.x1 + t,
                y1: fixture.y1,
                x2: fixture.x1 + t,
                y2: fixture.y2,
              }
            : {
                x1: fixture.x1,
                y1: fixture.y1 + t,
                x2: fixture.x2,
                y2: fixture.y1 + t,
              };
        addSegment(tread, "A-FLOR-FIXT");
      }
    }
    const label = fixture.label || fixture.type;
    if (label && label !== "other") {
      writer.addText(
        point3d(
          (fixture.x1 + fixture.x2) / 2,
          -(fixture.y1 + fixture.y2) / 2,
          0,
        ),
        150,
        label,
        { layerName: "A-FLOR-FIXT" },
      );
    }
  }

  // Furniture symbols, pre-transformed to mm (same math as the SVG). The lib
  // has no ELLIPSE entity, so circles/ellipses become 24-segment polylines.
  const addSampledPolyline = (shape, fromDeg, toDeg, segments, closed) => {
    const vertices = [];
    for (let i = 0; i <= (closed ? segments - 1 : segments); i += 1) {
      const deg = fromDeg + ((toDeg - fromDeg) * i) / segments;
      const [x, y] = ellipsePoint(shape, deg);
      vertices.push({ point: point2d(x, -y) });
    }
    writer.addLWPolyline(vertices, {
      flags: closed ? LWPolylineFlags.Closed : LWPolylineFlags.None,
      layerName: "A-FURN",
    });
  };

  for (const asset of assets) {
    for (const shape of transformAssetPrimitives(asset)) {
      if (shape.t === "line") {
        addSegment(shape, "A-FURN");
      } else if (shape.t === "poly") {
        writer.addLWPolyline(
          shape.points.map(([x, y]) => ({ point: point2d(x, -y) })),
          { flags: LWPolylineFlags.Closed, layerName: "A-FURN" },
        );
      } else if (shape.t === "ellipse") {
        addSampledPolyline(shape, 0, 360, 24, true);
      } else if (Math.abs(shape.rx - shape.ry) < 0.01) {
        // uniform scale: a true arc, using the door-swing y-flip angle rule
        const startDeg = shape.rotDeg + shape.startDeg;
        const endDeg = shape.rotDeg + shape.endDeg;
        writer.addArc(
          point3d(shape.cx, -shape.cy, 0),
          shape.rx,
          -endDeg,
          -startDeg,
          {
            layerName: "A-FURN",
          },
        );
      } else {
        const sweep = Math.abs(shape.endDeg - shape.startDeg);
        addSampledPolyline(
          shape,
          shape.startDeg,
          shape.endDeg,
          Math.max(8, Math.ceil(sweep / 15)),
          false,
        );
      }
    }
  }

  // Dimensions are drawn as explicit graphics (extension lines, dimension
  // line, 45° architectural ticks, centered text) rather than DIMENSION
  // entities: @tarikjabiri/dxf writes DIMENSION without the anonymous
  // geometry block, which strict importers (ezdxf audit) delete on open.
  // Inputs are y-down; drawing happens in DXF y-up space (y' = -y).
  const addDimensionGraphics = (x1, y1, x2, y2, nx, ny, offset, valueMm) => {
    const layer = { layerName: "A-ANNO-DIMS" };
    const length = Math.hypot(x2 - x1, y2 - y1) || 1;
    const ux = (x2 - x1) / length;
    const uy = (y2 - y1) / length;
    const q1 = [x1 + nx * offset, y1 + ny * offset];
    const q2 = [x2 + nx * offset, y2 + ny * offset];
    if (offset > 0) {
      // extension lines: 50mm gap from the measured points, 100mm overshoot
      for (const [px, py, qx, qy] of [
        [x1, y1, q1[0], q1[1]],
        [x2, y2, q2[0], q2[1]],
      ]) {
        writer.addLine(
          point3d(px + nx * 50, py + ny * 50, 0),
          point3d(qx + nx * 100, qy + ny * 100, 0),
          layer,
        );
      }
    }
    writer.addLine(point3d(q1[0], q1[1], 0), point3d(q2[0], q2[1], 0), layer);
    // 45° tick strokes at each end of the dimension line
    const tx = ((ux + nx) * DIM_TICK_MM) / 2;
    const ty = ((uy + ny) * DIM_TICK_MM) / 2;
    for (const [qx, qy] of [q1, q2]) {
      writer.addLine(
        point3d(qx - tx, qy - ty, 0),
        point3d(qx + tx, qy + ty, 0),
        layer,
      );
    }
    const midX = (q1[0] + q2[0]) / 2 + nx * 120;
    const midY = (q1[1] + q2[1]) / 2 + ny * 120;
    const rotation =
      ((((Math.atan2(uy, ux) * 180) / Math.PI + 180) % 180) + 180) % 180;
    writer.addText(
      point3d(midX, midY, 0),
      DIM_TEXT_HEIGHT_MM,
      `${Math.round(valueMm)}`,
      {
        ...layer,
        rotation,
        horizontalAlignment: TextHorizontalAlignment.Center,
        secondAlignmentPoint: point3d(midX, midY, 0),
      },
    );
  };

  // Overall extents: width below the plan, height to its left (y-up coords).
  addDimensionGraphics(
    bounds.minX,
    -bounds.maxY,
    bounds.maxX,
    -bounds.maxY,
    0,
    -1,
    DIM_OFFSET_MM,
    bounds.maxX - bounds.minX,
  );
  addDimensionGraphics(
    bounds.minX,
    -bounds.maxY,
    bounds.minX,
    -bounds.minY,
    -1,
    0,
    DIM_OFFSET_MM,
    bounds.maxY - bounds.minY,
  );

  // Printed dimensions from the source drawing, drawn on the segment they
  // annotate with the printed value.
  for (const dim of dimensions) {
    if (Number.isFinite(dim.valueMm) && dim.valueMm > 0) {
      addDimensionGraphics(
        dim.x1,
        -dim.y1,
        dim.x2,
        -dim.y2,
        0,
        0,
        0,
        dim.valueMm,
      );
    }
  }

  return writer.stringify();
};
