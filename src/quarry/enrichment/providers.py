"""Concrete embedding providers behind the frozen EmbeddingProvider seam (provider.py).

Both modalities share one 512-d space (NOTES.md 2026-06-25 adjudication): text via the CLIP
text encoder, image via the CLIP image encoder. StubProvider mirrors that contract deterministically
with pure stdlib so tests run without torch.
"""

from __future__ import annotations

import hashlib
import math
import struct
from pathlib import Path
from typing import TYPE_CHECKING

from .provider import EmbeddingProvider, set_provider

if TYPE_CHECKING:
    from PIL.Image import Image  # type: ignore[import-not-found]

_DIM = 512


def _l2_normalize(vec: list[float]) -> list[float]:
    norm = math.sqrt(sum(component * component for component in vec))
    if norm == 0.0:
        raise ValueError("Cannot normalize a zero vector")
    return [component / norm for component in vec]


def _image_to_bytes(image: object) -> bytes:
    """Resolve the StubProvider's three accepted image inputs to stable bytes to hash."""
    if isinstance(image, bytes):
        return image
    if isinstance(image, (str, Path)):
        return str(image).encode("utf-8")
    save = getattr(image, "tobytes", None)
    if callable(save):
        return bytes(save())
    raise TypeError(f"Unsupported image input for embedding: {type(image)!r}")


class StubProvider:
    """Deterministic, dependency-free provider for tests and offline fixtures.

    Derives a 512-d unit vector from a reproducible byte stream seeded by sha256(input). Same input
    yields an identical vector; distinct inputs diverge. NOT a semantic embedding — only the seam's
    shape and invariants (length, finiteness, L2-unit, determinism) are honoured.
    """

    dim = _DIM

    def _vector_from_seed(self, seed: bytes) -> list[float]:
        stream = bytearray()
        counter = 0
        # Each sha256 block yields 8 float32 values (32 bytes); 512 dims need 64 blocks.
        while len(stream) < _DIM * 4:
            stream.extend(hashlib.sha256(seed + struct.pack(">I", counter)).digest())
            counter += 1
        raw = struct.unpack(f">{_DIM}I", bytes(stream[: _DIM * 4]))
        vec = [(value / 0xFFFFFFFF) * 2.0 - 1.0 for value in raw]
        return _l2_normalize(vec)

    def embed_text(self, text: str) -> list[float]:
        return self._vector_from_seed(b"text:" + text.encode("utf-8"))

    def embed_image(self, image: object) -> list[float]:
        return self._vector_from_seed(b"image:" + _image_to_bytes(image))


class ClipProvider:
    """open_clip ViT-B/32 — text and image encoders in one 512-d L2-normalized space.

    torch/open_clip/PIL are lazy-imported so this module loads without them; only constructing a
    ClipProvider (or calling its methods) requires the heavy deps.
    """

    dim = _DIM

    def __init__(self, model_name: str = "ViT-B-32", pretrained: str = "openai") -> None:
        import open_clip  # type: ignore[import-not-found]  # noqa: PLC0415
        import torch  # type: ignore[import-not-found]  # noqa: PLC0415

        self._torch = torch
        self._model, _, self._preprocess = open_clip.create_model_and_transforms(
            model_name, pretrained=pretrained
        )
        self._model.eval()
        self._tokenizer = open_clip.get_tokenizer(model_name)

    def _open_image(self, image: object) -> Image:
        from io import BytesIO  # noqa: PLC0415

        from PIL import Image as PILImage  # type: ignore[import-not-found]  # noqa: PLC0415

        if isinstance(image, bytes):
            return PILImage.open(BytesIO(image)).convert("RGB")
        if isinstance(image, str) and image.startswith(("http://", "https://")):
            import httpx  # noqa: PLC0415

            resp = httpx.get(image, timeout=30, follow_redirects=True)
            resp.raise_for_status()
            return PILImage.open(BytesIO(resp.content)).convert("RGB")
        if isinstance(image, (str, Path)):
            return PILImage.open(image).convert("RGB")
        return image.convert("RGB")  # type: ignore[attr-defined]

    def embed_text(self, text: str) -> list[float]:
        tokens = self._tokenizer([text])
        with self._torch.no_grad():
            features = self._model.encode_text(tokens)
            features = features / features.norm(dim=-1, keepdim=True)
        vec: list[float] = features[0].tolist()
        return vec

    def embed_image(self, image: object) -> list[float]:
        tensor = self._preprocess(self._open_image(image)).unsqueeze(0)
        with self._torch.no_grad():
            features = self._model.encode_image(tensor)
            features = features / features.norm(dim=-1, keepdim=True)
        vec: list[float] = features[0].tolist()
        return vec


def default_provider(name: str | None = None) -> EmbeddingProvider:
    choice = (name or "stub").lower()
    if choice == "stub":
        return StubProvider()
    if choice == "clip":
        return ClipProvider()
    raise ValueError(f"Unknown embedding provider {name!r} (expected 'stub' or 'clip')")


def register_default_provider(name: str | None = None) -> EmbeddingProvider:
    provider = default_provider(name)
    set_provider(provider)
    return provider
