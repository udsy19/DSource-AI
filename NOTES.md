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

## Requests
(none yet)
