"""Tests for the label-seeded room segmenter (pure geometry, no DXF).

The robustness guarantee: two labeled rooms never merge, even when the wall between them has a gap —
the nearest-seed watershed splits the shared region. And a bounded region with no label still comes
back as one region (an open field / unlabeled room), never dropped.
"""

from __future__ import annotations

from shapely.geometry import LineString

from app.ingestion.room_segment import segment_regions

BOX = [LineString([(0, 0), (20, 0), (20, 20), (0, 20), (0, 0)])]  # a closed 20x20 ft room
BOUNDS = (0.0, 0.0, 20.0, 20.0)


def test_gapped_partition_with_two_seeds_yields_two_rooms():
    # a partition that stops 5 ft short of the top wall — a real gap that merges the two halves
    walls = BOX + [LineString([(10, 0), (10, 15)])]
    regions = segment_regions(walls, [(5, 10), (15, 10)], BOUNDS)
    seeded = [r for r in regions if r.seed_index is not None]
    assert len(seeded) == 2, f"two seeds across a wall gap must not merge; got {len(regions)} regions"
    assert {r.seed_index for r in seeded} == {0, 1}
    assert all(r.basis == "label_seeded" for r in seeded)


def test_bounded_region_without_a_seed_is_still_returned():
    regions = segment_regions(BOX, [], BOUNDS)
    assert len(regions) == 1
    assert regions[0].seed_index is None
    assert regions[0].basis == "walls_closed"
    assert regions[0].area_sf > 250  # ~ the 20x20 interior, minus wall thickness


def test_single_seed_claims_its_bounded_room():
    regions = segment_regions(BOX, [(10, 10)], BOUNDS)
    assert len(regions) == 1
    assert regions[0].seed_index == 0
    assert regions[0].basis == "walls_closed"
