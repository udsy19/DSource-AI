// Adopt a generated test-fit as a read-layout: synthesize the ExtractedLayout (walls, rooms,
// furniture, inventory) the same shape ingestCad produces, so a generated design flows into the
// full read-layout view (2D LayoutPlan, 3D LayoutScene, inventory) with no re-ingest.
//
// The generation models each enclosed program element as ONE instance footprint (a
// private_office instance IS the office room, not a desk), so those become ROOMS with synthesized
// partitions; open-plan workstations become workstation furniture.

import type {
  ExtractedFurniture,
  ExtractedLayout,
  ExtractedRoom,
  ExtractedWall,
  Instance,
  Plan,
  WallType,
} from "./types";

// instance type -> how it reads once adopted (room label/type + the partition material)
const ROOM_META: Record<string, { label: string; type: string; wall: WallType }> = {
  private_office: { label: "Office", type: "office", wall: "drywall" },
  meeting_room: { label: "Meeting", type: "meeting", wall: "glass" },
  collaboration: { label: "Collaboration", type: "collab", wall: "glass" },
  phone_booth: { label: "Phone Booth", type: "phone", wall: "glass" },
  reception: { label: "Reception", type: "amenity", wall: "drywall" },
  kitchen: { label: "Kitchen", type: "amenity", wall: "drywall" },
  wellness: { label: "Wellness", type: "amenity", wall: "drywall" },
  copy_print: { label: "Copy / Print", type: "amenity", wall: "drywall" },
  storage: { label: "Storage", type: "amenity", wall: "drywall" },
};

const closeRing = (pts: [number, number][]): [number, number][] => {
  const [a, b] = [pts[0], pts[pts.length - 1]];
  return pts.length > 1 && (a[0] !== b[0] || a[1] !== b[1]) ? [...pts, pts[0]] : pts;
};

// the 4 footprint corners rotated about the centre (degrees — matches the engine's convention)
const corners = (it: Instance): [number, number][] => {
  const cx = it.x + it.w / 2;
  const cy = it.y + it.h / 2;
  const rad = (it.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const raw: [number, number][] = [
    [it.x, it.y],
    [it.x + it.w, it.y],
    [it.x + it.w, it.y + it.h],
    [it.x, it.y + it.h],
  ];
  return raw.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos] as [number, number];
  });
};

export function layoutFromFit(plan: Plan, instances: Instance[]): ExtractedLayout {
  const xs = plan.boundary.map((p) => p[0]);
  const ys = plan.boundary.map((p) => p[1]);
  const bounds: [number, number, number, number] = [
    Math.min(...xs),
    Math.min(...ys),
    Math.max(...xs),
    Math.max(...ys),
  ];

  const walls: ExtractedWall[] = [{ type: "perimeter", points: closeRing(plan.boundary) }];
  for (const core of plan.cores) walls.push({ type: "core", points: closeRing(core) });

  const rooms: ExtractedRoom[] = [];
  const furniture: ExtractedFurniture[] = [];
  const inventory: Record<string, number> = {};

  let roomN = 0;
  for (const it of instances) {
    if (it.type === "workstation") {
      furniture.push({
        category: "workstation", block_name: "", brand: "", model: "",
        x: it.x, y: it.y, w: it.w, h: it.h, rotation: it.rotation,
      });
      inventory.workstation = (inventory.workstation ?? 0) + 1;
      continue;
    }
    const meta = ROOM_META[it.type] ?? { label: it.type, type: "room", wall: "drywall" as WallType };
    const poly = corners(it);
    walls.push({ type: meta.wall, points: closeRing(poly) });
    rooms.push({
      id: `r${roomN++}`,
      label: meta.label,
      area_sf: Math.round(it.w * it.h),
      polygon: poly,
      center: [it.x + it.w / 2, it.y + it.h / 2],
      type: meta.type,
    });
  }

  return {
    source: "generated",
    units: plan.units || "ft",
    bounds,
    walls,
    doors: [],
    rooms,
    furniture,
    inventory,
    needs_confirmation: false,
    notes: [
      "Adopted from a generated test-fit. Rooms and partitions are synthesized from the placed " +
        "program; open-plan desks read as workstation furniture. Door swings are not modelled.",
    ],
  };
}
