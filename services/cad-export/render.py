"""DXF/DWG rendering for floor-plan geometry.

Input coordinates are real millimeters in Y-DOWN image space; every
coordinate is flipped to CAD Y-up (y' = -y) at the authoring boundary.
"""

from __future__ import annotations

import base64
import io
import math
import os
import shutil
import tempfile
from pathlib import Path
from typing import Any

import ezdxf
from ezdxf import audit as ezaudit
from ezdxf import recover as ezrecover
from ezdxf.enums import TextEntityAlignment
from ezdxf.lldxf import const as dxfconst

ENGINE = "ezdxf"

DOOR_BLOCK = "DOOR"
DOOR_UNIT = 900.0  # unit door block: 900 mm leaf along +X

TEXT_STYLE = "ARCHTEXT"
DIM_STYLE = "ARCH"

# AIA/NCS layer table: name -> (AutoCAD color index, lineweight in 1/100 mm)
LAYERS = {
    "A-WALL": (1, 50),
    "A-WALL-PATT": (9, 13),
    "A-DOOR": (4, 25),
    "A-GLAZ": (3, 18),
    "A-AREA": (5, 13),
    "A-ROOM-IDEN": (5, 18),
    "A-FLOR-FIXT": (6, 18),
    "A-ANNO-DIMS": (7, 18),
    "A-ANNO-TTLB": (7, 35),
}


# ---------------------------------------------------------------------------
# geometry helpers (CAD space, y-up)
# ---------------------------------------------------------------------------

def _flip(pt: Any) -> tuple[float, float]:
    """Image-space [x, y] (y-down) -> CAD-space (x, -y)."""
    return (float(pt[0]), -float(pt[1]))


def _flip_ring(ring: Any) -> list[tuple[float, float]]:
    return [_flip(p) for p in ring]


def _signed_area(ring: list[tuple[float, float]]) -> float:
    area = 0.0
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        area += x1 * y2 - x2 * y1
    return area / 2.0


def _oriented(ring: list[tuple[float, float]], ccw: bool) -> list[tuple[float, float]]:
    if (_signed_area(ring) > 0) != ccw:
        return list(reversed(ring))
    return ring


def _centroid(ring: list[tuple[float, float]]) -> tuple[float, float]:
    area = _signed_area(ring)
    if abs(area) < 1e-9:  # degenerate: fall back to vertex average
        n = max(len(ring), 1)
        return (sum(p[0] for p in ring) / n, sum(p[1] for p in ring) / n)
    cx = cy = 0.0
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        cross = x1 * y2 - x2 * y1
        cx += (x1 + x2) * cross
        cy += (y1 + y2) * cross
    return (cx / (6.0 * area), cy / (6.0 * area))


def _norm_deg(a: float) -> float:
    return a % 360.0


def _ang_close(a: float, b: float, tol: float = 15.0) -> bool:
    d = abs(_norm_deg(a) - _norm_deg(b))
    return min(d, 360.0 - d) <= tol


# ---------------------------------------------------------------------------
# document setup
# ---------------------------------------------------------------------------

def _setup_doc(warnings: list[str]):
    doc = ezdxf.new("R2018", setup=True)
    doc.header["$INSUNITS"] = 4  # millimeters
    doc.header["$MEASUREMENT"] = 1  # metric

    for name, (color, lw) in LAYERS.items():
        doc.layers.add(name, color=color, lineweight=lw)

    try:
        doc.styles.add(TEXT_STYLE, font="arial.ttf")
    except Exception:
        warnings.append("Font arial.ttf unavailable for ARCHTEXT, using txt")
        doc.styles.add(TEXT_STYLE, font="txt")

    doc.dimstyles.add(
        DIM_STYLE,
        dxfattribs={
            "dimtsz": 100,  # architectural tick size
            "dimtxt": 200,  # text height
            "dimexe": 100,  # extension beyond dim line
            "dimexo": 50,  # extension line offset
            "dimdec": 0,  # no decimals
            "dimzin": 8,  # suppress trailing zeros
            "dimtxsty": TEXT_STYLE,
            "dimtad": 1,  # text above dimension line
            "dimgap": 50,
        },
    )
    return doc


