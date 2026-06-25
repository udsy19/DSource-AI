"""Enrichment — embedding providers + vector backfill. [AGENT B]

The EmbeddingProvider Protocol and the module-level embed_text/embed_image/set_provider in
provider.py are a FROZEN seam (Agent C calls them). Implement concrete providers behind this
interface; you may add modules here, but keep this public API stable.
"""

from .backfill import backfill_vectors
from .provider import (
    EmbeddingProvider,
    embed_image,
    embed_text,
    get_provider,
    set_provider,
)
from .providers import (
    ClipProvider,
    StubProvider,
    default_provider,
    register_default_provider,
)

__all__ = [
    "ClipProvider",
    "EmbeddingProvider",
    "StubProvider",
    "backfill_vectors",
    "default_provider",
    "embed_image",
    "embed_text",
    "get_provider",
    "register_default_provider",
    "set_provider",
]
