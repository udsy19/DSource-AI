"""Raster / vector-PDF layout reader — produce an `ExtractedLayout` from a JPG/PNG/PDF that has no
CAD layers.

Three honest paths, routed by file type and content:

  * VECTOR PDF  — parse the page's own geometry. pdfplumber gives us `lines`/`rects`/`curves`
    (the walls) and `extract_words()` (the room labels). We polygonize the wall segments with
    shapely and attach each label to the room it sits inside. source="vector_pdf". A PDF carries a
    coordinate space but not necessarily a real-world scale, so unless a points-per-foot is supplied
    we keep units="pt" and flag for confirmation. We do NOT name furniture from a vector PDF.

  * RASTER  — a PNG/JPG, or a scanned PDF page with no extractable vectors. Classical CV (OpenCV):
    binarize, recover the wall contours and the room regions, and OCR room labels IF a `tesseract`
    binary is available. Honours the no-scale rule: without `px_per_ft` we stay in pixels, set
    needs_confirmation, and never fabricate an area. source="raster".

Furniture-symbol detection (chairs/desks/tables) needs a trained detector (YOLO / Mask R-CNN on
real labelled plans). The strong open model, CubiCasa5K, is CC BY-NC — non-commercial — so we do
NOT ship it. Until a licensable model exists, furniture is left empty with a note. We never invent
counts.
"""

from __future__ import annotations

import io
import shutil

import cv2
import numpy as np
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import polygonize, unary_union

from .schema import ExtractedLayout, Room, Wall
from ..floorplan.raster import _approx_polygon

_FURNITURE_NOTE = (
    "Furniture-symbol detection is not yet implemented: it needs a trained detector "
    "(YOLO / Mask R-CNN on real labelled plans). The strong open model (CubiCasa5K) is "
    "CC BY-NC and cannot be shipped, so furniture is reported empty rather than guessed."
)
_MIN_ROOM_AREA_FRAC = 0.002  # ignore regions smaller than 0.2% of the page/plate (noise, glyphs)


def read_layout(
    content: bytes, filename: str, px_per_ft: float | None = None
) -> ExtractedLayout:
    """Route an uploaded plan to the vector-PDF or raster reader and return an ExtractedLayout."""
    name = filename.lower()
    if name.endswith(".pdf"):
        page = _open_pdf_page(content)
        if _has_vector_content(page):
            return _read_vector_pdf(page, px_per_ft)
        gray = _pdf_page_to_grayscale(page)
        return _read_raster(gray, px_per_ft)

    array = np.frombuffer(content, np.uint8)
    gray = cv2.imdecode(array, cv2.IMREAD_GRAYSCALE)
    if gray is None:
        raise ValueError("Could not decode the image — expected PNG, JPG, or PDF.")
    return _read_raster(gray, px_per_ft)


# --- vector PDF ------------------------------------------------------------------------------


def _open_pdf_page(content: bytes):
    import pdfplumber

    pdf = pdfplumber.open(io.BytesIO(content))
    if not pdf.pages:
        raise ValueError("PDF has no pages.")
    return pdf.pages[0]


def _has_vector_content(page) -> bool:
    return bool(page.lines) or bool(page.rects) or len(page.curves) > 4


def _pdf_page_to_grayscale(page) -> np.ndarray:
    pil = page.to_image(resolution=150).original.convert("L")
    return np.array(pil)


def _segments_from_page(page) -> list[LineString]:
    """Collect wall segments from a vector page: explicit lines, plus the four edges of each rect."""
    segments: list[LineString] = []
    for ln in page.lines:
        segments.append(LineString([(ln["x0"], ln["top"]), (ln["x1"], ln["bottom"])]))
    for rect in page.rects:
        x0, x1, top, bottom = rect["x0"], rect["x1"], rect["top"], rect["bottom"]
        corners = [(x0, top), (x1, top), (x1, bottom), (x0, bottom), (x0, top)]
        for a, b in zip(corners, corners[1:]):
            segments.append(LineString([a, b]))
    return [s for s in segments if s.length > 0]


