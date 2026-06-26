# CLAUDE.md — Quarry

> Working codename: **Quarry** (the source materials come from). Rename freely.
> This file is the source of truth for any agent working in this repo. Read it fully before writing code. If a decision here conflicts with your instinct, follow this file or raise the conflict explicitly — do not silently diverge.

---

## 1. Mission

Quarry is the **digital product library** for an interior fit-out pipeline. Its job is to take a structured line item from a bill of quantities (BOQ) and return **ranked, real products** that satisfy the hard requirements and best fit the design intent.

It is a **resolver**, not a search website. The human-facing search UI is secondary and optional. The primary interface is an API:

```
match(boq_line) -> ranked[product_candidate]
```

Everything in this repo exists to make that function fast, accurate, and auditable.

---

## 2. Where this fits (the bigger pipeline)

Quarry is stage 4 of a larger pipeline. You are only building stage 4 right now. The rest is context so you design the seams correctly.

```
1. Test Fit        floorplate + brief -> space-plan layout
2. CAD/Revit       layout -> editable IFC/DXF
3. Schematic+BOQ   layout -> structured element list + quantities   <-- produces our INPUT
4. Quarry (THIS)   BOQ line -> ranked real products                 <-- WE BUILD THIS
5. Render          matched products (3D assets) -> photoreal scene   <-- consumes our OUTPUT
6. Procurement     selected products -> POs  (out of scope)
```

Two seams matter:
- **Upstream (stage 3 -> 4):** we consume `BOQLine` objects. Define this schema cleanly; stage 3 will be built against it later. For now, seed BOQ lines by hand.
- **Downstream (stage 4 -> 5):** every matched product must carry a 3D asset reference (glTF/USD) so the render stage can place it. A match with no usable geometry is a half-match — flag it.

---

## 3. V1 scope — narrow and deep

The hard part of a product library is **data acquisition and normalization**, not search. Do not chase breadth. V1 proves the full loop on a thin slice.

**In scope (v1):**
- Exactly **two taxonomy leaves**: `finishes/acoustic/wall-panel` and `ffe/seating/task-chair`. (One finish, one piece of FF&E — they exercise different data sources and different hard constraints.)
- 5–10 brands per leaf, ingested into one canonical schema.
- Faceted hard-filter + embedding-based soft-rank match service.
- A `/match` API endpoint.
- An eval harness with golden BOQ lines and retrieval metrics.

**Explicitly out of scope (v1):**
- The other ~298 categories. The taxonomy supports them; we don't populate them.
- Sample logistics, procurement, ordering (that's a different business — see Material Bank's real moat).
- Live manufacturer partnerships. We work from whatever clean data we can get (BIM libraries, CSV/PIM exports, curated seeds).
- The render engine and the test-fit generator. We only define the seams.

A library that resolves **two** categories perfectly beats a shallow 300-category catalog that matches nothing well. Depth first.

---

## 4. Architecture principles (non-negotiable)

1. **Resolver, API-first.** Design around `match(boq_line)`. The UI, if built, calls the same API a machine would.
2. **Constraint filter, then semantic rank.** Two distinct layers. Hard constraints (dimensions, budget, certs, category-specific minimums like acoustic NRC or fire rating) *eliminate* candidates via SQL. Soft signals (style similarity, budget headroom, lead time, sustainability) *rank* the survivors. Never let a soft signal override a hard constraint.
3. **LLM stays out of the numeric/geometric loop.** Embeddings and an optional LLM are used only to turn fuzzy design intent ("warm matte terracotta") into a query vector. They never invent products, prices, quantities, or scores. Scoring is deterministic and inspectable.
4. **Auditability.** Every match returns a score *breakdown* (which hard filters passed, the style similarity, the budget fit, etc.). A human must be able to see *why* a product ranked where it did.
5. **Canonical schema is the contract.** All sources normalize into one `CanonicalProduct`. Source-specific mess lives only in the ingestion adapters and the `raw` field. Nothing downstream of ingestion ever sees a source-specific shape.

---

## 5. Tech stack

- **Language:** Python 3.12, managed with `uv`.
- **API:** FastAPI + uvicorn.
- **Storage:** PostgreSQL 16 + `pgvector` (one store for structured data *and* embeddings).
- **ORM / migrations:** SQLAlchemy 2.x + Alembic.
- **Validation / schema:** Pydantic v2 (the canonical models are Pydantic; DB models mirror them).
- **Embeddings:** pluggable `EmbeddingProvider` interface. Default impl uses `open_clip` for images and a sentence-transformer for text, runnable locally; a hosted provider can be swapped in behind the same interface.
- **Fetching:** `httpx`. Scraping (last resort) behind an adapter using `playwright`/`selectolax`.
- **Quality:** `pytest`, `ruff`, `mypy` (strict on `src/quarry/schema` and `src/quarry/matching`).
- **Local infra:** `docker-compose` brings up Postgres+pgvector.

---

## 6. Repository layout

