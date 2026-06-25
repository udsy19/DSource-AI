"""Hard-constraint safety — the critical proof (§4.2, §8 step 1).

For every hard constraint we insert one product that fails ONLY that constraint and one fully
compliant product, then assert the failing product is NEVER returned while the compliant one IS.
A soft signal must never resurrect a hard-filtered product.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from quarry.matching import match
from quarry.schema import (
    BOQLine,
    BudgetCeiling,
    Envelope,
    HardConstraints,
    Quantity,
    StyleIntent,
)

from .conftest import insert_product


def _ids(line: BOQLine, session: Session) -> set[UUID]:
    return {c.product_id for c in match(line, session=session).candidates}


def _acoustic_line(**hc: object) -> BOQLine:
    return BOQLine(
        category="finishes/acoustic/wall-panel",
        quantity=Quantity(value=40, unit="sqm"),
        budget_ceiling=BudgetCeiling(amount=1000, basis="per_unit"),
        hard_constraints=HardConstraints(**hc),  # type: ignore[arg-type]
    )


def test_over_budget_eliminated(session: Session) -> None:
    line = BOQLine(
        category="ffe/seating/task-chair",
        quantity=Quantity(value=1),
        budget_ceiling=BudgetCeiling(amount=500, basis="per_unit"),
    )
    good = insert_product(session, price_amount=450.0)
    bad = insert_product(session, price_amount=600.0)
    ids = _ids(line, session)
    assert good.id in ids
    assert bad.id not in ids


def test_too_large_vs_envelope_eliminated(session: Session) -> None:
    line = BOQLine(
        category="ffe/seating/task-chair",
        quantity=Quantity(value=1),
        budget_ceiling=BudgetCeiling(amount=1000),
        envelope=Envelope(max_w=700, max_d=700, max_h=1200),
    )
    good = insert_product(session, dim_w=600.0, dim_d=600.0, dim_h=1100.0)
    bad = insert_product(session, dim_w=900.0, dim_d=600.0, dim_h=1100.0)
    ids = _ids(line, session)
    assert good.id in ids
    assert bad.id not in ids


def test_null_dims_pass_envelope(session: Session) -> None:
    """A NULL product dimension is unknown, not a violation — it survives the envelope gate."""
    line = BOQLine(
        category="ffe/seating/task-chair",
        quantity=Quantity(value=1),
        budget_ceiling=BudgetCeiling(amount=1000),
        envelope=Envelope(max_w=700, max_d=700, max_h=1200),
    )
    unknown = insert_product(session, dim_w=None, dim_d=None, dim_h=None)
    assert unknown.id in _ids(line, session)


def test_missing_required_cert_eliminated(session: Session) -> None:
    line = BOQLine(
        category="ffe/seating/task-chair",
        quantity=Quantity(value=1),
        budget_ceiling=BudgetCeiling(amount=1000),
        required_certs=["GREENGUARD", "CDPH"],
    )
    good = insert_product(session, certifications=["GREENGUARD", "CDPH", "BIFMA"])
    bad = insert_product(session, certifications=["GREENGUARD"])
    ids = _ids(line, session)
    assert good.id in ids
    assert bad.id not in ids


def test_acoustic_nrc_below_min_eliminated(session: Session) -> None:
    line = _acoustic_line(min_acoustic_nrc=0.8)
    good = insert_product(session, category="finishes/acoustic/wall-panel", acoustic_nrc=0.85)
    bad = insert_product(session, category="finishes/acoustic/wall-panel", acoustic_nrc=0.6)
    null_nrc = insert_product(session, category="finishes/acoustic/wall-panel", acoustic_nrc=None)
    ids = _ids(line, session)
    assert good.id in ids
    assert bad.id not in ids
    assert null_nrc.id not in ids  # unknown NRC cannot prove compliance


def test_fire_rating_below_min_eliminated(session: Session) -> None:
    line = _acoustic_line(fire_rating_min="B")  # require Class B or better (A or B)
    class_a = insert_product(session, category="finishes/acoustic/wall-panel", fire_rating="Class A")
    class_b = insert_product(session, category="finishes/acoustic/wall-panel", fire_rating="B")
    class_c = insert_product(session, category="finishes/acoustic/wall-panel", fire_rating="Class C")
    null_fire = insert_product(session, category="finishes/acoustic/wall-panel", fire_rating=None)
    ids = _ids(line, session)
    assert class_a.id in ids
    assert class_b.id in ids
    assert class_c.id not in ids
    assert null_fire.id not in ids


def test_wrong_category_eliminated(session: Session) -> None:
    line = BOQLine(
        category="ffe/seating/task-chair",
        quantity=Quantity(value=1),
        budget_ceiling=BudgetCeiling(amount=1000),
    )
    good = insert_product(session, category="ffe/seating/task-chair")
    bad = insert_product(session, category="finishes/acoustic/wall-panel")
    ids = _ids(line, session)
    assert good.id in ids
    assert bad.id not in ids


def test_descendant_leaf_included(session: Session) -> None:
    """A line targeting an interior node matches products at descendant leaves."""
    line = BOQLine(
        category="ffe/seating",
        quantity=Quantity(value=1),
        budget_ceiling=BudgetCeiling(amount=1000),
    )
    chair = insert_product(session, category="ffe/seating/task-chair")
    table = insert_product(session, category="ffe/tables")
    ids = _ids(line, session)
    assert chair.id in ids
    assert table.id not in ids


def test_style_signal_cannot_resurrect_hard_failure(session: Session) -> None:
    """A perfect style match on an over-budget product still never returns it."""
    line = BOQLine(
        category="ffe/seating/task-chair",
        quantity=Quantity(value=1),
        budget_ceiling=BudgetCeiling(amount=500),
        style_intent=StyleIntent(precomputed_vector=[1.0] + [0.0] * 511),
    )
    over_budget = insert_product(session, price_amount=900.0, image_vec=[1.0] + [0.0] * 511)
    assert over_budget.id not in _ids(line, session)
