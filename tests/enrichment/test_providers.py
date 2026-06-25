from __future__ import annotations

import math

import pytest

from quarry.enrichment import (
    StubProvider,
    default_provider,
    embed_image,
    embed_text,
    get_provider,
    set_provider,
)


def _is_unit(vec: list[float]) -> bool:
    return math.isclose(math.sqrt(sum(c * c for c in vec)), 1.0, rel_tol=1e-9, abs_tol=1e-9)


def test_embed_text_shape_and_invariants() -> None:
    vec = StubProvider().embed_text("warm matte terracotta")
    assert len(vec) == 512
    assert all(math.isfinite(c) for c in vec)
    assert _is_unit(vec)


def test_embed_image_shape_and_invariants() -> None:
    vec = StubProvider().embed_image("https://example.com/chair.jpg")
    assert len(vec) == 512
    assert all(math.isfinite(c) for c in vec)
    assert _is_unit(vec)


def test_embed_image_accepts_bytes_and_path() -> None:
    provider = StubProvider()
    assert provider.embed_image(b"\x00\x01\x02") == provider.embed_image(b"\x00\x01\x02")
    assert len(provider.embed_image("/tmp/x.png")) == 512


def test_text_is_deterministic() -> None:
    provider = StubProvider()
    assert provider.embed_text("mid-century") == provider.embed_text("mid-century")


def test_distinct_text_inputs_diverge() -> None:
    provider = StubProvider()
    assert provider.embed_text("terracotta") != provider.embed_text("cobalt")


def test_text_and_image_namespaced_apart() -> None:
    provider = StubProvider()
    assert provider.embed_text("chair") != provider.embed_image("chair")


def test_set_get_provider_roundtrip() -> None:
    stub = StubProvider()
    set_provider(stub)
    assert get_provider() is stub


def test_module_functions_dispatch_to_set_provider() -> None:
    stub = StubProvider()
    set_provider(stub)
    assert embed_text("warm") == stub.embed_text("warm")
    assert embed_image("ref.png") == stub.embed_image("ref.png")


def test_default_provider_factory() -> None:
    assert isinstance(default_provider(), StubProvider)
    assert isinstance(default_provider("stub"), StubProvider)
    with pytest.raises(ValueError, match="Unknown embedding provider"):
        default_provider("nope")


def test_cosine_self_is_nearest_neighbour() -> None:
    provider = StubProvider()
    corpus = {label: provider.embed_text(label) for label in ("oak", "felt", "steel", "linen")}

    def cosine(a: list[float], b: list[float]) -> float:
        return sum(x * y for x, y in zip(a, b, strict=True))

    for label, vec in corpus.items():
        nearest = max(corpus, key=lambda other: cosine(vec, corpus[other]))
        assert nearest == label
