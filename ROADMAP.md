# DSource AI — Build Roadmap

Phased plan, sharpened by the foundation research (2026-06-22). Companion to `CLAUDE.md` (rules/orientation) and `memory.md` (live state). Across every phase: keep tests green (add tests for new code), follow the design system, preserve the never-fake-data ethos.

**The throughline the research confirmed:** the catalog — not the AI — is the bottleneck and the moat. Global tools have great renders and no India SKU/INR/vendor link; that seam is the whole business. Build the catalog + embedding layer first; everything else reuses it.

---

## Phase 0 — Repoint the foundation (Studio → AI)
Decouple the engine from office-only assumptions; reframe the shell as DSource AI.
- First-class `typology` concept (`residential | hospitality | retail | workplace`) threaded through brief → scene → catalog filter.
- Gate office-specific logic (workstation grids, WELL-8 scoring) behind `typology == workplace` so it stops being the universal default.
- Keep all existing engine modules as the reusable core; reframe the app shell.
- **Done when:** the app runs typology-agnostic, the office flow still works, tests pass.

## Phase 1 — Catalog + embeddings ← **FIRST MILESTONE (stop-for-approval)**
The shared prerequisite for both modes: a real, embedded India catalog queryable by image/text with an honest Exact/Close/No-match label. **Scope it demand-first — harvest only what the real seed project touches, not full catalogs.**

Research adjustment: Phase 1 is the **full harvest → embed → match → calibrate loop**, not just "load a catalog." Enrichment, derivation, and vendor-mapping are *separate later phases* — do not fold them in, or the milestone won't gate cleanly.

**New backend modules** (fit existing layout):
```
backend/app/harvest/   schema.py · client.py(curl_cffi) · shopify.py · woocommerce.py · jsonld.py · spa.py · pipeline.py
backend/app/embeddings/ embedder.py(open_clip, marqo-ecommerce-B) · index.py(VectorIndex Protocol + SqliteVecIndex)
backend/app/core/match.py        PURE cosine→{exact|close|no_match} banding, no I/O
backend/app/routers/match.py     POST /api/match {image|text} → ranked products + label; GET /status
backend/scripts/harvest_seed.py  CLI: harvest seed suppliers, embed, report coverage
```
**Schema:** extend the existing `Product` (additive, nullable): `image_url`, `price_inr` (None when source price 0/null — flag), `gst_rate` (HSN-derived, `basis='estimated'`), `provenance` JSON. New `ProductEmbedding` (vector in `vec0` table keyed by `product_id`). Reuse `realdata.py`'s warm-cache guard so re-runs never re-fetch/re-embed unchanged products.

**Steps (gate after each):** (1) add+verify deps on Py3.13/Apple-Silicon — **confirm a torch wheel + one-image embed runs before proceeding**; (2) harvest Tier-0 Shopify for seed suppliers → `NormalizedProduct`, flag price/material gaps; (3) batch-embed (CPU), persist vectors; (4) match endpoint + pure banding; (5) **calibrate Exact/Close/No-match thresholds on 30–50 known-in-catalog India products** (percentile method, never hardcode literature numbers); (6) Tiers 1–3 only if seed needs non-Shopify suppliers.

**Tests:** `test_harvest_shopify` (price 0/null → None+flag, rifeindia regression), `test_harvest_tiers` (tier dispatch from CSV, 404 fallthrough), `test_normalized_provenance` (every estimated/missing field flagged), `test_embedder` (unit-norm 768-dim deterministic), `test_sqlitevec_index` (upsert→query top-1 + metadata filter), `test_match_bands` (below floor → `no_match`, never nearest), `test_match_calibration` (recall/precision bar on labeled set).

**Done when:** query the real India catalog by text or image → ranked, real, priced products with vendor + honest confidence, tests proving it, no fabricated data. **Stops for approval before any Explore/render/vendor work.**

## Phase 1.5 — Enrichment (material-level detail)
Vision-LLM pass extracting `material, finish, color, dimensions, weight, upholstery, care` from image + text + spec PDF. **Novelty-gated router:** near-duplicates (CLIP cosine ≥~0.85 + category overlap) → `gemini-2.5-flash`; novel/first-seen → `claude-haiku-4-5`; hard spec sheets → `claude-opus-4-8`. One Pydantic schema drives both providers (`{value, confidence, source}` per field). PDF via pdfplumber (MIT, never PyMuPDF/AGPL). Behind a `VisionEnricher` interface mirroring `render.py`.
- Cold-start reality: demand-first means early items are ~all novel ⇒ mostly Claude. Run the seed enrichment as a **Claude Batches (50% off) one-shot**; the cheap-model hit-rate climbs as coverage grows. Don't plan around steady-state economics.
- Needs an Anthropic key in `backend/.env` for the Claude path (Gemini path uses the existing key).
- **Done when:** seed products carry structured, flagged material attributes; routing decisions logged for threshold tuning.

