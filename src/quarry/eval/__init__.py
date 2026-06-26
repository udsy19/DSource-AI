"""Evaluation — golden filter set, ranking-quality set, retrieval metrics, scorecard CLI. [AGENT D]

The eval runs the live ``match()`` over hand-written golden lines and ranking queries. The filter
section scores precision@k / recall@k against a DYNAMIC ground truth (every catalog product that
independently satisfies the line) and re-checks every returned product's hard constraints. The
ranking section scores relevant@k / MRR of the text->image style ranker over the photographed chairs.
``python -m quarry.eval`` exits nonzero if any hard-constraint violation is found.
"""

from .golden import GoldenCase, golden_cases
from .metrics import (
    Violation,
    constraint_breaches,
    hard_constraint_violations,
    mrr,
    precision_at_k,
    recall_at_k,
    relevant_at_k,
    satisfies,
)
from .ranking import RankingCase, ranking_cases
from .run import (
    FilterResult,
    RankingResult,
    Scorecard,
    format_scorecard,
    run_eval,
    total_violations,
)

__all__ = [
    "FilterResult",
    "GoldenCase",
    "RankingCase",
    "RankingResult",
    "Scorecard",
    "Violation",
    "constraint_breaches",
    "format_scorecard",
    "golden_cases",
    "hard_constraint_violations",
    "mrr",
    "precision_at_k",
    "ranking_cases",
    "recall_at_k",
    "relevant_at_k",
    "run_eval",
    "satisfies",
    "total_violations",
]
