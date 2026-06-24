from app.routers.source import build_india_source


def _match(query: str):
    if "chair" in query:
        return {"sku": "NK-CH", "name": "Mesh Chair", "vendor": "Nilkamal",
                "price_inr": 8000, "gst_rate": 0.18, "label": "close", "material": "mesh"}
    if "desk" in query or "table" in query:
        return {"sku": "NK-DK", "name": "Office Desk", "vendor": "Nilkamal",
                "price_inr": 12000, "gst_rate": 0.18, "label": "close", "material": "engineered wood"}
    return {"label": "no_match", "price_inr": None}  # e.g. lounge — nothing in catalog


def test_builds_inr_bom_from_counts():
    out = build_india_source({"workstation": 10}, _match)
    assert out["currency"] == "INR"
    desk = next(line for line in out["lines"] if line["sku"] == "NK-DK")
    assert desk["qty"] == 10 and desk["line_inr"] == 120000
    assert out["subtotal"] == 200000           # 10×12000 desks + 10×8000 chairs
    assert out["total"] == 236000              # + 18% GST


def test_no_real_match_goes_to_unmatched_never_faked():
    out = build_india_source({"collaboration": 3}, _match)
    assert out["lines"] == []
    assert out["unmatched"]                     # lounge had no real match
    assert out["subtotal"] == 0


def test_zero_counts_are_skipped():
    out = build_india_source({"workstation": 0, "meeting_room": 0}, _match)
    assert out["lines"] == [] and out["total"] == 0
