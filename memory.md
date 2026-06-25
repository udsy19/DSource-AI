# Quarry — Memory (living state)

Single source of truth for *current* state. Companion to `CLAUDE.md` (the frozen contract) and `ROADMAP.md` (the plan).

_Last updated: 2026-06-25._

## Pivot

**2026-06-25: full pivot DSource Studio → Quarry.** The user replaced `CLAUDE.md` with the Quarry spec and chose: **full replace** (Quarry is the product now, DSource Studio shelved), **adopt Quarry's stack**, **keep all existing `.claude/rules`**. The prior DSource Studio app (CAD→3D→material-swap→INR sourcing, ~8k LoC) lives only in git history now.

## What Quarry is

A **digital product library / resolver** — `match(BOQLine) -> ranked real products` — stage 4 of an interior fit-out pipeline (test-fit → CAD → BOQ → **Quarry** → render → procurement). API-first, not a search site. V1 = two taxonomy leaves deep (`finishes/acoustic/wall-panel`, `ffe/seating/task-chair`). Hard SQL filter **then** deterministic soft rank; every match returns an auditable breakdown; LLM/embeddings only turn fuzzy intent into a query vector, never invent products/prices/scores.

## Locked decisions

- **Stack:** Python 3.12 + `uv`; FastAPI; **Postgres 16 + pgvector**; SQLAlchemy 2 + Alembic; Pydantic v2; docker-compose. Embeddings pluggable (open_clip + sentence-transformer default).
- **Rules:** all `.claude/rules/` apply (no-bloat, code-style, testing, **git-workflow incl. NO AI attribution**, frontend-style). Quarry §11 conventions add on top.
- **File ownership** (post-Phase-0): A=ingestion, B=enrichment, C=matching+api, D=eval. Agents edit only their dir; `schema/`+`db/`+`taxonomy.yaml` are frozen.

## Status — Phase 0 ✅ DONE

- `src/quarry/schema/` (Pydantic contract), `data/taxonomy.yaml`, `src/quarry/db/` (`ProductRow` + pgvector), `alembic/` baseline, `docker-compose.yml`, stub `match()` + `/match`(501) + `/healthz`.
- **Verified:** Postgres healthy on host **5433**; `alembic upgrade head` created the products table + vector extension; `pytest tests/` = 5 green; `mypy` strict clean (schema+matching); `/match` returns 501, `/healthz` ok.
- **FROZEN:** schema, db, taxonomy. Changes go via `NOTES.md`, not silent edits.

## How to run

```
docker compose up -d                     # Postgres 16 + pgvector on :5433
uv sync                                  # venv + deps (Python 3.12)
uv run alembic upgrade head              # apply migration
uv run pytest tests/ -q                  # contract tests
uv run mypy                              # strict on schema + matching
uv run uvicorn quarry.api:app --reload   # serve /healthz, /match (501 until Agent C)
```
DB URL: `postgresql+psycopg://quarry:quarry@localhost:5433/quarry` (config default; override via `DATABASE_URL`).

## Next (parallelizable after Phase 0)

- **Agent A** ingestion: `SourceAdapter` ABC + CSV/PIM + BIM adapters + 5–10 seeds/leaf, idempotent upsert.
- **Agent B** embeddings: `EmbeddingProvider` + backfill text_vec/image_vec.
- **Agent C** matching+api: real hard filter → rank → `/match` with breakdowns.
- **Agent D** eval: golden BOQ set + precision@k + zero hard-constraint violations (after C).

## Notes / open

- Old DSource code (`backend/`, `frontend/`, `run.sh`, `PLAN.md`) — to be removed (git history preserves). `data/india/manufacturers.csv` + the harvested catalog (real task-chairs!) could seed Agent A's `ffe/seating/task-chair` leaf — worth reusing.
- `embed_dim` = 512 (pgvector column width, config default); changing it needs a migration.
- mypy strict scoped to `schema/`+`matching/` only (per spec); db/api/alembic are loose.
