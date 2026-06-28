"""Detailed-mode tests — pure geometry, no DB/catalog/network.

Builds a PlanModel directly from a rectangular boundary (mirrors test_alternatives.py /
test_concept.py). Asserts the core Detailed behaviours: explicit requested counts are placed (or
fewer with a note if they don't fit), window-placed offices sit nearer the perimeter than core
ones, 3 scored variants are returned with valid metrics, and determinism.
"""

from shapely.geometry import Polygon, box

from app.floorplan.dxf_ingest import PlanModel
from app.testfit.detailed import DetailedProgram, RoomRequest, generate_from_detailed

_METRIC_KEYS = {
    "usf", "seats", "open_space_seats", "offices", "conf_rooms",
    "density_sf_per_person", "daylight_pct", "privacy_pct", "efficiency_pct",
}


def _plan() -> PlanModel:
    """A plain 140 x 90 ft rectangular plate (12,600 sf), no core/columns."""
    w, h = 140.0, 90.0
    boundary = [(0.0, 0.0), (w, 0.0), (w, h), (0.0, h), (0.0, 0.0)]
    area = w * h
    return PlanModel(
        units="feet", sqft_factor=1.0, boundary=boundary,
        gross_area_sf=area, core_area_sf=0.0, usable_area_sf=area,
        columns=[], cores=[], boundary_source="polyline",
        needs_confirmation=False, notes=[],
    )


def _instances_of(alt: dict, instance_type: str) -> list[dict]:
    return [i for i in alt["testfit"]["instances"] if i["type"] == instance_type]


def test_returns_three_scored_variants():
    program = DetailedProgram(rooms=[RoomRequest(type="office", count=4, placement="window")])
    result = generate_from_detailed(_plan(), program)

    assert [a["id"] for a in result["alternatives"]] == ["A", "B", "C"]
    assert result["plan"]["usable_area_sf"] == 12600.0
    for alt in result["alternatives"]:
        assert set(alt["metrics"]) == _METRIC_KEYS
        assert "instances" in alt["testfit"]
        for v in alt["metrics"].values():
            assert v >= 0.0
    metrics = [tuple(sorted(a["metrics"].items())) for a in result["alternatives"]]
    assert len(set(metrics)) == 3, "the three variants must differ in their metrics"


def test_explicit_counts_are_honoured():
    program = DetailedProgram(rooms=[
        RoomRequest(type="office", count=4, placement="window"),
        RoomRequest(type="meeting", count=2, placement="core"),
        RoomRequest(type="huddle", count=1, placement="flexible"),
    ])
    result = generate_from_detailed(_plan(), program)

    # Variant A keeps the request as-is (no room-dropping). The 140x90 plate is roomy enough.
    alt_a = result["alternatives"][0]
    assert len(_instances_of(alt_a, "private_office")) == 4
    assert len(_instances_of(alt_a, "meeting_room")) == 2
    assert len(_instances_of(alt_a, "collaboration")) == 1
    placed = alt_a["testfit"]["program"]["placed"]
    assert placed["office"] == 4
    assert placed["meeting"] == 2


def test_shortfall_is_noted_not_faked():
    """Requesting far more rooms than fit -> fewer placed AND an honest note; never off-plate."""
    program = DetailedProgram(rooms=[RoomRequest(type="meeting", count=40, placement="window")])
    result = generate_from_detailed(_plan(), program)
    alt_a = result["alternatives"][0]

    placed = len(_instances_of(alt_a, "meeting_room"))
    assert placed < 40
    assert alt_a["testfit"]["program"]["requested"]["meeting"] == 40
    assert alt_a["testfit"]["program"]["placed"].get("meeting", 0) == placed
    assert any("fewer than requested" in n for n in alt_a["testfit"]["notes"])


def test_window_offices_sit_nearer_perimeter_than_core():
    plan = _plan()
    boundary = Polygon(plan.boundary)

    window = generate_from_detailed(
        plan, DetailedProgram(rooms=[RoomRequest(type="office", count=3, placement="window")])
    )
    core = generate_from_detailed(
        plan, DetailedProgram(rooms=[RoomRequest(type="office", count=3, placement="core")])
    )

    def mean_edge_distance(result: dict) -> float:
        offices = _instances_of(result["alternatives"][0], "private_office")
        assert offices, "expected offices placed"
        dists = [
            boundary.exterior.distance(box(o["x"], o["y"], o["x"] + o["w"], o["y"] + o["h"]).centroid)
            for o in offices
        ]
        return sum(dists) / len(dists)

    assert mean_edge_distance(window) < mean_edge_distance(core)


def test_is_deterministic():
    program = DetailedProgram(rooms=[
        RoomRequest(type="office", count=3, placement="window"),
        RoomRequest(type="phone_booth", count=2, placement="core"),
    ])
    assert generate_from_detailed(_plan(), program) == generate_from_detailed(_plan(), program)
