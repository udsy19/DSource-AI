"""Taxonomy — the controlled category tree (the orchestrator owns data/taxonomy.yaml).

Leaf paths (e.g. "ffe/seating/task-chair") are the `category` values products and BOQ lines use.
Leaves may declare the category-specific hard-constraint keys that apply to them.
"""

from __future__ import annotations

from pathlib import Path

import yaml
from pydantic import BaseModel, Field


class TaxonomyNode(BaseModel):
    key: str
    label: str
    hard_constraint_keys: list[str] = Field(default_factory=list)
    children: list[TaxonomyNode] = Field(default_factory=list)

    @property
    def is_leaf(self) -> bool:
        return not self.children


class Taxonomy(BaseModel):
    roots: list[TaxonomyNode]

    def leaf_paths(self) -> list[str]:
        paths: list[str] = []

        def walk(node: TaxonomyNode, prefix: str) -> None:
            path = f"{prefix}/{node.key}" if prefix else node.key
            if node.is_leaf:
                paths.append(path)
            for child in node.children:
                walk(child, path)

        for root in self.roots:
            walk(root, "")
        return paths

    def is_known_leaf(self, category: str) -> bool:
        return category in set(self.leaf_paths())


def load_taxonomy(path: Path) -> Taxonomy:
    data = yaml.safe_load(path.read_text())
    return Taxonomy(roots=[TaxonomyNode.model_validate(node) for node in data])
