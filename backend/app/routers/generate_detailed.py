"""Detailed-mode generate router — upload a floor plate + EXPLICIT room counts, get 3 test-fits.

The Qbiq "Detailed" flow (high control): the user states exact per-type room counts and a
placement preference per type. We ingest the CAD plate, place the requested rooms via
`generate_from_detailed`, and return the same `AlternativesResult` shape as /api/generate.

Request: multipart/form-data with
  - file: the .dxf/.dwg vector floor plate
  - program: a JSON string of the DetailedProgram, e.g.
      {"rooms": [{"type": "office", "count": 4, "placement": "window"},
                 {"type": "meeting", "count": 2, "placement": "core"},
                 {"type": "huddle", "count": 1, "placement": "flexible"}],
       "desk_type": "workstations", "desk_width_cm": 140, "desk_depth_cm": 70}
"""

from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field, ValidationError

from ..floorplan.dxf_ingest import ingest_cad
from ..jobs import jobs
from ..testfit.detailed import DetailedProgram, generate_from_detailed
from ..testfit.payloads import plan_from_payload

router = APIRouter(prefix="/api", tags=["generate"])


def run_detailed(content: bytes, filename: str, detailed: DetailedProgram):
    """Ingest the plate and place the requested rooms — the slow work, run inside a background job."""
    plan = ingest_cad(content, filename)
    return generate_from_detailed(plan, detailed)


@router.post("/generate/detailed")
async def generate_detailed(
    file: UploadFile = File(...),
    program: str = Form(...),
):
    """Submit a detailed generation as a background job (poll /api/generate/jobs/{job_id}). Fast
    input validation is synchronous; ingest + placement run off-thread."""
    if not (file.filename or "").lower().endswith((".dxf", ".dwg")):
        raise HTTPException(status_code=422, detail="Expected a .dxf or .dwg vector floor plate.")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="Empty file.")

    try:
        detailed = DetailedProgram.model_validate_json(program)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid detailed program: {exc}") from exc

    filename = file.filename or ""
    job_id = jobs.submit(lambda: run_detailed(content, filename, detailed))
    return {"job_id": job_id, "status": "processing"}


class IterateRequest(BaseModel):
    """Regenerate keeping pinned rooms — the iterate loop, working off the prior version's plan
    (no CAD re-upload/re-ingest). `locked` are instances pinned from a prior version."""

    plan: dict
    program: DetailedProgram
    locked: list[dict] = Field(default_factory=list)


@router.post("/generate/detailed/iterate")
def iterate_detailed(req: IterateRequest):
    return generate_from_detailed(plan_from_payload(req.plan), req.program, locked=req.locked)
