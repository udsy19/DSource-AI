"""sqlite-vec vector index, attached through apsw.

The stdlib `sqlite3` on this macOS Python is built without loadable-extension support, so
sqlite-vec can't load through it — apsw bundles its own SQLite that can. The index lives in
the SAME database file as the ORM (separate connection); vectors are unit-normalized, so a
cosine distance_metric gives `score = 1 - distance` = cosine similarity.
"""

from __future__ import annotations

import struct
from typing import Protocol

import apsw
import sqlite_vec

from ..config import settings

_TABLE = "product_vectors"


def _sqlite_path() -> str:
    url = settings.database_url
    if url.startswith("sqlite:///"):
        return url[len("sqlite:///"):]
    if url.startswith("sqlite://"):
        return url[len("sqlite://"):] or ":memory:"
    raise ValueError(f"SqliteVecIndex requires a sqlite database_url, got: {url!r}")


class VectorIndex(Protocol):
    def upsert(self, product_id: int, vector: list[float], category: str = "", has_price: bool = False) -> None: ...
    def query(self, vector: list[float], k: int = 5, category: str | None = None) -> list[tuple[int, float]]: ...


class SqliteVecIndex:
    def __init__(self, db_path: str | None = None, dim: int | None = None) -> None:
        self.dim = dim or settings.embed_dim
        self._db = apsw.Connection(db_path or _sqlite_path())
        self._db.enableloadextension(True)
        self._db.loadextension(sqlite_vec.loadable_path())
        self._db.enableloadextension(False)
        self._db.execute(
            f"CREATE VIRTUAL TABLE IF NOT EXISTS {_TABLE} USING vec0("
            f"product_id INTEGER PRIMARY KEY, embedding FLOAT[{self.dim}] distance_metric=cosine, "
            f"category TEXT, has_price INTEGER)"
        )

    def upsert(self, product_id: int, vector: list[float], category: str = "", has_price: bool = False) -> None:
        blob = self._pack(vector)
        self._db.execute(f"DELETE FROM {_TABLE} WHERE product_id = ?", (product_id,))
        self._db.execute(
            f"INSERT INTO {_TABLE}(product_id, embedding, category, has_price) VALUES (?,?,?,?)",
            (product_id, blob, category, int(has_price)),
        )

    def query(self, vector: list[float], k: int = 5, category: str | None = None) -> list[tuple[int, float]]:
        blob = self._pack(vector)
        sql = f"SELECT product_id, distance FROM {_TABLE} WHERE embedding MATCH ? AND k = ?"
        params: list = [blob, k]
        if category:
            sql += " AND category = ?"
            params.append(category)
        rows = self._db.execute(sql + " ORDER BY distance", params).fetchall()
        return [(pid, 1.0 - dist) for pid, dist in rows]

    def count(self) -> int:
        return self._db.execute(f"SELECT count(*) FROM {_TABLE}").fetchone()[0]

    def _pack(self, vector: list[float]) -> bytes:
        if len(vector) != self.dim:
            raise ValueError(f"expected {self.dim}-dim vector, got {len(vector)}")
        return struct.pack(f"{self.dim}f", *vector)
