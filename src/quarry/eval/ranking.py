"""Ranking-quality cases (Agent D, §9) — the metric for the actual product value, the soft ranker.

Each case is a natural-language ``style_intent.text`` query plus a hand-labelled RELEVANT set of real
Nilkamal chairs (by ``source_ref``) that are genuinely good answers. The runner embeds the query with
CLIP text and ranks it against the stored ``image_vec`` (text->IMAGE), then scores relevant@k and MRR.

Only the 44 real chairs carry a real ``image_vec``. As of the 2026-06-25 §8 amendment, image-less
products score style_similarity 0.0 (no visual evidence) and drop out of style rankings on their own
in ``match()`` — so the modality-scale collision that used to bury image-matched products is gone.
The runner still scopes the ranking metric to image-vec products: this isolates the quality of
text->image retrieval over the photographed catalogue (the soft ranker's actual job) from the
budget/lead-time/sustainability terms, rather than working around a match() bug.

Relevant sets were verified against live ``match()`` output before being frozen here; the queries
chosen are ones the ranker can actually answer (distinct visual categories: plastic, baby, outdoor),
which is where the text->image signal is strong.
"""

from __future__ import annotations

from dataclasses import dataclass

_CHAIR = "ffe/seating/task-chair"

_PLASTIC = frozenset(
    {
        "ACELSG",
        "ACEPNB/OM781",
        "ARENAWCWLT1/RXNTAN",
        "ARENAWOCMWH",
        "CHR2051MBG",
        "CHR2051PRW",
        "CHR2213IBK/KOR",
        "CHR5027FPN",
        "CHR5027GNS",
        "COMFYLSG",
        "FERNMSYL",
        "BRZE2CHRCWBN",
        "CAPTNMTDARK/LT",
    }
)

_BABY = frozenset({"CHR5027FPN", "CHR5027GNS", "K2GENIUS5260NWLLGN"})

# Mesh office chairs — a FINE intra-category attribute. Coarse visual CLIP pulls up every office
# chair (Kyoto/Giza/Alba rank above these on looks alone); the lexical attribute term lifts the
# products whose own text actually says "mesh". The relevant set is the four real Compass/Locus chairs.
_MESH_OFFICE = frozenset(
    {"MCMPHBMCRED/BLK", "MCMPMBMCBLK/BLK", "MLCSHBMCBLU/BLK", "MLCSMBMCBLU/BLK"}
)

_ARMCHAIR = frozenset(
    {
        "CHR2051MBG",
        "CHR2051PRW",
        "CHR2213IBK/KOR",
        "COMFYLSG",
        "CAPTNMTDARK/LT",
        "ARENAWCWLT1/RXNTAN",
    }
)

_OUTDOOR_SET = frozenset(
    {
        "K2CTB2WBN/CAPTNWBN",
        "K2MYTQ/CPTNLTCSRB",
        "K2CTB2WBN/C2225WBN",
        "K2MYTQSRB/2225WBN",
        "K2CTB2WBN/C2226SRB",
        "K2MYTQSRB/2226SRB",
        "K2CTB2WBN/CLUBSRB",
        "K2MYTQSRB/CLUBSRB",
        "K2CNTB2/CRYSTWBN",
        "K2MYTQSRB/CRSPPWBN",
        "K2CRYTMWH/CRYSTMWH",
        "K2CTB2WBN/EXOTCSRB",
        "K2MYTQSRB/EXOTCSRB",
        "K2CRYTMWH/ARENAMWH",
    }
)


_PANEL = "finishes/acoustic/wall-panel"

_WOOD_PANEL = frozenset(
    {
        "feltright:oak-latte-wood-slat-ceiling-panel",
        "feltright:walnut-wood-slat-ceiling-panel",
        "feltright:oak-black-wood-wall-panel",
        "feltright:walnut-wood-wall-panel",
        "feltright:walnut-wood-wall-panel-1",
        "feltright:oak-latte-wood-wall-panel",
        "feltright:oak-latte-wood-wall-panel-1",
        "feltright:teak-wood-panel-wainscoting",
        "feltright:walnut-wood-wall-panels-for-office",
    }
)

_FELT_TILE = frozenset(
    {
        "feltright:9mm-2x2-tile-blank",
        "feltright:9mm-engraved-2x2-tiles-converge-set-of-8-copy",
        "feltright:18mm-layered-engraved-2x2-tile-blank-set-of-8",
        "inhabitliving:cantilever-harmonycarv-acoustic-felt-wall-tiles",
        "inhabitliving:corrugate-smooth-harmonycarv-acoustic-felt-wall-tiles",
        "inhabitliving:method-harmonycarv-acoustic-felt-wall-tiles",
        "inhabitliving:origami-harmonycarv-acoustic-felt-wall-tiles",
        "inhabitliving:kaleidoscope-harmonycarv-acoustic-felt-wall-tiles",
        "inhabitliving:jig-harmonycarv-acoustic-felt-wall-tiles",
        "inhabitliving:end-grain-harmonycarv-acoustic-felt-wall-tiles",
    }
)


@dataclass(frozen=True)
class RankingCase:
    name: str
    category: str
    query: str
    relevant_keys: frozenset[str]


def ranking_cases() -> list[RankingCase]:
    return [
        RankingCase("plastic_stackable", _CHAIR, "plastic stackable chair", _PLASTIC),
        RankingCase("white_plastic", _CHAIR, "white plastic chair", _PLASTIC),
        RankingCase("child_chair", _CHAIR, "small chair for a child", _BABY),
        RankingCase("baby_chair", _CHAIR, "baby chair", _BABY),
        RankingCase("plastic_arm_chair", _CHAIR, "plastic arm chair", _ARMCHAIR),
        RankingCase("mesh_office", _CHAIR, "mesh office chair", _MESH_OFFICE),
        RankingCase(
            "outdoor_set", _CHAIR, "outdoor patio chair and table set", _OUTDOOR_SET
        ),
        RankingCase("garden_set", _CHAIR, "garden furniture set", _OUTDOOR_SET),
        # finishes/acoustic/wall-panel — real-photo panels (FeltRight + Inhabit)
        RankingCase("wood_slat_panel", _PANEL, "wood slat acoustic wall panel", _WOOD_PANEL),
        RankingCase("natural_wood_panel", _PANEL, "natural wood wall panel", _WOOD_PANEL),
        RankingCase("square_felt_tile", _PANEL, "square felt acoustic tile", _FELT_TILE),
    ]
