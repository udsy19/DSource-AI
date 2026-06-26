from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import ProductRow
from ..schema import Model3D


class RenderAsset(BaseModel):
    """One selected product's render-stage payload (the stage-4 -> stage-5 seam)."""

    product_id: UUID
    brand: str
    name: str
    category: str
    model_3d: Model3D | None
    has_geometry: bool


class RenderExport(BaseModel):
    assets: list[RenderAsset]
    missing_geometry: list[UUID]  # found, but no usable geometry — a half-match (CLAUDE.md §2)
    not_found: list[UUID]


def build_render_export(session: Session, product_ids: list[UUID]) -> RenderExport:
    rows = {row.id: row for row in session.query(ProductRow).filter(ProductRow.id.in_(product_ids))}

    assets: list[RenderAsset] = []
    missing_geometry: list[UUID] = []
    not_found: list[UUID] = []

    for product_id in product_ids:
        row = rows.get(product_id)
        if row is None:
            not_found.append(product_id)
            continue

        uri = row.model_3d_uri
        has_geometry = uri is not None
        if not has_geometry:
            missing_geometry.append(product_id)

        model_3d = Model3D(format=row.model_3d_format or "gltf", uri=uri) if uri is not None else None
        assets.append(
            RenderAsset(
                product_id=row.id,
                brand=row.brand,
                name=row.name,
                category=row.category,
                model_3d=model_3d,
                has_geometry=has_geometry,
            )
        )

    return RenderExport(assets=assets, missing_geometry=missing_geometry, not_found=not_found)
