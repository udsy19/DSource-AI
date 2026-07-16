// Format-agnostic furniture/fixture symbol library for the CAD pipeline.
// Every symbol is drawn as top-down architectural line art inside a UNIT BOX
// (x,y ∈ 0..1, y-down — same orientation as the rest of the geometry code).
// Renderers map the unit box onto the placed asset's real-mm box, so the art
// here is pure shape: outlines plus a few interior lines, never fills.
//
// Primitive types (angles are degrees in y-down space, like door swings):
//   {t:"line",   x1,y1,x2,y2}
//   {t:"rect",   x,y,w,h}
//   {t:"circle", cx,cy,r}          // r is relative to the unit box; a
//                                  // non-square asset box turns it into an
//                                  // ellipse, which renderers accept
//   {t:"arc",    cx,cy,r,startDeg,endDeg}

export const SYMBOL_CATEGORIES = [
  { id: "living", label: "Living Room" },
  { id: "bedroom", label: "Bedroom" },
  { id: "kitchen", label: "Kitchen & Dining" },
  { id: "bathroom", label: "Bathroom" },
  { id: "decor", label: "Decor" },
];

export const SYMBOLS = {
  sofa: {
    label: "Sofa (3-seat)",
    category: "living",
    defaultWmm: 2000,
    defaultHmm: 900,
    primitives: [
      { t: "rect", x: 0, y: 0, w: 1, h: 1 },
      // backrest front edge and inner arm edges frame the seat area
      { t: "line", x1: 0.1, y1: 0.24, x2: 0.9, y2: 0.24 },
      { t: "line", x1: 0.1, y1: 0.24, x2: 0.1, y2: 1 },
      { t: "line", x1: 0.9, y1: 0.24, x2: 0.9, y2: 1 },
      // three seat cushions
      { t: "line", x1: 0.3667, y1: 0.24, x2: 0.3667, y2: 1 },
      { t: "line", x1: 0.6333, y1: 0.24, x2: 0.6333, y2: 1 },
    ],
  },
  armchair: {
    label: "Armchair",
    category: "living",
    defaultWmm: 850,
    defaultHmm: 850,
    primitives: [
      { t: "rect", x: 0, y: 0, w: 1, h: 1 },
      { t: "line", x1: 0.16, y1: 0.28, x2: 0.84, y2: 0.28 },
      { t: "line", x1: 0.16, y1: 0.28, x2: 0.16, y2: 1 },
      { t: "line", x1: 0.84, y1: 0.28, x2: 0.84, y2: 1 },
      // curved seat-cushion front edge
      { t: "arc", cx: 0.5, cy: 1, r: 0.34, startDeg: 180, endDeg: 360 },
    ],
  },
  "coffee-table": {
    label: "Coffee Table",
    category: "living",
    defaultWmm: 1100,
    defaultHmm: 600,
    primitives: [
      { t: "rect", x: 0, y: 0, w: 1, h: 1 },
      { t: "rect", x: 0.09, y: 0.14, w: 0.82, h: 0.72 },
    ],
  },
  "tv-unit": {
    label: "TV Unit",
    category: "living",
    defaultWmm: 1600,
    defaultHmm: 450,
    primitives: [
      { t: "rect", x: 0, y: 0, w: 1, h: 1 },
      // screen block sitting on the cabinet, facing the room (+y)
      { t: "rect", x: 0.15, y: 0.3, w: 0.7, h: 0.25 },
      { t: "line", x1: 0.15, y1: 0.425, x2: 0.85, y2: 0.425 },
      { t: "line", x1: 0.42, y1: 0.55, x2: 0.58, y2: 0.55 },
    ],
  },
  "potted-plant": {
    label: "Potted Plant",
    category: "decor",
    defaultWmm: 500,
    defaultHmm: 500,
    primitives: [
      { t: "circle", cx: 0.5, cy: 0.5, r: 0.46 },
      { t: "circle", cx: 0.5, cy: 0.5, r: 0.06 },
      // off-centre leaf arcs give the canopy an organic swirl
      { t: "arc", cx: 0.35, cy: 0.35, r: 0.22, startDeg: 90, endDeg: 320 },
      { t: "arc", cx: 0.66, cy: 0.42, r: 0.18, startDeg: 200, endDeg: 470 },
      { t: "arc", cx: 0.5, cy: 0.68, r: 0.2, startDeg: -20, endDeg: 220 },
    ],
  },
  "dining-table": {
    label: "Dining Table (6)",
    category: "kitchen",
    defaultWmm: 1600,
    defaultHmm: 900,
    primitives: [
      { t: "rect", x: 0.13, y: 0.2, w: 0.74, h: 0.6 },
      { t: "rect", x: 0.17, y: 0.02, w: 0.16, h: 0.16 },
      { t: "rect", x: 0.42, y: 0.02, w: 0.16, h: 0.16 },
      { t: "rect", x: 0.67, y: 0.02, w: 0.16, h: 0.16 },
      { t: "rect", x: 0.17, y: 0.82, w: 0.16, h: 0.16 },
      { t: "rect", x: 0.42, y: 0.82, w: 0.16, h: 0.16 },
      { t: "rect", x: 0.67, y: 0.82, w: 0.16, h: 0.16 },
    ],
  },
  "kitchen-sink": {
    label: "Kitchen Sink",
    category: "kitchen",
    defaultWmm: 800,
    defaultHmm: 500,
    primitives: [
      { t: "rect", x: 0, y: 0, w: 1, h: 1 },
      { t: "rect", x: 0.12, y: 0.28, w: 0.76, h: 0.6 },
      { t: "circle", cx: 0.5, cy: 0.14, r: 0.06 },
      { t: "line", x1: 0.5, y1: 0.2, x2: 0.5, y2: 0.28 },
    ],
  },
  stove: {
    label: "Stove",
    category: "kitchen",
    defaultWmm: 600,
    defaultHmm: 600,
    primitives: [
      { t: "rect", x: 0, y: 0, w: 1, h: 1 },
      { t: "line", x1: 0.02, y1: 0.14, x2: 0.98, y2: 0.14 },
      { t: "circle", cx: 0.28, cy: 0.38, r: 0.13 },
      { t: "circle", cx: 0.72, cy: 0.38, r: 0.13 },
      { t: "circle", cx: 0.28, cy: 0.76, r: 0.13 },
      { t: "circle", cx: 0.72, cy: 0.76, r: 0.13 },
    ],
  },
  fridge: {
    label: "Fridge",
    category: "kitchen",
    defaultWmm: 750,
    defaultHmm: 700,
    primitives: [
      { t: "rect", x: 0, y: 0, w: 1, h: 1 },
      // cross marks a tall appliance; front line + split = double doors
      { t: "line", x1: 0.06, y1: 0.06, x2: 0.94, y2: 0.82 },
      { t: "line", x1: 0.94, y1: 0.06, x2: 0.06, y2: 0.82 },
      { t: "line", x1: 0.06, y1: 0.88, x2: 0.94, y2: 0.88 },
      { t: "line", x1: 0.5, y1: 0.88, x2: 0.5, y2: 1 },
    ],
  },
  "bed-double": {
    label: "Double Bed",
    category: "bedroom",
    defaultWmm: 1600,
    defaultHmm: 2000,
    primitives: [
      { t: "rect", x: 0, y: 0, w: 1, h: 1 },
      { t: "rect", x: 0.07, y: 0.03, w: 0.4, h: 0.12 },
      { t: "rect", x: 0.53, y: 0.03, w: 0.4, h: 0.12 },
      // blanket line with a turned-back corner
      { t: "line", x1: 0, y1: 0.3, x2: 1, y2: 0.3 },
      { t: "line", x1: 0.88, y1: 0.3, x2: 1, y2: 0.42 },
    ],
  },
  "bed-single": {
    label: "Single Bed",
    category: "bedroom",
    defaultWmm: 900,
    defaultHmm: 2000,
    primitives: [
      { t: "rect", x: 0, y: 0, w: 1, h: 1 },
      { t: "rect", x: 0.12, y: 0.03, w: 0.76, h: 0.11 },
      { t: "line", x1: 0, y1: 0.28, x2: 1, y2: 0.28 },
      { t: "line", x1: 0.82, y1: 0.28, x2: 1, y2: 0.4 },
    ],
  },
  wardrobe: {
    label: "Wardrobe",
    category: "bedroom",
    defaultWmm: 1800,
    defaultHmm: 600,
    primitives: [
      { t: "rect", x: 0, y: 0, w: 1, h: 1 },
      // hanging rail along the length with hanger ticks; centre door split
      { t: "line", x1: 0.03, y1: 0.5, x2: 0.97, y2: 0.5 },
      { t: "line", x1: 0.5, y1: 0, x2: 0.5, y2: 1 },
      { t: "line", x1: 0.15, y1: 0.34, x2: 0.15, y2: 0.66 },
      { t: "line", x1: 0.3, y1: 0.34, x2: 0.3, y2: 0.66 },
      { t: "line", x1: 0.7, y1: 0.34, x2: 0.7, y2: 0.66 },
      { t: "line", x1: 0.85, y1: 0.34, x2: 0.85, y2: 0.66 },
    ],
  },
  bathtub: {
    label: "Bathtub",
    category: "bathroom",
    defaultWmm: 1700,
    defaultHmm: 750,
    primitives: [
      { t: "rect", x: 0, y: 0, w: 1, h: 1 },
      { t: "rect", x: 0.07, y: 0.13, w: 0.8, h: 0.74 },
      { t: "circle", cx: 0.16, cy: 0.5, r: 0.045 },
    ],
  },
  toilet: {
    label: "Toilet",
    category: "bathroom",
    defaultWmm: 400,
    defaultHmm: 650,
    primitives: [
      { t: "rect", x: 0.06, y: 0, w: 0.88, h: 0.26 },
      { t: "rect", x: 0.28, y: 0.26, w: 0.44, h: 0.07 },
      { t: "circle", cx: 0.5, cy: 0.62, r: 0.3 },
    ],
  },
  washbasin: {
    label: "Washbasin",
    category: "bathroom",
    defaultWmm: 500,
    defaultHmm: 450,
    primitives: [
      { t: "rect", x: 0, y: 0, w: 1, h: 1 },
      { t: "circle", cx: 0.5, cy: 0.56, r: 0.34 },
      { t: "circle", cx: 0.5, cy: 0.56, r: 0.05 },
      { t: "circle", cx: 0.5, cy: 0.12, r: 0.07 },
      { t: "line", x1: 0.5, y1: 0.19, x2: 0.5, y2: 0.3 },
    ],
  },
};
