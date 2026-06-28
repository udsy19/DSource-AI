"""Detailed-mode generative space planning — Qbiq's "Detailed" program -> 3 test-fit variants.

The high-control counterpart to Concept mode. Instead of high-level dials, the user states
EXPLICIT room-type COUNTS and a placement preference per type, and the engine honours them:

  rooms: [{type, count, placement}]   type in {office, meeting, huddle, phone_booth}
                                       placement in {window, core, flexible}

Type -> instance:
  office       -> private_office  (10x12 ft enclosed)
  meeting      -> meeting_room    (20x15 ft enclosed)
  huddle       -> collaboration   (8x8 ft small enclosed/open cluster)
  phone_booth  -> phone_booth     (4x4 ft single-occupant enclosed; reuses room geometry at a
                                   small size — a booth is a tiny private_office, so it is placed
                                   by the same edge-march/interior packer, not invented separately)

Placement:
  window   -> perimeter band (edge-march along the exterior wall, daylight)
  core     -> interior, biased toward the building core/centroid
  flexible -> engine decides (tried at the perimeter first, then interior)

After the requested rooms land, the remaining open area is filled with the workstation field
(desk_type/dims, as in Concept). HONESTY: we track placed-vs-requested per type and, when fewer
fit than asked, add a note — we never fabricate off-plate rooms.

Deterministic: same program -> same output. Returns the shared `AlternativesResult` dict shape.
"""

from __future__ import annotations

from pydantic import BaseModel, Field
from shapely.geometry import Polygon, box

from ..floorplan.dxf_ingest import PlanModel
from .layout import (
    FurnitureInstance,
    TestFit,
    WorkstationSpec,
    _column_circles,
    _cores,
    _place_workstation_field,
    _placeable_region,
    _usable_boundary,
)
from .metrics import compute_metrics
from .payloads import plan_payload, testfit_payload
from .rooms import RoomSpec, place_perimeter_rooms
from .zones import place_interior_rooms

_CM_PER_FT = 30.48

# Per Detailed room type: the canonical instance type + its footprint (feet). Booths reuse the
# room packer at a small size; huddles are small collaboration clusters.
_ROOM_TYPES: dict[str, RoomSpec] = {
    "office": RoomSpec(type="private_office", width_ft=10.0, depth_ft=12.0),
    "meeting": RoomSpec(type="meeting_room", width_ft=20.0, depth_ft=15.0),
    "huddle": RoomSpec(type="collaboration", width_ft=8.0, depth_ft=8.0),
    "phone_booth": RoomSpec(type="phone_booth", width_ft=4.0, depth_ft=4.0),
}


class RoomRequest(BaseModel):
    type: str = Field(pattern="^(office|meeting|huddle|phone_booth)$")
    count: int = Field(ge=0)
    placement: str = Field("flexible", pattern="^(window|core|flexible)$")


class DetailedProgram(BaseModel):
    """Explicit per-type room counts + placement, plus the desk geometry dials from Concept."""

    rooms: list[RoomRequest] = Field(default_factory=list)
    desk_type: str = Field("workstations", pattern="^(workstations|benchings)$")
    desk_width_cm: int = Field(140, gt=0)
    desk_depth_cm: int = Field(70, gt=0)


def _workstation_spec(program: DetailedProgram) -> WorkstationSpec:
    """Desk geometry from cm dials (mirrors Concept): benchings widen the per-desk footprint."""
    width_ft = program.desk_width_cm / _CM_PER_FT
    depth_ft = program.desk_depth_cm / _CM_PER_FT
    if program.desk_type == "benchings":
        width_ft *= 1.4
    return WorkstationSpec(width_ft=round(width_ft, 3), depth_ft=round(depth_ft, 3))


def _requested_counts(program: DetailedProgram) -> dict[str, int]:
    """Sum requested counts per Detailed type (a type may appear more than once)."""
    counts: dict[str, int] = {}
    for r in program.rooms:
        counts[r.type] = counts.get(r.type, 0) + r.count
    return counts


