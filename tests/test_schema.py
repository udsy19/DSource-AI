from pathlib import Path

from quarry.schema import (
    BOQLine,
    BudgetCeiling,
    Breakdown,
    Candidate,
    CanonicalProduct,
    MatchResponse,
    Price,
    Quantity,
    Source,
    Weights,
    load_taxonomy,
)

TAXONOMY = Path(__file__).resolve().parents[1] / "data" / "taxonomy.yaml"
V1_LEAVES = {"finishes/acoustic/wall-panel", "ffe/seating/task-chair"}


def test_canonical_product_minimal_valid():
    p = CanonicalProduct(
        source=Source.seed, source_ref="seed:chair-1", brand="Acme",
        name="Task Chair X", category="ffe/seating/task-chair",
        price=Price(amount=420, currency="USD", unit="each"),
    )
    assert p.id is not None
    assert p.attributes.acoustic_nrc is None  # nullable per field
    assert p.model_3d is None                  # null = no geometry for the render seam


def test_canonical_product_round_trips():
    p = CanonicalProduct(
        source=Source.csv_pim, source_ref="pim:42", brand="Acme", name="Panel",
        category="finishes/acoustic/wall-panel", price=Price(amount=90, unit="sqm"),
    )
    assert CanonicalProduct.model_validate(p.model_dump()) == p


def test_boqline_carries_hard_constraints():
    line = BOQLine(
        category="finishes/acoustic/wall-panel",
        quantity=Quantity(value=40, unit="sqm"),
        budget_ceiling=BudgetCeiling(amount=120, basis="per_unit"),
        required_certs=["GREENGUARD"],
    )
    line.hard_constraints.min_acoustic_nrc = 0.8
    assert line.hard_constraints.min_acoustic_nrc == 0.8
    assert "GREENGUARD" in line.required_certs


def test_match_response_echoes_query_and_weights():
    line = BOQLine(category="ffe/seating/task-chair", quantity=Quantity(value=1),
                   budget_ceiling=BudgetCeiling(amount=500))
    p = CanonicalProduct(source=Source.seed, source_ref="s1", brand="Acme", name="Chair",
                         category="ffe/seating/task-chair", price=Price(amount=420))
    resp = MatchResponse(
        query=line, weights_used=Weights(),
        candidates=[Candidate(
            product_id=p.id, score=0.87, has_geometry=True,
            breakdown=Breakdown(style_similarity=0.9, attribute_match=0.6, budget_fit=0.8,
                                lead_time_score=0.7, sustainability_bonus=0.5,
                                filters_passed=["category", "budget"]),
        )],
    )
    assert resp.query.category == "ffe/seating/task-chair"
    assert resp.candidates[0].breakdown.filters_passed  # auditable: why it passed


def test_taxonomy_loads_and_knows_v1_leaves():
    tax = load_taxonomy(TAXONOMY)
    leaves = set(tax.leaf_paths())
    assert V1_LEAVES <= leaves
    for leaf in V1_LEAVES:
        assert tax.is_known_leaf(leaf)
    assert not tax.is_known_leaf("ffe/seating")  # an interior node is not a leaf
