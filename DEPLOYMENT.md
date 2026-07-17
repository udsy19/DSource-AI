# Deployment Guide

Go-live reference for the DSource web client (Next.js 15 App Router) and its
companion CAD export microservice. Every command and variable below is
verified against the code on this branch.

> **Merge note:** the `CAD-IMAGE` branch (CAD Studio + `/api/cad-convert` +
> `services/cad-export`) is being merged into this branch. Sections marked
> *(CAD-IMAGE)* apply once that merge lands.

---

## 1. Environment variables

Names verified against actual `process.env.*` usages in the codebase.

| Variable | Used by | Required for | Secret? |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `middleware.js`, `src/utils/supabase/{client,server}.js`, `src/utils/visualizer/images.js` (own-storage URL check), `scripts/backfill-embeddings.mjs` | Everything: auth, catalog, render history | No (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `middleware.js`, `src/utils/supabase/{client,server}.js` | Everything: auth, catalog, render history | No (anon key; data protected by RLS, not by hiding the key) |
| `GOOGLE_GENAI_API_KEY` | `/api/analyze-image`, `/api/detect-components`, `/api/generate-image` (topic guard + adherence verification), `/api/reverse-search` (crop description + re-rank) | AI Material Finder; visualizer component detection, prompt guard, PROOF verification, reverse-search quality | **Yes** — server-side only |
| `REPLICATE_API_TOKEN` | `/api/generate-image` (all image generation), `/api/reverse-search` + `src/utils/visualizer/embeddings.js` (CLIP query embedding), `/api/depth` + `src/utils/visualizer/depth.js` (depth maps), `/api/products` (single-product embed on create), `scripts/backfill-embeddings.mjs` | All visualizer generation, reverse material search, 3D view | **Yes** — server-side only |
| `MATERIAL_BANK_API_URL` | `src/utils/visualizer/material-bank.js` (used from `/api/reverse-search` and `/api/generate-image` swap path) | Optional. When set, reverse search matches the live material-bank catalog and product **swap-into-render** becomes available. When unset, reverse search falls back to the per-user Supabase catalog (`match_products` RPC) and swap returns "Product swap requires the material bank connection." | Not a credential, but keep it server-side (no `NEXT_PUBLIC_` prefix) |
| `SUPABASE_SERVICE_ROLE_KEY` | `scripts/backfill-embeddings.mjs` **only** | Embeddings backfill script | **Yes — server scripts only.** Bypasses RLS entirely. It is not referenced anywhere in the app runtime; do **not** add it to Vercel/app env. Keep it in the shell environment of whoever runs the backfill. |
| `DEV_AUTH_BYPASS` | `middleware.js` and every visualizer API route | Dev-only auth escape hatch | Must be **absent or `false` in production**. It is additionally `NODE_ENV`-gated (`NODE_ENV !== "production"`), so a production build ignores it — but do not set it anyway. |
| `PACE_MS` | `scripts/backfill-embeddings.mjs` | Optional; delay between Replicate calls (default `11000` ms) | No |
| `CAD_EXPORT_URL` *(CAD-IMAGE)* | `/api/cad-convert` | Optional. When set, professional DXF/DWG export via the cad-export microservice; unset or unreachable falls back to the baseline JS DXF renderer. | No, but keep server-side |
| `ODA_CONVERTER_PATH` *(CAD-IMAGE)* | `services/cad-export/render.py` (microservice, not the Next app) | Optional DWG output — path to the ODA File Converter binary | No |

`.env.example` documents the app-level variables. Routes with **no** external
env (`/api/get-products`, `/api/products-list`, `/api/renders`,
`/api/spec-pdf`, `/api/vendor/upload`, `/api/images/[...path]`) still need
the two Supabase publics for auth.

## 2. Build and run

### Vercel (recommended)

- Import the repo; framework preset **Next.js**. Default build (`next build`)
  works; the repo's `npm run build` uses `--turbopack`.
- Set the environment variables from the table above in Project Settings →
  Environment Variables (production scope). **Do not** set
  `SUPABASE_SERVICE_ROLE_KEY` or `DEV_AUTH_BYPASS`.
- `next.config.mjs` already handles serverless font tracing (see below) and
  the `next/image` remote-host allowlist (`src/utils/image-hosts.mjs`).

### Self-hosted

```bash
npm ci
npm run build
npm start            # listens on :3000; use `npm start -- -p <port>` to change
```

Node 18.18+ (Node 20 LTS recommended). Set the same env vars in the process
environment before `npm start`.

### Spec-PDF font tracing

`/api/spec-pdf` reads vendored Libre Caslon TTFs from `src/assets/fonts/` via
`fs` at runtime (needed for ₹ glyph support — WinAnsi built-ins cannot encode
U+20B9). `next.config.mjs` declares:

```js
outputFileTracingIncludes: { "/api/spec-pdf": ["./src/assets/fonts/*.ttf"] }
```

so standalone/serverless output bundles the fonts. If you change the fonts'
location, update this mapping or PDF generation breaks in production only.

## 3. Supabase state

- **Project:** `bojnqensefigniidkblx` (URL in `NEXT_PUBLIC_SUPABASE_URL`).
- **Migrations:** all three under `supabase/migrations/` are **already
  applied** to that project:
  - `20260714_visualizer_renders.sql` — `visualizer_renders` table + private
    `visualizer-renders` storage bucket, RLS owner-only policies on both.
  - `20260715_product_embeddings.sql` — pgvector `embedding vector(768)`
    column on `scraped_product_list`, HNSW cosine index, `match_products`
    RPC (scoped to `auth.uid()`, pinned `search_path` per Supabase advisor
    lint 0011).
  - `20260716_render_layers.sql` — `layers jsonb` column on
    `visualizer_renders`.
- **RLS:** enabled on `visualizer_renders`; storage-object policies restrict
  the `visualizer-renders` bucket to `{user_id}/...` prefixes; the
  `match_products` RPC filters by `created_by = auth.uid()`.
- **Auth:** email/password. Vendor accounts carry
  `user_type: "vendor"` in user/app metadata.
- **Catalog:** `scraped_product_list` (marketplace, vendor CSV upload,
  reverse-search fallback). After any CSV bulk upload, run the embeddings
  backfill (below) — bulk uploads do not auto-embed.

### Embeddings backfill (server-side script)

```bash
NEXT_PUBLIC_SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
REPLICATE_API_TOKEN=... \
node scripts/backfill-embeddings.mjs
```

Resumable (only processes rows with `embedding IS NULL`). Uses the same
pinned CLIP model as the query path — never change one without the other.

## 4. External services and failure modes

Every external dependency degrades gracefully; the API surfaces a `notice`
string instead of failing the whole request where possible.

| Service | Used for | On failure |
|---|---|---|
| **Replicate** (`black-forest-labs/flux-kontext-pro` render/CAD-style edits, `bytedance/seedream-4` swap, `google/nano-banana` moodboard, `andreasjansson/clip-features` embeddings, `chenxwh/depth-anything-v2` depth) | All visualizer generation, reverse search, 3D view | Generation errors are mapped to user-safe messages (`mapGenerationError` in `/api/generate-image`); embedding/depth failures return route-level errors. Community models are version-pinned. |
| **Google Gemini** (`gemini-2.5-flash`) | Material finder analysis, component detection, prompt topic guard, post-render adherence verification (PROOF), crop description, candidate re-rank | All secondary uses are **fail-open**: verification skipped ("Prompt topic check was unavailable."), re-rank falls back to original order, crop description falls back to the detected label. Primary analysis routes return a 5xx with a clear message. |
| **Material bank API** (`MATERIAL_BANK_API_URL`, endpoints `/api/match`, `/api/product/:id`) | Reverse material search, swap product resolution | 15–20 s timeouts. No matches → `notice: "No matches found in the material bank for this component."`. Unset → Supabase per-user catalog fallback (`notice: "No indexed products yet — run the embeddings backfill on your catalog."` when empty). Swap requires the bank and errors cleanly without it. |
| **Supabase render history** | Saving/listing renders | Fail-soft: generation still succeeds with `notice: "This render could not be saved to your history."`; listing returns `notice: "Render history is unavailable right now."`. |
| **cad-export microservice** *(CAD-IMAGE)* | Professional DXF/DWG | Any failure or unset `CAD_EXPORT_URL` → baseline JS DXF with warning "Professional export service unavailable — using baseline DXF". |

## 5. Rate limiting — single-instance caveat

`src/utils/rate-limit.js` is an **in-memory fixed-window limiter** keyed by
user id per route (10/min on most routes, 6/min on `/api/depth`). State lives
in the process: it resets on cold start and is **not shared across
serverless instances or replicas**. On Vercel or any multi-instance
deployment the effective limit is `N × limit`. Acceptable as a cost
first-line, but back it with a durable limiter (Redis/Upstash) before scaling
out — the code comment in `rate-limit.js` says the same.

## 6. Operational warnings

- **Replicate low-credit throttle:** accounts with under $5 credit are
  throttled to ~6 predictions/min. This makes the embeddings backfill crawl
  (its default `PACE_MS=11000` exists for exactly this) and can starve
  concurrent visualizer generations. Top up before launch.
- **Token rotation pending:** the Replicate token (and other dev-era keys)
  have been used during development; rotate all secrets before go-live (see
  security checklist).
- **CSV bulk uploads do not auto-embed** — re-run the backfill after imports
  or reverse search won't see the new products (single-product creates embed
  automatically, best-effort).
