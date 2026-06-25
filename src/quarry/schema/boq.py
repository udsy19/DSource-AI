"""BOQLine — the query, and the upstream seam from stage 3 (Schematic+BOQ). Frozen contract §7."""

from __future__ import annotations

from pydantic import BaseModel, Field


class Quantity(BaseModel):
    value: float
    unit: str = "each"  # each | sqm | linear_m


class Envelope(BaseModel):
    """Dimensional hard constraints — a product must fit within these maxima."""

    max_w: float | None = None
    max_d: float | None = None
    max_h: float | None = None
    unit: str = "mm"


class BudgetCeiling(BaseModel):
    amount: float
    currency: str = "USD"
    basis: str = "per_unit"  # per_unit | total


class HardConstraints(BaseModel):
    """Category-specific hard minimums. Extend per leaf; absent = not constrained."""

    min_acoustic_nrc: float | None = None
    fire_rating_min: str | None = None


class StyleIntent(BaseModel):
    text: str | None = None  # "warm matte terracotta, mid-century"
    reference_image: str | None = None
    precomputed_vector: list[float] | None = None


class BOQLine(BaseModel):
    category: str  # taxonomy leaf
    quantity: Quantity
    envelope: Envelope | None = None
    budget_ceiling: BudgetCeiling
    required_certs: list[str] = Field(default_factory=list)  # hard: product must have all
    hard_constraints: HardConstraints = Field(default_factory=HardConstraints)
    style_intent: StyleIntent = Field(default_factory=StyleIntent)