def _place_rooms(
    program: DetailedProgram,
    usable: Polygon,
    cores: list[Polygon],
    columns: list,
    spec: WorkstationSpec,
    density_scale: float,
):
    """Place every requested room honouring placement, then return (instances, placed-by-type).

    Order: window rooms first (perimeter edge-march), then core rooms (interior packer), then
    flexible (perimeter, falling back to interior). `density_scale` < 1 drops a few rooms to make
    a sparser variant; > 1 is clamped to the request (never invents rooms beyond what was asked).
    """
    window: list[RoomSpec] = []
    core: list[RoomSpec] = []
    flexible: list[RoomSpec] = []
    for req in program.rooms:
        spec_room = _ROOM_TYPES[req.type]
        n = max(0, round(req.count * density_scale)) if density_scale < 1.0 else req.count
        bucket = {"window": window, "core": core, "flexible": flexible}[req.placement]
        bucket += [spec_room] * n

    placed_rooms = []
    occupied: list[Polygon] = []

    perimeter = place_perimeter_rooms(
        boundary_poly=usable, cores=cores, column_circles=columns, setback_ft=0.0,
        room_order=window, column_clearance_ft=spec.column_clearance_ft,
    )
    placed_rooms += perimeter
    occupied += [box(r.x, r.y, r.x + r.w, r.y + r.h) for r in perimeter]

    if core:
        interior_region = _interior_region(usable, cores, columns, occupied)
        core_placed = place_interior_rooms(interior_region, occupied, core)
        placed_rooms += core_placed
        occupied += [box(r.x, r.y, r.x + r.w, r.y + r.h) for r in core_placed]

    # Flexible: perimeter first, then interior for whatever didn't fit on the wall.
    if flexible:
        flex_peri = place_perimeter_rooms(
            boundary_poly=usable, cores=cores, column_circles=columns, setback_ft=0.0,
            room_order=flexible, column_clearance_ft=spec.column_clearance_ft,
            occupied_polys=occupied,
        )
        placed_rooms += flex_peri
        occupied += [box(r.x, r.y, r.x + r.w, r.y + r.h) for r in flex_peri]
        leftover = _subtract_placed(flexible, flex_peri)
        if leftover:
            interior_region = _interior_region(usable, cores, columns, occupied)
            flex_int = place_interior_rooms(interior_region, occupied, leftover)
            placed_rooms += flex_int

    instances = [FurnitureInstance(r.type, r.x, r.y, r.w, r.h, r.rotation) for r in placed_rooms]
    placed_by_type = _placed_by_detailed_type(placed_rooms)
    return instances, placed_by_type, occupied


def _interior_region(usable: Polygon, cores, columns, occupied: list[Polygon]):
    """Usable area net of core/columns/already-placed rooms — where interior rooms may land."""
    eps = 0.05
    region = usable
    for c in cores:
        region = region.difference(c.buffer(eps))
    for col in columns:
        region = region.difference(col.buffer(eps))
    for op in occupied:
        region = region.difference(op.buffer(eps))
    return region


def _subtract_placed(requested: list[RoomSpec], placed) -> list[RoomSpec]:
    """Return the requested RoomSpecs not yet satisfied by `placed` (by instance type)."""
    placed_counts: dict[str, int] = {}
    for r in placed:
        placed_counts[r.type] = placed_counts.get(r.type, 0) + 1
    leftover: list[RoomSpec] = []
    for spec in requested:
        if placed_counts.get(spec.type, 0) > 0:
            placed_counts[spec.type] -= 1
        else:
            leftover.append(spec)
    return leftover


# Reverse map instance type -> Detailed type for honest placed-vs-requested reporting.
_INSTANCE_TO_DETAILED = {spec.type: name for name, spec in _ROOM_TYPES.items()}


def _placed_by_detailed_type(placed) -> dict[str, int]:
    counts: dict[str, int] = {}
    for r in placed:
        name = _INSTANCE_TO_DETAILED.get(r.type, r.type)
        counts[name] = counts.get(name, 0) + 1
    return counts


