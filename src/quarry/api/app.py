from __future__ import annotations

from fastapi import FastAPI, HTTPException

from ..schema import BOQLine, MatchResponse
from ..matching import match

app = FastAPI(
    title="Quarry — digital product library (resolver)",
    version="0.1.0",
    description="BOQ line -> ranked real products. Hard filter, then deterministic rank.",
)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/match", response_model=MatchResponse)
def post_match(line: BOQLine) -> MatchResponse:
    try:
        return match(line)
    except NotImplementedError as exc:
        # Phase 0: shared interface live, resolver not yet implemented (Agent C).
        raise HTTPException(status_code=501, detail=str(exc)) from exc


@app.get("/products/{product_id}")
def get_product(product_id: str) -> dict[str, str]:
    raise HTTPException(status_code=501, detail="not implemented (Phase 0 stub)")