```
quarry/
  CLAUDE.md                 # this file (frozen contract lives in §8)
  pyproject.toml
  docker-compose.yml        # postgres + pgvector
  alembic/                  # migrations
  data/
    taxonomy.yaml           # controlled category tree (CONTRACT — orchestrator owns)
    seeds/                  # hand-curated seed products per category
  src/quarry/
    schema/                 # CONTRACT — Pydantic: product, boq, match, taxonomy
    db/                     # SQLAlchemy models, session, pgvector setup
    ingestion/              # base adapter + per-source adapters  [AGENT A]
      base.py
      adapters/
    enrichment/             # embedding pipeline + providers       [AGENT B]
    matching/               # filter + rank + resolver service     [AGENT C]
    api/                    # FastAPI app + routes                 [AGENT C]
    eval/                   # golden BOQ set + metrics              [AGENT D]
  tests/                    # mirrors src/ layout
```

**File ownership is enforced (see §9).** Agents edit only their owned directories. The `schema/`, `db/`, and `data/taxonomy.yaml` are the shared contract and are frozen after Phase 0.

---

## 7. Core data model (the contract)

These shapes are frozen after Phase 0. If you need to change them, stop and surface it — a schema change invalidates other agents' work.

### CanonicalProduct
```
id: UUID
source: Enum[csv_pim, bimobject, scrape, seed]
source_ref: str                      # original id or URL
brand: str
name: str
category: str                        # taxonomy leaf path, e.g. "ffe/seating/task-chair"
attributes:
  dimensions: {w, d, h, unit}        # nullable per field
  colors: [str]
  materials: [str]
  finish: str | null
  fire_rating: str | null
  acoustic_nrc: float | null         # relevant for acoustic panels
  weight: {value, unit} | null
price: {amount, currency, unit}      # unit in {each, sqm, linear_m}
lead_time_days: int | null
sustainability:
  has_epd: bool
  embodied_carbon: float | null      # kgCO2e, from EPD/EC3 where available
  certifications: [str]              # e.g. ["CDPH", "GREENGUARD"]
media:
  images: [url]
  thumbnail: url | null
  texture_maps: {albedo, normal, roughness} | null   # for render
model_3d: {format, uri} | null       # format in {gltf, usd, rfa}; null = no geometry
text_blob: str                       # concatenated text used for the text embedding
text_vec: vector(N) | null           # pgvector
image_vec: vector(N) | null          # pgvector
raw: JSON                            # untouched source payload
ingested_at, updated_at
```

### BOQLine (the query — the upstream seam)
```
category: str                        # taxonomy leaf
quantity: {value, unit}
envelope: {max_w, max_d, max_h, unit} | null   # dimensional hard constraints
budget_ceiling: {amount, currency, basis}      # basis in {per_unit, total}
required_certs: [str]                # hard: product must have all
hard_constraints: {min_acoustic_nrc?, fire_rating_min?}   # category-specific
style_intent:
  text: str | null                   # "warm matte terracotta, mid-century"
  reference_image: url | null
  precomputed_vector: vector(N) | null
```

### MatchResponse
```
query: BOQLine                       # echo
candidates: [
  {
    product_id: UUID,
    score: float,                    # 0..1, deterministic weighted sum
    hard_pass: true,                 # only passing products are returned
    breakdown: {
      style_similarity: float,
      budget_fit: float,
      lead_time_score: float,
      sustainability_bonus: float,
      filters_passed: [str]
    },
    has_geometry: bool               # false => render stage cannot use it
  }
]
weights_used: {style, budget, lead_time, sustainability}
```

---

## 8. The match algorithm

```
def match(line: BOQLine, weights=DEFAULT_WEIGHTS, k=20) -> MatchResponse:
    # 1. HARD FILTER (SQL) — eliminate, don't rank
    pool = products where
        category is line.category (or a descendant)
        AND dimensions fit line.envelope (if given)
        AND effective_price <= line.budget_ceiling
        AND certifications ⊇ line.required_certs
        AND category-specific hard_constraints satisfied
              (e.g. acoustic_nrc >= min_acoustic_nrc)

    # 2. STYLE VECTOR
    style_vec = (
        line.style_intent.precomputed_vector
        or embed_text(line.style_intent.text)
        or embed_image(line.style_intent.reference_image)
        or None
    )

    # 3. SOFT RANK (deterministic) over the survivors
    for p in pool:
        style_similarity = cosine(style_vec, p.image_vec) if (style_vec and p.image_vec) else 0.0
        # ^ amended 2026-06-25: style is VISUAL — match against image_vec only. The old
        #   `image_vec or text_vec` fallback mixed CLIP modality scales (text-text ~0.84 vs
        #   text-image ~0.30) and buried image-matched products. See NOTES.md.
        budget_fit       = headroom_score(p.effective_price, line.budget_ceiling)
        lead_time_score  = lead_time_score(p.lead_time_days)
        sustainability   = sustainability_bonus(p.sustainability)
        score = weighted_sum(...)      # weights are explicit + returned

    return top-k with full breakdown
```

