"""POST /boq — the stage-3 batch seam: many BOQ lines -> a MatchResponse per line."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from .conftest import insert_product


def test_boq_returns_one_result_per_line_in_order(client: TestClient, session: Session) -> None:
    insert_product(session, category="ffe/seating/task-chair", price_amount=300.0)
    insert_product(
        session, category="finishes/acoustic/wall-panel", price_amount=80.0,
        price_unit="sqm", acoustic_nrc=0.9, fire_rating="Class A",
    )
    body = {
        "lines": [
            {"category": "ffe/seating/task-chair", "quantity": {"value": 1},
             "budget_ceiling": {"amount": 1000}},
            {"category": "finishes/acoustic/wall-panel", "quantity": {"value": 40, "unit": "sqm"},
             "budget_ceiling": {"amount": 200}},
        ]
    }
    resp = client.post("/boq", json=body)
    assert resp.status_code == 200
    results = resp.json()["results"]
    assert len(results) == 2
    # each MatchResponse echoes its own query, and order is preserved
    assert results[0]["query"]["category"] == "ffe/seating/task-chair"
    assert results[1]["query"]["category"] == "finishes/acoustic/wall-panel"
    assert len(results[0]["candidates"]) == 1
    assert len(results[1]["candidates"]) == 1


def test_boq_applies_hard_constraints_per_line(client: TestClient, session: Session) -> None:
    insert_product(session, source_ref="cheap", price_amount=300.0)
    insert_product(session, source_ref="pricey", price_amount=900.0)
    body = {
        "lines": [
            {"category": "ffe/seating/task-chair", "quantity": {"value": 1},
             "budget_ceiling": {"amount": 500, "basis": "per_unit"}},
        ]
    }
    resp = client.post("/boq", json=body)
    candidates = resp.json()["results"][0]["candidates"]
    assert len(candidates) == 1  # the £900 chair is eliminated, not penalized


def test_boq_empty_batch_returns_empty_results(client: TestClient) -> None:
    resp = client.post("/boq", json={"lines": []})
    assert resp.status_code == 200
    assert resp.json() == {"results": []}
