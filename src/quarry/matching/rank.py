"""Soft rank (§8 step 3) — deterministic, inspectable scoring over the hard-filter survivors.

No randomness, no I/O, no LLM. Every term is a pure function of stored product data and the BOQ
line, so the same inputs always yield the same order and the same breakdown. Scoring never
revisits a hard constraint; survivors are already known to pass.
"""

from __future__ import annotations

import math

from ..schema import BOQLine, Breakdown, Candidate, Weights
from ..db import ProductRow


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Cosine of two vectors mapped from [-1, 1] onto [0, 1] so it composes with the other
    [0, 1] rank terms. Zero-norm vectors yield 0.0 (no signal, never a divide-by-zero)."""
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    cosine = dot / (norm_a * norm_b)
    return (max(-1.0, min(1.0, cosine)) + 1.0) / 2.0


def style_similarity(style_vec: list[float] | None, product: ProductRow) -> float:
    """§8 (amended 2026-06-25): style is VISUAL — cosine(style_vec, product.image_vec).

    The original `image_vec or text_vec` fallback mixed CLIP's modality scales (text↔text ~0.84
    vs text↔image ~0.30), letting image-less products bury image-matched ones. Visual style is
    matched against the product's appearance; a product with no image_vec earns no style signal
    (0.0 — absence of evidence, not a penalty) and competes on the other terms. text↔text style
    was measured to be noise, so nothing real is lost. See NOTES.md."""
    if style_vec is None or product.image_vec is None:
        return 0.0
    return cosine_similarity(style_vec, product.image_vec)


def effective_price(product: ProductRow, line: BOQLine) -> float:
    if line.budget_ceiling.basis == "total":
        return product.price_amount * line.quantity.value
    return product.price_amount


def budget_fit(product: ProductRow, line: BOQLine) -> float:
    """1.0 at free, approaching 0.0 at the ceiling — cheaper within budget ranks higher.
    Linear in headroom: (ceiling - price) / ceiling, clamped to [0, 1]."""
    ceiling = line.budget_ceiling.amount
    if ceiling <= 0.0:
        return 0.0
    headroom = (ceiling - effective_price(product, line)) / ceiling
    return max(0.0, min(1.0, headroom))


def lead_time_score(lead_time_days: int | None) -> float:
    """Shorter is better. Unknown lead time scores 0.0 — we don't reward an unverifiable promise.
    Maps 0 days -> 1.0 down to >= 90 days -> 0.0 linearly."""
    if lead_time_days is None:
        return 0.0
    horizon = 90.0
    return max(0.0, min(1.0, (horizon - lead_time_days) / horizon))


def sustainability_bonus(product: ProductRow) -> float:
    """0..1 from three independent signals: an EPD, holding certifications, and low embodied
    carbon. Each contributes a third so the term is bounded and explainable."""
    score = 0.0
    if product.has_epd:
        score += 1.0 / 3.0
    if product.certifications:
        score += 1.0 / 3.0
    if product.embodied_carbon is not None:
        threshold = 50.0  # kgCO2e — below this counts as low embodied carbon
        score += (1.0 / 3.0) * max(0.0, min(1.0, (threshold - product.embodied_carbon) / threshold))
    return max(0.0, min(1.0, score))


def score_candidate(
    product: ProductRow,
    line: BOQLine,
    style_vec: list[float] | None,
    weights: Weights,
    filters_passed: list[str],
) -> Candidate:
    breakdown = Breakdown(
        style_similarity=style_similarity(style_vec, product),
        budget_fit=budget_fit(product, line),
        lead_time_score=lead_time_score(product.lead_time_days),
        sustainability_bonus=sustainability_bonus(product),
        filters_passed=filters_passed,
    )
    score = (
        weights.style * breakdown.style_similarity
        + weights.budget * breakdown.budget_fit
        + weights.lead_time * breakdown.lead_time_score
        + weights.sustainability * breakdown.sustainability_bonus
    )
    return Candidate(
        product_id=product.id,
        score=score,
        hard_pass=True,
        breakdown=breakdown,
        has_geometry=product.model_3d_uri is not None,
    )
