"""The resolver entrypoint (§8): hard SQL filter eliminates, deterministic rank orders, every
candidate carries its breakdown. This is the frozen ``match(line, weights=None, k=20)`` seam.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from .. import enrichment
from ..config import settings
from ..db import SessionLocal
from ..schema import BOQLine, MatchResponse, Weights
from .filter import applied_filters, hard_filter
from .rank import rank_candidates


def resolve_style_vec(line: BOQLine) -> list[float] | None:
    """§8 step 2: precomputed vector, else embed the text, else embed the reference image, else
    None. None means style_similarity is 0 downstream — we never fabricate a vector."""
    intent = line.style_intent
    if intent.precomputed_vector is not None:
        return intent.precomputed_vector
    if intent.text is not None:
        return enrichment.embed_text(intent.text)
    if intent.reference_image is not None:
        return enrichment.embed_image(intent.reference_image)
    return None


def match(
    line: BOQLine,
    weights: Weights | None = None,
    k: int = 20,
    session: Session | None = None,
) -> MatchResponse:
    """BOQ line -> top-k ranked, hard-constraint-respecting, audited candidates.

    ``session`` lets the API and tests pass a request-scoped session; left None, the resolver
    opens and closes its own. The frozen call ``match(line, weights, k)`` is unchanged.
    """
    weights_used = weights if weights is not None else settings.weights

    owned_session = session is None
    db = session if session is not None else SessionLocal()
    try:
        survivors = db.execute(hard_filter(line)).scalars().all()
    finally:
        if owned_session:
            db.close()

    style_vec = resolve_style_vec(line)
    filters_passed = applied_filters(line)

    candidates = rank_candidates(survivors, line, style_vec, weights_used, filters_passed)
    # Deterministic order: score desc, ties broken by product_id so the order is stable.
    candidates.sort(key=lambda c: (-c.score, str(c.product_id)))

    return MatchResponse(query=line, candidates=candidates[:k], weights_used=weights_used)
