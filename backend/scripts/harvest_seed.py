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

# (manufacturer_code, domain) — verified priced Shopify-JSON India brands across categories so
# the Floor/Wall/Furniture material swatches all resolve to real SKUs (see data/india).
SEED_BRANDS = [
    ("NK", "www.nilkamalfurniture.com"),  # furniture
    ("TB", "trustbasket.com"),            # planters
    ("UG", "www.ugaoo.com"),              # plants
    ("IK", "www.imperialknots.com"),      # rugs / carpets -> Floor
    ("OBT", "obeetee.in"),                # rugs / carpets -> Floor
    ("GW", "www.giffywalls.in"),          # wallpaper -> Walls
    ("OOR", "www.oorjaa.in"),             # decorative lighting
]


def main(per_brand_pages: int = 1, per_brand_index: int = 45, recalibrate: bool = False) -> None:
    Base.metadata.create_all(bind=engine)
    ensure_catalog_columns(engine)
    db = SessionLocal()
    try:
        for code, domain in SEED_BRANDS:
            try:  # one flaky brand (DNS/WAF/rate-limit) must not abort the whole seed
                products = fetch_shopify(domain, code, max_pages=per_brand_pages)
                res = upsert_harvest(db, products)
                idx = index_catalog(db, manufacturer_code=code, limit=per_brand_index)
                print(f"[seed] {domain}: +{res.created} new / {res.updated} updated "
                      f"({res.no_price} no-price) -> indexed {idx['indexed']}")
            except Exception as exc:
                print(f"[seed] {domain}: FAILED ({type(exc).__name__}: {exc}) — skipped")
        if recalibrate:
            print("[calibrate]", calibrate_bands(db, limit=200))
    finally:
        db.close()


if __name__ == "__main__":
    main()
