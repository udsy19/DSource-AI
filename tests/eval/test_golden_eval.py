"""Integration: run the eval against the live seeded DB (read-only).

The §9 DoD is loud here — ZERO hard-constraint violations across every filter case, and the filter
must reproduce the dynamic ground truth (every catalog product that independently satisfies the line)
exactly. Because the ground truth is computed, not hardcoded, these assertions hold at any catalog
size. The ranking assertions document the text->image relevance bar we actually measure.

``run_eval`` registers CLIP and embeds the ranking queries (no image fetching, no network — stored
image_vec + local CLIP text), so this module is the slow path. We run the eval once and share it.
"""

from __future__ import annotations

import pytest
from sqlalchemy.orm import Session

from quarry.db import ProductRow
from quarry.eval.run import Scorecard, run_eval, total_violations


@pytest.fixture
def scorecard(seeded_session: Session) -> Scorecard:
    return run_eval(session=seeded_session)


def test_zero_hard_constraint_violations(scorecard: Scorecard) -> None:
    assert total_violations(scorecard) == 0, [
        (r.name, v) for r in scorecard.filter_results for v in r.violations
    ]


def test_filter_reproduces_dynamic_ground_truth(scorecard: Scorecard) -> None:
    assert scorecard.filter_results, "filter set is empty"
    for result in scorecard.filter_results:
        assert set(result.retrieved_keys) == result.expected_keys, result.name
        assert result.precision == 1.0, result.name
        assert result.recall == 1.0, result.name


def test_ranking_meets_relevance_bar(scorecard: Scorecard) -> None:
    results = scorecard.ranking_results
    assert results, "ranking set is empty"
    # Measured on the live catalogue: aggregate relevant@3 == 1.0, MRR ~= 0.93. We assert a
    # conservative floor so the bar is robust to minor embedding drift, not brittle to the exact run.
    mean_rel3 = sum(r.relevant_at_3 for r in results) / len(results)
    mean_mrr = sum(r.reciprocal_rank for r in results) / len(results)
    assert mean_rel3 >= 0.8, mean_rel3
    assert mean_mrr >= 0.7, mean_mrr


def test_eval_does_not_mutate_seed(seeded_session: Session) -> None:
    before = seeded_session.query(ProductRow).count()
    run_eval(session=seeded_session)
    assert seeded_session.query(ProductRow).count() == before
