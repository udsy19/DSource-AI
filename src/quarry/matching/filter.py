"""Hard filter (§8 step 1) — a SQL WHERE clause that ELIMINATES candidates, never penalizes.

Every predicate here is a binary gate: a product either survives or it is gone. Soft signals
(style, budget headroom, lead time, sustainability) live in rank.py and only order survivors.

Two conventions worth stating because they are NOT inferable from the schema:

* NULL product dimensions are treated as PASSING the envelope check. A NULL dim means the source
  never told us that measurement; we do not eliminate on an unknown. A product with a known dim
  that exceeds the envelope IS eliminated. (Per-axis: each of w/d/h is judged independently.)
* Fire rating is ordered A > B > C (Class A is the most stringent / best). A product satisfies
  ``fire_rating_min`` only if its rating is at least as stringent as the minimum. A product whose
  fire_rating is NULL is eliminated when a minimum is required — we cannot prove compliance.
"""

from __future__ import annotations

from pathlib import Path

from sqlalchemy import ColumnElement, Select, and_, or_, select

from ..schema import BOQLine, Taxonomy, load_taxonomy
from ..db import ProductRow

_TAXONOMY_PATH = Path(__file__).resolve().parents[3] / "data" / "taxonomy.yaml"

# Class A is the most demanding. A product rated X satisfies a minimum Y when rank(X) >= rank(Y).
_FIRE_RANK: dict[str, int] = {"C": 1, "B": 2, "A": 3}


def fire_rank(rating: str | None) -> int | None:
    if rating is None:
        return None
    return _FIRE_RANK.get(rating.strip().upper().removeprefix("CLASS ").strip())


def categories_in_scope(category: str, taxonomy: Taxonomy) -> list[str]:
    """The requested category plus every descendant leaf under it.

    A BOQ line may target an interior node (e.g. ``ffe/seating``); a product sits at a leaf
    (``ffe/seating/task-chair``). We match the node itself and any leaf whose path is the node
    followed by ``/``.
    """
    prefix = f"{category}/"
    descendants = [leaf for leaf in taxonomy.leaf_paths() if leaf.startswith(prefix)]
    return [category, *descendants]


def _envelope_predicates(line: BOQLine) -> list[ColumnElement[bool]]:
    if line.envelope is None:
        return []
    envelope = line.envelope
    predicates: list[ColumnElement[bool]] = []
    if envelope.max_w is not None:
        predicates.append(or_(ProductRow.dim_w.is_(None), ProductRow.dim_w <= envelope.max_w))
    if envelope.max_d is not None:
        predicates.append(or_(ProductRow.dim_d.is_(None), ProductRow.dim_d <= envelope.max_d))
    if envelope.max_h is not None:
        predicates.append(or_(ProductRow.dim_h.is_(None), ProductRow.dim_h <= envelope.max_h))
    return predicates


def _budget_predicate(line: BOQLine) -> ColumnElement[bool]:
    ceiling = line.budget_ceiling
    if ceiling.basis == "total":
        return ProductRow.price_amount * line.quantity.value <= ceiling.amount
    return ProductRow.price_amount <= ceiling.amount


def applied_filters(line: BOQLine) -> list[str]:
    """The filter names that actually gated this query — recorded for the breakdown's
    ``filters_passed`` so a human can see which constraints a survivor cleared."""
    names = ["category"]
    if line.envelope is not None and any(
        v is not None for v in (line.envelope.max_w, line.envelope.max_d, line.envelope.max_h)
    ):
        names.append("envelope")
    names.append("budget")
    if line.required_certs:
        names.append("certifications")
    if line.hard_constraints.min_acoustic_nrc is not None:
        names.append("acoustic_nrc")
    if line.hard_constraints.fire_rating_min is not None:
        names.append("fire_rating")
    return names


def hard_filter(line: BOQLine, taxonomy: Taxonomy | None = None) -> Select[tuple[ProductRow]]:
    """Build the SQL Select that eliminates every product violating a hard constraint.

    Returns a Select the service executes; survivors are the pool §8 step 3 ranks.
    """
    tax = taxonomy if taxonomy is not None else load_taxonomy(_TAXONOMY_PATH)

    clauses: list[ColumnElement[bool]] = [
        ProductRow.category.in_(categories_in_scope(line.category, tax))
    ]
    clauses.extend(_envelope_predicates(line))
    clauses.append(_budget_predicate(line))

    if line.required_certs:
        clauses.append(ProductRow.certifications.contains(line.required_certs))

    min_nrc = line.hard_constraints.min_acoustic_nrc
    if min_nrc is not None:
        clauses.append(and_(ProductRow.acoustic_nrc.is_not(None), ProductRow.acoustic_nrc >= min_nrc))

    fire_min = line.hard_constraints.fire_rating_min
    if fire_min is not None:
        clauses.append(and_(ProductRow.fire_rating.is_not(None), _fire_rating_at_least(fire_min)))

    return select(ProductRow).where(and_(*clauses))


def _fire_rating_at_least(fire_min: str) -> ColumnElement[bool]:
    """SQL gate: stored fire_rating is at least as stringent as ``fire_min`` (A > B > C).

    Ratings are a tiny fixed vocabulary, so we enumerate the accepted Class letters and every
    spelling fire_rank() normalizes (``A`` / ``Class A`` / case variants) into an IN clause —
    deterministic and pushed entirely into SQL."""
    floor = fire_rank(fire_min)
    accepted = [r for r, v in _FIRE_RANK.items() if floor is not None and v >= floor]
    spellings: list[str] = []
    for letter in accepted:
        spellings.extend([letter, letter.lower(), f"Class {letter}", f"CLASS {letter}"])
    return ProductRow.fire_rating.in_(spellings)