Rules: hard filter is a `WHERE` clause, never a soft penalty. If `style_vec` is `None`, rank on the remaining terms (don't fabricate similarity). Always return the breakdown.

---

## 9. Build roadmap & multi-agent workstreams

### Phase 0 — Foundation (BLOCKING, do this first, single-threaded)
Done by the orchestrator before any subagent is spawned. Produces the frozen contract.
- `schema/`: Pydantic models for CanonicalProduct, BOQLine, MatchResponse, taxonomy types.
- `data/taxonomy.yaml`: the category tree (full skeleton; only the two v1 leaves need to be deep).
- `db/`: SQLAlchemy models mirroring the schema, pgvector columns, Alembic baseline migration.
- `docker-compose.yml`: Postgres + pgvector up and reachable.
- Stub `match()` signature + empty `/match` route returning `501`, so everyone shares the interface.
**DoD:** `docker compose up` works, migrations apply, `pytest tests/test_schema.py` passes, types check clean.

After Phase 0, fan out. Each agent owns a directory and touches nothing outside it except by reading the frozen `schema/`.

### Agent A — Ingestion  (owns `ingestion/**`, `data/seeds/**`)
- `base.py`: `SourceAdapter` ABC with `fetch() -> raw` and `normalize(raw) -> CanonicalProduct`.
- Two concrete adapters: a CSV/PIM adapter and one BIM-library-style adapter (JSON/structured).
- Hand-curate seed data: 5–10 products per v1 leaf, fully populated (including a `model_3d` ref where possible).
- Idempotent upsert into Postgres keyed on `(source, source_ref)`.
**DoD:** running ingestion populates the DB with ≥10 valid products across both leaves; every row validates against the schema; re-running is idempotent.

### Agent B — Enrichment / Embeddings  (owns `enrichment/**`)
- `EmbeddingProvider` interface + a default local impl (open_clip images, sentence-transformer text).
- A backfill job: for products missing vectors, compute `text_vec` from `text_blob` and `image_vec` from the primary image, write to pgvector.
- Build against the schema; if no real rows exist yet, use schema-valid fixtures.
**DoD:** after backfill, every ingested product has non-null vectors; cosine similarity over a fixture set returns sane neighbours; provider is swappable via config.

### Agent C — Matching + API  (owns `matching/**`, `api/**`)
- `matching/filter.py` (hard SQL filter), `matching/rank.py` (deterministic scoring + breakdown), `matching/service.py` (`match()`).
- `api/`: implement `POST /match` (BOQLine -> MatchResponse), `GET /products/{id}`, `GET /healthz`.
- Weights are config-driven and echoed in the response.
**DoD:** `POST /match` against seeded data returns ranked candidates with full breakdowns; hard constraints are provably never violated (tested); style-vector and no-style paths both work.

### Agent D — Evaluation  (owns `eval/**`, `tests/**` integration tests)
- A golden set: ~15 hand-written BOQ lines with expected-good product IDs.
- Metrics: precision@k, recall@k, and a hard-constraint-violation count (must be 0).
- A CLI: `python -m quarry.eval` prints the scorecard.
**DoD:** eval runs end to end against the live service and prints metrics; any hard-constraint violation fails the run loudly.

### Phase 5 (optional, after green) — Thin review UI
A single-page UI: paste/select a BOQ line, see ranked candidates with images and breakdowns. Calls `/match`. No new business logic.

### Phase 6 (seam work) — pipeline integration stubs
- A `POST /boq` endpoint that accepts a batch of BOQ lines (the stage-3 seam) and returns matches per line.
- An export that emits, per selected product, its `model_3d` ref for the render stage (the stage-5 seam).

---

## 10. Dependency order

```
Phase 0 (schema/db/taxonomy)  ── must finish first ──┐
                                                     ▼
        ┌────────────┬──────────────┬────────────────┐
        ▼            ▼              ▼                 │
     Agent A      Agent B        Agent C             │
   (ingestion)  (embeddings)   (match+api)           │
        │            │              │                 │
        └────────────┴──────┬───────┘                 │
                            ▼                          │
                         Agent D  (eval, depends on C) │
```
A, B, C can run in parallel after Phase 0 (B and C build against the schema and fixtures until A's data lands). D starts once C exposes `/match`.

---

## 11. Conventions

- **Don't cross ownership lines.** If Agent C needs a schema change, it does not edit `schema/`; it opens a note in `NOTES.md` and waits for the orchestrator. Schema is frozen post-Phase-0.
- **Tests live beside the code** and are written *with* the feature, not after. Mirror `src/` in `tests/`.
- **No hidden network calls in tests.** Mock adapters; embeddings use a deterministic stub provider in tests.
- **Commits:** conventional commits, scoped to your area (`feat(ingestion): ...`, `feat(matching): ...`).
- **Config over constants.** Weights, embedding dims, DB URL, provider choice all come from env/config, never hardcoded.
- **Every public function in `matching/` and `schema/` is typed and mypy-clean.**

---

## 12. Definition of done (v1)

`docker compose up` → ingest seeds → backfill embeddings → `POST /match` returns audited, ranked, hard-constraint-respecting candidates for both v1 categories → `python -m quarry.eval` prints precision@k with **zero** hard-constraint violations. Every returned product reports whether it carries usable geometry for the render seam.
