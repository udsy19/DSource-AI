"""CAD element-reader route — upload a real DWG/DXF, get the structured ExtractedLayout.

This is the deterministic "read the actual design" path: walls, doors, rooms and the full
furniture inventory are recovered from layers and named blocks (see ingestion.cad_reader).
"""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from ..ingestion.cad_reader import read_cad
from ..ingestion.schema import ExtractedLayout

router = APIRouter(prefix="/api/ingest", tags=["ingest"])


@router.post("/cad", response_model=ExtractedLayout)
async def ingest_cad_elements(file: UploadFile = File(...)) -> ExtractedLayout:
    name = (file.filename or "").lower()
    if not name.endswith((".dxf", ".dwg")):
        raise HTTPException(status_code=422, detail="Expected a .dxf or .dwg CAD file.")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="Empty file.")
    try:
        return read_cad(content, file.filename or "")
    except Exception as exc:  # noqa: BLE001 - surface parse errors at the HTTP boundary
        raise HTTPException(status_code=422, detail=f"Could not read CAD file: {exc}") from exc
