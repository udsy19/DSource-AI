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
./run.sh                  # ROBUST one-command: Postgres + migrate + seed-if-empty + API :8000 + UI :5173
./run.sh seed             # just (re)seed the catalog (ingest + CLIP backfill)
./run.sh api              # Postgres + backend only
```
Manual / piecemeal:
```
docker compose up -d                     # Postgres 16 + pgvector on :5433
uv sync                                  # venv + deps (Python 3.12)
uv run alembic upgrade head              # apply migration
uv run python scripts/seed.py            # ingest seeds + CLIP backfill (idempotent)
uv run pytest tests/ -q                  # 75 tests
uv run mypy && uv run ruff check src     # strict on schema+matching; lint
uv run uvicorn quarry.api:app --port 8000 --reload   # /match /boq /export /products /healthz
uv run --with playwright python scripts/browser_smoke.py  # headless-browser UI test (servers up)
```
DB URL: `postgresql+psycopg://quarry:quarry@localhost:5433/quarry` (config default; override via `DATABASE_URL`).

## Ranking is now REAL & MEASURED (2026-06-25, post-V1)

CLIP enabled (open-clip-torch/torch/pillow). Key learning: **text→text CLIP is noise** (grey ranked over green); **text→image is the product** (CLIP's actual strength). `embed_image` now fetches URLs.
- **Chair-leaf expanded:** +44 real Nilkamal chairs (real Shopify photos) as a committed PIM seed (`data/seeds/nilkamal_task_chairs.csv`); resilient backfill (dead URLs → `image_failed`, skip not crash). Catalog = 56 products, 44 with real `image_vec`.
- **Eval re-derived (robust + measures the ranker):** filter cases now use DYNAMIC ground truth (independent per-product constraint re-check over the live catalog) → precision/recall robust at any size; new ranking section (text→image relevant@k + MRR). Measured: filter 1.000/1.000 & 0 violations; **ranking rel@3=1.0, MRR=0.929**.
- **Honest read:** ranker chooses well on **coarse visual intent** (plastic→plastic, "chair for a child"→baby chairs, outdoor→sets at rank 1) but is **weak on fine intra-category attributes** (mesh vs high-back office chairs land rank ~18–27). Cause: plastic-dominated catalog + CLIP clustering on gross form. So Quarry is a product for coarse semantic retrieval; fine discrimination needs richer data (more office chairs w/ photos) and possibly attribute-aware ranking.
- **✅ §8 AMENDED (user-approved 2026-06-25):** `style_similarity = cosine(style_vec, p.image_vec)` only (was `image_vec OR text_vec`); image-less product → style 0.0. Fixes the CLIP modality-scale mix (text→text ~0.84 buried text→image ~0.30). CLAUDE.md §8 + NOTES.md updated; scorecard unchanged (rank rel@3=1.0, MRR=0.929); 0 regressions.
- **✅ /boq seam (Phase 6 upstream):** `POST /boq {lines:[BOQLine]} -> {results:[MatchResponse]}` — resolve a whole BOQ, one ranked+audited MatchResponse per line, hard constraints per line, order preserved. Reuses the frozen types + the `/match` resolver. Live-verified on the 56-product catalog.
## Finishing pass (2026-06-25) — parallel agents A/B/C + integration

Built via 3 concurrent subagents + orchestrator integration. **Catalog now 80 products** (50 chairs, 30 panels; 68 with real image_vec). 75 tests green, mypy strict + ruff clean.
- ✅ **Render-export seam (Phase 6 downstream):** `POST /export {product_ids}` -> `RenderExport {assets[{model_3d,has_geometry}], missing_geometry, not_found}` (the §2 half-match flag). `src/quarry/export/`. 5 tests.
- ✅ **Thin review UI (Phase 5):** `frontend/` Vite+React+TS — BOQ form -> /match -> ranked cards (score, has_geometry badge, breakdown bars, filters_passed chips, per-candidate /products/{id}). Minimal design system per `frontend-style.md`; a11y. tsc+build clean. (Not browser-tested — verify by running.)
- ✅ **Panel leaf UNBLOCKED:** research found real photographed+priced acoustic panels on Shopify (FeltRight, Inhabit Living). Harvested 24 -> `data/seeds/real_acoustic_panels.csv`, backfilled real image_vec. **text->image now works on BOTH leaves** (wood-slat query->wood panels, tile->tiles).
- ✅ **Eval covers both leaves:** added 3 panel ranking cases; fixed the filter eval to return ALL survivors (k=catalog size — recall was capped by ranking top-k once a line qualified >20 products). **Aggregate: filter 1.000/1.000, ranking rel@3=1.0 MRR=0.950, 0 violations.**

## ✅ Style calibration fixed — pool-relative normalization (2026-06-26)
Raw CLIP text→image cosine is compressed (~0.55-0.68 for a good match), so on a STYLE query a
no-photo product that was cheaper/greener/faster could out-rank the true best visual match — backwards.
**Fix (user-approved §8 change):** min-max normalize the style term WITHIN the survivor pool so the best
photo earns ~1.0 relative; no-photo → 0.0; single/all-equal photo → 1.0. Implemented as
`rank.rank_candidates(pool, ...)` (replaced per-product `score_candidate`); `service.match` calls it; only
the style term is pool-relative. TDD: `test_style_query_best_photo_outranks_strong_no_photo`.
**Scorecard improved:** ranking MRR 0.950 → **1.000**, rel@3/rel@5 = 1.0; filter 1.000/1.000, 0 violations.
Live check (`warm matte terracotta`, real 80-product catalog): best photo panel now style **1.000** and #1.
CLAUDE.md §8 + NOTES.md updated.

## ✅ Attribute-aware ranking — fine lexical term added (2026-06-26)
CLIP clusters on gross visual form, so fine intra-category attributes (mesh vs high-back office chairs)
get buried. **Fix (user-approved §7/§8 change):** a 5th soft term `attribute_match` = fraction of the
query's attribute words (stopwords + leaf nouns stripped) the product's own text claims (name + materials +
finish + colors + text_blob + **category path**). Per-product [0,1], deterministic, no LLM. Implemented in
`rank.py` (`attribute_match`/`_tokenize`/`_product_tokens`). **Weights rebalanced** (sum=1.0, style+attribute≥0.6
to keep the calibration guarantee): style 0.45, attribute 0.15, budget 0.20, lead 0.10, sust 0.10. Schema
(`Weights`+`Breakdown`), config, frontend (breakdown bar + weights row) all updated.
- **Data fix the term surfaced:** 3 FeltRight felt-tile seed rows had empty `materials` (brand "FeltRight" ≠
  token "felt") → scored attr 0 and lost to non-tile felt products. Set `materials: PET Felt` (honest); re-seeded.
- **Scorecard (11 cases incl. new fine-grained `mesh_office`): rel@1=rel@3=rel@5=1.000, MRR=1.000; filter
  1.000/1.000; 0 violations.** TDD: `test_attribute_term_breaks_visual_ties_lexically`. 77 tests green, mypy+ruff+tsc clean.

## ✅ Render seam (stage 4->5) — honest 3-way placement (2026-06-26)
The export was binary (`has_geometry` true/false). Catalog reality: only 6/80 carry a real mesh; 56/80 have
neither mesh nor dimensions (Shopify scrapes captured price+image only). Can't fabricate geometry. So enriched
`RenderExport`/`RenderAsset` (export/ — NOT frozen schema) to a 3-way `placement`, real-data only:
- **exact** — real product mesh (`model_3d`); place as-is. (6)
- **proxy** — no mesh but real w/d/h; render stage places an HONEST dimensioned bounding box, marked as a
  stand-in. (6 dims-only panels) `dimensions` (reused schema `Dimensions`) rides along to size it.
- **none** — no mesh, no dims; genuinely unplaceable, flagged. (68)
`RenderExport` adds `unplaceable` (placement==none) alongside `missing_geometry` (no real mesh = proxy+none,
preserves §2 half-match). **Placeable doubled 6 -> 12 with zero fabrication; the 68-product gap is now quantified
+ actionable (a data-acquisition problem, Agent A).** 4 new export tests; 80 green, mypy strict + ruff clean.

## Honest read on the ranker (now coarse visual + fine lexical)
Coarse visual intent works great (plastic/baby/outdoor chairs, wood/tile panels -> rank 1). Fine intra-category
attributes are now handled by the lexical `attribute_match` term **when the product text states the attribute**
(mesh office chairs -> rank 1). Remaining limit: attributes that are visual-only and absent from product text
(e.g. a specific weave or sheen never written down) still rely on CLIP alone. render-seam gap real: 35/80 products
have has_geometry=False (no model_3d) — flagged by /export.

## Standing items
- Fine-grained ranking needs richer/more-varied data + maybe attribute-aware ranking.
- Real 3D assets (model_3d) for the render seam — none of the real catalog has them.
- Phase 5 UI not browser-verified.

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
