"""Evaluation — golden BOQ set, retrieval metrics, and the scorecard CLI. [AGENT D]

The eval runs the live ``match()`` over hand-written golden lines, scores precision@k / recall@k
against expected product keys, and independently re-checks every returned product's hard
constraints. ``python -m quarry.eval`` exits nonzero if any hard-constraint violation is found.
"""

from .golden import GoldenCase, golden_cases
from .metrics import Violation, hard_constraint_violations, precision_at_k, recall_at_k
from .run import CaseResult, format_scorecard, run_eval, total_violations

__all__ = [
    "CaseResult",
    "GoldenCase",
    "Violation",
    "format_scorecard",
    "golden_cases",
    "hard_constraint_violations",
    "precision_at_k",
    "recall_at_k",
    "run_eval",
    "total_violations",
]
