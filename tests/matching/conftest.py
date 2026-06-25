"""Transactional-rollback Postgres fixtures + a deterministic embedding stub for matching tests.

Each test runs inside an outer transaction that is rolled back at teardown, so inserted
ProductRows never persist and tests stay isolated and order-independent. ``match()`` is handed
this same session so it sees the uncommitted rows.
"""

from __future__ import annotations

from collections.abc import Iterator
from uuid import uuid4

import pytest
from sqlalchemy.orm import Session

from quarry.config import settings
from quarry.db import Base, ProductRow, engine


class StubProvider:
    """Deterministic embeddings: a vector is a fixed direction scaled by a per-key magnitude, so
    cosine similarity between any two keys is reproducible without torch or network."""

    dim = settings.embed_dim

    def __init__(self, vectors: dict[str, list[float]]) -> None:
        self._vectors = vectors

    def _lookup(self, key: str) -> list[float]:
        return self._vectors.get(key, [0.0] * self.dim)

    def embed_text(self, text: str) -> list[float]:
        return self._lookup(text)

    def embed_image(self, image: object) -> list[float]:
        return self._lookup(str(image))


def axis_vector(index: int, magnitude: float = 1.0) -> list[float]:
    vec = [0.0] * settings.embed_dim
    vec[index % settings.embed_dim] = magnitude
    return vec


@pytest.fixture(scope="session", autouse=True)
def _schema() -> None:
    Base.metadata.create_all(engine)


@pytest.fixture
def session() -> Iterator[Session]:
    connection = engine.connect()
    transaction = connection.begin()
    db = Session(bind=connection, join_transaction_mode="create_savepoint")
    # Clear committed seed data inside the transaction so each test starts on an isolated,
    # empty table; the outer rollback restores every seed row at teardown.
    db.query(ProductRow).delete()
    db.flush()
    try:
        yield db
    finally:
        db.close()
        transaction.rollback()
        connection.close()


def insert_product(session: Session, **overrides: object) -> ProductRow:
    """Insert a fully-valid task-chair ProductRow; override any field to craft a constraint case."""
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
        "price_unit": "each",
        "acoustic_nrc": None,
        "fire_rating": None,
        "lead_time_days": 30,
        "certifications": [],
        "has_epd": False,
        "embodied_carbon": None,
        "model_3d_uri": None,
        "text_vec": None,
        "image_vec": None,
    }
    defaults.update(overrides)
    product = ProductRow(**defaults)
    session.add(product)
    session.flush()
    return product
