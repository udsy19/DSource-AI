"""Live layout metrics — the seat/density figures the editable canvas re-scores after each edit.

The fit-side counterpart is testfit.metrics.compute_metrics (generated TestFit); this is its
analog for a real ExtractedLayout, where seats come from placed desks rather than a program.
Every value is derived from the geometry — nothing invented — so the editor's numbers are auditable.
"""

from __future__ import annotations

from collections import Counter

from .schema import ExtractedLayout

# A seat is a work position: an open-plan workstation or a desk (one person each).
_SEAT_CATEGORIES = ("desk", "workstation")
# Room types that enclose a seat, so it reads as private rather than open-field.
_ENCLOSED_ROOM_TYPES = ("office", "meeting", "huddle")


def compute_layout_metrics(layout: ExtractedLayout) -> dict:
    """Derive seats, open/enclosed split, usable area and density from a layout's geometry.

    Formulas (all measured):
      * seats                 = # furniture in a seat category (desk / workstation).
      * enclosed_seats        = # of those inside an office/meeting/huddle room.
      * open_seats            = seats - enclosed_seats.
      * usable_sf             = sum of detected room areas, else the plate bounding-box area.
      * density_sf_per_person = usable_sf / seats  (0 when seats == 0).
    """
    seats_items = [f for f in layout.furniture if f.category in _SEAT_CATEGORIES]
    seats = len(seats_items)

    enclosed_ids = {r.id for r in layout.rooms if r.type in _ENCLOSED_ROOM_TYPES}
    enclosed_seats = sum(1 for f in seats_items if f.room_id in enclosed_ids)

    room_area = sum(r.area_sf or 0.0 for r in layout.rooms if r.polygon)
    minx, miny, maxx, maxy = layout.bounds
    plate_area = max(0.0, maxx - minx) * max(0.0, maxy - miny)
    usable_sf = round(room_area or plate_area, 1)

    return {
        "seats": seats,
        "open_seats": seats - enclosed_seats,
        "enclosed_seats": enclosed_seats,
        "usable_sf": usable_sf,
        "density_sf_per_person": round(usable_sf / seats, 1) if seats else 0.0,
        "rooms": sum(1 for r in layout.rooms if r.polygon),
        "rooms_by_type": dict(Counter(r.type for r in layout.rooms)),
    }
