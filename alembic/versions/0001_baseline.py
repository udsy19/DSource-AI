"""baseline — pgvector extension + products table

Revision ID: 0001_baseline
Revises:
Create Date: 2026-06-25
"""
from __future__ import annotations

from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

import sqlalchemy as sa
from alembic import op

revision: str = "0001_baseline"
down_revision: str | None = None
branch_labels = None
depends_on = None

EMBED_DIM = 512  # historical: pgvector column width at baseline (config default)


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("source_ref", sa.String(512), nullable=False),
        sa.Column("brand", sa.String(200), nullable=False),
        sa.Column("name", sa.String(400), nullable=False),
        sa.Column("category", sa.String(120), nullable=False),
        sa.Column("dim_w", sa.Float()),
        sa.Column("dim_d", sa.Float()),
        sa.Column("dim_h", sa.Float()),
        sa.Column("dim_unit", sa.String(8), server_default="mm", nullable=False),
        sa.Column("price_amount", sa.Float(), nullable=False),
        sa.Column("price_currency", sa.String(8), server_default="USD", nullable=False),
        sa.Column("price_unit", sa.String(12), server_default="each", nullable=False),
        sa.Column("acoustic_nrc", sa.Float()),
        sa.Column("fire_rating", sa.String(40)),
        sa.Column("lead_time_days", sa.Integer()),
        sa.Column("certifications", postgresql.ARRAY(sa.String()), server_default="{}", nullable=False),
        sa.Column("has_epd", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("embodied_carbon", sa.Float()),
        sa.Column("model_3d_format", sa.String(10)),
        sa.Column("model_3d_uri", sa.String(1024)),
        sa.Column("text_blob", sa.Text(), server_default="", nullable=False),
        sa.Column("text_vec", Vector(EMBED_DIM)),
        sa.Column("image_vec", Vector(EMBED_DIM)),
        sa.Column("attributes", postgresql.JSONB(), server_default="{}", nullable=False),
        sa.Column("media", postgresql.JSONB(), server_default="{}", nullable=False),
        sa.Column("raw", postgresql.JSONB(), server_default="{}", nullable=False),
        sa.Column("ingested_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("source", "source_ref", name="uq_source_ref"),
    )
    op.create_index("ix_products_category", "products", ["category"])
    op.create_index("ix_products_source", "products", ["source"])


def downgrade() -> None:
    op.drop_index("ix_products_source", table_name="products")
    op.drop_index("ix_products_category", table_name="products")
    op.drop_table("products")
