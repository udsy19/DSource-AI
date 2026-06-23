"""marqo-ecommerce-B image+text embeddings via open_clip.

Heavy deps (torch / open_clip) load lazily on first embed so unrelated code paths don't pay
for them. Embed at catalog-ingest time in batches; never per-request in a hot loop. Vectors
are unit-normalized so cosine == dot product downstream.
"""

from __future__ import annotations

import threading

from ..config import settings

_load_lock = threading.Lock()


class EcommerceClipEmbedder:
    def __init__(self, model_name: str | None = None) -> None:
        self.model_name = model_name or settings.embed_model
        self._model = None
        self._preprocess = None
        self._tokenizer = None
        self._torch = None

    def embed_image(self, image) -> list[float]:
        return self.embed_images([image])[0]

    def embed_images(self, images: list) -> list[list[float]]:
        self._ensure_loaded()
        from PIL import Image

        torch = self._torch
        pil = [img if hasattr(img, "mode") else Image.open(img).convert("RGB") for img in images]
        batch = torch.stack([self._preprocess(p.convert("RGB")) for p in pil])
        with torch.no_grad():
            feats = self._model.encode_image(batch)
            feats = feats / feats.norm(dim=-1, keepdim=True)
        return [f.tolist() for f in feats]

    def embed_text(self, text: str) -> list[float]:
        self._ensure_loaded()
        torch = self._torch
        with torch.no_grad():
            feats = self._model.encode_text(self._tokenizer([text]))
            feats = feats / feats.norm(dim=-1, keepdim=True)
        return feats[0].tolist()

    def _ensure_loaded(self) -> None:
        if self._model is not None:
            return
        with _load_lock:
            if self._model is not None:
                return
            import open_clip
            import torch

            model, preprocess = open_clip.create_model_from_pretrained(self.model_name)
            model.eval()
            self._torch = torch
            self._model = model
            self._preprocess = preprocess
            self._tokenizer = open_clip.get_tokenizer(self.model_name)
