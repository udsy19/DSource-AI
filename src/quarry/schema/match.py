"""MatchResponse — the resolver's output. Every candidate carries an auditable breakdown so a
human can see WHY it ranked where it did (architecture principle §4.4). Frozen contract §7.
"""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel

from .boq import BOQLine


class Weights(BaseModel):
    """Soft-rank weights — explicit and echoed in every response."""

    style: float = 0.5
    budget: float = 0.2
    lead_time: float = 0.15
    sustainability: float = 0.15


DEFAULT_WEIGHTS = Weights()


class Breakdown(BaseModel):
    style_similarity: float
    budget_fit: float
    lead_time_score: float
    sustainability_bonus: float
    filters_passed: list[str]


class Candidate(BaseModel):
    product_id: UUID
    score: float  # 0..1, deterministic weighted sum
    hard_pass: bool = True  # only hard-passing products are returned
    breakdown: Breakdown
    has_geometry: bool  # false => render stage (5) cannot place it


class MatchResponse(BaseModel):
    query: BOQLine  # echo
    candidates: list[Candidate]
    weights_used: Weights
