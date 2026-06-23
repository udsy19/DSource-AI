import math

from PIL import Image

from app.embeddings.embedder import EcommerceClipEmbedder


def _swatch() -> Image.Image:
    im = Image.new("RGB", (64, 64))
    for y in range(64):
        for x in range(64):
            im.putpixel((x, y), ((x * 4) % 256, (y * 4) % 256, 128))
    return im


def test_image_embedding_is_768_and_unit_norm():
    v = EcommerceClipEmbedder().embed_image(_swatch())
    assert len(v) == 768
    assert abs(math.sqrt(sum(x * x for x in v)) - 1.0) < 1e-3


def test_text_shares_space_and_is_deterministic():
    emb = EcommerceClipEmbedder()
    a = emb.embed_text("brown wooden office chair")
    b = emb.embed_text("brown wooden office chair")
    assert len(a) == 768
    assert max(abs(x - y) for x, y in zip(a, b)) < 1e-5  # same input -> same vector
