"""Golden-fixture regression tests for the cad-export structure contract.

Renders the checked-in payloads in goldens/*.json and compares a structure
snapshot of each emitted DXF against goldens/<name>.expected.json. Any
render.py change that alters output structure fails loudly here.

Run:      .venv/bin/python test_golden.py
Update:   .venv/bin/python test_golden.py --update   (after an intentional change)
(Every test_* function is also pytest-compatible.)
"""

from __future__ import annotations

import io
import json
import sys
from pathlib import Path

import ezdxf
from ezdxf.lldxf import const as dxfconst

from render import TEXT_STYLE, render_geometry
from test_render import RESULTS, check

HERE = Path(__file__).resolve().parent
GOLDENS = HERE / "goldens"
GOLDEN_NAMES = ("minimal", "full")

SHEET_LAYOUT = "SHEET-1"
# Text styles the render is allowed to place text with, and the built-in
# fonts they may resolve to (ARCHTEXT falls back to txt when arial.ttf is
# unavailable). Recipients need no font installs beyond stock CAD fonts.
REFERENCED_STYLES = {TEXT_STYLE, "Standard"}
BUILTIN_FONTS = {"arial.ttf", "txt", "txt.shx"}


def _load_payload(name: str) -> dict:
    return json.loads((GOLDENS / f"{name}.json").read_text())


def _render_doc(name: str):
    result = render_geometry(_load_payload(name))
    return result, ezdxf.read(io.StringIO(result["dxf"]))


def _entity_counts(space) -> dict[str, int]:
    counts: dict[str, int] = {}
    for e in space:
        key = f"{e.dxftype()}/{e.dxf.layer}"
        counts[key] = counts.get(key, 0) + 1
    return dict(sorted(counts.items()))


def snapshot(doc) -> dict:
    """Structure snapshot: everything the expectation files pin."""
    msp = doc.modelspace()
    sheet = doc.layout(SHEET_LAYOUT)
    dims = msp.query("DIMENSION")
    return {
        "layers": sorted(layer.dxf.name for layer in doc.layers),
        "insunits": int(doc.header["$INSUNITS"]),
        "modelspace": _entity_counts(msp),
        "paperspace": _entity_counts(sheet),
        "dimension_count": len(dims),
        "dimensions_with_geometry_block": sum(
            1 for d in dims if d.get_geometry_block() is not None
        ),
        "paperspace_viewport": any(
            vp.dxf.id != 1 for vp in sheet.query("VIEWPORT")
        ),
        "layouts": sorted(doc.layouts.names()),
        "text_styles": sorted(s.dxf.name for s in doc.styles),
    }


def _snapshot_diff(actual: dict, expected: dict) -> str:
    lines = []
    for key in sorted(set(actual) | set(expected)):
        a, e = actual.get(key), expected.get(key)
        if a != e:
            lines.append(f"{key}: expected {e!r}, got {a!r}")
    return "; ".join(lines) or "no field diff (key order?)"


def _assert_preflight(name: str, doc) -> None:
    """Recipient pre-flight checklist: the common CAD-exchange rejection causes."""
    # 1. units are explicit millimeters — no units ambiguity
    check(f"{name}: $INSUNITS present", "$INSUNITS" in doc.header)
    check(
        f"{name}: $INSUNITS == 4 (mm)",
        doc.header["$INSUNITS"] == 4,
        str(doc.header.get("$INSUNITS")),
    )

    # 2. self-contained: no xref block definitions
    xrefs = [
        b.name
        for b in doc.blocks
        if b.block.dxf.flags & (dxfconst.BLK_XREF | dxfconst.BLK_XREF_OVERLAY)
    ]
    check(f"{name}: no XREF blocks", not xrefs, str(xrefs))

    # 3. no font dependencies: text only via known styles on built-in fonts
    baseline = {s.dxf.name for s in ezdxf.new("R2018", setup=True).styles}
    extra = {s.dxf.name for s in doc.styles} - baseline - {TEXT_STYLE}
    check(f"{name}: style table only expected styles", not extra, str(extra))
    for style_name in REFERENCED_STYLES:
        font = doc.styles.get(style_name).dxf.font
        check(
            f"{name}: style {style_name} uses built-in font",
            font in BUILTIN_FONTS,
            f"font={font!r}",
        )
    used_styles = {
        t.dxf.style
        for space in (doc.modelspace(), doc.layout(SHEET_LAYOUT))
        for t in space.query("TEXT MTEXT")
    }
    check(
        f"{name}: all text on expected styles",
        used_styles <= REFERENCED_STYLES,
        str(used_styles),
    )

    # 4. everything in modelspace + the one paperspace sheet — no stray layouts
    check(
        f"{name}: layouts are Model + {SHEET_LAYOUT} only",
        sorted(doc.layouts.names()) == ["Model", SHEET_LAYOUT],
        str(doc.layouts.names()),
    )


def _run_golden(name: str) -> None:
    result, doc = _render_doc(name)
    audit = result["audit"]
    check(
        f"{name}: round-trip audit passed (0 errors)",
        audit["passed"] and audit["errors"] == 0,
        str(audit),
    )
    actual = snapshot(doc)
    expected_path = GOLDENS / f"{name}.expected.json"
    check(f"{name}: expectation file exists", expected_path.is_file(), str(expected_path))
    expected = json.loads(expected_path.read_text())
    check(
        f"{name}: structure snapshot matches",
        actual == expected,
        _snapshot_diff(actual, expected)
        + " — if intentional, run: python test_golden.py --update",
    )
    _assert_preflight(name, doc)


def test_golden_minimal() -> None:
    _run_golden("minimal")


def test_golden_full() -> None:
    _run_golden("full")


def update_expectations() -> None:
    """Regenerate goldens/<name>.expected.json (still gated on audit + pre-flight)."""
    for name in GOLDEN_NAMES:
        result, doc = _render_doc(name)
        audit = result["audit"]
        check(f"{name}: round-trip audit passed (0 errors)", audit["passed"], str(audit))
        _assert_preflight(name, doc)
        path = GOLDENS / f"{name}.expected.json"
        path.write_text(json.dumps(snapshot(doc), indent=2, sort_keys=True) + "\n")
        print(f"updated {path}")


def _report() -> bool:
    width = max(len(n) for n, _ in RESULTS)
    for name, status in RESULTS:
        print(f"{name:<{width}}  {status}")
    print(f"\n{sum(s == 'PASS' for _, s in RESULTS)}/{len(RESULTS)} checks passed")
    return all(s == "PASS" for _, s in RESULTS)


if __name__ == "__main__":
    if "--update" in sys.argv[1:]:
        update_expectations()
        sys.exit(0 if _report() else 1)
    for fn in (test_golden_minimal, test_golden_full):
        try:
            fn()
        except AssertionError:
            pass
    sys.exit(0 if _report() else 1)
