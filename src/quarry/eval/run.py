"""Eval runner + scorecard (Agent D, §9). ``uv run python -m quarry.eval``.

Registers the deterministic stub embedding provider, runs every golden case through the live
``match()`` against the seeded DB, resolves returned UUIDs to stable keys, computes precision@k /
recall@k against the golden expected sets, and independently re-checks every returned product
against its line's hard constraints. Prints a per-case + aggregate scorecard and EXITS NONZERO if
any hard-constraint violation is found — a violation is a §8 contract breach, never a soft signal.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from uuid import UUID

from sqlalchemy.orm import Session

from quarry.config import settings
from quarry.db import ProductRow, SessionLocal
from quarry.enrichment import register_default_provider
from quarry.matching import match
from quarry.matching.filter import categories_in_scope
from quarry.schema import load_taxonomy

from .golden import GoldenCase, golden_cases
from .metrics import Violation, hard_constraint_violations, precision_at_k, recall_at_k

_TAXONOMY_PATH = Path(__file__).resolve().parents[3] / "data" / "taxonomy.yaml"


@dataclass(frozen=True)
class CaseResult:
    name: str
    k: int
    retrieved_keys: list[str]
    expected_keys: frozenset[str]
    precision: float
    recall: float
    lacking_geometry: list[str]
    violations: list[Violation]


def _keys_by_id(session: Session, ids: list[UUID]) -> dict[UUID, ProductRow]:
    if not ids:
        return {}
    rows = session.query(ProductRow).filter(ProductRow.id.in_(ids)).all()
    return {row.id: row for row in rows}


def evaluate_case(case: GoldenCase, session: Session, k: int) -> CaseResult:
    response = match(case.line, k=k, session=session)
    ids = [c.product_id for c in response.candidates]
    rows_by_id = _keys_by_id(session, ids)
    retrieved_rows = [rows_by_id[i] for i in ids]
    retrieved_keys = [row.source_ref for row in retrieved_rows]

    taxonomy = load_taxonomy(_TAXONOMY_PATH)
    scope = categories_in_scope(case.line.category, taxonomy)

    lacking_geometry = [
        rows_by_id[c.product_id].source_ref
        for c in response.candidates
        if not c.has_geometry
    ]
    violations = hard_constraint_violations(case.line, retrieved_rows, scope)

    return CaseResult(
        name=case.name,
        k=k,
        retrieved_keys=retrieved_keys,
        expected_keys=case.expected_keys,
        precision=precision_at_k(retrieved_keys, case.expected_keys, k),
        recall=recall_at_k(retrieved_keys, case.expected_keys, k),
        lacking_geometry=lacking_geometry,
        violations=violations,
    )


def run_eval(session: Session | None = None, k: int | None = None) -> list[CaseResult]:
    register_default_provider("stub")
    k_value = k if k is not None else settings.match_k

    owned = session is None
    db = session if session is not None else SessionLocal()
    try:
        return [evaluate_case(case, db, k_value) for case in golden_cases()]
    finally:
        if owned:
            db.close()


def format_scorecard(results: list[CaseResult]) -> str:
    lines: list[str] = []
    lines.append("=" * 78)
    lines.append("QUARRY EVAL SCORECARD")
    lines.append("=" * 78)
    header = f"{'case':<42}{'cand':>5}{'prec@k':>9}{'rec@k':>8}{'viol':>6}"
    lines.append(header)
    lines.append("-" * 78)

    total_candidates = 0
    total_lacking_geometry = 0
    total_violations = 0
    sum_precision = 0.0
    sum_recall = 0.0

    for result in results:
        total_candidates += len(result.retrieved_keys)
        total_lacking_geometry += len(result.lacking_geometry)
        total_violations += len(result.violations)
        sum_precision += result.precision
        sum_recall += result.recall
        lines.append(
            f"{result.name:<42}{len(result.retrieved_keys):>5}"
            f"{result.precision:>9.3f}{result.recall:>8.3f}{len(result.violations):>6}"
        )

    n = len(results) or 1
    lines.append("-" * 78)
    lines.append(
        f"{'AGGREGATE (mean)':<42}{total_candidates:>5}"
        f"{sum_precision / n:>9.3f}{sum_recall / n:>8.3f}{total_violations:>6}"
    )
    lines.append("")
    lines.append(f"cases:                       {len(results)}")
    lines.append(f"total candidates returned:   {total_candidates}")
    lines.append(f"products lacking geometry:   {total_lacking_geometry}")
    lines.append(f"hard-constraint violations:  {total_violations}")

    if total_violations:
        lines.append("")
        lines.append("VIOLATIONS (each is a §8 contract breach):")
        for result in results:
            for v in result.violations:
                lines.append(f"  [{result.name}] {v.product_key}: {v.constraint} — {v.detail}")

    lines.append("=" * 78)
    return "\n".join(lines)


def total_violations(results: list[CaseResult]) -> int:
    return sum(len(r.violations) for r in results)
