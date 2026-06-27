"""Render export — the stage-4 (Quarry) -> stage-5 (Render) downstream seam. Per selected product
it emits a placement the render stage can act on, using only real data: an exact mesh, an honest
dimensioned proxy box (real dims, no mesh), or none (flagged half-match, CLAUDE.md §2)."""

from .service import RenderAsset, RenderExport, build_render_export

__all__ = ["RenderAsset", "RenderExport", "build_render_export"]
