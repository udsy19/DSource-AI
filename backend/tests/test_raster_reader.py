"""Raster/vector layout reader: synthesize plans in-memory and assert the ExtractedLayout contract.

Deterministic, no network, no model download. The vector-PDF path is exercised with a tiny
reportlab page if available; the raster path is the always-on core.
"""

from __future__ import annotations

import shutil

import cv2
import numpy as np
import pytest

from app.ingestion.raster_reader import read_layout
from app.ingestion.schema import ExtractedLayout


def _plate_png() -> bytes:
    """A filled plate (the walls) with an interior rectangle 'room' punched out, on white."""
    img = np.full((300, 400), 255, np.uint8)
    cv2.rectangle(img, (50, 50), (350, 250), 0, thickness=-1)  # plate 300x200 px
    cv2.rectangle(img, (120, 100), (280, 200), 255, thickness=-1)  # interior room
    ok, buf = cv2.imencode(".png", img)
    assert ok
    return buf.tobytes()


def test_raster_returns_layout_with_room_and_wall():
    layout = read_layout(_plate_png(), "plate.png")
    assert isinstance(layout, ExtractedLayout)
    assert layout.source == "raster"
    assert len(layout.walls) >= 1
    assert len(layout.rooms) >= 1
    assert layout.inventory["rooms"] == len(layout.rooms)


def test_raster_no_scale_is_flagged_not_faked():
    layout = read_layout(_plate_png(), "plate.png")  # no px_per_ft
    assert layout.units == "px"
    assert layout.needs_confirmation is True
    assert all(r.area_sf is None for r in layout.rooms)  # never invents an area


def test_raster_with_scale_computes_feet_and_area():
    layout = read_layout(_plate_png(), "plate.png", px_per_ft=10.0)
    assert layout.units == "ft"
    assert layout.needs_confirmation is False
    assert any(r.area_sf and r.area_sf > 0 for r in layout.rooms)


def test_raster_furniture_is_empty_and_documented():
    layout = read_layout(_plate_png(), "plate.png")
    assert layout.furniture == []
    assert any("furniture" in n.lower() for n in layout.notes)


def test_ocr_skipped_gracefully_when_unavailable():
    layout = read_layout(_plate_png(), "plate.png")

    def _ocr_ready() -> bool:
        try:
            import pytesseract  # noqa: F401
        except ImportError:
            return False
        return shutil.which("tesseract") is not None

    skipped = any("ocr skipped" in n.lower() for n in layout.notes)
    # OCR is skipped (with a note, never a hard failure) iff tesseract isn't fully available.
    assert skipped == (not _ocr_ready())


def _vector_pdf() -> bytes | None:
    """A 200x200pt page with a rectangular room outline and an 'OFFICE 100 SF' label."""
    try:
        from reportlab.pdfgen import canvas
    except ImportError:
        return None
    import io

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(200, 200))
    c.rect(40, 40, 120, 120, stroke=1, fill=0)  # room outline
    c.drawString(70, 95, "OFFICE 100 SF")
    c.showPage()
    c.save()
    return buf.getvalue()


def test_vector_pdf_reads_room_and_label():
    pdf = _vector_pdf()
    if pdf is None:
        pytest.skip("reportlab not installed; vector-PDF synthesis unavailable")
    layout = read_layout(pdf, "plan.pdf")
    assert layout.source == "vector_pdf"
    assert len(layout.walls) >= 1
    assert len(layout.rooms) >= 1
    labels = [r.label for r in layout.rooms if r.label]
    assert any("OFFICE" in (lbl or "") for lbl in labels)
    office = next(r for r in layout.rooms if r.label and "OFFICE" in r.label)
    assert office.area_sf == 100.0  # parsed from the "100 SF" text, not the geometry
    assert office.type == "office"


def test_vector_pdf_without_scale_uses_points():
    pdf = _vector_pdf()
    if pdf is None:
        pytest.skip("reportlab not installed")
    layout = read_layout(pdf, "plan.pdf")
    assert layout.units == "pt"
    assert layout.needs_confirmation is True
