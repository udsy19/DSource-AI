import math

from app.embeddings.index import SqliteVecIndex


def _unit(v: list[float]) -> list[float]:
    n = math.sqrt(sum(x * x for x in v))
    return [x / n for x in v]


def test_self_is_nearest_and_score_is_cosine():
    idx = SqliteVecIndex(db_path=":memory:", dim=4)
    a, b, c = _unit([1, 0, 0, 0]), _unit([0.9, 0.1, 0, 0]), _unit([0, 0, 1, 0])
    idx.upsert(1, a, category="chair", has_price=True)
    idx.upsert(2, b, category="chair")
    idx.upsert(3, c, category="table", has_price=True)

    res = idx.query(a, k=2)
    assert res[0][0] == 1            # self is the nearest
    assert res[0][1] > 0.999         # cosine ~1.0
    assert 2 in [pid for pid, _ in res]   # the close vector ranks next


def test_metadata_filter_excludes_other_categories():
    idx = SqliteVecIndex(db_path=":memory:", dim=4)
    idx.upsert(1, _unit([1, 0, 0, 0]), category="chair")
    idx.upsert(2, _unit([0, 1, 0, 0]), category="chair")
    idx.upsert(3, _unit([0, 0, 1, 0]), category="table")
    res = idx.query(_unit([0, 0, 1, 0]), k=5, category="chair")
    assert all(pid in (1, 2) for pid, _ in res)  # the table row is filtered out


def test_upsert_replaces_not_duplicates():
    idx = SqliteVecIndex(db_path=":memory:", dim=4)
    idx.upsert(1, _unit([1, 0, 0, 0]), category="chair")
    idx.upsert(1, _unit([0, 1, 0, 0]), category="chair")
    assert idx.count() == 1