def _build_testfit(
    plan: PlanModel, program: DetailedProgram, spec: WorkstationSpec, density_scale: float
) -> TestFit:
    """One Detailed test-fit: explicit rooms (honouring placement) + a workstation field."""
    usable = _usable_boundary(plan, spec)
    requested = _requested_counts(program)
    if usable.is_empty or usable.area <= 0:
        return TestFit(workstation_count=0, placeable_area_sf=0.0,
                       notes=["No usable area after perimeter setback."])

    cores = _cores(plan)
    columns = _column_circles(plan, spec)
    room_instances, placed_by_type, occupied = _place_rooms(
        program, usable, cores, columns, spec, density_scale
    )

    region = _interior_region(usable, cores, columns, occupied)
    workstations = _place_workstation_field(region, spec)

    instances = room_instances + workstations
    office_count = sum(1 for i in instances if i.type == "private_office")
    meeting_count = sum(1 for i in instances if i.type == "meeting_room")
    # Both huddles (collaboration) and booths (phone_booth) are enclosed clusters, not desks.
    collab_count = sum(1 for i in instances if i.type in ("collaboration", "phone_booth"))
    placeable_sf = round(_placeable_region(plan, spec).area, 1)

    notes = _honesty_notes(requested, placed_by_type)
    return TestFit(
        workstation_count=len(workstations),
        office_count=office_count,
        meeting_count=meeting_count,
        collab_count=collab_count,
        instances=instances,
        placeable_area_sf=placeable_sf,
        sf_per_workstation=round(placeable_sf / len(workstations), 1) if workstations else None,
        program={"requested": requested, "placed": placed_by_type},
        notes=notes,
    )


def _honesty_notes(requested: dict[str, int], placed: dict[str, int]) -> list[str]:
    notes = [
        "Detailed test-fit: explicit requested room counts placed by stated preference "
        "(window=perimeter band, core=interior), then the open area filled with workstations.",
        "Procedural placement + Shapely constraint filter — every room is contained, clear of "
        "core/columns, and non-overlapping. Deferred: door swings, corridors, egress, ADA.",
    ]
    shortfalls = [
        f"{t} {placed.get(t, 0)}/{requested[t]}"
        for t in requested
        if placed.get(t, 0) < requested[t]
    ]
    if shortfalls:
        notes.append(
            "Placed fewer than requested (the plate ran out of clear space): "
            + ", ".join(shortfalls) + ". No off-plate rooms were invented."
        )
    return notes


# Density scales per variant: A as requested, B sparser open plan, C denser. Rooms are only
# DROPPED (scale < 1), never added beyond the request — the user's counts are a ceiling.
_VARIANTS: list[tuple[str, float, float]] = [
    ("A", 1.0, 1.0),   # rooms as requested, desks as given
    ("B", 1.0, 0.85),  # same rooms, tighter desks -> denser open plan
    ("C", 0.7, 1.15),  # fewer rooms, looser desks -> more open area
]


def generate_from_detailed(plan: PlanModel, program: DetailedProgram, n: int = 3) -> dict:
    """Place the explicit requested rooms honouring placement, then return `n` scored variants.

    Variants vary workstation density and (for C) how many of the requested rooms are kept, so the
    three options trade enclosed-vs-open while never exceeding the requested room counts. Same
    `AlternativesResult` dict shape as /api/generate and /api/testfit/alternatives.
    """
    spec = _workstation_spec(program)
    alternatives = []
    for alt_id, room_scale, desk_scale in _VARIANTS[:n]:
        variant_spec = WorkstationSpec(
            width_ft=round(spec.width_ft * desk_scale, 3),
            depth_ft=round(spec.depth_ft * desk_scale, 3),
            aisle_ft=spec.aisle_ft,
            perimeter_setback_ft=spec.perimeter_setback_ft,
            column_clearance_ft=spec.column_clearance_ft,
        )
        fit = _build_testfit(plan, program, variant_spec, room_scale)
        alternatives.append({
            "id": alt_id,
            "testfit": testfit_payload(fit),
            "metrics": compute_metrics(plan, fit),
        })
    return {"plan": plan_payload(plan), "alternatives": alternatives}
