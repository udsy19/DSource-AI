"""Golden BOQ lines with their expected-good product keys (Agent D, §9).

Each case is one BOQLine plus the STABLE keys (``source_ref``) of every seeded product that truly
clears that line's HARD constraints under §8 semantics — category scope, envelope (NULL dims pass,
known dims that exceed are eliminated), effective price <= ceiling (per_unit or total*quantity),
certifications superset (EXACT cert-string match: "GREENGUARD" != "GREENGUARD Gold"), acoustic_nrc
floor, and fire rating (A > B > C; NULL fails when a minimum is set).

The expected set is the GROUND TRUTH the hard filter must reproduce exactly: precision/recall are
measured against it, and every returned product is independently re-checked in metrics.py. Keys are
``source_ref`` because product UUIDs are random per ingest. A precomputed style vector only reorders
survivors; it never changes the expected set, so style cases share the same hard-constraint truth.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from quarry.schema import (
    BOQLine,
    BudgetCeiling,
    Envelope,
    HardConstraints,
    Quantity,
    StyleIntent,
)

_DIM = 512


def _style_vector(seed: int) -> list[float]:
    """A deterministic unit vector along one axis — exercises the precomputed-vector style path
    without torch. Different seeds point at different chairs/panels; the magnitude is irrelevant to
    cosine, only the direction matters."""
    vec = [0.0] * _DIM
    vec[seed % _DIM] = 1.0
    return vec


@dataclass(frozen=True)
class GoldenCase:
    name: str
    line: BOQLine
    expected_keys: frozenset[str] = field(default_factory=frozenset)


_CHAIR = "ffe/seating/task-chair"
_PANEL = "finishes/acoustic/wall-panel"


def golden_cases() -> list[GoldenCase]:
    return [
        # ── task chairs ──────────────────────────────────────────────────────────────────────
        GoldenCase(
            name="chairs_all_under_generous_budget",
            line=BOQLine(
                category=_CHAIR,
                quantity=Quantity(value=10, unit="each"),
                budget_ceiling=BudgetCeiling(amount=1500, basis="per_unit"),
            ),
            expected_keys=frozenset(
                {
                    "bim:knoll-remix-high-back",
                    "bim:haworth-fern-digital-knit",
                    "bim:steelcase-leap-v2",
                    "bim:vitra-id-mesh",
                    "bim:humanscale-freedom-headrest",
                    "bim:herman-miller-aeron-remastered",
                }
            ),
        ),
        GoldenCase(
            name="chairs_budget_excludes_priciest",
            line=BOQLine(
                category=_CHAIR,
                quantity=Quantity(value=10, unit="each"),
                budget_ceiling=BudgetCeiling(amount=1000, basis="per_unit"),
            ),
            # Only Knoll ($879) and Haworth ($949) sit at or below $1000.
            expected_keys=frozenset(
                {"bim:knoll-remix-high-back", "bim:haworth-fern-digital-knit"}
            ),
        ),
        GoldenCase(
            name="chairs_total_basis_budget",
            line=BOQLine(
                category=_CHAIR,
                quantity=Quantity(value=4, unit="each"),
                # total ceiling 4000 / 4 units => effective per-unit ceiling 1000.
                budget_ceiling=BudgetCeiling(amount=4000, basis="total"),
            ),
            expected_keys=frozenset(
                {"bim:knoll-remix-high-back", "bim:haworth-fern-digital-knit"}
            ),
        ),
        GoldenCase(
            name="chairs_fire_class_a_only",
            line=BOQLine(
                category=_CHAIR,
                quantity=Quantity(value=10, unit="each"),
                budget_ceiling=BudgetCeiling(amount=1500, basis="per_unit"),
                hard_constraints=HardConstraints(fire_rating_min="A"),
            ),
            # Knoll (B) and Vitra (B) are eliminated; the four Class-A chairs survive.
            expected_keys=frozenset(
                {
                    "bim:haworth-fern-digital-knit",
                    "bim:steelcase-leap-v2",
                    "bim:humanscale-freedom-headrest",
                    "bim:herman-miller-aeron-remastered",
                }
            ),
        ),
        GoldenCase(
            name="chairs_require_bifma_l3_cert",
            line=BOQLine(
                category=_CHAIR,
                quantity=Quantity(value=10, unit="each"),
                budget_ceiling=BudgetCeiling(amount=1500, basis="per_unit"),
                required_certs=["GREENGUARD Gold", "BIFMA LEVEL 3"],
            ),
            # Only Steelcase, Humanscale, Aeron hold BIFMA LEVEL 3 (Haworth has L2, not L3).
            expected_keys=frozenset(
                {
                    "bim:steelcase-leap-v2",
                    "bim:humanscale-freedom-headrest",
                    "bim:herman-miller-aeron-remastered",
                }
            ),
        ),
        GoldenCase(
            name="chairs_envelope_caps_depth",
            line=BOQLine(
                category=_CHAIR,
                quantity=Quantity(value=10, unit="each"),
                envelope=Envelope(max_w=700, max_d=670, max_h=1100, unit="mm"),
                budget_ceiling=BudgetCeiling(amount=1500, basis="per_unit"),
            ),
            # Knoll (660/660/1080) and Aeron (686/668/1041) fit. The rest exceed a depth or height
            # cap: Haworth h1080 ok but d654 ok yet w711>700 out; Steelcase d705>670; Vitra h1110>1100;
            # Humanscale h1118>1100.
            expected_keys=frozenset(
                {"bim:knoll-remix-high-back", "bim:herman-miller-aeron-remastered"}
            ),
        ),
        GoldenCase(
            name="chairs_fire_a_and_bifma_l3_with_style",
            line=BOQLine(
                category=_CHAIR,
                quantity=Quantity(value=10, unit="each"),
                budget_ceiling=BudgetCeiling(amount=1500, basis="per_unit"),
                required_certs=["BIFMA LEVEL 3"],
                hard_constraints=HardConstraints(fire_rating_min="A"),
                style_intent=StyleIntent(precomputed_vector=_style_vector(7)),
            ),
            # Class-A AND BIFMA L3: Steelcase, Humanscale, Aeron. Style only reorders these three.
            expected_keys=frozenset(
                {
                    "bim:steelcase-leap-v2",
                    "bim:humanscale-freedom-headrest",
                    "bim:herman-miller-aeron-remastered",
                }
            ),
        ),
        GoldenCase(
            name="chairs_empty_below_cheapest",
            line=BOQLine(
                category=_CHAIR,
                quantity=Quantity(value=10, unit="each"),
                # Below the cheapest chair ($879) => no survivors.
                budget_ceiling=BudgetCeiling(amount=500, basis="per_unit"),
            ),
            expected_keys=frozenset(),
        ),
        # ── acoustic wall panels ─────────────────────────────────────────────────────────────
        GoldenCase(
            name="panels_all_under_generous_budget",
            line=BOQLine(
                category=_PANEL,
                quantity=Quantity(value=40, unit="sqm"),
                budget_ceiling=BudgetCeiling(amount=250, basis="per_unit"),
            ),
            expected_keys=frozenset(
                {
                    "pim:woven-image-echopanel-geo",
                    "pim:autex-cube-acoustic-tile",
                    "pim:autex-quietspace-panel-50",
                    "pim:offecct-soundwave-swell",
                    "pim:baux-wood-wool-tile",
                    "pim:kvadrat-soft-cells-broadline",
                }
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
            # nrc >= 0.85: Cube (0.85), Quietspace (0.95), Kvadrat (0.90).
            expected_keys=frozenset(
                {
                    "pim:autex-cube-acoustic-tile",
                    "pim:autex-quietspace-panel-50",
                    "pim:kvadrat-soft-cells-broadline",
                }
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
            # EXACT match: Offecct holds "GREENGUARD" (not Gold) and BAUX holds FSC/CDPH — both out.
            expected_keys=frozenset(
                {
                    "pim:woven-image-echopanel-geo",
                    "pim:autex-cube-acoustic-tile",
                    "pim:autex-quietspace-panel-50",
                    "pim:kvadrat-soft-cells-broadline",
                }
            ),
        ),
        GoldenCase(
            name="panels_fire_class_a_floor",
            line=BOQLine(
                category=_PANEL,
                quantity=Quantity(value=40, unit="sqm"),
                budget_ceiling=BudgetCeiling(amount=250, basis="per_unit"),
                hard_constraints=HardConstraints(fire_rating_min="A"),
            ),
            # Class A only: EchoPanel, Cube, Quietspace, Kvadrat. BAUX (B) and Offecct (C) eliminated.
            expected_keys=frozenset(
                {
                    "pim:woven-image-echopanel-geo",
                    "pim:autex-cube-acoustic-tile",
                    "pim:autex-quietspace-panel-50",
                    "pim:kvadrat-soft-cells-broadline",
                }
            ),
        ),
        GoldenCase(
            name="panels_budget_excludes_kvadrat",
            line=BOQLine(
                category=_PANEL,
                quantity=Quantity(value=40, unit="sqm"),
                # Ceiling 100/sqm drops Kvadrat ($210) and BAUX ($118); five... no, four remain.
                budget_ceiling=BudgetCeiling(amount=100, basis="per_unit"),
            ),
            # <= 100/sqm: EchoPanel (64), Cube (72), Quietspace (89.5), Offecct (96).
            expected_keys=frozenset(
                {
                    "pim:woven-image-echopanel-geo",
                    "pim:autex-cube-acoustic-tile",
                    "pim:autex-quietspace-panel-50",
                    "pim:offecct-soundwave-swell",
                }
            ),
        ),
        GoldenCase(
            name="panels_nrc_and_fire_and_cert_with_style",
            line=BOQLine(
                category=_PANEL,
                quantity=Quantity(value=40, unit="sqm"),
                budget_ceiling=BudgetCeiling(amount=250, basis="per_unit"),
                required_certs=["GREENGUARD Gold"],
                hard_constraints=HardConstraints(min_acoustic_nrc=0.85, fire_rating_min="A"),
                style_intent=StyleIntent(precomputed_vector=_style_vector(42)),
            ),
            # nrc>=0.85 AND Class A AND GREENGUARD Gold: Cube (0.85), Quietspace (0.95), Kvadrat (0.90).
            expected_keys=frozenset(
                {
                    "pim:autex-cube-acoustic-tile",
                    "pim:autex-quietspace-panel-50",
                    "pim:kvadrat-soft-cells-broadline",
                }
            ),
        ),
    ]