def _parse_label_area(words: list[dict]) -> list[tuple[str, float | None, float, float]]:
    """Group page words into label candidates (label, area_sf, x, y).

    Looks for a trailing "<NN> SF" / "<NN> SQ FT" area and treats the preceding words on that line
    as the label. Words without an area become labels with area_sf=None. Coordinates are the word's
    page-space center (PDF origin top-left; y flipped to plan y-up by the caller).
    """
    rows: dict[int, list[dict]] = {}
    for w in words:
        key = round(w["top"] / 6.0)  # bucket words into ~6pt text rows
        rows.setdefault(key, []).append(w)

    out: list[tuple[str, float | None, float, float]] = []
    for row in rows.values():
        row.sort(key=lambda w: w["x0"])
        tokens = [w["text"] for w in row]
        upper = [t.upper().strip(".") for t in tokens]
        area_sf: float | None = None
        label_tokens = tokens
        for i, tok in enumerate(upper):
            if tok in ("SF", "SQFT") or (tok == "SQ" and i + 1 < len(upper) and upper[i + 1] == "FT"):
                num = _to_float(tokens[i - 1]) if i > 0 else None
                if num is not None:
                    area_sf = num
                    label_tokens = tokens[: i - 1]
                break
        label = " ".join(label_tokens).strip()
        if not label:
            continue
        cx = sum((w["x0"] + w["x1"]) / 2 for w in row) / len(row)
        cy = sum((w["top"] + w["bottom"]) / 2 for w in row) / len(row)
        out.append((label, area_sf, cx, cy))
    return out


def _to_float(text: str) -> float | None:
    try:
        return float(text.replace(",", ""))
    except ValueError:
        return None


def _read_vector_pdf(page, px_per_ft: float | None) -> ExtractedLayout:
    segments = _segments_from_page(page)
    height = float(page.height)

    walls = [
        Wall(points=[(x, height - y) for x, y in seg.coords], type="unknown")
        for seg in segments
    ]

    polygons = list(polygonize(unary_union(segments)))
    page_area = float(page.width) * height
    polygons = [p for p in polygons if p.area >= _MIN_ROOM_AREA_FRAC * page_area]

    labels = _parse_label_area(page.extract_words())

    scaled, units, scale_note = _resolve_scale(px_per_ft, "pt")
    rooms: list[Room] = []
    for idx, poly in enumerate(polygons):
        label, area_sf = _label_for_polygon(poly, labels)
        boundary = [(x, height - y) for x, y in poly.exterior.coords]
        if scaled:
            boundary = [(x / px_per_ft, y / px_per_ft) for x, y in boundary]
            if area_sf is None:
                area_sf = poly.area / (px_per_ft**2)
        rooms.append(
            Room(
                id=f"R-{idx + 1}",
                label=label,
                area_sf=area_sf if scaled or area_sf is not None else None,
                polygon=boundary,
                type=_room_type(label),
            )
        )

    bounds = _bounds_of(walls, rooms)
    inventory = {"rooms": len(rooms), "walls": len(walls), "doors": 0}
    notes = [
        "Geometry read directly from the vector PDF (paths + text), not from pixels.",
        _FURNITURE_NOTE,
    ]
    if scale_note:
        notes.append(scale_note)
    return ExtractedLayout(
        source="vector_pdf",
        units=units,
        bounds=bounds,
        walls=walls,
        doors=[],
        rooms=rooms,
        furniture=[],
        inventory=inventory,
        needs_confirmation=not scaled,
        notes=notes,
    )


def _label_for_polygon(
    poly: Polygon, labels: list[tuple[str, float | None, float, float]]
) -> tuple[str | None, float | None]:
    for label, area_sf, cx, cy in labels:
        if poly.contains(Point(cx, cy)):
            return label, area_sf
    return None, None


# --- raster ----------------------------------------------------------------------------------


