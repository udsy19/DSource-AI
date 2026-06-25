# Quarry — Build Roadmap

Companion to `CLAUDE.md` (the contract) and `memory.md` (live state). Quarry is **stage 4** of an interior fit-out pipeline: `match(BOQLine) -> ranked real products`. V1 proves the full loop on **two taxonomy leaves** (`finishes/acoustic/wall-panel`, `ffe/seating/task-chair`) — depth over breadth.

Across every phase: tests live beside the code; mypy stays clean on `schema/` + `matching/`; the existing `.claude/rules/` (no-bloat, code-style, testing, git-workflow incl. **no AI attribution**, frontend-style) all apply.

---

## Phase 0 — Foundation ✅ DONE (single-threaded, blocking)
The frozen contract everything builds against.
- ✅ `src/quarry/schema/` — Pydantic: `CanonicalProduct`, `BOQLine`, `MatchResponse`, taxonomy.
- ✅ `data/taxonomy.yaml` — category tree, two v1 leaves deep.
- ✅ `src/quarry/db/` — SQLAlchemy `ProductRow` mirroring the schema (hard-filter columns + JSONB + pgvector); `alembic/` baseline migration (extension + table).
- ✅ `docker-compose.yml` — Postgres 16 + pgvector (host port 5433).
- ✅ Stub `match()` + `POST /match` (501) + `GET /healthz` — shared interface.
- **DoD met:** `docker compose up` → `alembic upgrade head` applies → `pytest tests/test_schema.py` (5) → mypy strict clean.

**The schema, db, and `data/taxonomy.yaml` are now FROZEN.** A change invalidates other agents' work — surface it in `NOTES.md`, don't edit silently.

After Phase 0, fan out. Each agent owns a directory and reads (never edits) the frozen `schema/`.

## Agent A — Ingestion (owns `ingestion/**`, `data/seeds/**`)
- `base.py`: `SourceAdapter` ABC — `fetch() -> raw`, `normalize(raw) -> CanonicalProduct`.
- Two adapters: a CSV/PIM adapter + a BIM-library-style (structured JSON) adapter.
- Hand-curate **5–10 seed products per v1 leaf**, fully populated (incl. a `model_3d` ref where possible).
- Idempotent upsert into Postgres keyed on `(source, source_ref)`.
- **DoD:** ingestion populates ≥10 valid products across both leaves; every row validates; re-running is idempotent.

## Agent B — Enrichment / Embeddings (owns `enrichment/**`)
- `EmbeddingProvider` interface + a default local impl (open_clip images, sentence-transformer text); swappable via config.
- Backfill: for products missing vectors, compute `text_vec` from `text_blob` and `image_vec` from the primary image → pgvector. Build against schema-valid fixtures until A's data lands.
- **DoD:** every ingested product has non-null vectors; cosine over a fixture set returns sane neighbours; provider swappable.

## Agent C — Matching + API (owns `matching/**`, `api/**`)
- `matching/filter.py` (hard SQL filter — **WHERE, never a soft penalty**), `matching/rank.py` (deterministic weighted score + breakdown), `matching/service.py` (`match()`).
- `api/`: real `POST /match`, `GET /products/{id}`, `GET /healthz`. Weights config-driven + echoed.
- **DoD:** `/match` returns ranked candidates with full breakdowns; hard constraints provably never violated (tested); style-vector and no-style paths both work.

## Agent D — Evaluation (owns `eval/**`, integration tests)
- Golden set: ~15 hand-written BOQ lines with expected-good product IDs.
- Metrics: precision@k, recall@k, **hard-constraint-violation count (must be 0)**.
- CLI: `python -m quarry.eval` prints the scorecard.
- **DoD:** eval runs end-to-end against the live service; any hard-constraint violation fails loudly.

## Dependency order
A, B, C run in parallel after Phase 0 (B/C build against schema + fixtures until A's data lands). **D starts once C exposes `/match`.**

## Phase 5 (optional, after green) — Thin review UI
Single page: pick/paste a BOQ line → ranked candidates with images + breakdowns. Calls `/match`. No new business logic. (Follows `.claude/rules/frontend-style.md`.)

## Phase 6 (seam work) — pipeline integration stubs
- `POST /boq`: accept a batch of BOQ lines (stage-3 seam) → matches per line.
- Export: per selected product, emit its `model_3d` ref for the render stage (stage-5 seam).

## V1 definition of done
`docker compose up` → ingest seeds → backfill embeddings → `POST /match` returns audited, ranked, hard-constraint-respecting candidates for **both** v1 categories → `python -m quarry.eval` prints precision@k with **zero** hard-constraint violations. Every returned product reports whether it carries usable geometry for the render seam.
