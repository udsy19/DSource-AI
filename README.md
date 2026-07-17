# DSource Web Client

DSource is an AI-powered interior materials marketplace built with [Next.js 15](https://nextjs.org) (App Router). Users browse a product catalog, find matching materials from a room photo, visualize designs and material swaps in their own space, and export product specs as a print-ready PDF. Vendors get a dedicated portal to manage and bulk-upload their catalog.

## Features

- **Marketplace** (`/marketplace`) — browse and view products backed by a Supabase database.
- **Material Finder** (`/material-finder`) — paste a product link or drop a photo of one product; resolves what it is (JSON-LD identifiers, or Gemini vision reading the label), then fans out across the DSource catalog, Shopify's catalog, ShopSavvy and Google Lens to find everyone selling it. Every seller is shown, ranked by tier (GTIN agreement → probable → unverified) with the evidence behind each match, and grey-market/dropshipper signals flagged. The tool at `/material-finder/find` *requires login* and is rate-limited — each search spends real money across paid providers. The landing page and tutorial are public.
- **AI Visualizer** (`/ai-visualizer`) — three modes, all image-edit-first (they start from your uploaded room photo). *Requires login.*
  - **AI Render** — restyle the room from structured parameters (style, lighting, palette, flooring, ...) plus a free-text brief. After generation, vision AI verifies the result against the brief and retries once with strengthened directives if a parameter was ignored; when every check passes the title block reads **PROOF: VERIFIED**.
  - **Mood Board** — fuse selected catalog products into a composed board.
  - **Image to CAD** — convert a room photo into a CAD-style drawing.
  - **Reverse material search** — click a detected component in a render to find matching real products: the crop is described and embedded (CLIP), matched against the material-bank catalog when `MATERIAL_BANK_API_URL` is configured (with live prices), or against your own Supabase catalog otherwise, then re-ranked by vision AI.
  - **Swap-into-render** — take a matched material-bank product and swap it into the render; the room is preserved and only the component changes (material bank connection required).
  - **3D view** — a monocular depth map (Depth Anything V2) drives a parallax 3D viewer for any render.
  - **Render history** — renders persist to a private Supabase storage bucket with per-user RLS; each record keeps a layer graph of how it was built.
- **Spec Builder** (`/spec-builder`) — assemble product specifications and export a real PDF (pdf-lib, vendored Libre Caslon fonts, ₹-safe). *Requires login.*
- **Vendor Portal** (`/vendor`) — vendor login, product management, and bulk CSV upload. *Requires a vendor account.*
- Static/info pages: `/about`, `/pricing`, `/faq`, `/help-center`, `/privacy`, `/terms`.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) + React 19 |
| Styling | Tailwind CSS v4 (via PostCSS) |
| Auth & Database | Supabase (`@supabase/supabase-js`, `@supabase/ssr`), pgvector for reverse search |
| Image generation | Replicate — an internal router picks the model per task (Flux Kontext Pro for renders/CAD, Seedream 4 for swaps, Nano Banana for mood boards); CLIP embeddings and Depth Anything V2 also run on Replicate |
| Vision analysis | Google Gemini (`gemini-2.5-flash`) via `@google/genai` — detection, topic guard, adherence verification, re-ranking |
| PDF | `pdf-lib` + `@pdf-lib/fontkit` |
| 3D / motion | `three`, `gsap`, `lenis` |
| CSV parsing | `csv-parse` (vendor bulk upload) |
| Lint / Format | Biome |

## Setup

### 1. Prerequisites

