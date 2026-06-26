"""Golden filter BOQ lines (Agent D, §9).

Each case is one BOQLine that exercises a hard constraint (budget per_unit/total, certs, envelope,
acoustic floor, fire floor, category scope). The expected-good set is NOT hardcoded: it is computed
at eval time as every current-catalog product that independently ``satisfies`` the line (metrics.py),
so the eval stays correct as the catalog grows from 12 to 56 to 500. precision/recall then measure
whether ``match()`` reproduces that dynamic ground truth, and every returned product is re-checked
for violations. The filter is style-agnostic, so these lines carry no style intent.
"""

from __future__ import annotations

from dataclasses import dataclass

from quarry.schema import (
    BOQLine,
    BudgetCeiling,
    Envelope,
    HardConstraints,
    Quantity,
)

_CHAIR = "ffe/seating/task-chair"
_PANEL = "finishes/acoustic/wall-panel"


@dataclass(frozen=True)
class GoldenCase:
    name: str
    line: BOQLine


def golden_cases() -> list[GoldenCase]:
    return [
        # ── task chairs ──────────────────────────────────────────────────────────────────────
        GoldenCase(
            name="chairs_generous_budget",
            line=BOQLine(
                category=_CHAIR,
                quantity=Quantity(value=10, unit="each"),
                budget_ceiling=BudgetCeiling(amount=1500, basis="per_unit"),
            ),
        ),
        GoldenCase(
            name="chairs_tight_per_unit_budget",
            line=BOQLine(
                category=_CHAIR,
                quantity=Quantity(value=10, unit="each"),
                budget_ceiling=BudgetCeiling(amount=120, basis="per_unit"),
            ),
        ),
        GoldenCase(
            name="chairs_total_basis_budget",
            line=BOQLine(
                category=_CHAIR,
                quantity=Quantity(value=4, unit="each"),
                # total ceiling 480 / 4 units => effective per-unit ceiling 120.
                budget_ceiling=BudgetCeiling(amount=480, basis="total"),
            ),
        ),
        GoldenCase(
            name="chairs_fire_class_a",
            line=BOQLine(
                category=_CHAIR,
                quantity=Quantity(value=10, unit="each"),
                budget_ceiling=BudgetCeiling(amount=2000, basis="per_unit"),
                hard_constraints=HardConstraints(fire_rating_min="A"),
            ),
        ),
        GoldenCase(
            name="chairs_require_bifma_l3_cert",
            line=BOQLine(
                category=_CHAIR,
                quantity=Quantity(value=10, unit="each"),
                budget_ceiling=BudgetCeiling(amount=2000, basis="per_unit"),
                required_certs=["GREENGUARD Gold", "BIFMA LEVEL 3"],
            ),
        ),
        GoldenCase(
            name="chairs_envelope_caps_size",
            line=BOQLine(
                category=_CHAIR,
                quantity=Quantity(value=10, unit="each"),
                envelope=Envelope(max_w=700, max_d=670, max_h=1100, unit="mm"),
                budget_ceiling=BudgetCeiling(amount=2000, basis="per_unit"),
            ),
        ),
        # ── acoustic wall panels ─────────────────────────────────────────────────────────────
        GoldenCase(
            name="panels_generous_budget",
            line=BOQLine(
                category=_PANEL,
                quantity=Quantity(value=40, unit="sqm"),
                budget_ceiling=BudgetCeiling(amount=250, basis="per_unit"),
            ),
        ),
        GoldenCase(
            name="panels_high_nrc_floor",
            line=BOQLine(
                category=_PANEL,
                quantity=Quantity(value=40, unit="sqm"),
                budget_ceiling=BudgetCeiling(amount=250, basis="per_unit"),
                hard_constraints=HardConstraints(min_acoustic_nrc=0.85),
            ),
        ),
        GoldenCase(
            name="panels_greenguard_gold_exact_cert",
            line=BOQLine(
                category=_PANEL,
                quantity=Quantity(value=40, unit="sqm"),
                budget_ceiling=BudgetCeiling(amount=250, basis="per_unit"),
                required_certs=["GREENGUARD Gold"],
            ),
        ),
        GoldenCase(
            name="panels_fire_and_nrc_floor",
            line=BOQLine(
                category=_PANEL,
                quantity=Quantity(value=40, unit="sqm"),
                budget_ceiling=BudgetCeiling(amount=250, basis="per_unit"),
                hard_constraints=HardConstraints(min_acoustic_nrc=0.85, fire_rating_min="A"),
            ),
        ),
    ]
