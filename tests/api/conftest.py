"""API fixtures: a TestClient whose DB dependency is bound to a rolled-back transaction, so
HTTP tests insert rows that never persist and stay isolated."""

from __future__ import annotations

from collections.abc import Iterator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from quarry.api.app import app
from quarry.db import Base, ProductRow, engine, get_session


@pytest.fixture(scope="session", autouse=True)
def _schema() -> None:
    Base.metadata.create_all(engine)


@pytest.fixture
def session() -> Iterator[Session]:
    connection = engine.connect()
    transaction = connection.begin()
    db = Session(bind=connection, join_transaction_mode="create_savepoint")
    db.query(ProductRow).delete()
    db.flush()
    try:
        yield db
    finally:
        db.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(session: Session) -> Iterator[TestClient]:
    app.dependency_overrides[get_session] = lambda: session
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def insert_product(session: Session, **overrides: object) -> ProductRow:
    defaults: dict[str, object] = {
        "id": uuid4(),
        "source": "seed",
        "source_ref": f"seed:{uuid4()}",
        "brand": "Acme",
        "name": "Task Chair X",
        "category": "ffe/seating/task-chair",
        "dim_w": 600.0,
        "dim_d": 600.0,
        "dim_h": 1100.0,
        "price_amount": 400.0,
        "lead_time_days": 30,
        "certifications": ["GREENGUARD"],
        "has_epd": True,
        "model_3d_format": "gltf",
        "model_3d_uri": "s3://assets/chair.gltf",
    }
    defaults.update(overrides)
    product = ProductRow(**defaults)
    session.add(product)
    session.flush()
    return product
