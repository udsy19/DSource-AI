"""A read-only, transactional session over the live seeded DB for the eval integration test.

The DB is already seeded; we must not mutate it. Each test runs inside an outer transaction rolled
back at teardown, so any incidental write is discarded and the seed rows are restored. Unlike the
matching conftest, we do NOT clear the table — the integration test needs the real seed rows.
"""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from sqlalchemy.orm import Session

from quarry.db import engine


@pytest.fixture
def seeded_session() -> Iterator[Session]:
    connection = engine.connect()
    transaction = connection.begin()
    db = Session(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield db
    finally:
        db.close()
        transaction.rollback()
        connection.close()
