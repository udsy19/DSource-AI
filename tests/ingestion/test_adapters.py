from __future__ import annotations

import json
from pathlib import Path

from quarry.ingestion.adapters import BimObjectAdapter, CsvPimAdapter
from quarry.schema import CanonicalProduct, Source, load_taxonomy

TAXONOMY = Path(__file__).resolve().parents[2] / "data" / "taxonomy.yaml"

CSV_FIXTURE = (
    "source_ref,brand,name,category,dim_w,dim_d,dim_h,dim_unit,price_amount,price_currency,"
    "price_unit,fire_rating,acoustic_nrc,materials,colors,finish,weight_kg,lead_time_days,"
    "has_epd,embodied_carbon,certifications,images,thumbnail,model_3d_format,model_3d_uri\n"
    "pim:test-panel,Testex,Felt Panel,finishes/acoustic/wall-panel,600,24,600,mm,80,USD,sqm,"
    "Class A,0.85,PET Felt|Recycled Polyester,Slate|Ash,Matte,3.1,14,true,4.8,"
    "GREENGUARD|CDPH,https://x/a.jpg|https://x/b.jpg,https://x/thumb.jpg,,\n"
)

BIM_FIXTURE = {
    "products": [
        {
            "source_ref": "bim:test-chair",
            "brand": "Testseat",
            "name": "Mesh Task Chair",
            "category": "ffe/seating/task-chair",
            "dimensions": {"w": 686, "d": 668, "h": 1041, "unit": "mm"},
            "materials": ["Mesh", "Aluminium"],
            "colors": ["Graphite"],
            "finish": "Matte",
            "fire_rating": "Class A",
            "weight": {"value": 18.6, "unit": "kg"},
            "price": {"amount": 940.0, "currency": "USD", "unit": "each"},
            "lead_time_days": 30,
            "sustainability": {
                "has_epd": True,
                "embodied_carbon": 72.4,
                "certifications": ["GREENGUARD Gold"],
            },
            "media": {"images": ["https://x/chair.jpg"], "thumbnail": "https://x/chair_thumb.jpg"},
            "model": {"format": "gltf", "uri": "https://assets/chair.gltf"},
        }
    ]
}


def test_csv_normalize_yields_valid_product_on_real_leaf(tmp_path: Path) -> None:
    path = tmp_path / "panels.csv"
    path.write_text(CSV_FIXTURE, encoding="utf-8")

    products = CsvPimAdapter(path).load()

    assert len(products) == 1
    product = products[0]
    assert isinstance(product, CanonicalProduct)
    assert product.source is Source.csv_pim
    assert load_taxonomy(TAXONOMY).is_known_leaf(product.category)
    assert product.attributes.acoustic_nrc == 0.85
    assert product.attributes.fire_rating == "Class A"
    assert product.price.unit == "sqm"
    assert product.attributes.materials == ["PET Felt", "Recycled Polyester"]
    assert product.sustainability.has_epd is True
    assert product.sustainability.certifications == ["GREENGUARD", "CDPH"]
    assert product.model_3d is None
    assert "Testex" in product.text_blob and "PET Felt" in product.text_blob


def test_bim_normalize_carries_gltf_model_ref(tmp_path: Path) -> None:
    path = tmp_path / "chairs.json"
    path.write_text(json.dumps(BIM_FIXTURE), encoding="utf-8")

    products = BimObjectAdapter(path).load()

    assert len(products) == 1
    product = products[0]
    assert isinstance(product, CanonicalProduct)
    assert product.source is Source.bimobject
    assert load_taxonomy(TAXONOMY).is_known_leaf(product.category)
    assert product.model_3d is not None
    assert product.model_3d.format == "gltf"
    assert product.model_3d.uri == "https://assets/chair.gltf"
    assert product.attributes.dimensions.w == 686
    assert product.price.amount == 940.0