def _define_door_block(doc) -> None:
    """Unit door on layer '0': 900 mm leaf along +X, quarter swing arc CCW."""
    block = doc.blocks.new(name=DOOR_BLOCK)
    attribs = {"layer": "0"}
    block.add_line((0, 0), (DOOR_UNIT, 0), dxfattribs=attribs)
    block.add_arc(
        center=(0, 0), radius=DOOR_UNIT, start_angle=0, end_angle=90, dxfattribs=attribs
    )


# ---------------------------------------------------------------------------
# model-space content
# ---------------------------------------------------------------------------

def _draw_walls(msp, wall_network: list[dict], warnings: list[str]) -> None:
    for i, region in enumerate(wall_network or []):
        outer = _flip_ring(region.get("outer") or [])
        if len(outer) < 3:
            warnings.append(f"wallNetwork[{i}]: outer ring has <3 points, skipped")
            continue
        holes = [
            _flip_ring(h) for h in (region.get("holes") or []) if len(h) >= 3
        ]

        # outline polylines
        msp.add_lwpolyline(outer, close=True, dxfattribs={"layer": "A-WALL"})
        for hole in holes:
            msp.add_lwpolyline(hole, close=True, dxfattribs={"layer": "A-WALL"})

        # hatch: outer CCW external, holes CW punching out
        hatch = msp.add_hatch(dxfattribs={"layer": "A-WALL-PATT"})
        hatch.set_pattern_fill("ANSI31", scale=20)
        hatch.dxf.hatch_style = dxfconst.HATCH_STYLE_NESTED
        hatch.paths.add_polyline_path(
            _oriented(outer, ccw=True),
            is_closed=True,
            flags=dxfconst.BOUNDARY_PATH_EXTERNAL,
        )
        for hole in holes:
            hatch.paths.add_polyline_path(
                _oriented(hole, ccw=False),
                is_closed=True,
                flags=dxfconst.BOUNDARY_PATH_OUTERMOST,
            )


def _door_insert_params(door: dict) -> tuple[tuple[float, float], float, float, float]:
    """Return (hinge, rotation_deg, xscale, yscale) in CAD space."""
    hinge = _flip(door["hinge"])
    leaf = door.get("leaf") or {}
    p1 = _flip((leaf.get("x1", 0), leaf.get("y1", 0)))
    p2 = _flip((leaf.get("x2", 0), leaf.get("y2", 0)))
    # leaf vector points from the hinge to the free end
    if math.dist(p1, hinge) <= math.dist(p2, hinge):
        vec = (p2[0] - hinge[0], p2[1] - hinge[1])
    else:
        vec = (p1[0] - hinge[0], p1[1] - hinge[1])
    rotation = math.degrees(math.atan2(vec[1], vec[0]))

    width = float(door.get("width") or math.hypot(*vec) or DOOR_UNIT)
    scale = width / DOOR_UNIT

    # Swing side: the unit block sweeps CCW from the leaf (0 deg -> 90 deg).
    # Image-space arc angles map to CAD as negated angles; if the arc's far
    # end sits at rotation-90 the swing is clockwise -> mirror with -yscale.
    yscale = scale
    arc = door.get("swingArc") or {}
    if "startDeg" in arc and "endDeg" in arc:
        ends_cad = (-float(arc["startDeg"]), -float(arc["endDeg"]))
        for a in ends_cad:
            if _ang_close(a, rotation):
                continue
            if _ang_close(a, rotation - 90):
                yscale = -scale
            break
    return hinge, rotation, scale, yscale


def _draw_doors(msp, doors: list[dict], warnings: list[str]) -> None:
    for i, door in enumerate(doors or []):
        try:
            hinge, rotation, xscale, yscale = _door_insert_params(door)
        except (KeyError, TypeError, ValueError) as exc:
            warnings.append(f"doors[{i}]: invalid ({exc}), skipped")
            continue
        msp.add_blockref(
            DOOR_BLOCK,
            hinge,
            dxfattribs={
                "layer": "A-DOOR",
                "rotation": rotation,
                "xscale": xscale,
                "yscale": yscale,
            },
        )