- **Node.js 18.18+** (Node 20 LTS recommended); npm (`package-lock.json` is committed).
- A **Supabase project** with the migrations under `supabase/migrations/` applied.
- A **Google Gemini API key** ([Google AI Studio](https://aistudio.google.com/apikey)) and a **Replicate API token** ([replicate.com](https://replicate.com)) for the AI features.

### 2. Install and configure

```bash
git clone <repository-url>
cd dsource-client
npm install
cp .env.example .env.local   # then fill in your values
```

`.env.example` documents every variable. The full table — which route needs which variable, which are secret, and production-only concerns — lives in **[DEPLOYMENT.md](./DEPLOYMENT.md)**. In short: the two `NEXT_PUBLIC_SUPABASE_*` values are always required; `GOOGLE_GENAI_API_KEY` and `REPLICATE_API_TOKEN` power the AI features; `MATERIAL_BANK_API_URL` is optional (enables live-catalog reverse search and swaps); `SUPABASE_SERVICE_ROLE_KEY` is only for the backfill script and must never reach app runtime env.

### 3. Supabase

1. **Auth** — email/password; users sign up at `/signup`. Vendor accounts carry `user_type: "vendor"` in user (or app) metadata.
2. **Migrations** — apply everything in `supabase/migrations/` (SQL editor or `supabase db push`): render history table + private storage bucket, pgvector product embeddings + `match_products` RPC, and the render layer-graph column. The app degrades gracefully (with user-facing notices) until they're applied.
3. **Catalog** — the `scraped_product_list` table backs the marketplace, product APIs, and vendor upload. After bulk CSV imports, run the embeddings backfill so reverse search can see the new rows:

```bash
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... REPLICATE_API_TOKEN=... \
node scripts/backfill-embeddings.mjs
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server (Turbopack) at `http://localhost:3000` |
| `npm run build` | Create an optimized production build (Turbopack) |
| `npm start` | Serve the production build (run `npm run build` first) |
| `npm run lint` | Check code with Biome |
| `npm run format` | Format code with Biome (writes changes) |
| `node scripts/backfill-embeddings.mjs` | Backfill CLIP embeddings for catalog products (resumable; see DEPLOYMENT.md) |

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full go-live guide: environment variable table, Vercel and self-hosted instructions, Supabase state, external-service failure modes, the rate-limiting caveat, the CAD export microservice, the security checklist, and post-deploy smoke tests.

## Project Structure

```
dsource-client/
├── middleware.js            # Supabase session handling + route protection
├── next.config.mjs          # Image host allowlist + spec-pdf font tracing
├── scripts/                 # backfill-embeddings.mjs
├── supabase/migrations/     # Render history, embeddings, layer graph
└── src/
    ├── app/
    │   ├── marketplace/ · material-finder/ · ai-visualizer/
    │   ├── spec-builder/ · vendor/ · login/ · signup/ · static pages
    │   └── api/
    │       ├── analyze-image/       # Gemini: detect elements in a room photo
    │       ├── detect-components/   # Gemini: components + boxes for reverse search
    │       ├── generate-image/      # Replicate render/swap/moodboard/CAD + verification
    │       ├── reverse-search/      # Crop → embed → match → re-rank (streaming)
    │       ├── depth/               # Depth map for the 3D view
    │       ├── renders/             # Render history (list/delete)
    │       ├── spec-pdf/            # Spec sheet PDF generation
    │       ├── products/ · products-list/ · get-products/
    │       └── vendor/upload/       # CSV bulk upload (vendor-only)
    ├── components/          # Shared UI (visualizer tabs, header, vendor, ...)
    ├── contexts/            # AuthContext, SpecContext, PathnameContext
    ├── assets/fonts/        # Vendored Libre Caslon (spec PDF)
    └── utils/
        ├── supabase/        # Supabase client factories (browser + server)
        ├── visualizer/      # model-router, prompt-composer, verify, images,
        │                    # embeddings, depth, material-bank, persist, layers
        └── *.js             # api-auth, rate-limit, spec-pdf, image-hosts, gemini
```

Internal modules are imported through the `@/*` alias (e.g. `@/utils/supabase/server`).

## Authentication & Route Protection

`middleware.js` runs on every non-static page request:

- `/spec-builder`, `/material-finder/find`, `/ai-visualizer` → redirect to `/` when not logged in.
  (`/material-finder` itself and its tutorial stay public — only the tool is gated.)
- `/vendor/*` (beyond the `/vendor` landing page) → redirect unless the user has the `vendor` role.

API routes are skipped by the middleware and enforce auth themselves (`src/utils/api-auth.js`); the expensive AI routes are additionally rate-limited per user (`src/utils/rate-limit.js`).

## Vendor CSV Upload

The CSV must include a header row with **all** of these columns:

```
product_id, product_material_depot_variant_handle, product_name, brand_name,
category_name, color, color_code, color_family, sub_category, series_name,
description, application, thickness, size, tags, image_url
```

- `sub_category`, `application`, and `tags` accept multiple values separated by `|` (e.g., `residential|commercial`).
- Rows are validated and inserted into `scraped_product_list`. Bulk uploads do **not** auto-embed — run the backfill script afterwards so reverse search can match the new products.

## Troubleshooting

- **Redirected to `/` on protected pages** — not logged in, or Supabase env vars are missing/wrong so the session can't be read.
- **AI endpoints return 500 / "unavailable" notices** — check `GOOGLE_GENAI_API_KEY` and `REPLICATE_API_TOKEN`. Verification, re-ranking, and the topic guard are fail-open: renders still deliver with a notice when Gemini is down.
- **Reverse search says "No indexed products yet"** — the embeddings backfill hasn't run against your catalog (or `MATERIAL_BANK_API_URL` is unset and your Supabase catalog is empty).
- **Generations are slow or throttled** — Replicate accounts under $5 credit are limited to ~6 predictions/min.
- **Marketplace shows no products** — `scraped_product_list` is empty or RLS is blocking reads. Seed it (vendor CSV upload) and check policies.
- **Remote product images fail to load or are skipped** — external hosts must be allowlisted in `src/utils/image-hosts.mjs` (shared by `next/image` and the server-side SSRF whitelist); add the hostname and restart the dev server.
- **Changed `.env.local` but nothing happened** — restart the dev server; env vars are read at startup.
