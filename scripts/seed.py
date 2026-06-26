"""Seed the Quarry catalog: ingest all seed files + backfill embeddings with CLIP.

Idempotent — ingestion upserts on (source, source_ref); backfill only fills NULL vectors and
skips dead image URLs. Safe to re-run. Called by run.sh on an empty catalog (first run).
"""

from __future__ import annotations

from quarry.db import ProductRow, SessionLocal
from quarry.enrichment import backfill_vectors, register_default_provider
from quarry.ingestion.run import main as ingest


def main() -> None:
    ingest()
    register_default_provider("clip")
    db = SessionLocal()
    try:
        print(f"[seed] catalog: {db.query(ProductRow).count()} products")
        print(f"[seed] backfill: {backfill_vectors(db)}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
