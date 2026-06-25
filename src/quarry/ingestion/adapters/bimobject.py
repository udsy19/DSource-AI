"""BimObjectAdapter — a BIM-library JSON export → CanonicalProduct.

BIM exports are already structured (nested dimensions, sustainability, a `model` block with a
glTF asset). The file is a JSON array of objects, or an object with a top-level `products` array.
Every BIM product carries geometry — that's the point of a BIM library — so `model_3d` is set.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

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


class BimObjectAdapter(SourceAdapter):
    def __init__(self, path: Path) -> None:
        self.path = path

    def fetch(self) -> list[dict[str, object]]:
        data = json.loads(self.path.read_text(encoding="utf-8"))
        records = data["products"] if isinstance(data, dict) else data
        return [dict(record) for record in records]

    def normalize(self, raw: dict[str, object]) -> CanonicalProduct:
        record: dict[str, Any] = dict(raw)
        dims: dict[str, Any] = record.get("dimensions", {})
        sust: dict[str, Any] = record.get("sustainability", {})
        media: dict[str, Any] = record.get("media", {})
        price: dict[str, Any] = record["price"]
        model: dict[str, Any] | None = record.get("model")
        weight: dict[str, Any] | None = record.get("weight")

        brand = record["brand"]
        name = record["name"]
        materials = list(record.get("materials", []))
        colors = list(record.get("colors", []))
        finish = record.get("finish")

        return CanonicalProduct(
            source=Source.bimobject,
            source_ref=record["source_ref"],
            brand=brand,
            name=name,
            category=record["category"],
            attributes=Attributes(
                dimensions=Dimensions(
                    w=dims.get("w"),
                    d=dims.get("d"),
                    h=dims.get("h"),
                    unit=dims.get("unit", "mm"),
                ),
                colors=colors,
                materials=materials,
                finish=finish,
                fire_rating=record.get("fire_rating"),
                acoustic_nrc=record.get("acoustic_nrc"),
                weight=(
                    Weight(value=weight["value"], unit=weight.get("unit", "kg")) if weight else None
                ),
            ),
            price=Price(
                amount=price["amount"],
                currency=price.get("currency", "USD"),
                unit=price.get("unit", "each"),
            ),
            lead_time_days=record.get("lead_time_days"),
            sustainability=Sustainability(
                has_epd=sust.get("has_epd", False),
                embodied_carbon=sust.get("embodied_carbon"),
                certifications=list(sust.get("certifications", [])),
            ),
            media=Media(
                images=list(media.get("images", [])),
                thumbnail=media.get("thumbnail"),
            ),
            model_3d=(
                Model3D(format=model.get("format", "gltf"), uri=model["uri"]) if model else None
            ),
            text_blob=build_text_blob(brand, name, materials, finish, colors),
            raw=record,
        )
