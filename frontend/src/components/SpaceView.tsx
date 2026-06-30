import { useMemo, useRef, useState } from "react";

import { renderView } from "../api";
import type { ExtractedLayout, Instance, Plan } from "../types";

/* Axonometric "paper model" — a pure-SVG 2.5D view of the plan. No WebGL, so it can never lose its
   context or fail to compile; it renders instantly and reads like the ink-on-paper 2D plan. Walls
   and furniture are extruded into an isometric projection and painted back-to-front. */

type Pt = [number, number];

// ── palette (paper + ink, single terracotta accent) ──
const PAPER = "#f4f1ea";
const FLOOR_TOP = "#e9e3d6";
const WALL_SIDE = "#d8d2c4";
const WALL_SIDE_DK = "#cbc4b2";
const FURN_TOP = "#efe7d8";
const FURN_SIDE = "#d8cdb8";
const INK = "#1a1813";
const LINE = "#cdc6b6";
const ACCENT = "#b8552f";

const WALL_H = 9; // ft
const HEIGHTS: Record<string, number> = {
  chair: 2.8, stool: 2.6, desk: 2.4, table: 2.4, workstation: 3.2, sofa: 2.6,
  storage: 4, panel: 5, mullion: 9, tv: 4.2, planter: 2.4, other: 2.4,
  // generated-fit room types render as low platforms
  private_office: 0.4, meeting_room: 0.4, collaboration: 0.4,
};
const ROOM_TONES: Record<string, string> = {
  workstation: "#e7e0d1", private_office: "#e3dcc9", meeting_room: "#e6ddc8",
  collaboration: "#ece3d0",
};

const ISO = Math.PI / 6; // 30° — classic 2:1 isometric
const COS = Math.cos(ISO);
const SIN = Math.sin(ISO);

// One extruded thing to draw: a footprint polygon raised from z0 to z1, plus optional ink linework
// drawn on its top face (the real furniture outline).
type Prism = { poly: Pt[]; z1: number; top: string; side: string; topLines?: Pt[][] };

// Rotate a world point a quarter-turn `q` times about the plan centre — gives the 4 viewing angles.
function spin(p: Pt, c: Pt, q: number): Pt {
  let [x, y] = [p[0] - c[0], p[1] - c[1]];
  for (let i = 0; i < ((q % 4) + 4) % 4; i++) [x, y] = [-y, x];
  return [x + c[0], y + c[1]];
}

const iso = (x: number, y: number, z: number): Pt => [(x - y) * COS, (x + y) * SIN - z];
const depthOf = (poly: Pt[]) => poly.reduce((s, [x, y]) => s + x + y, 0) / poly.length;

function rectCorners(x: number, y: number, w: number, h: number, rotDeg: number): Pt[] {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const a = (rotDeg * Math.PI) / 180;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  return ([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]] as Pt[]).map(
    ([dx, dy]) => [cx + dx * ca - dy * sa, cy + dx * sa + dy * ca] as Pt,
  );
}

// ── scene assembly ──
type Scene = { floor: Pt[]; walls: { a: Pt; b: Pt }[]; prisms: Prism[]; center: Pt };

function sceneFromLayout(layout: ExtractedLayout): Scene {
  const [minx, miny, maxx, maxy] = layout.bounds;
  const center: Pt = [(minx + maxx) / 2, (miny + maxy) / 2];
  const floor: Pt[] = [[minx, miny], [maxx, miny], [maxx, maxy], [minx, maxy]];

  const walls = layout.walls.flatMap((w) => {
    const segs: { a: Pt; b: Pt }[] = [];
    for (let i = 0; i + 1 < w.points.length; i++) segs.push({ a: w.points[i], b: w.points[i + 1] });
    return segs;
  });

  const prisms: Prism[] = layout.furniture
    .filter((f) => f.category !== "mullion")
    .map((f) => ({
      poly: rectCorners(f.x, f.y, f.w, f.h, f.rotation),
      z1: HEIGHTS[f.category] ?? HEIGHTS.other,
      top: FURN_TOP,
      side: FURN_SIDE,
      topLines: f.outline?.length ? f.outline : undefined,
    }));

  return { floor, walls, prisms, center };
}

function sceneFromPlan(plan: Plan, instances: Instance[]): Scene {
  const xs = plan.boundary.map((p) => p[0]);
  const ys = plan.boundary.map((p) => p[1]);
  const center: Pt = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  const floor = plan.boundary as Pt[];

  const walls: { a: Pt; b: Pt }[] = [];
  for (let i = 0; i < plan.boundary.length; i++) {
    walls.push({ a: plan.boundary[i] as Pt, b: plan.boundary[(i + 1) % plan.boundary.length] as Pt });
  }

  const prisms: Prism[] = instances.map((i) => ({
    poly: rectCorners(i.x, i.y, i.w, i.h, i.rotation),
    z1: HEIGHTS[i.type] ?? HEIGHTS.other,
    top: ROOM_TONES[i.type] ?? FURN_TOP,
    side: FURN_SIDE,
  }));

  return { floor, walls, prisms, center };
}

// A flat, depth-sortable face ready to paint.
type Face = { pts: Pt[]; fill: string; stroke?: string; depth: number; order: number; lines?: Pt[][] };

