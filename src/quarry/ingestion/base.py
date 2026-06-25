"""SourceAdapter — the seam between a messy source and the canonical schema.

Every source (CSV/PIM export, BIM library, scrape) implements this ABC. Source-specific parsing
lives in `fetch`; `normalize` maps one raw record into a validated CanonicalProduct. Nothing
downstream of ingestion ever sees a source-specific shape (architecture principle §4.5).
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from quarry.schema import CanonicalProduct


class SourceAdapter(ABC):
    @abstractmethod
    def fetch(self) -> list[dict[str, object]]:
        """Read the source into a list of raw, source-shaped records."""

    @abstractmethod
    def normalize(self, raw: dict[str, object]) -> CanonicalProduct:
        """Map one raw record to a validated CanonicalProduct."""

    def load(self) -> list[CanonicalProduct]:
        return [self.normalize(raw) for raw in self.fetch()]


def build_text_blob(
    brand: str, name: str, materials: list[str], finish: str | None, colors: list[str]
) -> str:
    """The text the embedding pipeline reads: brand + name + materials + finish + colors."""
    parts = [brand, name, *materials]
    if finish:
        parts.append(finish)
    parts.extend(colors)
    return " ".join(parts)
