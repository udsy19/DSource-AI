"""In-process async job store — local-first, no external queue/broker (CLAUDE.md: no heavy infra yet).

Generation is CPU-bound and takes seconds, so the API submits it here and returns a job id
immediately; the client polls for status. State is in-memory for the single process — correct for
this single-user product. Swap for a real queue (Redis/RQ, Celery) when multi-user/multi-worker
lands; callers only depend on submit()/get(), so that swap won't touch the routers.
"""

from __future__ import annotations

import threading
import traceback
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable, Literal, TypedDict

JobStatus = Literal["processing", "ready", "failed"]


class Job(TypedDict):
    status: JobStatus
    result: Any
    error: str | None


class JobStore:
    """Runs a callable on a background thread and tracks its status/result. Thread-safe."""

    def __init__(self, max_workers: int = 2) -> None:
        self._pool = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="job")
        self._lock = threading.Lock()
        self._jobs: dict[str, Job] = {}

    def submit(self, fn: Callable[[], Any]) -> str:
        job_id = uuid.uuid4().hex
        with self._lock:
            self._jobs[job_id] = {"status": "processing", "result": None, "error": None}
        self._pool.submit(self._run, job_id, fn)
        return job_id

    def _run(self, job_id: str, fn: Callable[[], Any]) -> None:
        try:
            result = fn()
        except Exception as exc:  # noqa: BLE001 — the boundary: any failure becomes a failed job
            traceback.print_exc()
            with self._lock:
                self._jobs[job_id] = {"status": "failed", "result": None, "error": str(exc)}
            return
        with self._lock:
            self._jobs[job_id] = {"status": "ready", "result": result, "error": None}

    def get(self, job_id: str) -> Job | None:
        with self._lock:
            job = self._jobs.get(job_id)
            return dict(job) if job else None  # copy so callers can't mutate the store


jobs = JobStore()
