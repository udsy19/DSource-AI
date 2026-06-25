from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

from ..db import ProductRow, get_session
from ..matching import match
from ..schema import BOQLine, MatchResponse

app = FastAPI(
    title="Quarry — digital product library (resolver)",
    version="0.1.0",
    description="BOQ line -> ranked real products. Hard filter, then deterministic rank.",
)

SessionDep = Annotated[Session, Depends(get_session)]


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/match", response_model=MatchResponse)
def post_match(line: BOQLine, session: SessionDep) -> MatchResponse:
    return match(line, session=session)


@app.get("/products/{product_id}")
def get_product(product_id: UUID, session: SessionDep) -> dict[str, object]:
    product = session.get(ProductRow, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail=f"product {product_id} not found")
    return {
        "id": str(product.id),
        "source": product.source,
        "source_ref": product.source_ref,
        "brand": product.brand,
        "name": product.name,
        "category": product.category,
        "price": {
            "amount": product.price_amount,
            "currency": product.price_currency,
            "unit": product.price_unit,
        },
        "dimensions": {
            "w": product.dim_w,
            "d": product.dim_d,
            "h": product.dim_h,
            "unit": product.dim_unit,
        },
        "acoustic_nrc": product.acoustic_nrc,
        "fire_rating": product.fire_rating,
        "lead_time_days": product.lead_time_days,
        "certifications": list(product.certifications),
        "has_epd": product.has_epd,
        "embodied_carbon": product.embodied_carbon,
        "has_geometry": product.model_3d_uri is not None,
        "model_3d": (
            {"format": product.model_3d_format, "uri": product.model_3d_uri}
            if product.model_3d_uri is not None
            else None
        ),
    }
