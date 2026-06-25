"""Idempotent upsert of CanonicalProducts into Postgres, keyed on (source, source_ref).

Hard-filter fields become columns (the match filter is a SQL WHERE); colors/materials/finish/
weight go in `attributes` JSONB; `media` and the untouched source payload `raw` are JSONB too.
Re-running with the same data updates in place and creates nothing — the contract's DoD.
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from quarry.db import ProductRow
from quarry.schema import CanonicalProduct


@dataclass
class UpsertResult:
    created: int = 0
    updated: int = 0


def _columns(product: CanonicalProduct) -> dict[str, object]:
    attrs = product.attributes
    dims = attrs.dimensions
    return {
        "brand": product.brand,
        "name": product.name,
        "category": product.category,
        "dim_w": dims.w,
        "dim_d": dims.d,
        "dim_h": dims.h,
        "dim_unit": dims.unit,
        "price_amount": product.price.amount,
        "price_currency": product.price.currency,
        "price_unit": product.price.unit,
        "acoustic_nrc": attrs.acoustic_nrc,
        "fire_rating": attrs.fire_rating,
        "lead_time_days": product.lead_time_days,
        "certifications": list(product.sustainability.certifications),
        "has_epd": product.sustainability.has_epd,
        "embodied_carbon": product.sustainability.embodied_carbon,
        "model_3d_format": product.model_3d.format if product.model_3d else None,
        "model_3d_uri": product.model_3d.uri if product.model_3d else None,
        "text_blob": product.text_blob,
        "attributes": {
            "colors": list(attrs.colors),
            "materials": list(attrs.materials),
            "finish": attrs.finish,
            "weight": attrs.weight.model_dump() if attrs.weight else None,
        },
        "media": product.media.model_dump(),
        "raw": product.raw,
    }


def upsert_products(session: Session, products: list[CanonicalProduct]) -> UpsertResult:
    result = UpsertResult()
    for product in products:
        row = session.scalar(
            select(ProductRow).where(
                ProductRow.source == product.source.value,
                ProductRow.source_ref == product.source_ref,
            )
        )
        columns = _columns(product)
        if row is None:
            session.add(
                ProductRow(source=product.source.value, source_ref=product.source_ref, **columns)
            )
            result.created += 1
        else:
            for key, value in columns.items():
                setattr(row, key, value)
            result.updated += 1
    session.flush()
    return result
