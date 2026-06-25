"""CanonicalProduct — the one shape every source normalizes into (frozen contract, §7).

Source-specific mess lives only in ingestion adapters and the `raw` field; nothing downstream
of ingestion ever sees a source-specific shape.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class Source(str, Enum):
    csv_pim = "csv_pim"
    bimobject = "bimobject"
    scrape = "scrape"
    seed = "seed"


class Dimensions(BaseModel):
    w: float | None = None
    d: float | None = None
    h: float | None = None
    unit: str = "mm"


class Weight(BaseModel):
    value: float
    unit: str = "kg"


class Price(BaseModel):
    amount: float
    currency: str = "USD"
    unit: str = "each"  # each | sqm | linear_m


class Sustainability(BaseModel):
    has_epd: bool = False
    embodied_carbon: float | None = None  # kgCO2e, from EPD/EC3 where available
    certifications: list[str] = Field(default_factory=list)


class TextureMaps(BaseModel):
    albedo: str | None = None
    normal: str | None = None
    roughness: str | None = None


class Media(BaseModel):
    images: list[str] = Field(default_factory=list)
    thumbnail: str | None = None
    texture_maps: TextureMaps | None = None


class Model3D(BaseModel):
    format: str  # gltf | usd | rfa
    uri: str


class Attributes(BaseModel):
    dimensions: Dimensions = Field(default_factory=Dimensions)
    colors: list[str] = Field(default_factory=list)
    materials: list[str] = Field(default_factory=list)
    finish: str | None = None
    fire_rating: str | None = None
    acoustic_nrc: float | None = None  # noise reduction coefficient — acoustic panels
    weight: Weight | None = None


class CanonicalProduct(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    source: Source
    source_ref: str  # original id or URL
    brand: str
    name: str
    category: str  # taxonomy leaf path, e.g. "ffe/seating/task-chair"
    attributes: Attributes = Field(default_factory=Attributes)
    price: Price
    lead_time_days: int | None = None
    sustainability: Sustainability = Field(default_factory=Sustainability)
    media: Media = Field(default_factory=Media)
    model_3d: Model3D | None = None  # null = no usable geometry for the render seam
    text_blob: str = ""  # concatenated text used for the text embedding
    text_vec: list[float] | None = None
    image_vec: list[float] | None = None
    raw: dict[str, object] = Field(default_factory=dict)  # untouched source payload
    ingested_at: datetime | None = None
    updated_at: datetime | None = None
