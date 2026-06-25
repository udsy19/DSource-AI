from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from quarry.db import ProductRow
from quarry.ingestion.run import SEEDS_DIR, _adapter_for
from quarry.ingestion.upsert import upsert_products
from quarry.schema import CanonicalProduct


def _seed_products() -> list[CanonicalProduct]:
    products: list[CanonicalProduct] = []
    for path in sorted(SEEDS_DIR.iterdir()):
        if path.suffix in {".csv", ".json"}:
            products.extend(_adapter_for(path).load())
    return products


def _with_unique_refs(products: list[CanonicalProduct]) -> list[CanonicalProduct]:
    # The shared DB may already hold the real seed rows (the CLI populates it); give this test its
    # own keyspace so create/update counts are deterministic regardless of what else is present.
    salt = uuid.uuid4().hex[:8]
    return [p.model_copy(update={"source_ref": f"{salt}:{p.source_ref}"}) for p in products]


def test_upsert_is_idempotent(session: Session) -> None:
    products = _with_unique_refs(_seed_products())

    first = upsert_products(session, products)
    count_after_first = session.scalar(select(func.count()).select_from(ProductRow))

    second = upsert_products(session, products)
    count_after_second = session.scalar(select(func.count()).select_from(ProductRow))

    assert first.created == len(products)
    assert first.updated == 0
    assert second.created == 0
    assert second.updated == len(products)
    assert count_after_second == count_after_first


def test_upsert_maps_hard_filter_columns(session: Session) -> None:
    products = _with_unique_refs(_seed_products())
    upsert_products(session, products)
    refs = [p.source_ref for p in products]

    panel = session.scalar(
        select(ProductRow).where(
            ProductRow.source_ref.in_(refs),
            ProductRow.category == "finishes/acoustic/wall-panel",
        )
    )
    assert panel is not None
    assert panel.acoustic_nrc is not None
    assert panel.fire_rating is not None
    assert panel.price_unit == "sqm"
    assert "colors" in panel.attributes

    chair = session.scalar(
        select(ProductRow).where(
            ProductRow.source_ref.in_(refs),
            ProductRow.model_3d_format == "gltf",
        )
    )
    assert chair is not None
    assert chair.model_3d_uri is not None
    assert chair.category == "ffe/seating/task-chair"
