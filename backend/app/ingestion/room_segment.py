"""Label-seeded room segmentation — the robust core of room detection.

Wall-tracing alone is brittle on real drawings (gappy partitions, curved perimeters, wide cased
openings) — rooms merge into one blob and everything downstream mis-assigns. This instead:

  1. rasterizes the wall network and dilates it (bridging double-lines + hairline gaps),
  2. takes connected free-space components (each a wall-bounded region),
  3. for a component holding several room-label seeds (walls between them failed), splits it by a
     nearest-seed watershed — so two labeled rooms can never merge, even through a gap,
  4. contours each region back to a world-coordinate polygon.

It is pure geometry: it knows nothing about Room / labels / types. The caller (cad_reader) seeds it
with label points and maps the returned Regions onto domain Rooms. Coordinates are feet, +y up.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np
from scipy import ndimage as ndi
from shapely.geometry import LineString, Polygon
from skimage.draw import line as _draw_line
from skimage.measure import find_contours
from skimage.segmentation import watershed

_TARGET_PX = 900      # cap the longer grid side, so a big plate stays fast
_MIN_PPF = 2.0        # pixels per foot floor (coarse plates)
_MAX_PPF = 6.0        # and ceiling (small plates), keeps resolution sane
_WALL_DILATE_PX = 2   # thickens walls to bridge double-lines + sub-foot gaps
_MIN_REGION_SF = 18.0
_OPEN_REACH_FT = 15.0  # free space this far from every room label is its own OPEN region — so a
                       # label whose walls don't enclose it can't sprawl across the open field


@dataclass
class Region:
    polygon: list[tuple[float, float]]  # closed boundary, world feet
    area_sf: float
    seed_index: int | None  # index into the seed_points passed in, or None for an unlabeled region
    basis: str  # "walls_closed" (own bounded region) | "label_seeded" (split from a merged region)


def segment_regions(
    boundaries: list[LineString],
    seed_points: list[tuple[float, float]],
    bounds: tuple[float, float, float, float],
) -> list[Region]:
    minx, miny, maxx, maxy = bounds
    wft, hft = maxx - minx, maxy - miny
    if wft <= 1.0 or hft <= 1.0:
        return []
    ppf = max(_MIN_PPF, min(_MAX_PPF, _TARGET_PX / max(wft, hft)))
    width = int(math.ceil(wft * ppf)) + 1
    height = int(math.ceil(hft * ppf)) + 1

    def to_px(x: float, y: float) -> tuple[int, int]:
        r = min(max(int(round((y - miny) * ppf)), 0), height - 1)
        c = min(max(int(round((x - minx) * ppf)), 0), width - 1)
        return r, c

    wall = np.zeros((height, width), dtype=bool)
    for ln in boundaries:
        cs = list(ln.coords)
        for (x0, y0), (x1, y1) in zip(cs, cs[1:]):
            r0, c0 = to_px(x0, y0)
            r1, c1 = to_px(x1, y1)
            rr, cc = _draw_line(r0, c0, r1, c1)
            wall[rr, cc] = True
    wall = ndi.binary_dilation(wall, iterations=_WALL_DILATE_PX)

    free = ~wall
    comp, ncomp = ndi.label(free)
    dist = ndi.distance_transform_edt(free)  # watershed landscape → splits settle on wall midlines

    seeds: list[tuple[int, int, int, int]] = []  # (seed_index, row, col, component_id)
    for i, (x, y) in enumerate(seed_points):
        r, c = to_px(x, y)
        if wall[r, c]:
            nb = _nearest_free(free, r, c)
            if nb is None:
                continue
            r, c = nb
        seeds.append((i, r, c, int(comp[r, c])))

    px_sf = 1.0 / (ppf * ppf)
    regions: list[Region] = []
    for cid in range(1, ncomp + 1):
        cmask = comp == cid
        if cmask.sum() * px_sf < _MIN_REGION_SF:
            continue
        cseeds = [s for s in seeds if s[3] == cid]
        if len(cseeds) <= 1:
            poly = _mask_to_polygon(cmask, ppf, minx, miny)
            if poly is not None:
                regions.append(Region(poly, round(cmask.sum() * px_sf, 1),
                                      cseeds[0][0] if cseeds else None, "walls_closed"))
            continue
        # merged region: split among its label seeds by nearest-seed watershed. Also seed the
        # deep-open zones (free space far from every label) so a label whose walls don't enclose it
        # stays near its seed instead of ballooning across the open field.
        markers = np.zeros((height, width), dtype=np.int32)
        marker_seed: dict[int, int | None] = {}
        for k, (seed_index, r, c, _cid) in enumerate(cseeds, start=1):
            markers[r, c] = k
            marker_seed[k] = seed_index
        seed_px = np.zeros((height, width), dtype=bool)
        for _i, r, c, _cid in cseeds:
            seed_px[r, c] = True
        far = cmask & (ndi.distance_transform_edt(~seed_px) > _OPEN_REACH_FT * ppf)
        open_lbl, n_open = ndi.label(far)
        k = len(cseeds)
        for j in range(1, n_open + 1):
            blob = open_lbl == j
            if blob.sum() * px_sf < _MIN_REGION_SF:
                continue
            rows, cols = np.nonzero(blob)
            mid = len(rows) // 2  # a pixel actually in the blob (centroid may fall outside)
            k += 1
            markers[rows[mid], cols[mid]] = k
            marker_seed[k] = None
        labelled = watershed(-dist, markers, mask=cmask)
        for mk, seed_index in marker_seed.items():
            sub = labelled == mk
            if sub.sum() * px_sf < _MIN_REGION_SF:
                continue
            poly = _mask_to_polygon(sub, ppf, minx, miny)
            if poly is not None:
                basis = "label_seeded" if seed_index is not None else "walls_closed"
                regions.append(Region(poly, round(sub.sum() * px_sf, 1), seed_index, basis))
    return regions


def _nearest_free(free: np.ndarray, r: int, c: int, radius: int = 6) -> tuple[int, int] | None:
    """A seed landing on a (dilated) wall is nudged to the closest free pixel within `radius`."""
    h, w = free.shape
    for rad in range(1, radius + 1):
        r0, r1 = max(0, r - rad), min(h, r + rad + 1)
        c0, c1 = max(0, c - rad), min(w, c + rad + 1)
        window = free[r0:r1, c0:c1]
        if window.any():
            rows, cols = np.nonzero(window)
            k = int(np.argmin((rows + r0 - r) ** 2 + (cols + c0 - c) ** 2))
            return int(rows[k] + r0), int(cols[k] + c0)
    return None


def _mask_to_polygon(mask: np.ndarray, ppf: float, minx: float, miny: float) -> list[tuple[float, float]] | None:
    """Largest contour of a region mask → a simplified world-coordinate polygon (feet)."""
    padded = np.pad(mask, 1)
    contours = find_contours(padded.astype(float), 0.5)
    if not contours:
        return None
    best = max(contours, key=_ring_area_px)
    coords = [(minx + (col - 1) / ppf, miny + (row - 1) / ppf) for row, col in best]
    if len(coords) < 4:
        return None
    poly = Polygon(coords)
    if not poly.is_valid:
        poly = poly.buffer(0)
    poly = poly.simplify(0.5, preserve_topology=True)
    if poly.is_empty or poly.geom_type != "Polygon":
        return None
    return [(round(x, 2), round(y, 2)) for x, y in poly.exterior.coords]


def _ring_area_px(contour: np.ndarray) -> float:
    r = contour[:, 0]
    c = contour[:, 1]
    return abs(float(np.dot(c, np.roll(r, 1)) - np.dot(r, np.roll(c, 1)))) / 2.0
