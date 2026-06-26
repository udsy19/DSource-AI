#!/usr/bin/env bash
# Quarry - bring up the whole stack: Postgres (pgvector) + migrations + seed + API + review UI.
# Robust + idempotent: re-runnable, self-heals stale ports, only seeds an empty catalog, and
# fails fast with a clear message instead of hanging.
#
#   ./run.sh            # full stack (Postgres + backend :8000 + UI :5173)
#   ./run.sh seed       # just (re)seed the catalog and exit
#   ./run.sh api        # just Postgres + backend (no UI)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

MODE="${1:-all}"
API_PORT=8000
UI_PORT=5173

log() { printf '\033[1;33m[run]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[run] ERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# -- prerequisites --
command -v docker >/dev/null || die "docker not found (install Docker Desktop)."
docker compose version >/dev/null 2>&1 || die "docker compose v2 not found."
command -v uv >/dev/null || die "uv not found (https://docs.astral.sh/uv/)."

# -- 1. Postgres + pgvector --
log "starting Postgres (pgvector)..."
docker info >/dev/null 2>&1 || die "Docker daemon not responding - start/restart Docker Desktop."
docker compose up -d || die "docker compose up failed - is Docker Desktop healthy?"

log "waiting for Postgres to accept connections..."
for i in $(seq 1 40); do
  if docker compose exec -T db pg_isready -U quarry -d quarry >/dev/null 2>&1; then
    log "Postgres ready."; break
  fi
  [ "$i" -eq 40 ] && die "Postgres did not become ready in ~80s (check 'docker compose logs db')."
  sleep 2
done

# -- 2. deps + migrations --
log "syncing deps (uv)..."
uv sync --quiet
log "applying migrations..."
uv run alembic upgrade head

# -- 3. seed an empty catalog (idempotent; first run only) --
seed_if_empty() {
  local count
  count="$(uv run python -c 'from quarry.db import SessionLocal, ProductRow; print(SessionLocal().query(ProductRow).count())' 2>/dev/null || echo 0)"
  case "$count" in (*[!0-9]*) count=0 ;; esac
  if [ "$count" -eq 0 ]; then
    log "empty catalog -> seeding + CLIP backfill (first run, downloads the model + ~68 images, ~3 min)..."
    uv run python scripts/seed.py
  else
    log "catalog already has $count products - skipping seed."
  fi
}
seed_if_empty
[ "$MODE" = "seed" ] && { log "seed complete."; exit 0; }

# -- 4. free stale ports --
free_port() { lsof -ti "tcp:$1" 2>/dev/null | xargs kill -9 2>/dev/null || true; }
free_port "$API_PORT"
[ "$MODE" = "all" ] && free_port "$UI_PORT"

# -- 5. backend (+ UI) --
PIDS=()
cleanup() { kill "${PIDS[@]}" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

log "starting API on http://localhost:$API_PORT (docs at /docs)..."
uv run uvicorn quarry.api:app --port "$API_PORT" --reload &
PIDS+=($!)

if [ "$MODE" = "all" ]; then
  ( cd frontend && { [ -d node_modules ] || { log "installing UI deps..."; npm install; }; } \
      && log "starting review UI on http://localhost:$UI_PORT..." \
      && npm run dev ) &
  PIDS+=($!)
fi

printf '\n  API : http://localhost:%s   (Swagger: /docs)\n' "$API_PORT"
[ "$MODE" = "all" ] && printf '  UI  : http://localhost:%s\n' "$UI_PORT"
printf '  Ctrl-C to stop.\n\n'
wait
