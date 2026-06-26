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

## Ranking is now REAL & MEASURED (2026-06-25, post-V1)

CLIP enabled (open-clip-torch/torch/pillow). Key learning: **text→text CLIP is noise** (grey ranked over green); **text→image is the product** (CLIP's actual strength). `embed_image` now fetches URLs.
- **Chair-leaf expanded:** +44 real Nilkamal chairs (real Shopify photos) as a committed PIM seed (`data/seeds/nilkamal_task_chairs.csv`); resilient backfill (dead URLs → `image_failed`, skip not crash). Catalog = 56 products, 44 with real `image_vec`.
- **Eval re-derived (robust + measures the ranker):** filter cases now use DYNAMIC ground truth (independent per-product constraint re-check over the live catalog) → precision/recall robust at any size; new ranking section (text→image relevant@k + MRR). Measured: filter 1.000/1.000 & 0 violations; **ranking rel@3=1.0, MRR=0.929**.
- **Honest read:** ranker chooses well on **coarse visual intent** (plastic→plastic, "chair for a child"→baby chairs, outdoor→sets at rank 1) but is **weak on fine intra-category attributes** (mesh vs high-back office chairs land rank ~18–27). Cause: plastic-dominated catalog + CLIP clustering on gross form. So Quarry is a product for coarse semantic retrieval; fine discrimination needs richer data (more office chairs w/ photos) and possibly attribute-aware ranking.
- **⚠️ §8 finding (frozen-contract concern, NOT silently changed):** `cosine(style_vec, image_vec OR text_vec)` mixes incomparable scales — a product falling back to `text_vec` scores ~0.84 (CLIP text→text) and BURIES every `image_vec` product (~0.3 text→image). D worked around it in the eval (rank only over image_vec products); `match()` itself still has it. Needs adjudication: e.g. rank within one modality, or normalize per-modality. Flagged to user.
- **acoustic-panel leaf:** still no real-image source → text-only, ranking untestable there.

## V1 COMPLETE — all four agents merged, DoD §12 met (2026-06-25)

Built via 4 parallel subagents (A/B/C in parallel, D after C), integrated by the orchestrator. **60 tests green, mypy strict clean, ruff clean.**
- **A ingestion** (`ingestion/`): `SourceAdapter` + CSV/PIM + BIM adapters; **12 seeds** (6 acoustic panels, 6 task chairs); idempotent upsert on (source, source_ref); `python -m quarry.ingestion`.
- **B embeddings** (`enrichment/`): `StubProvider` (deterministic, stdlib) + `ClipProvider` (open_clip ViT-B/32, 512-d shared text+image space, lazy torch); `backfill_vectors` (idempotent).
- **C matching** (`matching/`+`api/`): hard SQL filter (eliminates: category/dims/budget/certs/nrc/fire — NULL dim passes, NULL nrc/fire eliminated when a floor is set, fire A>B>C) → deterministic weighted rank + full Breakdown; `match()` §8; `POST /match`, `GET /products/{id}`, `/healthz`. **Proven: hard constraints never violated.**
- **D eval** (`eval/`): 14 golden cases (stable source_ref keys); `python -m quarry.eval` → **precision@k = recall@k = 1.000, 0 violations**, fail-loud nonzero exit on any violation.

**DoD run:** docker up → ingest → backfill → /match (both leaves) → eval = 46 candidates, **0 hard-constraint violations**.

## Open / flags
- **Render-seam gap (flagged per §2/§12):** the 6 acoustic wall panels have **no `model_3d`** (seed CSV `model_3d_uri` empty) → `has_geometry=False`; the render stage (5) can't place them. All 6 task chairs carry glTF. Fix = add panel glTF refs to the seed (Agent A).
- **Embeddings ran on the StubProvider** (deterministic, no torch). precision/recall=1.0 comes from the hard FILTER (provider-independent); style ranking with the stub is deterministic-but-not-semantic. Real CLIP = install `open-clip-torch torch pillow` + `register_default_provider("clip")` + re-backfill. **B reported these deps; not yet installed.**
- mypy strict scope = `schema/`+`matching/` only (per spec); other layers run plain ruff+mypy.

## Notes / open

- Old DSource code (`backend/`, `frontend/`, `run.sh`, `PLAN.md`) — to be removed (git history preserves). `data/india/manufacturers.csv` + the harvested catalog (real task-chairs!) could seed Agent A's `ffe/seating/task-chair` leaf — worth reusing.
- `embed_dim` = 512 (pgvector column width, config default); changing it needs a migration.
- mypy strict scoped to `schema/`+`matching/` only (per spec); db/api/alembic are loose.
