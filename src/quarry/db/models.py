from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, DateTime, Float, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from ..config import settings
from .base import Base


class ProductRow(Base):
    """Mirrors CanonicalProduct. Filter fields (category/dims/price/certs/nrc/fire) are columns
    for the SQL hard filter; nested attributes/media/raw are JSONB; vectors are pgvector."""

    __tablename__ = "products"
    __table_args__ = (UniqueConstraint("source", "source_ref", name="uq_source_ref"),)

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    source: Mapped[str] = mapped_column(String(20), index=True)
    source_ref: Mapped[str] = mapped_column(String(512))
    brand: Mapped[str] = mapped_column(String(200))
    name: Mapped[str] = mapped_column(String(400))
    category: Mapped[str] = mapped_column(String(120), index=True)

    # ── hard-filter columns ──
    dim_w: Mapped[float | None] = mapped_column(Float, nullable=True)
    dim_d: Mapped[float | None] = mapped_column(Float, nullable=True)
    dim_h: Mapped[float | None] = mapped_column(Float, nullable=True)
    dim_unit: Mapped[str] = mapped_column(String(8), default="mm")
    price_amount: Mapped[float] = mapped_column(Float)
    price_currency: Mapped[str] = mapped_column(String(8), default="USD")
    price_unit: Mapped[str] = mapped_column(String(12), default="each")
    acoustic_nrc: Mapped[float | None] = mapped_column(Float, nullable=True)
    fire_rating: Mapped[str | None] = mapped_column(String(40), nullable=True)
    lead_time_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    certifications: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    has_epd: Mapped[bool] = mapped_column(Boolean, default=False)
    embodied_carbon: Mapped[float | None] = mapped_column(Float, nullable=True)

    # ── render seam ──
    model_3d_format: Mapped[str | None] = mapped_column(String(10), nullable=True)
    model_3d_uri: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    # ── embeddings ──
    text_blob: Mapped[str] = mapped_column(String, default="")
    text_vec: Mapped[list[float] | None] = mapped_column(Vector(settings.embed_dim), nullable=True)
    image_vec: Mapped[list[float] | None] = mapped_column(Vector(settings.embed_dim), nullable=True)

    # ── remaining canonical fields, kept structured ──
    attributes: Mapped[dict] = mapped_column(JSONB, default=dict)  # colors/materials/finish/weight
    media: Mapped[dict] = mapped_column(JSONB, default=dict)
    raw: Mapped[dict] = mapped_column(JSONB, default=dict)

    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
