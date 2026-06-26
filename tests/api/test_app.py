"""API surface: /healthz, POST /match (ranked candidates + breakdowns), GET /products/{id}."""

from __future__ import annotations

from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from .conftest import insert_product


def test_healthz_ok(client: TestClient) -> None:
    resp = client.get("/healthz")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_post_match_returns_ranked_candidates_with_breakdowns(
    client: TestClient, session: Session
) -> None:
    insert_product(session, price_amount=300.0)
    insert_product(session, price_amount=600.0)
    body = {
        "category": "ffe/seating/task-chair",
        "quantity": {"value": 1},
        "budget_ceiling": {"amount": 1000, "basis": "per_unit"},
    }
    resp = client.post("/match", json=body)
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["query"]["category"] == "ffe/seating/task-chair"
    assert payload["weights_used"]["style"] == 0.45
    assert payload["weights_used"]["attribute"] == 0.15
    candidates = payload["candidates"]
    assert len(candidates) == 2
    scores = [c["score"] for c in candidates]
    assert scores == sorted(scores, reverse=True)
    for candidate in candidates:
        assert candidate["hard_pass"] is True
        assert "category" in candidate["breakdown"]["filters_passed"]
        assert "attribute_match" in candidate["breakdown"]
        assert candidate["has_geometry"] is True


def test_post_match_excludes_hard_failures(client: TestClient, session: Session) -> None:
    good = insert_product(session, price_amount=300.0)
    bad = insert_product(session, price_amount=2000.0)
    body = {
        "category": "ffe/seating/task-chair",
        "quantity": {"value": 1},
        "budget_ceiling": {"amount": 1000, "basis": "per_unit"},
    }
    ids = {c["product_id"] for c in client.post("/match", json=body).json()["candidates"]}
    assert str(good.id) in ids
    assert str(bad.id) not in ids


def test_get_product_found_then_missing(client: TestClient, session: Session) -> None:
    product = insert_product(session)
    found = client.get(f"/products/{product.id}")
    assert found.status_code == 200
    body = found.json()
    assert body["id"] == str(product.id)
    assert body["brand"] == "Acme"
    assert body["has_geometry"] is True

    missing = client.get(f"/products/{uuid4()}")
    assert missing.status_code == 404