- **`sharp` is not a declared dependency.** `src/utils/visualizer/images.js`
  and `/api/spec-pdf` import `sharp` directly, but it resolves only via
  Next.js's own `optionalDependencies`. `npm ci --omit=optional` (or an npm
  resolution change) would break reverse-search cropping and PDF images. Add
  `sharp` to `dependencies` when package.json is next touched.
- **Image host allowlist:** external product-image hosts must be listed in
  `src/utils/image-hosts.mjs` (shared by `next/image` and the SSRF
  whitelist). New catalog CDNs require a code change + deploy.

## 7. CAD export microservice *(CAD-IMAGE — `services/cad-export/`)*

FastAPI + ezdxf service that turns extracted floor-plan geometry into a
professional DXF R2018 (AIA/NCS layers, ANSI31 hatching, door blocks, real
DIMENSION entities, paperspace title sheet), plus optional DWG.

**Run (port 8100 by convention — matches `CAD_EXPORT_URL` default):**

```bash
cd services/cad-export
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt   # fastapi, uvicorn, ezdxf
.venv/bin/uvicorn main:app --port 8100
```

- **Endpoints:** `GET /health` → `{ status, engine, dwg }`;
  `POST /render` → `{ dxf, dwg|null, engine, warnings, audit }`. DWG problems
  never fail a request; unusable payloads return 422.
