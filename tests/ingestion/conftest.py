"""Transactional-rollback DB fixture so ingestion tests never pollute the shared Postgres.

Open one connection, begin an outer transaction, bind a Session to it, yield, then ROLLBACK —
nothing the test wrote survives, and concurrent agents on the same DB are unaffected.
"""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from sqlalchemy.orm import Session

from quarry.db import engine


@pytest.fixture
def session() -> Iterator[Session]:
    connection = engine.connect()
    transaction = connection.begin()
    db = Session(bind=connection)
    try:
        yield db
    finally:
        db.close()
        transaction.rollback()
        connection.close()
