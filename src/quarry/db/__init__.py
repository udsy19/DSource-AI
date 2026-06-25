"""Database layer — SQLAlchemy models mirroring the schema contract, on Postgres + pgvector.
Hard-filterable fields are real columns (so the match filter is a SQL WHERE); the rest of the
canonical product is kept in JSONB.
"""

from .base import Base, SessionLocal, engine, get_session
from .models import ProductRow

__all__ = ["Base", "ProductRow", "SessionLocal", "engine", "get_session"]
