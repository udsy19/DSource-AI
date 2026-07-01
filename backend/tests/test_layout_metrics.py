"""Tests for live layout metrics — the seat/density figures the editable canvas re-scores.

Every number is derived from the ExtractedLayout geometry (built here directly, no CAD file), so
the editor can show seats, open/enclosed split, usable area and density as the user edits.
"""

from __future__ import annotations

import pytest

from app.ingestion.layout_metrics import compute_layout_metrics
from app.ingestion.schema import ExtractedLayout, FurnitureItem, Room


def _desk(room_id: str) -> FurnitureItem:
    return FurnitureItem(category="desk", block_name="Desk", brand=None, model=None,
                         x=0, y=0, w=5, h=2, rotation=0, room_id=room_id)


def _layout() -> ExtractedLayout:
    rooms = [
        Room(id="R-open", label=None, area_sf=400.0, type="open",
             polygon=[(0, 0), (20, 0), (20, 20), (0, 20)], center=(10, 10)),
        Room(id="R-off", label="OFFICE 1", area_sf=200.0, type="office",
             polygon=[(20, 0), (40, 0), (40, 10), (20, 10)], center=(30, 5)),
    ]
    furniture = [_desk("R-open"), _desk("R-open"), _desk("R-off"),
                 FurnitureItem(category="chair", block_name="Chair", brand=None, model=None,
                               x=1, y=1, w=2, h=2, rotation=0, room_id="R-open")]
    return ExtractedLayout(source="cad", units="ft", bounds=(0, 0, 40, 20),
                           rooms=rooms, furniture=furniture)


def test_seats_count_only_work_positions():
    m = compute_layout_metrics(_layout())
    assert m["seats"] == 3  # three desks; the chair is not a work position


def test_open_vs_enclosed_split():
    m = compute_layout_metrics(_layout())
    assert m["enclosed_seats"] == 1  # the desk inside the office
    assert m["open_seats"] == 2      # the two desks in the open field


def test_usable_area_from_detected_rooms():
    m = compute_layout_metrics(_layout())
    assert m["usable_sf"] == pytest.approx(600.0)  # 400 + 200 room areas


def test_density_is_usable_over_seats():
    m = compute_layout_metrics(_layout())
    assert m["density_sf_per_person"] == pytest.approx(200.0)  # 600 / 3


def test_no_seats_yields_zero_density_not_crash():
    layout = ExtractedLayout(source="cad", units="ft", bounds=(0, 0, 10, 10),
                             rooms=[], furniture=[])
    m = compute_layout_metrics(layout)
    assert m["seats"] == 0
    assert m["density_sf_per_person"] == 0.0