- **Env:** `ODA_CONVERTER_PATH` (optional) — absolute path to the ODA File
  Converter for DWG output; otherwise it looks for `ODAFileConverter` on
  `PATH`; without it DWG is `null` with a warning. The converter is
  EULA-gated — install it manually; the service never downloads it.
- **Tests:** `.venv/bin/python test_render.py` and
  `.venv/bin/python test_golden.py` (golden-structure regression).
- **Security:** the service has **no authentication**. Deploy it on a
  private network (or bind to localhost next to the Next server) and point
  `CAD_EXPORT_URL` at it; never expose port 8100 publicly.
- The Next route calls it with a 15 s timeout and falls back to the baseline
  JS DXF on any failure.

## 8. Security checklist (pre-launch)

- [ ] **Rotate all secrets** used during development: `REPLICATE_API_TOKEN`
      (rotation pending), `GOOGLE_GENAI_API_KEY`, Supabase service-role key.
- [ ] **`SUPABASE_SERVICE_ROLE_KEY` is not in app env** (Vercel/host) — it is
      only ever exported ad hoc for `scripts/backfill-embeddings.mjs`.
- [ ] **`DEV_AUTH_BYPASS` absent/false** in production env (defense in depth;
      it is already `NODE_ENV`-gated in `middleware.js` and every route).
- [ ] **RLS verified** on `visualizer_renders`, the `visualizer-renders`
      storage bucket, and `scraped_product_list`; `match_products` is
      `auth.uid()`-scoped with a pinned `search_path` (advisor 0011).
- [ ] **SSRF guards intact** in all image intake paths:
      visualizer base images accept only data URIs or the app's own Supabase
      storage URLs (`normalizeBaseImage`); moodboard/product images are
      gated by the `image-hosts.mjs` allowlist; `/api/spec-pdf` resolves DNS
      and refuses private/reserved addresses, https only, no redirects,
      image content-type, 5 MB cap.
- [ ] **Auth on every mutating/expensive route**: middleware protects pages;
      API routes independently call `requireAuth`/vendor checks (middleware
      skips `/api/*` by design).
- [ ] **cad-export service not publicly reachable** (see §7).
- [ ] Rate limiting backed by Redis if running more than one instance (§5).

## 9. Post-deploy smoke tests

1. **Auth:** sign up, log in, log out; `/spec-builder`, `/material-finder`,
   `/ai-visualizer` redirect to `/` when logged out.
2. **Marketplace:** product list and detail pages render with images.
3. **AI Material Finder:** upload a room photo → elements detected → product
   matches shown.
4. **Visualizer — AI Render:** upload a room photo, set parameters, generate;
   title block shows **PROOF: VERIFIED** when all checks pass (or a
   fail-open notice if Gemini is down).
5. **Visualizer — reverse search:** detect components in a render, search a
   component → material-bank matches with prices (or Supabase-catalog matches
   if `MATERIAL_BANK_API_URL` is unset).
6. **Visualizer — swap:** pick a matched product → swap into the render;
   room preserved, product transplanted, aspect ratio unchanged.
7. **Visualizer — Mood Board:** select products + generate a board.
8. **Visualizer — Image to CAD:** photo → CAD-style output; *(CAD-IMAGE)*
   CAD Studio conversion downloads a DXF, and with `CAD_EXPORT_URL` set the
   response reports `exportEngine: "ezdxf"` (DWG too if ODA installed).
9. **3D view:** open the depth/parallax view on a render (exercises
   `/api/depth` → Replicate).
10. **Render history:** history lists past renders per mode; re-selecting a
    history item works (signed storage URLs).
11. **Spec builder:** add products, export the PDF — check ₹ prices render
    (font tracing, §2) and product images appear.
12. **Vendor:** vendor login, single product create (auto-embeds), CSV bulk
    upload; non-vendor users are redirected off `/vendor/*`.
13. **Rate limit:** hammer one visualizer endpoint 11× in a minute → 429 with
    `Retry-After`.
