# Material Finder — implementation roadmap

**Status as of 2026-07-16.** Written to hand context to whoever (human or agent)
picks this up next. Everything below marked ✅ was verified by driving the real
thing, not by reading code. Everything marked ⚠️ is unverified — treat it as a
question, not a fact.

---

## What the product is

Give it **a product URL or a product photo** → it finds **that exact product,
every seller of it we can verify**, each labeled with confidence and the
evidence behind the match. Grey-market/dropshipper signals are flagged, never
hidden.

Live at `/material-finder/find` (auth-gated, rate-limited 5/min — each search
spends real money across paid vendors). `/material-finder` (landing) and
`/material-finder/tutorial` are public.

**Also:** `dsource.ai/<any product url>` → loads that product straight into the
finder. e.g. `dsource.ai/ikea.com/gb/en/p/billy-bookcase-white-00263850`.

### Decisions locked with the founder (don't relitigate without asking)

| | |
|---|---|
| Match target | **Exact product, every seller.** Not "similar", not spec-equivalent. |
| Results | **Show every seller, labeled.** Counterfeit flagging is a feature, not a filter. |
| Cost | 5–30¢/search acceptable |
| Latency | 30–60s fine if streamed |
| Category strategy | **Catalog-first, then open web** |
| Legal | SerpAPI Lens used, but **isolated so it can be deleted** |
| UI | **The Dossier** — identity card + seller ledger + expandable evidence chain |
| Landing page | "Don't worry about it for now" — still sells the OLD room→pieces promise |

---

## ✅ What works today (verified live)

