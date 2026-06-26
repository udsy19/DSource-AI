"""Render export — the stage-4 (Quarry) -> stage-5 (Render) downstream seam. Emits each selected
product's 3D-asset ref; flags selections with no usable geometry as half-matches (CLAUDE.md §2)."""

from .service import RenderAsset, RenderExport, build_render_export

__all__ = ["RenderAsset", "RenderExport", "build_render_export"]
