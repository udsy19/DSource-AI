"""FastAPI CAD-export microservice: floor-plan geometry JSON -> DXF/DWG."""

from __future__ import annotations

import hmac
import os
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

from render import ENGINE, oda_available, render_geometry

app = FastAPI(title="cad-export", version="1.0.0")

# Optional shared-secret auth: set CAD_EXPORT_TOKEN on both this service and
# the Next.js app. When set, /render requires a matching X-CAD-Token header.
# Unset (e.g. localhost dev on a private network) keeps the open behavior.
_TOKEN = os.environ.get("CAD_EXPORT_TOKEN", "")


def _check_token(provided: str | None) -> None:
    if not _TOKEN:
        return
    if not provided or not hmac.compare_digest(provided, _TOKEN):
        raise HTTPException(status_code=401, detail="invalid or missing token")


class RenderRequest(BaseModel):
    geometry: dict[str, Any]
    meta: dict[str, Any] | None = None


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "engine": ENGINE, "dwg": oda_available()}


@app.post("/render")
def render(
    body: RenderRequest,
    x_cad_token: str | None = Header(default=None),
) -> dict:
    _check_token(x_cad_token)
    try:
        return render_geometry(body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
