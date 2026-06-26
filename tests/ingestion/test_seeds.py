from __future__ import annotations

from collections import Counter
from pathlib import Path

from quarry.ingestion.run import SEEDS_DIR, _adapter_for
from quarry.schema import CanonicalProduct, Source, load_taxonomy

TAXONOMY = Path(__file__).resolve().parents[2] / "data" / "taxonomy.yaml"
V1_LEAVES = {"finishes/acoustic/wall-panel", "ffe/seating/task-chair"}


def _load_all() -> list[CanonicalProduct]:
    products: list[CanonicalProduct] = []
    for path in sorted(SEEDS_DIR.iterdir()):
        if path.suffix in {".csv", ".json"}:
            products.extend(_adapter_for(path).load())
    return products


def test_seeds_yield_valid_products_across_both_leaves() -> None:
    taxonomy = load_taxonomy(TAXONOMY)
    products = _load_all()

    assert len(products) >= 10
    for product in products:
        # re-validation proves every seed is schema-valid end to end
        assert CanonicalProduct.model_validate(product.model_dump()) == product
        assert taxonomy.is_known_leaf(product.category)

    by_leaf = Counter(p.category for p in products)
    assert V1_LEAVES <= set(by_leaf)
    assert by_leaf["finishes/acoustic/wall-panel"] >= 5
    assert by_leaf["ffe/seating/task-chair"] >= 5


def test_spec_acoustic_panels_are_valid() -> None:
    # Trade/PIM panels declare lab acoustics (NRC + fire rating, priced per sqm). Real
    # e-commerce panels (Shopify) legitimately lack them — and the hard filter correctly
    # excludes such panels from NRC-floored BOQ lines (NULL nrc can't prove compliance).
    # So validate only the panels that actually declare a spec.
    panels = [p for p in _load_all() if p.category == "finishes/acoustic/wall-panel"]
    spec_panels = [p for p in panels if p.attributes.acoustic_nrc is not None]
    assert spec_panels  # at least the spec'd panels carry acoustics
    for panel in spec_panels:
        assert 0.5 <= panel.attributes.acoustic_nrc <= 1.0
        assert panel.attributes.fire_rating is not None
        assert panel.price.unit == "sqm"


def test_bim_task_chairs_carry_geometry_for_render_seam() -> None:
    # BIM-library chairs carry glTF by definition. PIM/scraped chairs (real catalog data) may
    # legitimately lack a 3D asset — that's exactly why has_geometry is a per-product flag, and
    # the render stage filters on it rather than assuming geometry exists.
    bim_chairs = [
        p for p in _load_all()
        if p.category == "ffe/seating/task-chair" and p.source == Source.bimobject
    ]
    assert bim_chairs
    for chair in bim_chairs:
        assert chair.model_3d is not None
        assert chair.model_3d.format == "gltf"
        assert chair.price.unit == "each"