def _draw_windows(msp, windows: list[dict], warnings: list[str]) -> None:
    attribs = {"layer": "A-GLAZ"}

    def add_seg(seg: dict | None) -> bool:
        if not seg:
            return False
        try:
            msp.add_line(
                _flip((seg["x1"], seg["y1"])), _flip((seg["x2"], seg["y2"])), dxfattribs=attribs
            )
            return True
        except (KeyError, TypeError):
            return False

    for i, win in enumerate(windows or []):
        drew = False
        for face in win.get("faceLines") or []:
            drew = add_seg(face) or drew
        drew = add_seg(win.get("glazingLine")) or drew
        if not drew:  # degenerate window: fall back to its centerline
            if not add_seg(win):
                warnings.append(f"windows[{i}]: no drawable lines, skipped")


def _draw_rooms(msp, rooms: list[dict], warnings: list[str]) -> None:
    for i, room in enumerate(rooms or []):
        poly = _flip_ring(room.get("polygon") or [])
        if len(poly) < 3:
            warnings.append(f"rooms[{i}]: polygon has <3 points, skipped")
            continue
        msp.add_lwpolyline(poly, close=True, dxfattribs={"layer": "A-AREA"})
        label = str(room.get("label") or "").strip()
        cx, cy = _centroid(poly)
        if label:
            text = msp.add_text(
                label,
                height=200,
                dxfattribs={"layer": "A-ROOM-IDEN", "style": TEXT_STYLE},
            )
            text.set_placement((cx, cy), align=TextEntityAlignment.MIDDLE_CENTER)
        area = room.get("areaM2")
        if isinstance(area, (int, float)) and area > 0:
            area_text = msp.add_text(
                f"{area} m2",
                height=150,
                dxfattribs={"layer": "A-ROOM-IDEN", "style": TEXT_STYLE},
            )
            area_text.set_placement(
                (cx, cy - 300), align=TextEntityAlignment.MIDDLE_CENTER
            )


