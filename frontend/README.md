# Quarry — Thin Review UI

A single-page app (Vite + React + TypeScript) to resolve a BOQ line and inspect
ranked candidates with their score breakdowns. It calls the Quarry resolver API;
it holds **no business logic** of its own.

## Run

1. **Start the backend** (from the repo root) on `:8000`:

   ```bash
   uv run uvicorn quarry.api:app --reload
   ```

2. **Start this UI** (from `frontend/`):

   ```bash
   npm install
   npm run dev
   ```

   Open the URL Vite prints (default http://localhost:5173).

The dev server proxies `/match`, `/boq`, `/products`, and `/healthz` to
`http://localhost:8000` (see `vite.config.ts`), so the UI fetches relative paths
— no CORS config and no backend change needed.

## What it does

- Compose a BOQ line: category (the two v1 leaves), quantity, budget ceiling
  (amount + basis), optional style intent, required certs, envelope, min
  acoustic NRC, fire-rating min.
- `POST /match` and render the ranked candidates: rank, score (Fraunces
  numeral), a `render-ready 3D` / `no 3D geometry` badge, and the full breakdown
  (style similarity, budget fit, lead time, sustainability as bars, plus
  `filters_passed` chips). Weights used are shown alongside the count.
- Each candidate fetches `GET /products/{id}` for name, brand, price, and
  attributes.

## Honest-data note

`GET /products/{id}` does not return an image URL, so cards show the product's
name / brand / price / attributes and the score breakdown rather than a render.
Null fields (e.g. unreported lead time) are stated plainly, never faked.

## Checks

```bash
npx tsc --noEmit   # type check
npm run build      # tsc + production build
```
