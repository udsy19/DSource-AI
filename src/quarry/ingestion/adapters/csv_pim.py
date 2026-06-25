"""CsvPimAdapter — a flat CSV/PIM export → CanonicalProduct.

PIM exports are one row per product with multi-value fields pipe-delimited (`colors`,
`materials`, `certifications`, `images`). Blank cells mean "unknown", not "empty list".
"""

from __future__ import annotations

import csv
from pathlib import Path

from quarry.ingestion.base import SourceAdapter, build_text_blob
from quarry.schema import (
    Attributes,
    CanonicalProduct,
    Dimensions,
    Media,
    Model3D,
    Price,
    Source,
    Sustainability,
    Weight,
)


def _cell(raw: dict[str, object], key: str) -> str:
    value = raw.get(key)
    return str(value).strip() if value is not None else ""


def _split(cell: str) -> list[str]:
    return [item.strip() for item in cell.split("|") if item.strip()]


def _opt_float(cell: str) -> float | None:
    return float(cell) if cell else None


def _opt_int(cell: str) -> int | None:
    return int(cell) if cell else None


def _opt_str(cell: str) -> str | None:
    return cell or None


class CsvPimAdapter(SourceAdapter):
    def __init__(self, path: Path) -> None:
        self.path = path

    def fetch(self) -> list[dict[str, object]]:
        with self.path.open(newline="", encoding="utf-8") as handle:
            return [dict(row) for row in csv.DictReader(handle)]

    def normalize(self, raw: dict[str, object]) -> CanonicalProduct:
        weight_kg = _cell(raw, "weight_kg")
        model_uri = _cell(raw, "model_3d_uri")

        brand = _cell(raw, "brand")
        name = _cell(raw, "name")
        materials = _split(_cell(raw, "materials"))
        colors = _split(_cell(raw, "colors"))
        finish = _opt_str(_cell(raw, "finish"))

        return CanonicalProduct(
            source=Source.csv_pim,
            source_ref=_cell(raw, "source_ref"),
            brand=brand,
            name=name,
            category=_cell(raw, "category"),
            attributes=Attributes(
                dimensions=Dimensions(
                    w=_opt_float(_cell(raw, "dim_w")),
                    d=_opt_float(_cell(raw, "dim_d")),
                    h=_opt_float(_cell(raw, "dim_h")),
                    unit=_cell(raw, "dim_unit") or "mm",
                ),
                colors=colors,
                materials=materials,
                finish=finish,
                fire_rating=_opt_str(_cell(raw, "fire_rating")),
                acoustic_nrc=_opt_float(_cell(raw, "acoustic_nrc")),
                weight=Weight(value=float(weight_kg), unit="kg") if weight_kg else None,
            ),
            price=Price(
                amount=float(_cell(raw, "price_amount")),
                currency=_cell(raw, "price_currency") or "USD",
                unit=_cell(raw, "price_unit") or "each",
            ),
            lead_time_days=_opt_int(_cell(raw, "lead_time_days")),
            sustainability=Sustainability(
                has_epd=_cell(raw, "has_epd").lower() in {"true", "1", "yes"},
                embodied_carbon=_opt_float(_cell(raw, "embodied_carbon")),
                certifications=_split(_cell(raw, "certifications")),
            ),
            media=Media(
                images=_split(_cell(raw, "images")),
                thumbnail=_opt_str(_cell(raw, "thumbnail")),
            ),
            model_3d=(
                Model3D(format=_cell(raw, "model_3d_format") or "gltf", uri=model_uri)
                if model_uri
                else None
            ),
            text_blob=build_text_blob(brand, name, materials, finish, colors),
            raw=dict(raw),
        )
