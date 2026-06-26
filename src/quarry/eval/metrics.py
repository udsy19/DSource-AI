"""Retrieval metrics + an independent re-implementation of the §8 hard constraints (Agent D).

The eval never trusts the matcher to define correctness. ``satisfies(line, product)`` re-derives, in
plain Python, whether one product clears a line's hard constraints (§8 step 1) — same A>B>C fire
order, exact-cert semantics, NULL-dimension-passes rule, and per_unit/total budget basis as the SQL
filter. From it we build BOTH halves of the filter eval:

* the *ground truth* for a line is every current-catalog product for which ``satisfies`` is true, so
  precision/recall hold on a catalog of any size (no hardcoded expected sets);
* the *violation check* re-runs the per-constraint predicates on every returned product and reports
  each breach by name, so a contract violation fails the run loudly.

Ranking metrics (``relevant_at_k`` / ``mrr``) score an ordered list of retrieved keys against a
hand-labelled relevant set — they measure the text->image style ranker, not the hard filter.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

from quarry.db import ProductRow
from quarry.schema import BOQLine

_FIRE_RANK: dict[str, int] = {"C": 1, "B": 2, "A": 3}


def _fire_rank(rating: str | None) -> int | None:
    if rating is None:
        return None
    return _FIRE_RANK.get(rating.strip().upper().removeprefix("CLASS ").strip())


def precision_at_k(retrieved_keys: Sequence[str], expected_keys: frozenset[str], k: int) -> float:
    """Fraction of the top-k retrieved that are expected-good. Empty top-k => 1.0 (nothing wrong
    was returned), which matches the empty-expected-set cases."""
    top = retrieved_keys[:k]
    if not top:
        return 1.0
    hits = sum(1 for key in top if key in expected_keys)
    return hits / len(top)


def recall_at_k(retrieved_keys: Sequence[str], expected_keys: frozenset[str], k: int) -> float:
    """Fraction of expected-good products found in the top-k. No expected products => 1.0."""
    if not expected_keys:
        return 1.0
    top = set(retrieved_keys[:k])
    hits = sum(1 for key in expected_keys if key in top)
    return hits / len(expected_keys)


def relevant_at_k(retrieved_keys: Sequence[str], relevant_keys: frozenset[str], k: int) -> float:
    """1.0 if at least one relevant key sits in the top-k, else 0.0 — the ranking hit rate."""
    return 1.0 if any(key in relevant_keys for key in retrieved_keys[:k]) else 0.0


def mrr(retrieved_keys: Sequence[str], relevant_keys: frozenset[str]) -> float:
    """Reciprocal rank of the first relevant key (1/rank); 0.0 if none retrieved."""
    for index, key in enumerate(retrieved_keys, start=1):
        if key in relevant_keys:
            return 1.0 / index
    return 0.0


@dataclass(frozen=True)
class Violation:
    product_key: str
    constraint: str
    detail: str


def _effective_price(product: ProductRow, line: BOQLine) -> float:
    if line.budget_ceiling.basis == "total":
        return product.price_amount * line.quantity.value
    return product.price_amount


def constraint_breaches(
    line: BOQLine,
    product: ProductRow,
    categories_in_scope: Sequence[str],
) -> list[Violation]:
    """Every hard constraint this product breaches, by name. Empty list => the product satisfies the
    line. This is the single source of truth for both ``satisfies`` and the violation re-check."""
    key = product.source_ref
    breaches: list[Violation] = []

    if product.category not in categories_in_scope:
        breaches.append(
            Violation(key, "category", f"{product.category} not in {list(categories_in_scope)}")
        )

    if line.envelope is not None:
        env = line.envelope
        for axis, value, ceiling in (
            ("w", product.dim_w, env.max_w),
            ("d", product.dim_d, env.max_d),
            ("h", product.dim_h, env.max_h),
        ):
            if ceiling is not None and value is not None and value > ceiling:
                breaches.append(Violation(key, "envelope", f"dim_{axis} {value} > max {ceiling}"))

    price = _effective_price(product, line)
    if price > line.budget_ceiling.amount:
        breaches.append(
            Violation(key, "budget", f"effective {price} > ceiling {line.budget_ceiling.amount}")
        )

    missing = [c for c in line.required_certs if c not in product.certifications]
    if missing:
        breaches.append(Violation(key, "certifications", f"missing {missing}"))

    min_nrc = line.hard_constraints.min_acoustic_nrc
    if min_nrc is not None and (product.acoustic_nrc is None or product.acoustic_nrc < min_nrc):
        breaches.append(Violation(key, "acoustic_nrc", f"nrc {product.acoustic_nrc} < min {min_nrc}"))

    fire_min = line.hard_constraints.fire_rating_min
    if fire_min is not None:
        floor = _fire_rank(fire_min)
        actual = _fire_rank(product.fire_rating)
        if actual is None or (floor is not None and actual < floor):
            breaches.append(
                Violation(key, "fire_rating", f"{product.fire_rating} below min {fire_min}")
            )

    return breaches


def satisfies(line: BOQLine, product: ProductRow, categories_in_scope: Sequence[str]) -> bool:
    """Independent re-implementation of §8 step 1: does this product clear every hard constraint?"""
    return not constraint_breaches(line, product, categories_in_scope)


def hard_constraint_violations(
    line: BOQLine,
    retrieved: Sequence[ProductRow],
    categories_in_scope: Sequence[str],
) -> list[Violation]:
    """Re-check every returned product against the line's hard constraints, independently of the
    matcher. One Violation per breached constraint; an empty list means the pool is clean."""
    return [
        breach
        for product in retrieved
        for breach in constraint_breaches(line, product, categories_in_scope)
    ]
