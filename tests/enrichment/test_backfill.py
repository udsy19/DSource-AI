from __future__ import annotations

from sqlalchemy.orm import Session

from quarry.enrichment import StubProvider, backfill_vectors

from .conftest import make_product


def test_backfill_fills_null_vectors(session: Session, provider: StubProvider) -> None:
    rows = [
        make_product("a", text_blob="oak task chair", image="https://x/a.jpg"),
        make_product("b", text_blob="felt wall panel", image="https://x/b.jpg"),
    ]
    session.add_all(rows)
    session.flush()

    counts = backfill_vectors(session, provider)

    assert counts == {"text_filled": 2, "image_filled": 2, "skipped": 0}
    for row in rows:
        session.refresh(row)
        assert row.text_vec is not None and len(row.text_vec) == 512
        assert row.image_vec is not None and len(row.image_vec) == 512


def test_backfill_is_idempotent(session: Session, provider: StubProvider) -> None:
    session.add(make_product("a", text_blob="oak chair", image="https://x/a.jpg"))
    session.flush()

    first = backfill_vectors(session, provider)
    second = backfill_vectors(session, provider)

    assert first["text_filled"] == 1
    assert second == {"text_filled": 0, "image_filled": 0, "skipped": 0}


def test_backfill_skips_image_when_no_media(session: Session, provider: StubProvider) -> None:
    row = make_product("a", text_blob="oak chair", image=None)
    session.add(row)
    session.flush()

    counts = backfill_vectors(session, provider)

    assert counts == {"text_filled": 1, "image_filled": 0, "skipped": 0}
    session.refresh(row)
    assert row.text_vec is not None
    assert row.image_vec is None


def test_backfill_uses_registered_provider_by_default(session: Session, provider: StubProvider) -> None:
    session.add(make_product("a", text_blob="oak chair", image="https://x/a.jpg"))
    session.flush()

    counts = backfill_vectors(session)

    assert counts["text_filled"] == 1
    assert counts["image_filled"] == 1
