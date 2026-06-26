"""Eval runner + scorecard (Agent D, §9). ``uv run python -m quarry.eval``.

Two sections, one scorecard:

* FILTER — every golden line runs through the live ``match()``. The expected-good set is computed
  dynamically as all catalog products that independently ``satisfy`` the line (no hardcoded sets), so
  precision/recall stay correct on any catalog size. Every returned product is re-checked for hard
  constraint violations; any violation EXITS NONZERO (§8 contract breach, never a soft signal).
* RANKING — each ranking case embeds its query with CLIP text and ranks it against stored image_vec
  (text->IMAGE) over the photographed chairs; we score relevant@k and MRR per case + aggregate.

CLIP is registered once so the text->image ranking section runs against the real provider.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from sqlalchemy.orm import Session

from quarry.config import settings
from quarry.db import ProductRow, SessionLocal
from quarry.enrichment import register_default_provider
from quarry.matching import match
from quarry.matching.filter import categories_in_scope
from quarry.schema import BOQLine, BudgetCeiling, Quantity, StyleIntent, load_taxonomy

from .golden import GoldenCase, golden_cases
from .metrics import (
    Violation,
    hard_constraint_violations,
    mrr,
    precision_at_k,
    recall_at_k,
    relevant_at_k,
    satisfies,
)
from .ranking import RankingCase, ranking_cases

_TAXONOMY_PATH = Path(__file__).resolve().parents[3] / "data" / "taxonomy.yaml"


@dataclass(frozen=True)
class FilterResult:
    name: str
    k: int
    retrieved_keys: list[str]
    expected_keys: frozenset[str]
    precision: float
    recall: float
    lacking_geometry: list[str]
    violations: list[Violation]


@dataclass(frozen=True)
class RankingResult:
    name: str
    query: str
    k: int
    ranked_keys: list[str]
    relevant_at_1: float
    relevant_at_3: float
    relevant_at_5: float
    reciprocal_rank: float


@dataclass(frozen=True)
class Scorecard:
    filter_results: list[FilterResult]
    ranking_results: list[RankingResult]
    products_lacking_geometry: int


def _expected_keys(line: BOQLine, session: Session, scope: list[str]) -> frozenset[str]:
    """Dynamic ground truth: every catalog product in scope that independently satisfies the line."""
    in_scope = session.query(ProductRow).filter(ProductRow.category.in_(scope)).all()
    return frozenset(p.source_ref for p in in_scope if satisfies(line, p, scope))


def evaluate_filter_case(
    case: GoldenCase, session: Session, k: int, scope_for: dict[str, list[str]]
) -> FilterResult:
    response = match(case.line, k=k, session=session)
    ids = [c.product_id for c in response.candidates]
    rows_by_id = {row.id: row for row in session.query(ProductRow).filter(ProductRow.id.in_(ids))}
    retrieved_rows = [rows_by_id[i] for i in ids]
    retrieved_keys = [row.source_ref for row in retrieved_rows]

    scope = scope_for[case.line.category]
    expected_keys = _expected_keys(case.line, session, scope)

    lacking_geometry = [
        rows_by_id[c.product_id].source_ref for c in response.candidates if not c.has_geometry
    ]
    violations = hard_constraint_violations(case.line, retrieved_rows, scope)

    return FilterResult(
        name=case.name,
        k=k,
        retrieved_keys=retrieved_keys,
        expected_keys=expected_keys,
        precision=precision_at_k(retrieved_keys, expected_keys, k),
        recall=recall_at_k(retrieved_keys, expected_keys, k),
        lacking_geometry=lacking_geometry,
        violations=violations,
    )


def evaluate_ranking_case(case: RankingCase, session: Session, k: int) -> RankingResult:
    """Run the query through ``match()`` and keep only image-vec products in match() order — the
    text->image ranking we are scoring (text_vec fallbacks are not a fair test of the image ranker).
    """
    line = BOQLine(
        category=case.category,
        quantity=Quantity(value=1),
        budget_ceiling=BudgetCeiling(amount=1_000_000, basis="per_unit"),
        style_intent=StyleIntent(text=case.query),
    )
    response = match(line, k=k, session=session)
    ids = [c.product_id for c in response.candidates]
    rows_by_id = {row.id: row for row in session.query(ProductRow).filter(ProductRow.id.in_(ids))}
    ranked_keys = [
        rows_by_id[c.product_id].source_ref
        for c in response.candidates
        if rows_by_id[c.product_id].image_vec is not None
    ]

    return RankingResult(
        name=case.name,
        query=case.query,
        k=k,
        ranked_keys=ranked_keys,
        relevant_at_1=relevant_at_k(ranked_keys, case.relevant_keys, 1),
        relevant_at_3=relevant_at_k(ranked_keys, case.relevant_keys, 3),
        relevant_at_5=relevant_at_k(ranked_keys, case.relevant_keys, 5),
        reciprocal_rank=mrr(ranked_keys, case.relevant_keys),
    )


def run_eval(session: Session | None = None, k: int | None = None) -> Scorecard:
    register_default_provider("clip")
    k_value = k if k is not None else settings.match_k

    owned = session is None
    db = session if session is not None else SessionLocal()
    try:
        taxonomy = load_taxonomy(_TAXONOMY_PATH)
        scope_for = {
            leaf: categories_in_scope(leaf, taxonomy)
            for leaf in {c.line.category for c in golden_cases()}
        }
        # A larger k for ranking so the relevant image-vec product can appear past the BIM fallbacks.
        ranking_k = max(k_value, 60)
        filter_results = [
            evaluate_filter_case(case, db, k_value, scope_for) for case in golden_cases()
        ]
        ranking_results = [
            evaluate_ranking_case(case, db, ranking_k) for case in ranking_cases()
        ]
        lacking = len({key for r in filter_results for key in r.lacking_geometry})
        return Scorecard(filter_results, ranking_results, lacking)
    finally:
        if owned:
            db.close()


def total_violations(scorecard: Scorecard) -> int:
    return sum(len(r.violations) for r in scorecard.filter_results)


def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def format_scorecard(scorecard: Scorecard) -> str:
    lines: list[str] = ["=" * 80, "QUARRY EVAL SCORECARD", "=" * 80]

    lines.append("FILTER  (dynamic ground truth: products that independently satisfy each line)")
    lines.append(f"{'case':<38}{'exp':>5}{'cand':>6}{'prec@k':>9}{'rec@k':>8}{'viol':>6}")
    lines.append("-" * 80)
    for fr in scorecard.filter_results:
        lines.append(
            f"{fr.name:<38}{len(fr.expected_keys):>5}{len(fr.retrieved_keys):>6}"
            f"{fr.precision:>9.3f}{fr.recall:>8.3f}{len(fr.violations):>6}"
        )
    lines.append("-" * 80)
    total_viol = total_violations(scorecard)
    lines.append(
        f"{'AGGREGATE (mean)':<49}"
        f"{_mean([r.precision for r in scorecard.filter_results]):>9.3f}"
        f"{_mean([r.recall for r in scorecard.filter_results]):>8.3f}{total_viol:>6}"
    )

    lines.append("")
    lines.append("RANKING  (text->image: CLIP text query vs stored image_vec, real chairs only)")
    lines.append(f"{'case':<22}{'query':<34}{'rel@1':>6}{'rel@3':>6}{'rel@5':>6}{'mrr':>7}")
    lines.append("-" * 80)
    for rr in scorecard.ranking_results:
        lines.append(
            f"{rr.name:<22}{rr.query[:33]:<34}"
            f"{rr.relevant_at_1:>6.0f}{rr.relevant_at_3:>6.0f}{rr.relevant_at_5:>6.0f}"
            f"{rr.reciprocal_rank:>7.3f}"
        )
    lines.append("-" * 80)
    lines.append(
        f"{'AGGREGATE (mean)':<56}"
        f"{_mean([r.relevant_at_1 for r in scorecard.ranking_results]):>6.3f}"
        f"{_mean([r.relevant_at_3 for r in scorecard.ranking_results]):>6.3f}"
        f"{_mean([r.relevant_at_5 for r in scorecard.ranking_results]):>6.3f}"
        f"{_mean([r.reciprocal_rank for r in scorecard.ranking_results]):>7.3f}"
    )

    lines.append("")
    lines.append(f"products lacking geometry:   {scorecard.products_lacking_geometry}")
    lines.append(f"hard-constraint violations:  {total_viol}")

    if total_viol:
        lines.append("")
        lines.append("VIOLATIONS (each is a §8 contract breach):")
        for fr in scorecard.filter_results:
            for v in fr.violations:
                lines.append(f"  [{fr.name}] {v.product_key}: {v.constraint} — {v.detail}")

    lines.append("=" * 80)
    return "\n".join(lines)
