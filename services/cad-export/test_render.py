"""Tests for the cad-export service.

Run with the service venv: .venv/bin/python test_render.py
(Every test_* function is also pytest-compatible.)
"""

from __future__ import annotations

import io
import json
import math
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

import ezdxf
from ezdxf import audit as ezaudit
from ezdxf.math import Matrix44

from render import DOOR_BLOCK, DOOR_UNIT, LAYERS, render_geometry

HERE = Path(__file__).resolve().parent
PORT = 8100

# ---------------------------------------------------------------------------
# fixture: 10 m x 8 m double-wall rectangle (240 mm walls), 2 doors with
# different rotations/swings, 1 window, 2 rooms, 1 printed dimension.
# All coordinates in mm, y-down image space.
# ---------------------------------------------------------------------------

FIXTURE = {
    "geometry": {
        "scale": {"mmPerUnit": 1.0, "source": "test", "confidence": 1.0, "samples": 4},
        "wallNetwork": [
            {
                "outer": [[0, 0], [10000, 0], [10000, 8000], [0, 8000]],
                "holes": [[[240, 240], [9760, 240], [9760, 7760], [240, 7760]]],
            }
        ],
        "walls": [
            {"x1": 0, "y1": 0, "x2": 10000, "y2": 0, "thickness": 240},
            {"x1": 0, "y1": 8000, "x2": 10000, "y2": 8000, "thickness": 240},
        ],
        "doors": [
            # door 1: hinge on top wall, leaf along +X (image), swings into the
            # room (image 0->90 deg == CAD clockwise => mirrored insert)
            {
                "width": 900,
                "hinge": [3000, 240],
                "leaf": {"x1": 3000, "y1": 240, "x2": 3900, "y2": 240},
                "swingArc": {"cx": 3000, "cy": 240, "r": 900, "startDeg": 0, "endDeg": 90},
            },
            # door 2: hinge on right wall, leaf along +Y image (CAD -90 deg),
            # arc image 0->90 with leaf at 90 => CAD counter-clockwise
            {
                "width": 800,
                "hinge": [9760, 5000],
                "leaf": {"x1": 9760, "y1": 5000, "x2": 9760, "y2": 5800},
                "swingArc": {"cx": 9760, "cy": 5000, "r": 800, "startDeg": 0, "endDeg": 90},
            },
        ],
        "windows": [
            {
                "x1": 6000, "y1": 120, "x2": 7200, "y2": 120,
                "faceLines": [
                    {"x1": 6000, "y1": 0, "x2": 7200, "y2": 0},
                    {"x1": 6000, "y1": 240, "x2": 7200, "y2": 240},
                ],
                "glazingLine": {"x1": 6000, "y1": 120, "x2": 7200, "y2": 120},
            }
        ],
        "rooms": [
            {"label": "LIVING", "polygon": [[240, 240], [5000, 240], [5000, 7760], [240, 7760]]},
            {"label": "BEDROOM", "polygon": [[5000, 240], [9760, 240], [9760, 7760], [5000, 7760]]},
        ],
        "dimensions": [
            {"text": "3600", "valueMm": 3600, "x1": 240, "y1": 240, "x2": 3840, "y2": 240}
        ],
        "bounds": {"minX": 0, "maxX": 10000, "minY": 0, "maxY": 8000},
    },
    "meta": {"projectName": "TEST HOUSE", "dateStr": "2026-07-15"},
}

RESULTS: list[tuple[str, str]] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    RESULTS.append((name, "PASS" if cond else f"FAIL {detail}"))
    assert cond, f"{name}: {detail}"


def _render_and_parse():
    result = render_geometry(FIXTURE)
    doc = ezdxf.read(io.StringIO(result["dxf"]))
    return result, doc


