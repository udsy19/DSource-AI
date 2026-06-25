"""Ingestion — source adapters normalize messy exports into the canonical schema, then upsert.

base.SourceAdapter is the seam; adapters/ hold concrete sources; upsert is idempotent on
(source, source_ref). Nothing downstream of here sees a source-specific shape.
"""

from quarry.ingestion.adapters import BimObjectAdapter, CsvPimAdapter
from quarry.ingestion.base import SourceAdapter, build_text_blob
from quarry.ingestion.upsert import UpsertResult, upsert_products

__all__ = [
    "BimObjectAdapter",
    "CsvPimAdapter",
    "SourceAdapter",
    "UpsertResult",
    "build_text_blob",
    "upsert_products",
]
