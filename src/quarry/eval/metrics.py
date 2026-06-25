"""Retrieval metrics + an independent hard-constraint re-check (Agent D, §9).

``precision_at_k`` / ``recall_at_k`` are pure set math over stable keys. ``hard_constraint_violations``
does NOT trust the matcher: it re-derives, for one returned product, whether it satisfies the line's
hard constraints (§8 step 1) using the same A>B>C fire order and exact-cert semantics as the filter.
Any product the matcher returned that fails here is a contract breach the eval must fail loudly on.
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


@dataclass(frozen=True)
class Violation:
    product_key: str
    constraint: str
    detail: str


def _effective_price(product: ProductRow, line: BOQLine) -> float:
    if line.budget_ceiling.basis == "total":
        return product.price_amount * line.quantity.value
    return product.price_amount


def hard_constraint_violations(
    line: BOQLine,
    retrieved: Sequence[ProductRow],
    categories_in_scope: Sequence[str],
) -> list[Violation]:
    """Re-check every returned product against the line's hard constraints, independently of the
    matcher. Returns one Violation per breached constraint; an empty list means the pool is clean.

    ``categories_in_scope`` is the requested category plus its descendant leaves (the matcher's own
    scope), so a product in a sibling leaf is flagged rather than silently accepted.
    """
    violations: list[Violation] = []
    for product in retrieved:
        key = product.source_ref

        if product.category not in categories_in_scope:
            violations.append(
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
                    violations.append(
                        Violation(key, "envelope", f"dim_{axis} {value} > max {ceiling}")
                    )

        price = _effective_price(product, line)
        if price > line.budget_ceiling.amount:
            violations.append(
                Violation(key, "budget", f"effective {price} > ceiling {line.budget_ceiling.amount}")
            )

        missing = [c for c in line.required_certs if c not in product.certifications]
        if missing:
            violations.append(Violation(key, "certifications", f"missing {missing}"))

        min_nrc = line.hard_constraints.min_acoustic_nrc
        if min_nrc is not None and (product.acoustic_nrc is None or product.acoustic_nrc < min_nrc):
            violations.append(
                Violation(key, "acoustic_nrc", f"nrc {product.acoustic_nrc} < min {min_nrc}")
            )

        fire_min = line.hard_constraints.fire_rating_min
        if fire_min is not None:
            floor = _fire_rank(fire_min)
            actual = _fire_rank(product.fire_rating)
            if actual is None or (floor is not None and actual < floor):
                violations.append(
                    Violation(key, "fire_rating", f"{product.fire_rating} below min {fire_min}")
                )

    return violations
