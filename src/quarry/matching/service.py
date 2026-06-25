"""The resolver entrypoint (§8). Phase 0 ships the frozen signature only; Agent C implements
the hard filter (filter.py) and the deterministic rank (rank.py) behind it.
"""

from __future__ import annotations

from ..schema import DEFAULT_WEIGHTS, BOQLine, MatchResponse, Weights


def match(line: BOQLine, weights: Weights | None = None, k: int = 20) -> MatchResponse:
    """BOQ line -> ranked, hard-constraint-respecting, audited candidates.

    Pipeline (Agent C): hard SQL filter eliminates; deterministic weighted rank orders the
    survivors; every candidate returns its score breakdown.
    """
    _ = weights or DEFAULT_WEIGHTS
    raise NotImplementedError("match() is implemented by Agent C (matching layer)")
