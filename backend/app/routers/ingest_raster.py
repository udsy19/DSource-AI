"""Raster / vector-PDF ingest router — upload a JPG/PNG/PDF with no CAD layers, get an
ExtractedLayout.

Sibling to `POST /api/ingest/cad` (owned by another agent); this owns `POST /api/ingest/raster`.
Vector PDFs are read directly (paths + text); rasters go through classical CV + optional OCR. The
result carries `needs_confirmation` whenever no real-world scale was derivable.
"""

from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..ingestion.raster_reader import read_layout
from ..ingestion.schema import ExtractedLayout

router = APIRouter(prefix="/api/ingest", tags=["ingest"])

_RASTER_EXT = (".png", ".jpg", ".jpeg", ".pdf")


@router.post("/raster", response_model=ExtractedLayout)
async def ingest_raster_layout(
    file: UploadFile = File(...),
    px_per_ft: float | None = Form(None),
) -> ExtractedLayout:
    if not (file.filename or "").lower().endswith(_RASTER_EXT):
        raise HTTPException(status_code=422, detail="Expected a .png, .jpg, or .pdf plan.")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="Empty file.")
    try:
        return read_layout(content, file.filename or "", px_per_ft=px_per_ft)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
