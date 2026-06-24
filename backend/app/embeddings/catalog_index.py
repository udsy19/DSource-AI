"""Embed catalog product images into the vector index + shared embedder/index singletons +
threshold calibration. Downloading product images is the only network step; embedding,
indexing, and calibration are local.

Calibration self-labels from the catalog (no hand-labeled set): products with >=2 images give
same-product positives (embed image #2, score against the indexed image #1); cross-category
hits give negatives. Thresholds come from those distributions, never from literature numbers.
"""

from __future__ import annotations

import io

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
    manufacturer_code: str | None = None,
) -> dict:
    embedder = embedder or get_embedder()
    index = index or get_index()
    query = db.query(Product).filter(Product.source == source, Product.image_url.isnot(None))
    if manufacturer_code:
        query = query.filter(Product.manufacturer_code == manufacturer_code)
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
    """Self-labelled, modality-aware band calibration over the indexed slice.

    Positives = the same product retrieved by another of its signals (its title for text,
    its 2nd photo for image); negatives = the best cross-category hit. Text and image are
    calibrated separately because of the CLIP modality gap.
    """
    embedder = embedder or get_embedder()
    index = index or get_index()
    query = db.query(Product).filter(Product.source == source, Product.image_url.isnot(None))
    products = query.limit(limit).all() if limit else query.all()

    text_pos: list[float] = []
    text_neg: list[float] = []
    img_pos: list[float] = []
    img_neg: list[float] = []
    for p in products:
        _collect(db, p, index.query(embedder.embed_text(p.name), k=10), text_pos, text_neg)
        images = (p.provenance or {}).get("image_urls", [])
        if len(images) >= 2:
            second = _fetch_image(images[1])
            if second is not None:
                _collect(db, p, index.query(embedder.embed_images([second])[0], k=10), img_pos, img_neg)

    return {"text": _separation(text_pos, text_neg), "image": _separation(img_pos, img_neg)}


def _collect(db: Session, p: Product, hits: list[tuple[int, float]],
             positives: list[float], negatives: list[float]) -> None:
    self_score = next((s for pid, s in hits if pid == p.id), None)
    if self_score is not None:
        positives.append(self_score)
    cross = [s for pid, s in hits if pid != p.id and _category(db, pid) != p.category]
    if cross:
        negatives.append(max(cross))


def _category(db: Session, product_id: int) -> str:
    p = db.get(Product, product_id)
    return p.category if p else ""


def _separation(positives: list[float], negatives: list[float]) -> dict:
    """Threshold that maximizes balanced accuracy between true matches and wrong matches,
    with the achieved TPR/TNR so the bands are honest, not assumed."""
    if not positives or not negatives:
        return {"n_pos": len(positives), "n_neg": len(negatives)}
    best_close, best_ba, best_rates = 0.0, -1.0, (0.0, 0.0)
    for t in sorted(set(positives) | set(negatives)):
        tpr = sum(x >= t for x in positives) / len(positives)
        tnr = sum(x < t for x in negatives) / len(negatives)
        ba = (tpr + tnr) / 2
        if ba > best_ba:
            best_ba, best_close, best_rates = ba, t, (tpr, tnr)
    exact_floor = sorted(positives)[int(len(positives) * 0.6)]  # 60th pct of true matches
    return {
        "n_pos": len(positives), "n_neg": len(negatives),
        "close": round(best_close, 4), "exact": round(max(best_close, exact_floor), 4),
        "balanced_accuracy": round(best_ba, 3),
        "tpr_at_close": round(best_rates[0], 3), "tnr_at_close": round(best_rates[1], 3),
    }
