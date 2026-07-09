# DSource Web Client

DSource is an AI-powered interior materials marketplace built with [Next.js 15](https://nextjs.org) (App Router). It lets users browse a product marketplace, find matching materials from a room photo using AI, visualize material swaps in their space, and build product specs. Vendors get a dedicated portal to manage and bulk-upload their product catalog.

## Features

- **Marketplace** (`/marketplace`) — browse and view products backed by a Supabase database.
- **AI Material Finder** (`/ai-material-finder`) — upload a room photo; Google Gemini (`gemini-2.5-flash`) analyzes the image, detects elements (sofa, floor, walls, lamps, etc.), and matches them to products in the catalog. *Requires login.*
- **AI Visualizer** (`/ai-visualizer`) — generate updated room images with swapped materials using Gemini image generation (`gemini-2.5-flash-image`).
- **Spec Builder** (`/spec-builder`) — assemble product specifications. *Requires login.*
- **Vendor Portal** (`/vendor`) — vendor login, product management, and bulk product upload via CSV. *Requires a vendor account.*
- Static/info pages: `/about`, `/pricing`, `/faq`, `/help-center`, `/privacy`, `/terms`.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) + React 19 |
| Styling | Tailwind CSS v4 (via PostCSS) |
| Auth & Database | Supabase (`@supabase/supabase-js`, `@supabase/ssr`) |
| AI | Google Gemini via `@google/genai` |
| CSV parsing | `csv-parse` (vendor bulk upload) |
| Lint / Format | Biome |

## Prerequisites

- **Node.js 18.18 or newer** (Node 20 LTS recommended) — required by Next.js 15.
- **npm** (ships with Node). `package-lock.json` is committed, so npm is the expected package manager.
- A **Supabase project** — [create one free](https://supabase.com/dashboard).
- A **Google Gemini API key** — get one from [Google AI Studio](https://aistudio.google.com/apikey). Needed for the AI Material Finder and AI Visualizer features.

## Setup

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd dsource-client
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

`.env.local` should contain:

```bash
# Supabase (Project Settings → API in the Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>

# Google Gemini (server-side only — never exposed to the browser)
GOOGLE_GENAI_API_KEY=<your-gemini-api-key>
```

| Variable | Where it's used | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Auth (middleware, client, server), product queries | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth (middleware, client, server), product queries | Yes |
| `GOOGLE_GENAI_API_KEY` | `/api/analyze-image` and `/api/generate-image` routes | Yes, for AI features |

> `.env.local` is git-ignored by Next.js convention. Never commit real keys.

### 3. Set up Supabase

The app expects the following in your Supabase project:

1. **Auth enabled** (email/password). Users sign up at `/signup` and log in at `/login`.
2. **A `scraped_product_list` table** — the product catalog that the marketplace, product APIs, and vendor upload all read from and write to. Columns expected by the vendor CSV upload (see below) include:

   `product_id`, `product_material_depot_variant_handle`, `product_name`, `brand_name`, `category_name`, `color`, `color_code`, `color_family`, `sub_category`, `series_name`, `description`, `application`, `thickness`, `size`, `tags`, `image_url`

   Multi-value columns (`sub_category`, `application`, `tags`) are stored as arrays and delimited with `|` in the CSV.
3. **Vendor role metadata** — vendor accounts are identified by `user_type: "vendor"` in the user's `user_metadata` (or `app_metadata`). Set this when creating vendor accounts (e.g., in the Supabase dashboard under Authentication → Users, or via a signup flow/trigger). Users without this role are redirected away from vendor pages.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The dev server uses Turbopack and hot-reloads on file changes.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server (Turbopack) at `http://localhost:3000` |
| `npm run build` | Create an optimized production build |
| `npm start` | Serve the production build (run `npm run build` first) |
| `npm run lint` | Check code with Biome |
| `npm run format` | Format code with Biome (writes changes) |

## Running in Production

```bash
npm run build
npm start
```

The server listens on port 3000 by default; use `npm start -- -p <port>` to change it. Make sure the same environment variables from `.env.local` are set in your production environment (e.g., Vercel project settings).

The easiest deployment path is [Vercel](https://vercel.com/new) — import the repo, add the three environment variables, and deploy.

## Project Structure

```
dsource-client/
├── middleware.js            # Supabase session handling + route protection
├── next.config.mjs          # Remote image host allowlist
├── biome.json               # Lint/format configuration
├── public/                  # Static assets (images, icons)
├── utils/
│   └── supabase/            # Supabase client factories (server-side)
└── src/
    ├── app/
    │   ├── page.js                  # Landing page
    │   ├── marketplace/             # Product listing & detail pages
    │   ├── [ai-material-finder]/    # AI material finder flow (find, tutorial)
    │   ├── ai-visualizer/           # AI room visualizer
    │   ├── spec-builder/            # Spec builder (auth required)
    │   ├── vendor/                  # Vendor portal (vendor role required)
    │   ├── login/ · signup/         # Auth pages
    │   ├── about/ · pricing/ · faq/ · help-center/ · privacy/ · terms/
    │   └── api/
    │       ├── analyze-image/       # Gemini: detect elements in a room photo
    │       ├── generate-image/      # Gemini: generate material-swapped images
    │       ├── get-products/        # Match detected categories to products
    │       ├── products/ · products-list/ · get-products/  # Catalog queries
    │       ├── images/[...path]/    # Serve images from /public
    │       └── vendor/upload/       # CSV bulk upload (vendor-only)
    ├── components/          # Shared UI (header, footer, landing page, auth, vendor)
    ├── contexts/            # AuthContext, SpecContext, PathnameContext
    ├── hooks/               # useAuthorization
    └── utils/               # api-auth, authorization, roles helpers
```

## Authentication & Route Protection

`middleware.js` runs on every non-static request and enforces:

- `/spec-builder` and `/ai-material-finder` → redirect to `/` if not logged in.
- `/vendor/*` (beyond the `/vendor` landing page) → redirect to `/vendor` unless the logged-in user has the `vendor` role.

API routes under `/api/vendor/*` additionally verify the vendor role server-side via `src/utils/api-auth.js`.

## Vendor CSV Upload

Vendors can bulk-upload products at the vendor portal. The CSV must include a header row with **all** of these columns:

```
product_id, product_material_depot_variant_handle, product_name, brand_name,
category_name, color, color_code, color_family, sub_category, series_name,
description, application, thickness, size, tags, image_url
```

- `sub_category`, `application`, and `tags` accept multiple values separated by `|` (e.g., `residential|commercial`).
- Rows are validated and inserted into the `scraped_product_list` table.

## Troubleshooting

- **Redirected to `/` when visiting AI Material Finder or Spec Builder** — you're not logged in, or the Supabase env vars are missing/wrong so the session can't be read.
- **"Model response was empty" or AI endpoints return 500** — check that `GOOGLE_GENAI_API_KEY` is set and valid, and that your key has access to the `gemini-2.5-flash` models.
- **Marketplace shows no products** — the `scraped_product_list` table is empty or Row Level Security is blocking reads for the anon role. Seed the table (e.g., via the vendor CSV upload) and check your RLS policies.
- **Remote product images fail to load** — external image hosts must be allowlisted in `next.config.mjs` under `images.remotePatterns`; add the new hostname there and restart the dev server.
- **Changed `.env.local` but nothing happened** — restart the dev server; env vars are read at startup.
