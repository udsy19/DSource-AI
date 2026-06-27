from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import ProductRow
from ..schema import Dimensions, Model3D

Placement = Literal["exact", "proxy", "none"]


class RenderAsset(BaseModel):
    """One selected product's render-stage payload (the stage-4 -> stage-5 seam).

    ``placement`` tells the render stage how it can place this product, using only real data:
    - ``exact``  — a real product mesh (``model_3d``); place it as-is.
    - ``proxy``  — no mesh, but real dimensions; place an HONEST dimensioned bounding box. It is a
                   stand-in, never the product's true geometry — the render stage must mark it so.
    - ``none``   — no mesh and no dimensions; genuinely unplaceable (CLAUDE.md §2 half-match).
    """

    product_id: UUID
    brand: str
    name: str
    category: str
    placement: Placement
    model_3d: Model3D | None  # set iff placement == "exact"
    dimensions: Dimensions | None  # real w/d/h when known — sizes the proxy box
    has_geometry: bool  # a real mesh is present (placement == "exact")


class RenderExport(BaseModel):
    assets: list[RenderAsset]
    missing_geometry: list[UUID]  # no real mesh (proxy or none) — a half-match (CLAUDE.md §2)
    unplaceable: list[UUID]  # placement == "none": no mesh AND no dimensions, can't place at all
    not_found: list[UUID]


def _dimensions(row: ProductRow) -> Dimensions | None:
    """Real product dimensions, only when all three axes are known (a box needs w, d, and h)."""
    if row.dim_w is None or row.dim_d is None or row.dim_h is None:
        return None
    return Dimensions(w=row.dim_w, d=row.dim_d, h=row.dim_h, unit=row.dim_unit)


def build_render_export(session: Session, product_ids: list[UUID]) -> RenderExport:
    rows = {row.id: row for row in session.query(ProductRow).filter(ProductRow.id.in_(product_ids))}

    assets: list[RenderAsset] = []
    missing_geometry: list[UUID] = []
    unplaceable: list[UUID] = []
    not_found: list[UUID] = []

    for product_id in product_ids:
        row = rows.get(product_id)
        if row is None:
            not_found.append(product_id)
            continue

        uri = row.model_3d_uri
        dimensions = _dimensions(row)
        if uri is not None:
            placement: Placement = "exact"
            model_3d = Model3D(format=row.model_3d_format or "gltf", uri=uri)
        elif dimensions is not None:
            placement = "proxy"
            model_3d = None
        else:
            placement = "none"
            model_3d = None

        if placement != "exact":
            missing_geometry.append(product_id)
        if placement == "none":
            unplaceable.append(product_id)

        assets.append(
            RenderAsset(
                product_id=row.id,
                brand=row.brand,
                name=row.name,
                category=row.category,
                placement=placement,
                model_3d=model_3d,
                dimensions=dimensions,
                has_geometry=placement == "exact",
            )
        )

    return RenderExport(
        assets=assets,
        missing_geometry=missing_geometry,
        unplaceable=unplaceable,
        not_found=not_found,
    )
