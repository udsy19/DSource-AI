"""Integration: run the golden eval against the live seeded DB.

The §9 DoD is loud here — the eval must report ZERO hard-constraint violations across every golden
case. We also assert the eval reproduces the expected sets exactly (perfect precision/recall), since
the golden expected keys are the ground truth the §8 hard filter must match.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from quarry.eval.run import run_eval, total_violations


def test_golden_eval_has_zero_hard_constraint_violations(seeded_session: Session) -> None:
    results = run_eval(session=seeded_session)
    assert total_violations(results) == 0, [
        (r.name, v) for r in results for v in r.violations
    ]


def test_golden_eval_reproduces_expected_sets(seeded_session: Session) -> None:
    results = run_eval(session=seeded_session)
    assert results, "golden set is empty"
    for result in results:
        assert set(result.retrieved_keys) == result.expected_keys, result.name
        assert result.precision == 1.0, result.name
        assert result.recall == 1.0, result.name


def test_golden_eval_does_not_mutate_seed(seeded_session: Session) -> None:
    from quarry.db import ProductRow

    before = seeded_session.query(ProductRow).count()
    run_eval(session=seeded_session)
    assert seeded_session.query(ProductRow).count() == before
