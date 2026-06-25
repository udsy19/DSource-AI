"""Vector backfill — fill NULL text_vec/image_vec on ProductRow from text_blob and primary image.

Idempotent (already-vectorized rows are skipped) and transactional. Agent C's match() reads these
columns; this job is what makes them non-null.
"""

from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from quarry.db import ProductRow
from quarry.enrichment.provider import EmbeddingProvider, get_provider


def _primary_image(media: dict[str, object]) -> str | None:
    images = media.get("images") or []
    if isinstance(images, list) and images:
        return str(images[0])
    thumbnail = media.get("thumbnail")
    return str(thumbnail) if thumbnail is not None else None


def backfill_vectors(
    session: Session,
    provider: EmbeddingProvider | None = None,
    limit: int | None = None,
) -> dict[str, int]:
    provider = provider or get_provider()

    query = select(ProductRow).where(
        or_(ProductRow.text_vec.is_(None), ProductRow.image_vec.is_(None))
    )
    if limit is not None:
        query = query.limit(limit)

    text_filled = 0
    image_filled = 0
    skipped = 0

    for row in session.execute(query).scalars():
        changed = False

        if row.text_vec is None and row.text_blob:
            row.text_vec = provider.embed_text(row.text_blob)
            text_filled += 1
            changed = True

        if row.image_vec is None:
            image = _primary_image(row.media or {})
            if image is not None:
                row.image_vec = provider.embed_image(image)
                image_filled += 1
                changed = True

        if not changed:
            skipped += 1

    session.commit()
    return {"text_filled": text_filled, "image_filled": image_filled, "skipped": skipped}
