"""Runtime config — everything that varies (DB URL, embedding dim, rank weights) comes from
env/config, never hardcoded (convention §11).
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict

from .schema.match import Weights


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://quarry:quarry@localhost:5433/quarry"

    # pgvector column width — Agent B's default provider (open_clip ViT-B/32) emits 512.
    embed_dim: int = 512

    match_k: int = 20
    weight_style: float = 0.5
    weight_budget: float = 0.2
    weight_lead_time: float = 0.15
    weight_sustainability: float = 0.15

    @property
    def weights(self) -> Weights:
        return Weights(
            style=self.weight_style,
            budget=self.weight_budget,
            lead_time=self.weight_lead_time,
            sustainability=self.weight_sustainability,
        )


settings = Settings()
