"""Async job store — the local-first background-job mechanism behind /api/generate.

Generation is submitted to a thread pool and polled for status, so the API can return immediately
(Draft → Processing → Ready) instead of blocking ~seconds. These tests lock the lifecycle and prove
a real detailed generation runs to completion off-thread.
"""

import time

from fastapi.testclient import TestClient
from shapely.geometry import Polygon  # noqa: F401 — parity with test_detailed's imports

from app.jobs import JobStore, jobs
from app.main import app
from app.floorplan.dxf_ingest import PlanModel
from app.testfit.detailed import DetailedProgram, RoomRequest, generate_from_detailed


def _await(store: JobStore, job_id: str, timeout: float = 10.0) -> dict:
    """Poll until the job leaves 'processing' (bounded — no infinite hang if a worker wedges)."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        job = store.get(job_id)
        assert job is not None
        if job["status"] != "processing":
            return job
        time.sleep(0.02)
    raise AssertionError("job did not finish within timeout")


def _plan() -> PlanModel:
    w, h = 140.0, 90.0
    boundary = [(0.0, 0.0), (w, 0.0), (w, h), (0.0, h), (0.0, 0.0)]
    return PlanModel(
        units="feet", sqft_factor=1.0, boundary=boundary,
        gross_area_sf=w * h, core_area_sf=0.0, usable_area_sf=w * h,
        columns=[], cores=[], boundary_source="polyline",
        needs_confirmation=False, notes=[],
    )


def test_job_runs_to_ready_with_result():
    store = JobStore()
    job_id = store.submit(lambda: 21 * 2)
    job = _await(store, job_id)
    assert job["status"] == "ready"
    assert job["result"] == 42
    assert job["error"] is None


def test_failing_job_is_captured_not_raised():
    store = JobStore()
    job_id = store.submit(lambda: 1 / 0)
    job = _await(store, job_id)
    assert job["status"] == "failed"
    assert job["result"] is None
    assert "division by zero" in job["error"]


def test_unknown_job_is_none():
    assert JobStore().get("nope") is None


def test_detailed_generation_runs_off_thread():
    # The real work the endpoint backgrounds: a full detailed generation must complete in the pool
    # and yield the 3 scored variants — proving generation is job-safe, not just toy callables.
    program = DetailedProgram(rooms=[RoomRequest(type="office", count=4, placement="window")])
    plan = _plan()
    job_id = jobs.submit(lambda: generate_from_detailed(plan, program))
    job = _await(jobs, job_id)
    assert job["status"] == "ready"
    assert [a["id"] for a in job["result"]["alternatives"]] == ["A", "B", "C"]


def test_poll_endpoint_404_for_unknown_job():
    client = TestClient(app)
    assert client.get("/api/generate/jobs/does-not-exist").status_code == 404
