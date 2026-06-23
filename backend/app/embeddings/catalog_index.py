"""Embed catalog product images into the vector index + shared embedder/index singletons +
threshold calibration. Downloading product images is the only network step; embedding,
indexing, and calibration are local.

Calibration self-labels from the catalog (no hand-labeled set): products with >=2 images give
same-product positives (embed image #2, score against the indexed image #1); cross-category
hits give negatives. Thresholds come from those distributions, never from literature numbers.
"""

from __future__ import annotations

import io
import statistics

from curl_cffi import requests
from PIL import Image
from sqlalchemy.orm import Session

from ..models import Product
from .embedder import EcommerceClipEmbedder
from .index import SqliteVecIndex

_embedder: EcommerceClipEmbedder | None = None
_index: SqliteVecIndex | None = None


def get_embedder() -> EcommerceClipEmbedder:
    global _embedder
    if _embedder is None:
        _embedder = EcommerceClipEmbedder()
    return _embedder


def get_index() -> SqliteVecIndex:
    global _index
    if _index is None:
        _index = SqliteVecIndex()
    return _index


def _fetch_image(url: str) -> Image.Image | None:
    # Network boundary: a 404 / timeout / non-image is expected for some catalog URLs — we
    # skip and count it rather than fail the whole ingest, and never fabricate the image.
    try:
        resp = requests.get(url, impersonate="chrome131", timeout=30)
        resp.raise_for_status()
        return Image.open(io.BytesIO(resp.content)).convert("RGB")
    except Exception:
        return None


def index_catalog(
    db: Session, embedder: EcommerceClipEmbedder | None = None,
    index: SqliteVecIndex | None = None, source: str = "harvest", limit: int | None = None,
) -> dict:
    embedder = embedder or get_embedder()
    index = index or get_index()
    query = db.query(Product).filter(Product.source == source, Product.image_url.isnot(None))
    products = query.limit(limit).all() if limit else query.all()
    indexed = skipped = 0
    for p in products:
        img = _fetch_image(p.image_url)
        if img is None:
            skipped += 1
            continue
        vector = embedder.embed_image(img)
        index.upsert(p.id, vector, category=p.category, has_price=p.price_inr is not None)
        indexed += 1
    return {"total": len(products), "indexed": indexed, "skipped": skipped}


def calibrate_bands(
    db: Session, embedder: EcommerceClipEmbedder | None = None,
    index: SqliteVecIndex | None = None, source: str = "harvest", limit: int | None = None,
) -> dict:
    embedder = embedder or get_embedder()
    index = index or get_index()
    positives: list[float] = []  # same product, different photo
    negatives: list[float] = []  # best cross-category score (should be low)
    # Same query+order as index_catalog so we only calibrate over the slice that was indexed.
    query = db.query(Product).filter(Product.source == source, Product.image_url.isnot(None))
    for p in (query.limit(limit).all() if limit else query.all()):
        images = (p.provenance or {}).get("image_urls", [])
        if len(images) < 2:
            continue
        second = _fetch_image(images[1])
        if second is None:
            continue
        hits = index.query(embedder.embed_images([second])[0], k=10)
        self_score = next((s for pid, s in hits if pid == p.id), None)
        if self_score is not None:
            positives.append(self_score)
        cross = [s for pid, s in hits if pid != p.id and _category(db, pid) != p.category]
        if cross:
            negatives.append(max(cross))

    recommended: dict[str, float] = {}
    if positives:
        recommended["exact"] = round(_low_percentile(positives), 4)
    if negatives:
        recommended["close"] = round(_high_percentile(negatives), 4)
    return {
        "positives": len(positives), "negatives": len(negatives),
        "pos_min": round(min(positives), 4) if positives else None,
        "neg_max": round(max(negatives), 4) if negatives else None,
        "recommended": recommended,
    }


def _category(db: Session, product_id: int) -> str:
    p = db.get(Product, product_id)
    return p.category if p else ""


def _low_percentile(values: list[float]) -> float:
    """~10th percentile (exact floor): most true matches score above this."""
    if len(values) < 10:
        return min(values)
    return statistics.quantiles(sorted(values), n=10)[0]


def _high_percentile(values: list[float]) -> float:
    """~90th percentile (no-match ceiling): most wrong matches score below this."""
    if len(values) < 10:
        return max(values)
    return statistics.quantiles(sorted(values), n=10)[8]