def _draw_fixtures(msp, fixtures: list[dict], warnings: list[str]) -> None:
    for i, fixture in enumerate(fixtures or []):
        try:
            x1, y1 = float(fixture["x1"]), float(fixture["y1"])
            x2, y2 = float(fixture["x2"]), float(fixture["y2"])
        except (KeyError, TypeError, ValueError):
            warnings.append(f"fixtures[{i}]: invalid box, skipped")
            continue
        # y-flip: box corners in CAD space
        ring = [(x1, -y1), (x2, -y1), (x2, -y2), (x1, -y2)]
        msp.add_lwpolyline(ring, close=True, dxfattribs={"layer": "A-FLOR-FIXT"})
        if fixture.get("type") == "stairs":
            w, h = abs(x2 - x1), abs(y2 - y1)
            span = max(w, h)
            steps = max(2, int(span // 280))
            for s in range(1, steps):
                t = span * s / steps
                if w >= h:
                    msp.add_line(
                        (x1 + t, -y1), (x1 + t, -y2),
                        dxfattribs={"layer": "A-FLOR-FIXT"},
                    )
                else:
                    msp.add_line(
                        (x1, -(y1 + t)), (x2, -(y1 + t)),
                        dxfattribs={"layer": "A-FLOR-FIXT"},
                    )
        label = str(fixture.get("label") or fixture.get("type") or "").strip()
        if label and label != "other":
            text = msp.add_text(
                label,
                height=150,
                dxfattribs={"layer": "A-FLOR-FIXT", "style": TEXT_STYLE},
            )
            text.set_placement(
                ((x1 + x2) / 2, -(y1 + y2) / 2),
                align=TextEntityAlignment.MIDDLE_CENTER,
            )


def _add_dim(msp, p1, p2, distance: float, text: str | None = None) -> None:
    dim = msp.add_aligned_dim(
        p1=p1,
        p2=p2,
        distance=distance,
        dimstyle=DIM_STYLE,
        text=text if text is not None else "<>",
        dxfattribs={"layer": "A-ANNO-DIMS"},
    )
    dim.render()


def _draw_dimensions(msp, geometry: dict, warnings: list[str]) -> None:
    bounds = geometry.get("bounds") or {}
    try:
        min_x, max_x = float(bounds["minX"]), float(bounds["maxX"])
        min_y, max_y = float(bounds["minY"]), float(bounds["maxY"])
    except (KeyError, TypeError, ValueError):
        warnings.append("bounds missing/invalid: overall dimensions skipped")
    else:
        # CAD space: y in [-max_y, -min_y]
        # overall width, 800 mm below the plan (p1->p2 chosen so +distance is below)
        _add_dim(msp, (max_x, -max_y), (min_x, -max_y), distance=800)
        # overall height, 800 mm left of the plan
        _add_dim(msp, (min_x, -max_y), (min_x, -min_y), distance=800)

    for i, d in enumerate(geometry.get("dimensions") or []):
        try:
            p1 = _flip((d["x1"], d["y1"]))
            p2 = _flip((d["x2"], d["y2"]))
            text = str(round(float(d["valueMm"])))
        except (KeyError, TypeError, ValueError) as exc:
            warnings.append(f"dimensions[{i}]: invalid ({exc}), skipped")
            continue
        _add_dim(msp, p1, p2, distance=300, text=text)


# ---------------------------------------------------------------------------
# paperspace sheet
# ---------------------------------------------------------------------------

SHEET_W, SHEET_H = 420.0, 297.0  # ISO A3 landscape, mm
SHEET_MARGIN = 10.0
TTLB_W, TTLB_H = 160.0, 40.0


def _setup_sheet(doc, geometry: dict, meta: dict, warnings: list[str]) -> None:
    doc.layouts.rename("Layout1", "SHEET-1")
    layout = doc.layout("SHEET-1")
    layout.page_setup(size=(SHEET_W, SHEET_H), margins=(0, 0, 0, 0), units="mm")

    attribs = {"layer": "A-ANNO-TTLB"}
    x0, y0 = SHEET_MARGIN, SHEET_MARGIN
    x1, y1 = SHEET_W - SHEET_MARGIN, SHEET_H - SHEET_MARGIN
    layout.add_lwpolyline(
        [(x0, y0), (x1, y0), (x1, y1), (x0, y1)], close=True, dxfattribs=attribs
    )

    # bottom-right title block
    tx0, ty0 = x1 - TTLB_W, y0
    layout.add_lwpolyline(
        [(tx0, ty0), (x1, ty0), (x1, ty0 + TTLB_H), (tx0, ty0 + TTLB_H)],
        close=True,
        dxfattribs=attribs,
    )
    lines = [
        (str(meta.get("projectName") or "FLOOR PLAN"), 5.0),
        (str(meta.get("dateStr") or ""), 3.5),
        ("SCALE 1:100", 3.5),
        ("GENERATED DRAFT — VERIFY DIMENSIONS", 3.0),
    ]
    ty = ty0 + TTLB_H - 8.0
    for content, height in lines:
        if not content:
            continue
        text = layout.add_text(
            content,
            height=height,
            dxfattribs={**attribs, "style": TEXT_STYLE},
        )
        text.set_placement((tx0 + 4.0, ty), align=TextEntityAlignment.MIDDLE_LEFT)
        ty -= 9.0

    # viewport fitted to the model extents (incl. dimension offsets)
    bounds = geometry.get("bounds") or {}
    try:
        min_x, max_x = float(bounds["minX"]), float(bounds["maxX"])
        min_y, max_y = float(bounds["minY"]), float(bounds["maxY"])
    except (KeyError, TypeError, ValueError):
        warnings.append("bounds missing/invalid: paperspace viewport skipped")
        return
    pad = 1500.0  # room for the overall dimensions + ticks
    ext_w = (max_x - min_x) + 2 * pad
    ext_h = (max_y - min_y) + 2 * pad
    view_center = ((min_x + max_x) / 2.0 - pad / 2.0, -(min_y + max_y) / 2.0 - pad / 2.0)

    vp_w = x1 - x0 - 2 * SHEET_MARGIN
    vp_h = y1 - y0 - TTLB_H - 2 * SHEET_MARGIN
    # match the viewport aspect to the extents so view_height fits everything
    if ext_w / ext_h > vp_w / vp_h:
        vp_h = vp_w * ext_h / ext_w
    else:
        vp_w = vp_h * ext_w / ext_h
    layout.add_viewport(
        center=((x0 + x1) / 2.0, (y0 + TTLB_H + y1) / 2.0),
        size=(vp_w, vp_h),
        view_center_point=view_center,
        view_height=ext_h,
    )


# ---------------------------------------------------------------------------
# DWG conversion (ODA File Converter)
# ---------------------------------------------------------------------------

def _oda_exec_path() -> str | None:
    env_path = os.environ.get("ODA_CONVERTER_PATH")
    if env_path and Path(env_path).is_file():
        return env_path
    return shutil.which("ODAFileConverter")


def oda_available() -> bool:
    return _oda_exec_path() is not None


def _export_dwg(doc, warnings: list[str]) -> str | None:
    exec_path = _oda_exec_path()
    if exec_path is None:
        warnings.append("DWG conversion unavailable")
        return None
    try:
        from ezdxf.addons import odafc

        ezdxf.options.set("odafc-addon", "unix_exec_path", exec_path)
        with tempfile.TemporaryDirectory() as tmp:
            dwg_path = Path(tmp) / "plan.dwg"
            odafc.export_dwg(doc, str(dwg_path), version="R2018", replace=True)
            return base64.b64encode(dwg_path.read_bytes()).decode("ascii")
    except Exception as exc:  # never fail the request over DWG
        warnings.append(f"DWG conversion unavailable ({exc})")
        return None


# ---------------------------------------------------------------------------
# round-trip audit gate
# ---------------------------------------------------------------------------

def _roundtrip_audit(dxf_text: str, warnings: list[str]) -> dict:
    """Re-parse the emitted DXF with ezdxf.recover and audit the result.

    Returns {"errors": int, "fixes": int, "passed": bool}; errors is -1 when
    the emitted text could not be parsed at all. Never raises — an audit
    problem degrades to a warning, not a failed request.
    """
    try:
        _, auditor = ezrecover.read(io.BytesIO(dxf_text.encode("utf-8")))
        errors, fixes = len(auditor.errors), len(auditor.fixes)
    except Exception as exc:
        warnings.append(f"Export audit could not parse emitted DXF ({exc})")
        return {"errors": -1, "fixes": 0, "passed": False}
    if errors > 0:
        warnings.append(f"Export audit found {errors} unrecoverable issue(s)")
    return {"errors": errors, "fixes": fixes, "passed": errors == 0}


# ---------------------------------------------------------------------------
# entry point
# ---------------------------------------------------------------------------

def render_geometry(payload: dict) -> dict:
    """Render the fixed /render JSON contract to DXF (+ optional DWG).

    Returns {"dxf": str, "dwg": str|None, "engine": "ezdxf",
    "warnings": [str], "audit": {"errors": int, "fixes": int, "passed": bool}}.
    Raises ValueError on an unusable payload.
    """
    geometry = payload.get("geometry")
    if not isinstance(geometry, dict):
        raise ValueError("payload.geometry must be an object")
    meta = payload.get("meta") or {}

    warnings: list[str] = []
    doc = _setup_doc(warnings)
    _define_door_block(doc)
    msp = doc.modelspace()

    _draw_walls(msp, geometry.get("wallNetwork") or [], warnings)
    _draw_doors(msp, geometry.get("doors") or [], warnings)
    _draw_windows(msp, geometry.get("windows") or [], warnings)
    _draw_rooms(msp, geometry.get("rooms") or [], warnings)
    _draw_fixtures(msp, geometry.get("fixtures") or [], warnings)
    _draw_dimensions(msp, geometry, warnings)
    _setup_sheet(doc, geometry, meta, warnings)

    auditor = doc.audit()
    for fix in auditor.fixes:
        warnings.append(f"audit fix: {fix.message}")
    verify = ezaudit.Auditor(doc)
    verify.run()
    if verify.has_errors:
        details = "; ".join(e.message for e in verify.errors[:5])
        raise ValueError(f"DXF audit failed with {len(verify.errors)} errors: {details}")

    stream = io.StringIO()
    doc.write(stream)
    dxf_text = stream.getvalue()

    audit_report = _roundtrip_audit(dxf_text, warnings)
    dwg_b64 = _export_dwg(doc, warnings)

    return {
        "dxf": dxf_text,
        "dwg": dwg_b64,
        "engine": ENGINE,
        "warnings": warnings,
        "audit": audit_report,
    }
