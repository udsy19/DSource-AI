"""Render export seam: build_render_export emits 3D refs for products with geometry, flags
geometry-less selections as half-matches, and reports unknown ids. Plus the POST /export route."""

from __future__ import annotations

from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from quarry.export import build_render_export

from .conftest import insert_product


def test_build_render_export_emits_model_ref_for_product_with_geometry(session: Session) -> None:
    product = insert_product(session, model_3d_format="usd", model_3d_uri="s3://assets/x.usd")

    export = build_render_export(session, [product.id])

    assert export.missing_geometry == []
    assert export.not_found == []
    [asset] = export.assets
    assert asset.product_id == product.id
    assert asset.has_geometry is True
    assert asset.model_3d is not None
    assert asset.model_3d.format == "usd"
    assert asset.model_3d.uri == "s3://assets/x.usd"


def test_build_render_export_emits_exact_placement_for_mesh(session: Session) -> None:
    product = insert_product(session, model_3d_uri="s3://assets/x.gltf", dim_w=600, dim_d=600, dim_h=1100)

    export = build_render_export(session, [product.id])

    [asset] = export.assets
    assert asset.placement == "exact"
    assert asset.has_geometry is True
    assert export.unplaceable == []


def test_build_render_export_proxies_dimensions_without_mesh(session: Session) -> None:
    """Real dimensions but no mesh -> the render stage can place an honest dimensioned proxy box.
    It is a half-match (no real geometry) but NOT unplaceable."""
    product = insert_product(
        session, model_3d_format=None, model_3d_uri=None, dim_w=600, dim_d=600, dim_h=1100
    )

    export = build_render_export(session, [product.id])

    [asset] = export.assets
    assert asset.placement == "proxy"
    assert asset.has_geometry is False
    assert asset.model_3d is None
    assert asset.dimensions is not None and asset.dimensions.w == 600
    assert export.missing_geometry == [product.id]  # still no real mesh (§2 half-match)
    assert export.unplaceable == []  # but placeable as a proxy


def test_build_render_export_flags_unplaceable_without_mesh_or_dims(session: Session) -> None:
    product = insert_product(session, model_3d_format=None, model_3d_uri=None)  # no dims either

    export = build_render_export(session, [product.id])

    assert export.missing_geometry == [product.id]
    assert export.unplaceable == [product.id]
    [asset] = export.assets
    assert asset.placement == "none"
    assert asset.has_geometry is False
    assert asset.model_3d is None
    assert asset.dimensions is None


def test_build_render_export_reports_unknown_ids(session: Session) -> None:
    unknown = uuid4()

    export = build_render_export(session, [unknown])

    assert export.not_found == [unknown]
    assert export.assets == []


def test_build_render_export_partitions_a_mixed_selection(session: Session) -> None:
    with_geometry = insert_product(session)
    without_geometry = insert_product(session, model_3d_format=None, model_3d_uri=None)
    unknown = uuid4()

    export = build_render_export(session, [with_geometry.id, without_geometry.id, unknown])

    assert {a.product_id for a in export.assets} == {with_geometry.id, without_geometry.id}
    assert export.missing_geometry == [without_geometry.id]
    assert export.not_found == [unknown]


def test_post_export_returns_partitioned_payload(client: TestClient, session: Session) -> None:
    with_geometry = insert_product(session)
    without_geometry = insert_product(session, model_3d_format=None, model_3d_uri=None)
    unknown = uuid4()

    resp = client.post(
        "/export",
        json={"product_ids": [str(with_geometry.id), str(without_geometry.id), str(unknown)]},
    )

    assert resp.status_code == 200
    payload = resp.json()
    assert payload["not_found"] == [str(unknown)]
    assert payload["missing_geometry"] == [str(without_geometry.id)]
    by_id = {a["product_id"]: a for a in payload["assets"]}
    assert by_id[str(with_geometry.id)]["model_3d"]["uri"] == "s3://assets/chair.gltf"
    assert by_id[str(without_geometry.id)]["model_3d"] is None