function buildFaces(scene: Scene, q: number): { faces: Face[]; floor: Pt[] } {
  const { center } = scene;
  const faces: Face[] = [];

  // walls — a thin vertical ribbon per segment
  for (const { a, b } of scene.walls) {
    const sa = spin(a, center, q);
    const sb = spin(b, center, q);
    const quad: Pt[] = [
      iso(sa[0], sa[1], 0), iso(sb[0], sb[1], 0), iso(sb[0], sb[1], WALL_H), iso(sa[0], sa[1], WALL_H),
    ];
    const near = (sa[0] + sa[1] + sb[0] + sb[1]) / 2 > center[0] + center[1];
    faces.push({ pts: quad, fill: near ? WALL_SIDE : WALL_SIDE_DK, stroke: LINE, depth: depthOf([sa, sb]), order: 0 });
  }

  // furniture / room prisms — the two viewer-facing side faces, then the top (with its real outline)
  for (const pr of scene.prisms) {
    const spun = pr.poly.map((p) => spin(p, center, q));
    const d = depthOf(spun);
    const sides = spun.map((a, i) => {
      const b = spun[(i + 1) % spun.length];
      return {
        pts: [iso(a[0], a[1], 0), iso(b[0], b[1], 0), iso(b[0], b[1], pr.z1), iso(a[0], a[1], pr.z1)] as Pt[],
        depth: (a[0] + a[1] + b[0] + b[1]) / 2,
      };
    });
    sides.sort((x, y) => x.depth - y.depth);
    for (const f of sides.slice(-2)) faces.push({ pts: f.pts, fill: pr.side, depth: d, order: 0 });
    const topPts = spun.map((p) => iso(p[0], p[1], pr.z1));
    const lines = pr.topLines?.map((ring) => ring.map((p) => iso(...(spin(p as Pt, center, q) as Pt), pr.z1)));
    faces.push({ pts: topPts, fill: pr.top, stroke: LINE, depth: d, order: 1, lines });
  }

  faces.sort((a, b) => a.depth - b.depth || a.order - b.order);
  const floor = scene.floor.map((p) => iso(...(spin(p, center, q) as Pt), 0));
  return { faces, floor };
}

const ptsStr = (pts: Pt[]) => pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

export default function SpaceView(props: { layout: ExtractedLayout } | { plan: Plan; instances: Instance[] }) {
  const [q, setQ] = useState(0); // viewing quarter-turn
  const [render, setRender] = useState<null | { busy: boolean; img: string | null; err: string | null }>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const scene = useMemo(
    () => ("layout" in props ? sceneFromLayout(props.layout) : sceneFromPlan(props.plan, props.instances)),
    [props],
  );
  const { faces, floor } = useMemo(() => buildFaces(scene, q), [scene, q]);

  // fit the projected drawing to a padded viewBox
  const all = [floor, ...faces.map((f) => f.pts)].flat();
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const pad = 6;
  const vb = all.length
    ? `${Math.min(...xs) - pad} ${Math.min(...ys) - pad} ${Math.max(...xs) - Math.min(...xs) + pad * 2} ${Math.max(...ys) - Math.min(...ys) + pad * 2}`
    : "0 0 100 100";

  async function handleRender() {
    const svg = svgRef.current;
    if (!svg) return;
    setRender({ busy: true, img: null, err: null });
    try {
      const xml = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
      await img.decode();
      const W = 1100;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = Math.round((W * svg.clientHeight) / Math.max(svg.clientWidth, 1)) || W;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const shot = canvas.toDataURL("image/jpeg", 0.85);
      const r = await renderView(shot);
      setRender({ busy: false, img: r.image ?? shot, err: r.image ? null : "Provider returned no image." });
    } catch (e) {
      setRender({ busy: false, img: null, err: String(e instanceof Error ? e.message : e) });
    }
  }

  return (
    <div className="axon">
      <svg ref={svgRef} className="axon-svg" viewBox={vb} preserveAspectRatio="xMidYMid meet" role="img"
        aria-label="Axonometric model of the layout">
        <polygon points={ptsStr(floor)} fill={FLOOR_TOP} stroke={LINE} strokeWidth={0.5} />
        {faces.map((f, i) => (
          <g key={i}>
            <polygon points={ptsStr(f.pts)} fill={f.fill} stroke={f.stroke ?? "none"}
              strokeWidth={0.4} strokeLinejoin="round" />
            {f.lines?.map((ring, j) => (
              <polyline key={j} points={ptsStr(ring)} fill="none" stroke={INK} strokeWidth={0.4}
                strokeLinejoin="round" opacity={0.65} />
            ))}
          </g>
        ))}
      </svg>

      <div className="axon-tools">
        <span className="axon-hint">Paper model · {["NE", "SE", "SW", "NW"][((q % 4) + 4) % 4]}</span>
        <button type="button" className="link-btn" onClick={() => setQ((v) => v - 1)} aria-label="Rotate left">⟲</button>
        <button type="button" className="link-btn" onClick={() => setQ((v) => v + 1)} aria-label="Rotate right">⟳</button>
        <button type="button" className="axon-render" onClick={handleRender}>Render</button>
      </div>

      {render && (
        <div className="render-overlay" onClick={() => setRender(null)}>
          <div className="render-card" onClick={(e) => e.stopPropagation()}>
            <div className="render-head">
              <span style={{ color: ACCENT }} className="ds-eyebrow">
                {render.busy ? "Rendering…" : render.err ? "Render unavailable" : "Photoreal render"}
              </span>
              <button type="button" className="link-btn" onClick={() => setRender(null)}>Close</button>
            </div>
            {render.img && <img src={render.img} alt="Photoreal render" className="render-img" />}
            {render.err && <p className="disclaim">{render.err}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
