from __future__ import annotations

from collections.abc import Iterator

import pytest
from sqlalchemy.orm import Session

from quarry.db import ProductRow, engine
from quarry.enrichment import StubProvider, set_provider


@pytest.fixture
def session() -> Iterator[Session]:
    """Transactional fixture: every test runs in a SAVEPOINT-backed transaction rolled back at
    teardown, so the products table is left untouched (db/ is read-only, owned elsewhere)."""
    connection = engine.connect()
    transaction = connection.begin()
    db = Session(bind=connection, join_transaction_mode="create_savepoint")
    # Start each test from an empty table (the shared DB holds committed seed rows); the outer
    # rollback restores them at teardown.
    db.query(ProductRow).delete()
    db.flush()
    try:
        yield db
    finally:
        db.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def provider() -> StubProvider:
    stub = StubProvider()
    set_provider(stub)
    return stub


def make_product(source_ref: str, *, text_blob: str, image: str | None) -> ProductRow:
    media = {"images": [image]} if image is not None else {}
    return ProductRow(
        source="seed",
        source_ref=source_ref,
        brand="Acme",
        name=f"Product {source_ref}",
        category="ffe/seating/task-chair",
        price_amount=100.0,
        text_blob=text_blob,
        media=media,
    )
