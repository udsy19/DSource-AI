"""Soft rank (§8 step 3) — deterministic, inspectable scoring over the hard-filter survivors.

No randomness, no I/O, no LLM. Every term is a pure function of stored product data and the BOQ
line, so the same inputs always yield the same order and the same breakdown. Scoring never
revisits a hard constraint; survivors are already known to pass.
"""

from __future__ import annotations

import math
import re
from collections.abc import Sequence

from ..schema import BOQLine, Breakdown, Candidate, Weights
from ..db import ProductRow

# Generic words carry no discriminating signal: English function words plus the v1 leaf nouns
# ("chair"/"panel"/"tile"). Stripping them leaves the descriptive attributes — "mesh", "leather",
# "wood", "slat", "high", "back", "outdoor" — which is exactly what the lexical term should match.
_STOPWORDS = frozenset(
    {
        "a", "an", "the", "and", "or", "of", "for", "with", "without", "to", "in", "on",
        "chair", "chairs", "panel", "panels", "tile", "tiles", "seating",
    }
)
_WORD = re.compile(r"[a-z0-9]+")


def _tokenize(text: str) -> set[str]:
    return {t for t in _WORD.findall(text.lower()) if len(t) > 1 and t not in _STOPWORDS}


def _product_tokens(product: ProductRow) -> set[str]:
    """The product's searchable text: name + structured attributes + the embedding text_blob, plus
    the category path. The category is structured truth — a `finishes/acoustic/wall-panel` IS
    acoustic even if its terse seed text never says so — so category-implied query words ("acoustic")
    match every product in the leaf uniformly, which is correct: they carry no intra-leaf signal."""
    attrs = product.attributes or {}
    parts = [product.name, product.text_blob, product.category, attrs.get("finish") or ""]
    parts += attrs.get("materials") or []
    parts += attrs.get("colors") or []
    return _tokenize(" ".join(parts))


def attribute_match(query_text: str | None, product: ProductRow) -> float:
    """Fraction of the query's attribute words that the product actually claims (lexical, [0,1]).

    Complements the visual style term: CLIP clusters on gross form, so a query for "mesh office
    chair" pulls up any office chair — this term lifts the products whose own text says "mesh".
    Deterministic and inspectable (no LLM). No query text (vector-only style) -> 0.0."""
    if not query_text:
        return 0.0
    wanted = _tokenize(query_text)
    if not wanted:
        return 0.0
    return len(wanted & _product_tokens(product)) / len(wanted)


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


def _raw_style(style_vec: list[float] | None, product: ProductRow) -> float | None:
    """§8: style is VISUAL — cosine(style_vec, product.image_vec). Returns None (not 0.0) when
    there is no visual evidence, so the pool normalizer can tell "no photo" apart from "worst
    photo." A product with no image_vec earns no style signal and competes on the other terms;
    text↔text style was measured to be noise, so nothing real is lost. See NOTES.md."""
    if style_vec is None or product.image_vec is None:
        return None
    return cosine_similarity(style_vec, product.image_vec)


def _normalize_pool(raws: list[float | None]) -> list[float]:
    """Min-max the visual-match scores WITHIN the survivor pool so the best photo earns ~1.0
    relative, not an absolute ~0.28. Raw CLIP text→image cosine is compressed (a good match maps
    to ~0.55-0.68), too weak to dominate the other [0,1] terms on a style query — yet on a style
    query the best visual match SHOULD win. Pool-relative scaling restores that. Products with no
    visual evidence stay 0.0; a single (or all-equal) photo pool collapses to 1.0 for each photo."""
    photo = [r for r in raws if r is not None]
    if not photo:
        return [0.0 for _ in raws]
    low, high = min(photo), max(photo)
    span = high - low
    return [0.0 if r is None else (1.0 if span <= 1e-9 else (r - low) / span) for r in raws]


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


def rank_candidates(
    products: Sequence[ProductRow],
    line: BOQLine,
    style_vec: list[float] | None,
    weights: Weights,
    filters_passed: list[str],
) -> list[Candidate]:
    """Score the whole survivor pool together so the style term can be normalized across it
    (§8 step 3). Every other term is per-product; only style needs the pool, because raw CLIP
    cosine is only meaningful relative to the other candidates' cosines for the same query."""
    styles = _normalize_pool([_raw_style(style_vec, product) for product in products])
    query_text = line.style_intent.text
    candidates: list[Candidate] = []
    for product, style in zip(products, styles, strict=True):
        breakdown = Breakdown(
            style_similarity=style,
            attribute_match=attribute_match(query_text, product),
            budget_fit=budget_fit(product, line),
            lead_time_score=lead_time_score(product.lead_time_days),
            sustainability_bonus=sustainability_bonus(product),
            filters_passed=filters_passed,
        )
        score = (
            weights.style * breakdown.style_similarity
            + weights.attribute * breakdown.attribute_match
            + weights.budget * breakdown.budget_fit
            + weights.lead_time * breakdown.lead_time_score
            + weights.sustainability * breakdown.sustainability_bonus
        )
        candidates.append(
            Candidate(
                product_id=product.id,
                score=score,
                hard_pass=True,
                breakdown=breakdown,
                has_geometry=product.model_3d_uri is not None,
            )
        )
    return candidates
