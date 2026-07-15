"""FastAPI CAD-export microservice: floor-plan geometry JSON -> DXF/DWG."""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from render import ENGINE, oda_available, render_geometry

app = FastAPI(title="cad-export", version="1.0.0")


class RenderRequest(BaseModel):
    geometry: dict[str, Any]
    meta: dict[str, Any] | None = None


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "engine": ENGINE, "dwg": oda_available()}


@app.post("/render")
def render(body: RenderRequest) -> dict:
    try:
        return render_geometry(body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
