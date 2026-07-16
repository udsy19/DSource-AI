/**
 * Client-side helpers for The Pinning Table: deterministic layout seeding,
 * palette extraction from an inspiration photo, and image shrinking before
 * a generated board is pinned as an item.
 */

/** FNV-1a string hash mapped to [0, 1). Stable — used instead of
 *  Math.random so "Compose for me" gives every item the same slight
 *  hand-placed tilt on every run. */
export const hash01 = (str) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0xffffffff;
};

const tilt = (id, max = 5) => (hash01(`${id}:rot`) * 2 - 1) * max;
const jitter = (id, salt, max = 0.02) =>
  (hash01(`${id}:${salt}`) * 2 - 1) * max;

/**
 * "Compose for me": a deterministic worktable layout. Hero product large
 * left-of-center, remaining products in a loose grid on the right, swatches
 * in a row bottom-left, notes stacked top-left. Returns new item objects
 * (same ids) with fresh x/y/w/rotation/z.
 */
export const composeLayout = (items) => {
  const products = items.filter((i) => i.kind === "product");
  const swatches = items.filter((i) => i.kind === "swatch");
  const notes = items.filter((i) => i.kind === "text");
  const images = items.filter((i) => i.kind === "image");

  const placed = [];
  let z = 0;
  const put = (item, x, y, w, maxTilt = 5) => {
    placed.push({
      ...item,
      x: Math.min(0.95, Math.max(0.05, x + jitter(item.id, "x"))),
      y: Math.min(0.95, Math.max(0.05, y + jitter(item.id, "y"))),
      w,
      rotation: tilt(item.id, maxTilt),
      z: z++,
    });
  };

  // A developed board image, if present, sits underneath everything.
  images.forEach((img, i) => {
    put(img, 0.5, 0.5, 0.55 - i * 0.05, 2);
  });

  const [hero, ...rest] = products;
  if (hero) put(hero, 0.34, 0.4, 0.34, 3);
  rest.forEach((product, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    put(product, 0.66 + col * 0.19, 0.2 + row * 0.27, 0.16);
  });

  swatches.forEach((swatch, i) => {
    put(swatch, 0.1 + (i % 6) * 0.09, 0.84 + Math.floor(i / 6) * 0.1, 0.06, 8);
  });

  notes.forEach((note, i) => {
    put(note, 0.14, 0.12 + i * 0.14, 0.2, 4);
  });

  return placed;
};

/**
 * Samples the dominant colors of an image (data URL) by bucket quantization:
 * downscale to a small canvas, quantize RGB to 4 bits/channel, rank buckets
 * by population, and keep the top `count` mutually-distinct colors.
 *
 * @returns {Promise<string[]>} hex colors, e.g. ["#a3937c", ...]
 */
export const extractPalette = (dataUrl, count = 5) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);

      // bucket key -> { n, r, g, b } (sums, for a mean color per bucket)
      const buckets = new Map();
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
        const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
        bucket.n += 1;
        bucket.r += r;
        bucket.g += g;
        bucket.b += b;
        buckets.set(key, bucket);
      }

      const ranked = [...buckets.values()]
        .sort((a, b) => b.n - a.n)
        .map(({ n, r, g, b }) => [
          Math.round(r / n),
          Math.round(g / n),
          Math.round(b / n),
        ]);

      // Greedy pick with a minimum RGB distance so five near-identical
      // shades of the dominant tone don't crowd out the accents.
      const picked = [];
      const minDist = 60;
      for (const rgb of ranked) {
        if (picked.length >= count) break;
        const tooClose = picked.some(
          (p) =>
            Math.hypot(p[0] - rgb[0], p[1] - rgb[1], p[2] - rgb[2]) < minDist,
        );
        if (!tooClose) picked.push(rgb);
      }
      // Backfill from the ranked list if distinctness left us short.
      for (const rgb of ranked) {
        if (picked.length >= count) break;
        if (!picked.includes(rgb)) picked.push(rgb);
      }

      resolve(
        picked.map(
          ([r, g, b]) =>
            `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`,
        ),
      );
    };
    img.onerror = () => reject(new Error("Could not read the image."));
    img.src = dataUrl;
  });

/**
 * Shrinks a data-URL image to fit maxDim (long edge) as JPEG — pinned board
 * items must stay under the items API's 2MB data-URI cap. Distinct from
 * useVisualizerTab's fileToDataUrl, which reads a File; this rescales an
 * already-materialized data URL (a generated render).
 */
export const shrinkDataUrl = (dataUrl, maxDim = 1024, quality = 0.85) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
