"""Ingest every seed file through its adapter and upsert into Postgres.

Run: `uv run python -m quarry.ingestion`. Seeds live in data/seeds/: *.csv via CsvPimAdapter,
*.json via BimObjectAdapter. Each file's products are upserted in one transaction.
"""

from __future__ import annotations

from pathlib import Path

from quarry.db import SessionLocal
from quarry.ingestion.adapters import BimObjectAdapter, CsvPimAdapter
from quarry.ingestion.base import SourceAdapter
from quarry.ingestion.upsert import UpsertResult, upsert_products

SEEDS_DIR = Path(__file__).resolve().parents[3] / "data" / "seeds"


def _adapter_for(path: Path) -> SourceAdapter:
    if path.suffix == ".csv":
        return CsvPimAdapter(path)
    if path.suffix == ".json":
        return BimObjectAdapter(path)
    raise ValueError(f"no adapter for {path.name}")


def ingest_seeds(seeds_dir: Path = SEEDS_DIR) -> UpsertResult:
    total = UpsertResult()
    with SessionLocal() as session:
        for path in sorted(seeds_dir.iterdir()):
            if path.suffix not in {".csv", ".json"}:
                continue
            products = _adapter_for(path).load()
            result = upsert_products(session, products)
            total.created += result.created
            total.updated += result.updated
            print(f"{path.name}: created={result.created} updated={result.updated}")
        session.commit()
    return total


def main() -> None:
    total = ingest_seeds()
    print(f"total: created={total.created} updated={total.updated}")


if __name__ == "__main__":
    main()
