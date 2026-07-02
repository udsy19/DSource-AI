"""Tests for merging two adjacent rooms into one larger space.

Geometry is built directly (no CAD file): two boxes sharing a wall gap. The merged polygon's area
must be ~= the sum of the two rooms, furniture must re-home onto the survivor, and the interior
shared partition must be dropped while perimeter walls survive.
"""

from __future__ import annotations

from shapely.geometry import Polygon

from app.ingestion.room_merge import merge_rooms, union_room_polygon
from app.ingestion.schema import ExtractedLayout, FurnitureItem, Room, Wall


def _adjacent_layout() -> ExtractedLayout:
    # Two 10x10 boxes side by side with a 0.5 ft wall gap between them (x: 0..10 and 10.5..20.5).
    a = Room(id="R-a", label="OFFICE 1", area_sf=100.0, type="office", confidence=0.9,
             polygon=[(0, 0), (10, 0), (10, 10), (0, 10)], center=(5, 5))
    b = Room(id="R-b", label="OFFICE 2", area_sf=100.0, type="office", confidence=0.6,
             polygon=[(10.5, 0), (20.5, 0), (20.5, 10), (10.5, 10)], center=(15.5, 5))
    furniture = [
        FurnitureItem(category="desk", block_name="Desk", brand=None, model=None,
                      x=1, y=1, w=5, h=2, rotation=0, room_id="R-a"),
        FurnitureItem(category="desk", block_name="Desk", brand=None, model=None,
                      x=12, y=1, w=5, h=2, rotation=0, room_id="R-b"),
    ]
    walls = [
        Wall(type="drywall", points=[(10, 0), (10, 10)]),      # shared partition (interior)
        Wall(type="perimeter", points=[(0, 0), (20.5, 0)]),    # outer wall (kept)
    ]
    return ExtractedLayout(source="cad", units="ft", bounds=(0, 0, 20.5, 10),
                           rooms=[a, b], furniture=furniture, walls=walls)


def test_union_area_approximates_sum_of_boxes():
    ring = union_room_polygon(
        [(0, 0), (10, 0), (10, 10), (0, 10)],
        [(10.5, 0), (20.5, 0), (20.5, 10), (10.5, 10)],
    )
    area = Polygon(ring).area
    # Two 100 sf boxes plus the ~5 sf bridged gap — one contiguous polygon, no double count.
    assert 200 <= area <= 215


def test_merge_collapses_two_rooms_into_one():
    layout = merge_rooms(_adjacent_layout(), "R-a", "R-b")
    assert len(layout.rooms) == 1
    merged = layout.rooms[0]
    assert merged.id == "R-a"           # survivor keeps room_a's id
    assert merged.boundary_basis == "merged"
    assert merged.confidence == 0.6     # weaker of the two inputs
    # Area is the honest sum of the two authored room areas, not the bridged-polygon geometry
    # (the +eps/-eps round-trip counts the shared-wall gap, over-stating the merged room).
    assert merged.area_sf == 200.0


def _undersized_layout() -> ExtractedLayout:
    # Mirrors the real DWG (0414 FURNITURE PLAN, OFFICE 1 + OFFICE 2): two "120 SF" offices whose
    # label-seeded segmentation polygons undersize the authored label (74 sf and 102 sf) and sit
    # ~1.4 ft apart across the shared wall. The bridged union polygon is only ~188 sf, but the
    # honest combined area is the two authored labels: 240 sf.
    a = Room(id="R-a", label="OFFICE 1", area_sf=120.0, type="office", confidence=0.6,
             polygon=[(0, 0), (8, 0), (8, 9.2), (0, 9.2)], center=(4, 4.6))
    b = Room(id="R-b", label="OFFICE 2", area_sf=120.0, type="office", confidence=0.6,
             polygon=[(9.4, 0), (17.4, 0), (17.4, 12.7), (9.4, 12.7)], center=(13.4, 6.35))
    return ExtractedLayout(source="cad", units="ft", bounds=(0, 0, 17.4, 12.7),
                           rooms=[a, b], furniture=[], walls=[])


def test_merge_sums_authored_areas_not_undersized_polygons():
    layout = merge_rooms(_undersized_layout(), "R-a", "R-b")
    merged = layout.rooms[0]
    assert merged.area_sf == 240.0
    # the honest combined area, not the ~188 sf bridged union of the under-sized polygons
    assert merged.area_sf > Polygon(merged.polygon).area


def test_merge_rehomes_furniture_onto_survivor():
    layout = merge_rooms(_adjacent_layout(), "R-a", "R-b")
    assert {f.room_id for f in layout.furniture} == {"R-a"}


def test_merge_drops_interior_partition_keeps_perimeter():
    layout = merge_rooms(_adjacent_layout(), "R-a", "R-b")
    types = [w.type for w in layout.walls]
    assert "drywall" not in types       # shared partition dropped
    assert "perimeter" in types         # outer wall kept


def test_merge_missing_room_raises():
    import pytest

    with pytest.raises(ValueError):
        merge_rooms(_adjacent_layout(), "R-a", "R-nope")
