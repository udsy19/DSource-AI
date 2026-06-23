"""Live seed: harvest priced India Shopify brands -> upsert catalog -> embed + index ->
calibrate match thresholds. Run from backend/:  ./.venv/bin/python -m scripts.harvest_seed

This is the only step that touches the network — public /products.json + product images,
throttled and brand-direct (no marketplaces). Demand-first: when a real project lands, swap
SEED_BRANDS for that project's suppliers.
"""

from __future__ import annotations

from app.database import Base, SessionLocal, engine
from app.embeddings.catalog_index import calibrate_bands, index_catalog
from app.harvest.shopify import fetch_shopify
from app.harvest.store import upsert_harvest
from app.models import ensure_catalog_columns

# (manufacturer_code, domain) — priced Shopify-JSON India brands from data/india/manufacturers.csv
SEED_BRANDS = [
    ("NK", "www.nilkamalfurniture.com"),
    ("TB", "trustbasket.com"),
    ("UG", "www.ugaoo.com"),
]


def main(per_brand_pages: int = 1, index_limit: int | None = 120) -> None:
    Base.metadata.create_all(bind=engine)
    ensure_catalog_columns(engine)
    db = SessionLocal()
    try:
        for code, domain in SEED_BRANDS:
            products = fetch_shopify(domain, code, max_pages=per_brand_pages)
            res = upsert_harvest(db, products)
            print(f"[harvest] {domain}: {len(products)} products -> "
                  f"+{res.created} new, {res.updated} updated, {res.no_price} no-price")
        print("[index]", index_catalog(db, limit=index_limit))
        print("[calibrate]", calibrate_bands(db, limit=index_limit))
    finally:
        db.close()


if __name__ == "__main__":
    main()