## Phase 2 — Material → maintenance derivation (can run parallel to 1.5)
The "molecular-level texture" differentiator — a **computed** layer, not scraped. Pure `derive_material_attributes(material_family, finish, sku_overrides)` over one flat `material_attributes` SQLite table. Six standard-backed axes — abrasion/wear (Martindale/Wyzenbeek/PEI/AC/Janka), dent hardness (Janka), cleanability (ACT W/S/WS/X), **dust/static affinity** (the differentiator), **moisture/humidity behavior** (India-critical), indoor-air/VOC (GREENGUARD/EPD/CARB/E0-E1). Each axis: 0–5 ordinal + `basis` enum + `standard_ref` + rationale. A real measured value on the SKU spec overrides (basis flips to `measured_standard`). Static table + pure function, no infra.

## Phase 3 — Specify mode: catalog-constrained material swap
Wire `FLOOR_MATS/WALL_MATS/FURN_MATS` to **real SKUs**. Bind each swappable element to a catalog query (category + typology + style) → real SKU; live 3D swap recomputes the exact BOM/quote/procurement from real catalog rows (reuse `pricing/engine.py`, `procurement/`). Replace synthetic pricing with India catalog where available; keep honest flags where not.
- **Done when:** tap any element on the 3D → choose among real products → get an exact, priced, sourceable BOM.

## Phase 4 — Explore mode: creative generate → back-match ("shop the look")
The inspiration front door, robust to a thin catalog. Generate via the existing Replicate Flux proxy (canny+depth control) **or** accept an uploaded inspiration image. Back-match: **FastSAM-s** masks (or user taps) → **same CLIP encoder** → nearest catalog product → confidence (**Exact / Close / No real match — flagged**). "Use these matches" promotes the inspiration into a Specify-mode scene → BOM/price/source.
- **Done when:** generate or upload inspiration → tap elements → real, priced products with honest confidence → one click converts to a real design.

## Phase 5 — Vendor mapping (two sub-phases, different risk)
Separate manufacturer (makes) / vendor-dealer (sells locally) / product. **5a Branded:** per-brand authorized-dealer locator adapters → high-confidence Specify links. **5b Commodity:** category+spec → capable local vendor. **Bootstrap Bengaluru manually (20–50 vetted vendors)** — do NOT industrial-scrape IndiaMART/Justdial (ToS + Meta v. Bright Data precedent); the IndiaMART API is demand-capture, not discovery. Data model: `vendor` + `vendor_offering`; serviceability via data.gov.in GODL pincode CSV + haversine; rank by distance + price + lead time.

## Phase 6 — Typology generalization
Make residential & hospitality first-class. Per-typology program templates, default categories, catalog filters. Make generative layout **optional** (many users start from a room photo, not a CAD plan). Swap WELL-8 for a lighter livability/maintenance lens outside `workplace`.
- **Done when:** a credible residential flow and a credible hospitality flow run end-to-end.

## Phase 7 — Entry points + AR
Inspiration-first entry (snap/upload) for end-clients; plan/CAD entry for pros. AR via `<model-viewer>` — start with single-surface tile/paint on a curated GLB set (catalog-wide AR is a later, asset-cost-bound feature).

## Phase 8 — Polish, onboarding, demo-readiness
Persona-aware onboarding (pro vs end-client); saved projects; read-only "share a spec" (a pro shares with their end-client without multi-seat). Tighten honest-confidence UI everywhere. Drive **one real end-to-end project** as validation + catalog seed.

---

## The dial
"Creative-led" vs "catalog-led" is a **product dial set per persona**, not an architecture choice. The build order delivers both; decide per-persona defaults *after Phase 4*, with real output in front of you.

## GTM note (from research)
Monetize the **GCC/workplace fit-out wedge first** — concentrated, high-ticket, and it matches the existing test-fit→BOM→RFQ→PO engine — with residential Explore as top-of-funnel. **SaaS (~₹999–2,499/mo) is the day-one revenue floor; vendor commission is upside** (India affiliate rates are thin, 5–11%). Official brand feeds are the endgame flywheel, earned by routing demand — not a day-1 dependency.
