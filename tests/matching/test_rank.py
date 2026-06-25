"""Ranking: determinism, full breakdowns, the style and no-style paths, and budget basis."""

from __future__ import annotations

import pytest
from sqlalchemy.orm import Session

from quarry import enrichment
from quarry.matching import match
from quarry.schema import (
    BOQLine,
    BudgetCeiling,
    Quantity,
    StyleIntent,
    Weights,
)

from .conftest import StubProvider, axis_vector, insert_product


def _chair_line(**overrides: object) -> BOQLine:
    base: dict[str, object] = {
        "category": "ffe/seating/task-chair",
        "quantity": Quantity(value=1),
        "budget_ceiling": BudgetCeiling(amount=1000),
    }
    base.update(overrides)
    return BOQLine(**base)  # type: ignore[arg-type]


def test_order_is_deterministic(session: Session) -> None:
    for price in (300.0, 500.0, 700.0):
        insert_product(session, price_amount=price)
    line = _chair_line()
    first = [c.product_id for c in match(line, session=session).candidates]
    second = [c.product_id for c in match(line, session=session).candidates]
    assert first == second
    assert len(first) == 3


def test_every_candidate_has_populated_breakdown(session: Session) -> None:
    insert_product(session, lead_time_days=10, has_epd=True, certifications=["GREENGUARD"])
    resp = match(_chair_line(), session=session)
    assert resp.candidates
    for candidate in resp.candidates:
        bd = candidate.breakdown
        assert "category" in bd.filters_passed
        assert "budget" in bd.filters_passed
        assert 0.0 <= bd.style_similarity <= 1.0
        assert 0.0 <= bd.budget_fit <= 1.0
        assert 0.0 <= bd.lead_time_score <= 1.0
        assert 0.0 <= bd.sustainability_bonus <= 1.0


def test_weights_are_echoed(session: Session) -> None:
    insert_product(session)
    weights = Weights(style=0.7, budget=0.1, lead_time=0.1, sustainability=0.1)
    resp = match(_chair_line(), weights=weights, session=session)
    assert resp.weights_used == weights


def test_style_path_ranks_by_similarity(session: Session) -> None:
    enrichment.set_provider(StubProvider({"warm terracotta": axis_vector(0)}))
    aligned = insert_product(session, image_vec=axis_vector(0))
    orthogonal = insert_product(session, image_vec=axis_vector(1))
    opposite = insert_product(session, image_vec=axis_vector(0, magnitude=-1.0))
    line = _chair_line(style_intent=StyleIntent(text="warm terracotta"))
    resp = match(line, weights=Weights(style=1.0, budget=0, lead_time=0, sustainability=0),
                 session=session)
    ranked = [c.product_id for c in resp.candidates]
    assert ranked[0] == aligned.id
    assert ranked.index(orthogonal.id) < ranked.index(opposite.id)
    aligned_bd = next(c for c in resp.candidates if c.product_id == aligned.id).breakdown
    assert aligned_bd.style_similarity == pytest.approx(1.0)


def test_precomputed_vector_used_without_provider(session: Session) -> None:
    aligned = insert_product(session, image_vec=axis_vector(2))
    other = insert_product(session, image_vec=axis_vector(3))
    line = _chair_line(style_intent=StyleIntent(precomputed_vector=axis_vector(2)))
    resp = match(line, weights=Weights(style=1.0, budget=0, lead_time=0, sustainability=0),
                 session=session)
    assert resp.candidates[0].product_id == aligned.id
    assert next(c for c in resp.candidates if c.product_id == other.id) is not None


def test_no_style_path_zero_similarity_ranks_on_other_terms(session: Session) -> None:
    cheap = insert_product(session, price_amount=100.0, lead_time_days=5)
    pricey = insert_product(session, price_amount=900.0, lead_time_days=80)
    line = _chair_line()  # empty style_intent
    resp = match(line, weights=Weights(style=0.5, budget=0.3, lead_time=0.2, sustainability=0.0),
                 session=session)
    for candidate in resp.candidates:
        assert candidate.breakdown.style_similarity == 0.0
    assert resp.candidates[0].product_id == cheap.id
    assert resp.candidates[-1].product_id == pricey.id


def test_image_vec_preferred_over_text_vec(session: Session) -> None:
    product = insert_product(session, image_vec=axis_vector(4), text_vec=axis_vector(5))
    line = _chair_line(style_intent=StyleIntent(precomputed_vector=axis_vector(4)))
    resp = match(line, weights=Weights(style=1.0, budget=0, lead_time=0, sustainability=0),
                 session=session)
    bd = next(c for c in resp.candidates if c.product_id == product.id).breakdown
    assert bd.style_similarity == pytest.approx(1.0)


def test_budget_basis_per_unit_vs_total(session: Session) -> None:
    """At qty 10 a $120 product is within a $150 per-unit ceiling but blows a $1000 total ceiling."""
    product = insert_product(session, price_amount=120.0)
    per_unit = _chair_line(
        quantity=Quantity(value=10),
        budget_ceiling=BudgetCeiling(amount=150, basis="per_unit"),
    )
    total = _chair_line(
        quantity=Quantity(value=10),
        budget_ceiling=BudgetCeiling(amount=1000, basis="total"),
    )
    assert product.id in {c.product_id for c in match(per_unit, session=session).candidates}
    assert product.id not in {c.product_id for c in match(total, session=session).candidates}


def test_total_basis_budget_fit_uses_extended_price(session: Session) -> None:
    insert_product(session, price_amount=100.0)
    line = _chair_line(
        quantity=Quantity(value=5),
        budget_ceiling=BudgetCeiling(amount=1000, basis="total"),
    )
    bd = match(line, session=session).candidates[0].breakdown
    # extended price 500 against a 1000 ceiling => headroom 0.5
    assert bd.budget_fit == pytest.approx(0.5)
