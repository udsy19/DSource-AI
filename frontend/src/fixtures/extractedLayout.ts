import type { ExtractedLayout } from "../types";

// Hand-built sample layout for developing/verifying the ExtractedLayout renderers
// (PlanCanvas + SpaceView) without a live /api/ingest/cad backend. Two rooms, walls of
// every type, ~20 furniture across varied categories. Feet, +y up.
export const SAMPLE_LAYOUT: ExtractedLayout = {
  source: "sample.dxf",
  units: "ft",
  bounds: [0, 0, 60, 40],
  walls: [
    // perimeter (closed loop)
    { type: "perimeter", points: [[0, 0], [60, 0], [60, 40], [0, 40], [0, 0]] },
    // service core (closed)
    { type: "core", points: [[26, 16], [34, 16], [34, 24], [26, 24], [26, 16]] },
    // drywall partition between the two offices
    { type: "drywall", points: [[0, 24], [20, 24]] },
    // half-height divider in the open area
    { type: "half_drywall", points: [[40, 0], [40, 12]] },
    // glazed meeting-room front
    { type: "glass", points: [[44, 24], [60, 24]] },
    { type: "glass", points: [[44, 24], [44, 40]] },
    // a door swing marked as a wall segment
    { type: "door", points: [[20, 24], [20, 28]] },
    { type: "unknown", points: [[20, 28], [12, 32]] },
  ],
  doors: [
    { x: 20, y: 26, width: 3, rotation: 0 },
    { x: 44, y: 30, width: 3, rotation: 90 },
  ],
  rooms: [
    { id: "r1", label: "Office A", area_sf: 480, type: "private_office", polygon: [[0, 24], [20, 24], [20, 40], [0, 40]] },
    { id: "r2", label: "Office B", area_sf: 480, type: "private_office", polygon: [[0, 0], [20, 0], [20, 24], [0, 24]] },
    { id: "r3", label: "Meeting", area_sf: 256, type: "meeting_room", polygon: [[44, 24], [60, 24], [60, 40], [44, 40]] },
    { id: "r4", label: "Open Plan", area_sf: 700, type: "open_office", polygon: [[20, 0], [44, 0], [44, 24], [20, 24]] },
  ],
  furniture: [
    // open-plan workstation bank (desks + chairs)
    { category: "workstation", block_name: "WS-01", brand: "Herman Miller", model: "Layout", x: 22, y: 2, w: 5, h: 2.5, rotation: 0 },
    { category: "chair", block_name: "CH-01", brand: "Steelcase", model: "Leap", x: 23.5, y: 4.5, w: 2, h: 2, rotation: 0 },
    { category: "workstation", block_name: "WS-02", brand: "Herman Miller", model: "Layout", x: 28, y: 2, w: 5, h: 2.5, rotation: 0 },
    { category: "chair", block_name: "CH-02", brand: "Steelcase", model: "Leap", x: 29.5, y: 4.5, w: 2, h: 2, rotation: 0 },
    { category: "desk", block_name: "DK-01", brand: "Knoll", model: "Antenna", x: 34, y: 2, w: 5, h: 2.5, rotation: 0 },
    { category: "chair", block_name: "CH-03", brand: "Steelcase", model: "Leap", x: 35.5, y: 4.5, w: 2, h: 2, rotation: 0 },
    { category: "desk", block_name: "DK-02", brand: "Knoll", model: "Antenna", x: 22, y: 10, w: 5, h: 2.5, rotation: 180 },
    { category: "chair", block_name: "CH-04", brand: "Steelcase", model: "Leap", x: 23.5, y: 8, w: 2, h: 2, rotation: 180 },
    // meeting room
    { category: "table", block_name: "TB-01", brand: "Vitra", model: "Eames", x: 49, y: 29, w: 8, h: 4, rotation: 0 },
    { category: "chair", block_name: "CH-05", brand: "Vitra", model: "Soft Pad", x: 48, y: 27, w: 2, h: 2, rotation: 0 },
    { category: "chair", block_name: "CH-06", brand: "Vitra", model: "Soft Pad", x: 56, y: 27, w: 2, h: 2, rotation: 0 },
    { category: "chair", block_name: "CH-07", brand: "Vitra", model: "Soft Pad", x: 48, y: 34, w: 2, h: 2, rotation: 180 },
    { category: "chair", block_name: "CH-08", brand: "Vitra", model: "Soft Pad", x: 56, y: 34, w: 2, h: 2, rotation: 180 },
    { category: "tv", block_name: "AV-01", brand: "Samsung", model: "Flip", x: 51, y: 38.5, w: 5, h: 0.5, rotation: 0 },
    // lounge / breakout
    { category: "sofa", block_name: "SF-01", brand: "Muuto", model: "Connect", x: 46, y: 2, w: 7, h: 3, rotation: 0 },
    { category: "stool", block_name: "ST-01", brand: "Hay", model: "About", x: 54, y: 3, w: 1.5, h: 1.5, rotation: 0 },
    { category: "stool", block_name: "ST-02", brand: "Hay", model: "About", x: 56, y: 6, w: 1.5, h: 1.5, rotation: 0 },
    { category: "planter", block_name: "PL-01", brand: "Generic", model: "Pot", x: 42, y: 36, w: 2, h: 2, rotation: 0 },
    // offices
    { category: "desk", block_name: "DK-03", brand: "Knoll", model: "Reff", x: 3, y: 30, w: 5, h: 2.5, rotation: 0 },
    { category: "chair", block_name: "CH-09", brand: "Steelcase", model: "Leap", x: 4.5, y: 32.5, w: 2, h: 2, rotation: 0 },
    { category: "storage", block_name: "ST-03", brand: "Bisley", model: "Lateral", x: 16, y: 25, w: 3, h: 1.5, rotation: 0 },
    { category: "panel", block_name: "PN-01", brand: "BuzziSpace", model: "Screen", x: 36, y: 14, w: 6, h: 0.4, rotation: 0 },
    { category: "other", block_name: "XX-01", brand: "", model: "", x: 8, y: 6, w: 3, h: 3, rotation: 0 },
  ],
  inventory: { chair: 9, desk: 3, workstation: 2, table: 1, sofa: 1, stool: 2, tv: 1, storage: 1, panel: 1, planter: 1, other: 1 },
  needs_confirmation: true,
  notes: ["2 blocks could not be classified", "door swings inferred from arc geometry"],
};
