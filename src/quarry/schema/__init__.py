"""The frozen schema contract (§7). All sources normalize into these shapes; everything
downstream of ingestion depends on them. Do not change post-Phase-0 without surfacing it.
"""

from .boq import (
    BOQLine,
    BudgetCeiling,
    Envelope,
    HardConstraints,
    Quantity,
    StyleIntent,
)
from .match import DEFAULT_WEIGHTS, Breakdown, Candidate, MatchResponse, Weights
from .product import (
    Attributes,
    CanonicalProduct,
    Dimensions,
    Media,
    Model3D,
    Price,
    Source,
    Sustainability,
    TextureMaps,
    Weight,
)
from .taxonomy import Taxonomy, TaxonomyNode, load_taxonomy

__all__ = [
    "Attributes", "BOQLine", "Breakdown", "BudgetCeiling", "CanonicalProduct", "Candidate",
    "DEFAULT_WEIGHTS", "Dimensions", "Envelope", "HardConstraints", "Media", "Model3D",
    "MatchResponse", "Price", "Quantity", "Source", "StyleIntent", "Sustainability",
    "Taxonomy", "TaxonomyNode", "TextureMaps", "Weight", "Weights", "load_taxonomy",
]
