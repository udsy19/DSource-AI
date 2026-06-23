import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.harvest.shopify import parse_products_json
from app.harvest.store import upsert_harvest
from app.models import Product


@pytest.fixture
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    s = sessionmaker(bind=engine)()
    try:
        yield s
    finally:
        s.close()


PAYLOAD = {
    "products": [
        {"title": "Aria Office Chair", "handle": "aria", "product_type": "Office Chair",
         "vendor": "Nilkamal", "tags": ["Material_Mesh"],
         "images": [{"src": "https://cdn/aria-1.jpg"}, {"src": "https://cdn/aria-2.jpg"}],
         "variants": [{"sku": "NK-ARIA-01", "price": "8499.00", "available": True}]},
        {"title": "Pro Monitor Arm", "handle": "pro-arm", "product_type": "Accessory",
         "vendor": "Rife", "tags": [], "images": [{"src": "https://cdn/arm.jpg"}],
         "variants": [{"sku": None, "price": "0.00", "available": False}]},
    ]
}


def test_upsert_creates_catalog_rows_with_inr_and_provenance(db):
    products = parse_products_json(PAYLOAD, "NK", base_url="https://shop.test")
    result = upsert_harvest(db, products)
    assert result.created == 2
    assert result.no_price == 1  # the 0.00 B2B arm

    chair = db.query(Product).filter_by(sku="NK-ARIA-01").one()
    assert chair.source == "harvest"
    assert chair.price_inr == 8499.0
    assert chair.image_url == "https://cdn/aria-1.jpg"
    assert chair.provenance["image_urls"] == ["https://cdn/aria-1.jpg", "https://cdn/aria-2.jpg"]
    assert chair.provenance["material_attrs"] == {"primary_material": "Mesh"}


def test_zero_price_row_persists_none_not_zero(db):
    products = parse_products_json(PAYLOAD, "RF", base_url="https://shop.test")
    upsert_harvest(db, products)
    arm = db.query(Product).filter_by(sku="pro-arm").one()  # sku fell back to handle
    assert arm.price_inr is None
    assert "price_inr" in arm.provenance["flagged_fields"]


def test_reharvest_updates_not_duplicates(db):
    products = parse_products_json(PAYLOAD, "NK", base_url="https://shop.test")
    upsert_harvest(db, products)
    second = upsert_harvest(db, products)
    assert second.created == 0 and second.updated == 2
    assert db.query(Product).count() == 2
