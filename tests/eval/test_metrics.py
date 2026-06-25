"""Unit tests for precision/recall math and the independent hard-constraint re-check.

Synthetic key sets exercise the metric edges (empty, partial, perfect, over-fetch). The violation
check is fed deliberately-bad and known-good ProductRows so we prove it flags breaches and clears
compliant products without touching the DB.
"""

from __future__ import annotations

from uuid import uuid4

from quarry.db import ProductRow
from quarry.eval.metrics import (
    hard_constraint_violations,
    precision_at_k,
    recall_at_k,
)
from quarry.schema import (
    BOQLine,
    BudgetCeiling,
    Envelope,
    HardConstraints,
    Quantity,
)

_CHAIR = "ffe/seating/task-chair"
_SCOPE = [_CHAIR]


def _row(**overrides: object) -> ProductRow:
    defaults: dict[str, object] = {
        "id": uuid4(),
        "source": "seed",
        "source_ref": "seed:good",
        "brand": "Acme",
        "name": "Task Chair",
        "category": _CHAIR,
        "dim_w": 600.0,
        "dim_d": 600.0,
        "dim_h": 1100.0,
        "price_amount": 400.0,
        "acoustic_nrc": None,
        "fire_rating": "Class A",
        "lead_time_days": 30,
        "certifications": ["GREENGUARD Gold"],
    }
    defaults.update(overrides)
    return ProductRow(**defaults)


def test_precision_counts_only_expected_in_top_k() -> None:
    retrieved = ["a", "b", "c", "d"]
    expected = frozenset({"a", "c"})
    assert precision_at_k(retrieved, expected, k=4) == 0.5


def test_precision_respects_k_cutoff() -> None:
    retrieved = ["a", "x", "y"]
    expected = frozenset({"a", "z"})
    # Only the first key is in scope at k=1, and it is expected.
    assert precision_at_k(retrieved, expected, k=1) == 1.0


def test_precision_empty_retrieval_is_one() -> None:
    assert precision_at_k([], frozenset({"a"}), k=5) == 1.0


def test_recall_finds_expected_within_top_k() -> None:
    retrieved = ["a", "b", "c"]
    expected = frozenset({"a", "c", "z"})
    assert recall_at_k(retrieved, expected, k=3) == 2 / 3


def test_recall_misses_expected_beyond_k() -> None:
    retrieved = ["a", "b", "c"]
    expected = frozenset({"c"})
    # 'c' is at index 2, outside k=2.
    assert recall_at_k(retrieved, expected, k=2) == 0.0


def test_recall_empty_expected_is_one() -> None:
    assert recall_at_k(["a", "b"], frozenset(), k=5) == 1.0


def test_violations_clears_a_compliant_product() -> None:
    line = BOQLine(
        category=_CHAIR,
        quantity=Quantity(value=1),
        envelope=Envelope(max_w=700, max_d=700, max_h=1200),
        budget_ceiling=BudgetCeiling(amount=500, basis="per_unit"),
        required_certs=["GREENGUARD Gold"],
        hard_constraints=HardConstraints(fire_rating_min="A"),
    )
    assert hard_constraint_violations(line, [_row()], _SCOPE) == []


def test_violations_flags_every_breached_constraint() -> None:
    line = BOQLine(
        category=_CHAIR,
        quantity=Quantity(value=1),
        envelope=Envelope(max_w=500, max_d=500, max_h=1000),
        budget_ceiling=BudgetCeiling(amount=300, basis="per_unit"),
        required_certs=["BIFMA LEVEL 3"],
        hard_constraints=HardConstraints(min_acoustic_nrc=0.8, fire_rating_min="A"),
    )
    bad = _row(
        source_ref="seed:bad",
        category="finishes/acoustic/wall-panel",
        dim_w=900.0,
        price_amount=800.0,
        certifications=["GREENGUARD"],
        acoustic_nrc=0.5,
        fire_rating="Class C",
    )
    constraints = {v.constraint for v in hard_constraint_violations(line, [bad], _SCOPE)}
    assert constraints == {
        "category",
        "envelope",
        "budget",
        "certifications",
        "acoustic_nrc",
        "fire_rating",
    }


def test_violations_total_basis_uses_quantity() -> None:
    line = BOQLine(
        category=_CHAIR,
        quantity=Quantity(value=10),
        budget_ceiling=BudgetCeiling(amount=3000, basis="total"),
    )
    # 400 * 10 = 4000 > 3000 total ceiling.
    violations = hard_constraint_violations(line, [_row(price_amount=400.0)], _SCOPE)
    assert [v.constraint for v in violations] == ["budget"]
