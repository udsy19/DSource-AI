"""Embedding seam — the interface Agent C depends on and Agent B implements behind.

§8's match() calls embed_text/embed_image; this module is where those live. The Protocol +
module-level dispatch are a FROZEN seam (like match()'s signature). Agent B registers a concrete
provider via set_provider(); tests register a deterministic stub.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable


@runtime_checkable
class EmbeddingProvider(Protocol):
    dim: int

    def embed_text(self, text: str) -> list[float]: ...

    def embed_image(self, image: object) -> list[float]: ...


_provider: EmbeddingProvider | None = None


def set_provider(provider: EmbeddingProvider) -> None:
    global _provider
    _provider = provider


def get_provider() -> EmbeddingProvider:
    if _provider is None:
        raise RuntimeError("No embedding provider configured — call enrichment.set_provider() first")
    return _provider


def embed_text(text: str) -> list[float]:
    return get_provider().embed_text(text)


def embed_image(image: object) -> list[float]:
    return get_provider().embed_image(image)