- **URL path.** `amazon.com/dp/B0863TXGM3` → 335 sellers, Best Buy/Target/Mercari
  leading, 130 flagged. `johnlewis.com/...` → GTIN 5025532922045 parsed from real
  markup → MEDIUM (correct: one source can't corroborate itself).
- **Image path.** A photo of Sony headphones → reads "SONY" / "WH-1000XM4" off the
  packaging → Best Buy $159.99.
- **Prefix route.** `/ikea.com/gb/en/p/billy-...` → 307 → finder, auto-runs.
  Real pages untouched (200), typos still 404.
- **Failure paths.** Blocked retailer → "try a photo instead". SSRF guard blocks
  `169.254.169.254` and localhost. 401 unauthed, 413 oversize, `Retry-After` on 429.
- **86 unit tests, biome clean, production build clean.**

## ❌ What does NOT work / isn't built

1. **Nothing persists.** `supabase/migrations/20260720_material_finder.sql` exists,
   is **NOT applied**, and **no code writes to it**. Every search is fire-and-forget.
   The vessel was built and never filled.
2. **Catalog-first is OFF.** `MATERIAL_BANK_API_URL` deliberately unset — see the
   Billy Goats bug below.
3. **Write-back to the catalog** — deferred by the founder ("we'll do that later").
4. **Similar/alternatives tab** — deferred ("leave similarity aside").
5. **Not deployed.** Vercel env vars unset (see `production-launch-state`).

---

## Architecture

```
┌─ URL ──→ fetch ladder: plain → Zyte/Oxylabs (success-billed)
│           └→ parse JSON-LD → {gtin, mpn, sku, brand, asin}
└─ IMAGE ─→ Gemini 2.5 flash triage
            └→ {brand, model, barcode, findability}
                              │
                    IDENTITY ─┴─→ fan-out (parallel, fail-open per provider)
                                    ├ catalog    (OFF — see below)
                                    ├ shopsavvy  (identifier → offers)
                                    ├ shopify    (⚠️ unverified wire format)
                                    └ lens       (image → sellers; §1201 risk)
                              ↓
                    enrichIdentity ← fill blanks from providers
                              ↓
                    verify (Gemini vision; SKIPPED when GTIN agrees)
                              ↓
                    scoreAndRank → HIGH / MEDIUM / LOW + flags
                              ↓
                         THE DOSSIER (NDJSON stage stream)
```

### Files

| Path | Notes |
|---|---|
| `src/utils/finder/score.js` | **Pure, heavily tested.** GTIN canonicalization, dedup, tiering, ranking, `searchKeyFor`, `enrichIdentity`, `offerFromSource`. Put new deterministic logic HERE, not in identity.js. |
| `src/utils/finder/jsonld.js` | **Pure, tested.** schema.org/Product extraction. |
| `src/utils/finder/identity.js` | I/O only — Gemini triage + URL fetch. Imports `@/utils/gemini`, so **it cannot be unit-tested by `node --test`** (the `@` alias doesn't resolve). That's why the pure helpers live in score.js. |
| `src/utils/finder/fetch-ladder.js` | plain → Zyte → Oxylabs. SSRF guard. |
| `src/utils/finder/prefix-url.js` | The `dsource.ai/<url>` parser. **Strict hostname guard — do not loosen it.** |
| `src/utils/finder/provider-registry.js` | Provider map + rationale. Mirrors `visualizer/model-router.js`. |
| `src/utils/finder/providers/{catalog,shopsavvy,shopify,lens}.js` | One file per source. |
| `src/utils/finder/verify.js` | Per-offer vision. Fail-open. |
| `src/app/api/material-finder/route.js` | NDJSON pipeline. Mirrors `api/reverse-search/route.js`. |
| `src/app/[...target]/page.js` | The prefix catch-all. |
| `src/components/material-finder/` | Dossier, IdentityCard, OfferLedger, OfferRow, EvidenceChain, ConfidenceMark, InputPlate, SearchProgress, useMaterialFinder. |

### Conventions that matter

- **Deterministic first.** A GTIN agreement short-circuits everything — never
  spend a vision call on a product whose identifier already matches. (Shopify
  skips the LLM for ~80% of merchants this way; it's the biggest cost lever.)
- **Fail-open** on every auxiliary AI step. Never block a result.
- **Each provider degrades gracefully when its key is absent** and the UI names
  what wasn't searched — a thin result set must never read as "that's everything".
- **Confidence is never shown as a %** — we have no calibrated probability.
  ●●●/●●○/●○○ only. `LOW` must read as *"we could not verify this"*, not "weak yes".

---

## 🔴 Known bugs / traps (READ BEFORE TOUCHING)

1. **`identityFromCatalog` gates on `visualScore >= 0.8` assuming cosine
   similarity. material-bank returns a FUSION score (~0.025).** Catalog seeding
   has never fired — a silent no-op. Fix the scale before trusting catalog-first.
2. **The catalog provider returns similar products AS SELLERS.** With
   `MATERIAL_BANK_API_URL` set, searching IKEA "BILLY Bookcase" returned
   *"Three Billy Goats Gruff"* (a children's book, ₹695) as a place to buy a
   bookcase. Catalog hits are *"products like this"* — they belong in a Similar
   tab, which doesn't exist yet. **This is why the env var is unset.**
3. **`/api/match` returns near-duplicate variants.** `/api/catalog` has
   `collapse=true` for this. Use it.
4. **`--limit N` on the VPS image backfill slices the HEAD of the id list**,
   which is all `server.orientbell.com` 403s. Small trials look like total
   failure. Test against the real backlog.
5. **Exact-match is worthless for closed distribution.** IKEA BILLY → 1 seller:
   IKEA. Proven. Sony ASIN → 335. The finder pays off only where distribution is
   open. This is structural, not a tuning problem.
6. **IKEA POÄNG returns no JSON-LD at all** (JS-rendered) → needs Zyte's browser
   rung (~$1/1k vs $0.13/1k HTTP).

---

## Vendor reality (verified 2026-07-16)

| Vendor | Status |
|---|---|
| **ShopSavvy** | ✅ Works. `GET /v1/products/offers?ids=<id>` — **`ids` plural**; `barcode=`/`asin=`/`id=` all error. Offers nest at `data[0].offers`. Link field is **`URL` uppercase**. `availability` is the bare string `"in"`. `meta.credits_remaining` reads 0 on ERRORS regardless of real balance. Offers = 3 credits. **`ids` needs a bare identifier** — `WH-1000XM4` works, `SONY WH-1000XM4` errors. |
| **SerpAPI Lens** | ✅ Key works (400 exact_matches standalone). Needs a **publicly fetchable image URL** — no upload. ⚠️ Defendant in *Google v. SerpApi* (DMCA §1201, MTD heard 2026-05-19, **no ruling found — needs a PACER check**) and *Reddit v. Perplexity et al.*, which attacks the "we just use a SERP API" posture directly. Isolated in `providers/lens.js` so it can be deleted. |
| **Zyte** | ✅ Key works. Success-billed, from $0.13/1k HTTP, ~$1/1k browser. |
| **Gemini** | ✅ Works. Reads brand/model off packaging reliably. |
| **Shopify Catalog MCP** | ⚠️ **Wire format UNVERIFIED against a live call.** Off unless `SHOPIFY_CATALOG_MCP_URL` set. Terms forbid caching results/images. |
| **Amazon** | ❌ PA-API retired 2026-05-15. Creators API is ASIN-only, no GTIN input, needs 10 sales/30d. We never call Amazon — the ASIN arrives via ShopSavvy's `amazon` field, so its licence doesn't bind us. |

**"Every seller" is not achievable — by anyone.** Google has 45B listings and no
API; Shopify forbids caching; Amazon bars aggregation. Each sells queries, none
sells the index. The honest claim is *"every seller we can verify"* and the UI
says so.

**Accuracy by category** (research, not measured on our data): books ~99% (ISBN),
electronics ~95%+ (GTIN), branded fashion ~70–85%, **furniture/homeware ~40–55%**
(usually no GTIN; visual-only ceiling ~43% R@1 on ILIAS/CVPR-2025). Furniture is
DSource's core AND the open web's worst category — that is *why* catalog-first is
the architecture.

---

## The catalog (material-bank) — the other half

Lives on **VPS 46.202.179.28** (`ssh root@…`), code `/opt/material-bank`, DB
`/opt/material-bank/data/catalog.db`. **The VPS is the source of truth** — the Mac
clone is on a different commit. Founder directive: *"everything happens on the
vps, literally nothing of the mac."*

- 250,569 products · 232,748 publish-ready · 213,824 priced · 178 suppliers.
  **All Indian suppliers, INR** (urbanladder, giffywalls.in, wallmantra, jaipurrugs).
- Embedding: **Marqo/marqo-ecommerce-embeddings-B, 768-dim, joint text+image
  space.** dsource-client uses **CLIP ViT-L/14** — same dimension, **incompatible
  space**. They can never search each other's vectors. material-bank wins.
- **text_vectors: 100%. image_vectors: was 1.7%** — a backfill is running
  (`mb-embed-images.service`, ~2.4 img/s, ~30h from 2026-07-16 22:30 UTC).
  Watch: `tail -f /opt/material-bank/reports/mb-embed-images.log`.
- No `/api/match/image`, no `/api/lead` yet.

---

## Roadmap — in order

### 1. Wire persistence (small, and it's an admitted gap)
Apply `20260720_material_finder.sql` and write to `finder_searches` from the
route. Note the migration's comment: **offers are deliberately NOT cached**
(Shopify/Amazon terms) — read it before adding a cache.

### 2. Finish the image backfill → then `POST /api/match/image`
Trivial once vectors exist: joint space, `store.search(vec, kind="image", k=)`
already exists. Return `confident_match` above ~0.85 (tune on real drops).
**Do not build it before the backfill lands** — at 1.7% coverage it searches 2%
of the catalog and is theatre.

### 3. The Similar tab (deferred, but this is the real product for furniture)
The founder's model is **dupe.com**. `dsource.ai/ikea.com/...` should show two
tabs: **Exact matches** (built) + **Similar** (catalog). Locked decisions:
- Audience: **Indian buyers**, browsing global sites for inspiration but buying
  locally. ₹ alternatives are correct.
- Promise: **"Both, labelled"** — lead with anything genuinely cheaper ("₹X less"),
  then plain similar. **Only claim "cheaper" when currencies match** — a wrong
  "₹1,200 less!" is worse than no badge.
- Fix bug #1 (score scale) and #3 (collapse) first, and wait for image vectors —
  text-only similarity returns wardrobes for bookcases.

### 4. Write-back to the catalog (deferred)
Founder's decisions, already made:
- Write to **material-bank**, not Supabase. **Shared/global** catalog (flywheel).
- **Only identified products** (real GTIN/MPN/ASIN), **held below the publish gate**.
- **Never insert directly** — queue an `ingest_lead` job; the worker re-fetches
  the source URL itself so price/stock carry OUR provenance.
- **The user's dropped photo is evidence, NEVER the product image.**
- Unknown domain ⇒ new supplier registry row + probe job. **This is the flywheel:
  one dropped photo can onboard a 3,000-SKU supplier.**
- ⚠️ Storage: the founder chose **"everything the APIs returned, verbatim"**, twice,
  with the conflict spelled out both times. This breaches Shopify's terms
  (*"Don't cache search results"*) and stores merchant photos during live §1201
  litigation. ShopSavvy is the exception and is genuinely fine — they sell
  [Bulk Data Licensing](https://shopsavvy.com/data-licensing) for exactly this.
  **Implement per-provider so any source flips to pointer-only in one line.**

### 5. Before any of this is public
- **API-key auth on material-bank POST endpoints** — the API is currently open.
- **Rotate every key** — SHOPSAVVY/SERPAPI/ZYTE/REPLICATE/GEMINI were all pasted
  into chat transcripts in plaintext.
- The in-memory rate limiter resets on cold start and isn't shared across
  serverless instances (`src/utils/rate-limit.js` says so). Needs Redis/Upstash.
- Phase-0 gate never closed: **measure GTIN coverage** on ~1000 real
  DSource-category URLs, using the PAID fetch ladder (a free fetcher silently
  samples only the unprotected half of the web). A 6-URL smoke probe got 1/6 with
  a GTIN and 3/6 blocked. **This sets the ceiling on the whole URL path.**

---

## Env

Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`GOOGLE_GENAI_API_KEY` (image path dies without it — it was a placeholder for
months), `REPLICATE_API_TOKEN`.

Optional, all degrade gracefully: `SHOPSAVVY_API_KEY`, `SERPAPI_KEY`,
`ZYTE_API_KEY` or `OXYLABS_USER`/`OXYLABS_PASS`, `SHOPIFY_CATALOG_MCP_URL`,
`MATERIAL_BANK_API_URL` (**intentionally unset — see bug #2**).

See `.env.example` for prices and the legal caveats on each.
