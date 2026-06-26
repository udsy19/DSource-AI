"""Pure unit tests for the eval metric functions — no DB, no model.

precision/recall/relevant@k/MRR run on synthetic key lists. The hard-constraint re-implementation
(``satisfies`` / ``hard_constraint_violations``) runs on hand-built ProductRows so we prove it flags
every breach and clears compliant products without touching the DB.
"""

from __future__ import annotations

from uuid import uuid4

from quarry.db import ProductRow
from quarry.eval.metrics import (
    hard_constraint_violations,
    mrr,
    precision_at_k,
    recall_at_k,
    relevant_at_k,
    satisfies,
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
    assert precision_at_k(["a", "b", "c", "d"], frozenset({"a", "c"}), k=4) == 0.5


def test_precision_respects_k_cutoff() -> None:
    assert precision_at_k(["a", "x", "y"], frozenset({"a", "z"}), k=1) == 1.0


def test_precision_empty_retrieval_is_one() -> None:
    assert precision_at_k([], frozenset({"a"}), k=5) == 1.0


def test_recall_finds_expected_within_top_k() -> None:
    assert recall_at_k(["a", "b", "c"], frozenset({"a", "c", "z"}), k=3) == 2 / 3


def test_recall_misses_expected_beyond_k() -> None:
    # 'c' is at index 2, outside k=2.
    assert recall_at_k(["a", "b", "c"], frozenset({"c"}), k=2) == 0.0


def test_recall_empty_expected_is_one() -> None:
    assert recall_at_k(["a", "b"], frozenset(), k=5) == 1.0


def test_relevant_at_k_hits_when_relevant_in_top_k() -> None:
    assert relevant_at_k(["x", "rel", "y"], frozenset({"rel"}), k=3) == 1.0


def test_relevant_at_k_misses_when_relevant_below_cutoff() -> None:
    assert relevant_at_k(["x", "y", "rel"], frozenset({"rel"}), k=2) == 0.0


def test_relevant_at_k_zero_when_none_relevant() -> None:
    assert relevant_at_k(["x", "y"], frozenset({"rel"}), k=5) == 0.0


def test_mrr_is_reciprocal_of_first_relevant_rank() -> None:
    assert mrr(["x", "y", "rel", "rel2"], frozenset({"rel", "rel2"})) == 1 / 3


def test_mrr_is_one_when_first_is_relevant() -> None:
    assert mrr(["rel", "x"], frozenset({"rel"})) == 1.0


def test_mrr_is_zero_when_no_relevant() -> None:
    assert mrr(["x", "y"], frozenset({"rel"})) == 0.0


def test_satisfies_true_for_a_compliant_product() -> None:
    line = BOQLine(
        category=_CHAIR,
        quantity=Quantity(value=1),
        envelope=Envelope(max_w=700, max_d=700, max_h=1200),
        budget_ceiling=BudgetCeiling(amount=500, basis="per_unit"),
        required_certs=["GREENGUARD Gold"],
        hard_constraints=HardConstraints(fire_rating_min="A"),
    )
    assert satisfies(line, _row(), _SCOPE)
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
    assert not satisfies(line, bad, _SCOPE)
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
