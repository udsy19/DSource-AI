# NOTES — schema-change requests & cross-agent coordination

`src/quarry/schema/`, `src/quarry/db/`, and `data/taxonomy.yaml` are **FROZEN** (CLAUDE.md §7–§8).
A subagent that believes a change is required must **STOP and append a dated entry here** — never
edit the contract. The orchestrator adjudicates.

## Frozen seams (orchestrator-defined)
- `quarry.matching.match(line, weights=None, k=20) -> MatchResponse` — implemented by Agent C.
- `quarry.enrichment`: `EmbeddingProvider` Protocol + module-level `embed_text` / `embed_image` /
  `set_provider` / `get_provider` — Agent B registers a concrete provider; Agent C calls
  `embed_text` / `embed_image`.

## Orchestrator adjudications
- **2026-06-25 — Embeddings model (reconciling §5 with the frozen §7 schema).** §5 names a
  sentence-transformer for text, but `text_vec` and `image_vec` are the SAME `vector(N)` (§7) and
  §8 cosines `style_vec` against `image_vec` OR `text_vec` — so text and image must share one
  space and one width. A 384-d sentence-transformer cannot co-exist with 512-d CLIP image vectors
  in one column. **Decision: use CLIP for BOTH modalities** (open_clip ViT-B/32, 512-d shared
  space) as the default provider. No schema change. Does not expand v1 scope. Flagged to the user.

- **2026-06-25 — §8 style_similarity amended (user-approved contract change).** Was
  `cosine(style_vec, p.image_vec or p.text_vec)`; now `cosine(style_vec, p.image_vec)` (image-less
  product → 0.0). Reason: CLIP's modality gap means text↔text (~0.84) and text↔image (~0.30)
  cosines aren't on one scale, so the `or text_vec` fallback let image-less products bury
  image-matched ones. Visual style is matched against the product image; text↔text style was
  measured to be noise, so nothing real is lost. Schema unchanged (`text_vec` retained for future
  text-search). Eval's prior image-vec restriction workaround removed — match() now handles mixed
  catalogs. Approved by the user before editing the contract.

- **2026-06-26 — §8 style term normalized within the survivor pool (user-approved contract
  change).** Was a per-product absolute `cosine(style_vec, p.image_vec)` mapped to [0,1]; now
  min-max normalized ACROSS the pool so the best visual match earns ~1.0 relative. Reason: raw
  CLIP text→image cosine is compressed into ~0.55-0.68 — too weak to win a style query against the
  other [0,1] terms (budget/lead/sustainability). A no-photo product that was cheaper/greener/
  faster could out-rank the true best visual match on a STYLE query, which is backwards. Pool min-
  max fixes calibration without touching the other terms: products with no `image_vec` stay 0.0; a
  single/all-equal-photo pool collapses to 1.0 each. `breakdown.style_similarity` now reports the
  normalized value (it both drives and explains the score). Implemented as
  `rank.rank_candidates(pool, ...)` (replaces the per-product `score_candidate`). No schema change.
  Scorecard improved: ranking MRR 0.950 → **1.000**, rel@3/rel@5 = 1.0; filter 1.000/1.000, 0
  violations. Regression test: `test_style_query_best_photo_outranks_strong_no_photo`. Approved by
  the user before editing the contract.

- **2026-06-26 — attribute-aware ranking: new lexical `attribute_match` term (user-approved
  contract change).** Adds a fifth soft-rank term + breakdown field: the fraction of the query's
  attribute words (stopwords + leaf nouns stripped) that the product's own text claims — name +
  materials + finish + colors + text_blob + category path. Reason: CLIP clusters on gross visual
  form, so fine intra-category attributes ("mesh" vs "high-back" office chairs) get buried; the
  lexical term breaks visual ties with exact evidence. Deterministic, per-product [0,1], no LLM
  (keeps §4.3). **Schema (frozen) changed:** `Weights` gains `attribute`; `Breakdown` gains
  `attribute_match`. **Weights rebalanced** to keep weights summing to 1.0 AND preserve the
  2026-06-26 calibration guarantee (style+attribute must stay ≥ ~0.6 or a maxed no-photo product
  can beat the best photo): style 0.5→0.45, attribute 0.15 (new), budget 0.20, lead 0.15→0.10,
  sustainability 0.15→0.10. Config (`weight_*`) + frontend (breakdown bar + weights row) updated.
  Tests: `test_attribute_term_breaks_visual_ties_lexically`; eval case `mesh_office`.
- **2026-06-26 — seed data fix surfaced by the attribute term (Agent A data, orchestrator-applied).**
  The 3 FeltRight felt-tile rows in `data/seeds/real_acoustic_panels.csv` had empty `materials`
  despite being PET-felt acoustic tiles (brand "FeltRight" tokenizes to "feltright", not "felt"),
  so on "square felt acoustic tile" they scored `attribute_match=0` and the best *visual* tiles
  (style 1.0) were beaten by non-tile felt products (3D/divider) that state "felt" in their name.
  Fix = declare `materials: PET Felt` on those rows (honest — they are felt). Re-seeded (vectors
  preserved). **Scorecard after both changes: ranking rel@1=rel@3=rel@5 = 1.000, MRR = 1.000
  across 11 cases (incl. the new fine-grained `mesh_office`); filter 1.000/1.000; 0 violations.**
  Both approved by the user (chose "attribute-aware ranking") before editing the contract.

## Requests
(none yet)