def _read_raster(gray: np.ndarray, px_per_ft: float | None) -> ExtractedLayout:
    height = gray.shape[0]
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    contours, hierarchy = cv2.findContours(binary, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        raise ValueError("No floor-plate outline found in the image.")

    scaled, units, scale_note = _resolve_scale(px_per_ft, "px")

    walls: list[Wall] = []
    rooms: list[Room] = []
    image_area = float(gray.shape[0] * gray.shape[1])
    plate_idx = max(range(len(contours)), key=lambda i: cv2.contourArea(contours[i]))

    for i, contour in enumerate(contours):
        area_px = cv2.contourArea(contour)
        if area_px < _MIN_ROOM_AREA_FRAC * image_area:
            continue
        poly = _approx_polygon(contour, height)  # y-flipped to plan y-up
        if scaled:
            poly = [(x / px_per_ft, y / px_per_ft) for x, y in poly]
        walls.append(Wall(points=poly, type="perimeter" if i == plate_idx else "unknown"))
        # Interior regions (holes of the plate) are rooms; the plate itself is the boundary wall.
        if hierarchy[0][i][3] == plate_idx:
            area_sf = area_px / (px_per_ft**2) if scaled else None
            rooms.append(
                Room(
                    id=f"R-{len(rooms) + 1}",
                    label=None,
                    area_sf=area_sf,
                    polygon=poly,
                    type="unknown",
                )
            )

    notes = [
        "Geometry recovered from a raster image by classical CV — confirm outline and scale.",
        _FURNITURE_NOTE,
    ]
    if scale_note:
        notes.append(scale_note)
    _apply_raster_ocr(gray, rooms, scaled, px_per_ft, height, notes)

    bounds = _bounds_of(walls, rooms)
    inventory = {"rooms": len(rooms), "walls": len(walls), "doors": 0}
    return ExtractedLayout(
        source="raster",
        units=units,
        bounds=bounds,
        walls=walls,
        doors=[],
        rooms=rooms,
        furniture=[],
        inventory=inventory,
        needs_confirmation=not scaled,
        notes=notes,
    )


def _apply_raster_ocr(
    gray: np.ndarray,
    rooms: list[Room],
    scaled: bool,
    px_per_ft: float | None,
    height: int,
    notes: list[str],
) -> None:
    """OCR room labels onto `rooms` in place, if the tesseract binary is available.

    No tesseract -> add a note and return; never hard-fail. Each detected word is placed into the
    room polygon that contains its center (point-in-polygon), so labels land on the right region.
    """
    if not rooms:
        return
    try:
        import pytesseract
    except ImportError:
        notes.append("OCR skipped: the `pytesseract` package is not installed; room labels unread.")
        return
    if shutil.which("tesseract") is None:
        notes.append("OCR skipped: the `tesseract` binary is not installed; room labels unread.")
        return

    data = pytesseract.image_to_data(gray, output_type=pytesseract.Output.DICT)
    polys = [(r, Polygon(r.polygon)) for r in rooms if len(r.polygon) >= 3]
    for i, text in enumerate(data["text"]):
        word = text.strip()
        if not word or int(data["conf"][i]) < 50:
            continue
        cx = data["left"][i] + data["width"][i] / 2
        cy_top = data["top"][i] + data["height"][i] / 2
        x = cx / px_per_ft if scaled else cx
        y = (height - cy_top) / px_per_ft if scaled else (height - cy_top)
        pt = Point(x, y)
        for room, poly in polys:
            if poly.contains(pt):
                room.label = f"{room.label} {word}".strip() if room.label else word
                room.type = _room_type(room.label)
                break


# --- shared ----------------------------------------------------------------------------------


def _resolve_scale(px_per_ft: float | None, raw_units: str) -> tuple[bool, str, str | None]:
    """Decide whether a real-world scale is usable. Returns (scaled, units, note)."""
    if px_per_ft and px_per_ft > 0:
        return True, "ft", None
    return (
        False,
        raw_units,
        f"No scale supplied: coordinates are in {raw_units}. Provide px_per_ft for real areas.",
    )


_ROOM_TYPES = {
    "office": "office",
    "meeting": "meeting",
    "conference": "meeting",
    "huddle": "huddle",
    "reception": "reception",
    "lobby": "reception",
    "open": "open",
    "core": "core",
    "corridor": "circulation",
    "circulation": "circulation",
}


def _room_type(label: str | None) -> str:
    if not label:
        return "unknown"
    low = label.lower()
    for key, value in _ROOM_TYPES.items():
        if key in low:
            return value
    return "unknown"


def _bounds_of(
    walls: list[Wall], rooms: list[Room]
) -> tuple[float, float, float, float]:
    xs: list[float] = []
    ys: list[float] = []
    for w in walls:
        for x, y in w.points:
            xs.append(x)
            ys.append(y)
    for r in rooms:
        for x, y in r.polygon:
            xs.append(x)
            ys.append(y)
    if not xs:
        return (0.0, 0.0, 0.0, 0.0)
    return (min(xs), min(ys), max(xs), max(ys))
