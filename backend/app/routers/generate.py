"""Concept-mode generate router — upload a floor plate + a 4-dial PROGRAM, get 3 test-fit options.

The Qbiq "Concept" flow: instead of the engine's low-level specs, the user sets planning style,
desk type, desk size, and seat distribution. We ingest the CAD plate, translate the program via
`generate_from_concept`, and return the same `AlternativesResult` shape as /api/testfit/alternatives.
"""

from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..floorplan.dxf_ingest import ingest_cad
from ..jobs import jobs
from ..testfit.concept import ConceptProgram, generate_from_concept

router = APIRouter(prefix="/api", tags=["generate"])


def run_concept(content: bytes, filename: str, concept: ConceptProgram):
    """Ingest the plate and generate the concept test-fits. Ingest + generation are the slow part,
    so this runs inside a background job; the router does the fast input validation up front."""
    plan = ingest_cad(content, filename)
    return generate_from_concept(plan, concept)


@router.post("/generate")
async def generate(
    file: UploadFile = File(...),
    planning_style: str = Form("modern"),
    desk_type: str = Form("workstations"),
    desk_width_cm: int = Form(140),
    desk_depth_cm: int = Form(70),
    closed_ratio: float = Form(0.2),
):
    """Submit a concept generation as a background job. Fast input validation runs synchronously
    (so bad input still 422s immediately); ingest + placement run off-thread. Returns a job id to
    poll at /api/generate/jobs/{job_id}."""
    if not (file.filename or "").lower().endswith((".dxf", ".dwg")):
        raise HTTPException(status_code=422, detail="Expected a .dxf or .dwg vector floor plate.")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="Empty file.")

    try:
        concept = ConceptProgram(
            planning_style=planning_style,
            desk_type=desk_type,
            desk_width_cm=desk_width_cm,
            desk_depth_cm=desk_depth_cm,
            closed_ratio=closed_ratio,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid concept program: {exc}") from exc

    filename = file.filename or ""
    job_id = jobs.submit(lambda: run_concept(content, filename, concept))
    return {"job_id": job_id, "status": "processing"}


@router.get("/generate/jobs/{job_id}")
def generate_job(job_id: str):
    """Poll a generation job. Returns {status: processing|ready|failed, result, error}. `result`
    carries the AlternativesResult once ready; `error` the message if it failed."""
    job = jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Unknown job id.")
    return job