def test_render_document():
    result, doc = _render_and_parse()
    msp = doc.modelspace()

    check("engine is ezdxf", result["engine"] == "ezdxf")
    check("dxf non-empty", len(result["dxf"]) > 1000)
    check("dwg is null or base64 str", result["dwg"] is None or isinstance(result["dwg"], str))
    check("units mm", doc.header["$INSUNITS"] == 4)
    check("measurement metric", doc.header["$MEASUREMENT"] == 1)

    # all 8 layers
    for layer in LAYERS:
        check(f"layer {layer} exists", layer in doc.layers)

    # hatch
    hatches = msp.query("HATCH")
    check("HATCH present", len(hatches) >= 1)
    check(
        "HATCH is ANSI31 with hole path",
        hatches[0].dxf.pattern_name == "ANSI31" and len(hatches[0].paths) == 2,
    )

    # doors
    inserts = [e for e in msp.query("INSERT") if e.dxf.name == DOOR_BLOCK]
    check("at least 2 DOOR inserts", len(inserts) >= 2, f"got {len(inserts)}")
    check("DOOR inserts on A-DOOR", all(i.dxf.layer == "A-DOOR" for i in inserts))

    # door leaf endpoints must land on the input leaf free ends (CAD space)
    expected_tips = []
    for door in FIXTURE["geometry"]["doors"]:
        leaf = door["leaf"]
        hinge = door["hinge"]
        pts = [(leaf["x1"], -leaf["y1"]), (leaf["x2"], -leaf["y2"])]
        h = (hinge[0], -hinge[1])
        expected_tips.append(max(pts, key=lambda p: math.dist(p, h)))
    for i, ins in enumerate(inserts):
        m = Matrix44.chain(
            Matrix44.scale(ins.dxf.xscale, ins.dxf.yscale, 1),
            Matrix44.z_rotate(math.radians(ins.dxf.rotation)),
            Matrix44.translate(ins.dxf.insert.x, ins.dxf.insert.y, 0),
        )
        tip = m.transform((DOOR_UNIT, 0, 0))
        err = math.dist((tip.x, tip.y), expected_tips[i])
        check(f"door {i} leaf endpoint within 1mm", err <= 1.0, f"off by {err:.2f}mm")
    # swing sides: door 0 mirrored (CW), door 1 not
    check("door 0 mirrored swing", inserts[0].dxf.yscale < 0)
    check("door 1 unmirrored swing", inserts[1].dxf.yscale > 0)

    # windows
    glaz = msp.query('LINE[layer=="A-GLAZ"]')
    check("3 glazing/face lines", len(glaz) == 3, f"got {len(glaz)}")

    # rooms
    check("2 room polygons", len(msp.query('LWPOLYLINE[layer=="A-AREA"]')) == 2)
    labels = {t.dxf.text for t in msp.query('TEXT[layer=="A-ROOM-IDEN"]')}
    check("room labels present", labels == {"LIVING", "BEDROOM"}, str(labels))

    # dimensions: overall width + overall height + 1 explicit
    dims = msp.query("DIMENSION")
    check("at least 3 DIMENSION entities", len(dims) >= 3, f"got {len(dims)}")
    for i, dim in enumerate(dims):
        check(f"dimension {i} has geometry block", dim.get_geometry_block() is not None)
    check("dimension text override", any(d.dxf.text == "3600" for d in dims))

    # paperspace sheet
    check("SHEET-1 layout exists", "SHEET-1" in doc.layouts.names())
    sheet = doc.layout("SHEET-1")
    viewports = sheet.query("VIEWPORT")
    # the first VIEWPORT of a layout is the paperspace viewport itself (id=1)
    check("sheet has a model viewport", any(vp.dxf.id != 1 for vp in viewports))
    sheet_texts = [t.dxf.text for t in sheet.query("TEXT")]
    check("title text: project name", "TEST HOUSE" in sheet_texts, str(sheet_texts))
    check("title text: draft notice", any("VERIFY DIMENSIONS" in t for t in sheet_texts))
    check("title text: scale", "SCALE 1:100" in sheet_texts)

    # audit of the round-tripped document
    auditor = ezaudit.Auditor(doc)
    auditor.run()
    check("audit 0 errors", not auditor.has_errors, str(auditor.errors[:3]))


def test_http_layer():
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--port", str(PORT)],
        cwd=HERE,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        health = None
        for _ in range(50):
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/health") as resp:
                    health = json.loads(resp.read())
                break
            except OSError:
                time.sleep(0.2)
        check("GET /health responds", health is not None)
        check(
            "health payload",
            health["status"] == "ok"
            and health["engine"] == "ezdxf"
            and isinstance(health["dwg"], bool),
            str(health),
        )

        req = urllib.request.Request(
            f"http://127.0.0.1:{PORT}/render",
            data=json.dumps(FIXTURE).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req) as resp:
            check("POST /render 200", resp.status == 200, str(resp.status))
            body = json.loads(resp.read())
        check(
            "render payload shape",
            isinstance(body["dxf"], str)
            and body["engine"] == "ezdxf"
            and isinstance(body["warnings"], list)
            and (body["dwg"] is None or isinstance(body["dwg"], str)),
        )
        doc = ezdxf.read(io.StringIO(body["dxf"]))
        check("HTTP dxf parses", doc.dxfversion == "AC1032")  # R2018
    finally:
        proc.terminate()
        proc.wait(timeout=10)


if __name__ == "__main__":
    failed = False
    for fn in (test_render_document, test_http_layer):
        try:
            fn()
        except AssertionError:
            failed = True
    width = max(len(n) for n, _ in RESULTS)
    for name, status in RESULTS:
        print(f"{name:<{width}}  {status}")
    print(f"\n{sum(s == 'PASS' for _, s in RESULTS)}/{len(RESULTS)} checks passed")
    sys.exit(1 if failed else 0)
