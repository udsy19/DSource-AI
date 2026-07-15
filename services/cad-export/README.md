# cad-export

FastAPI microservice that turns extracted floor-plan geometry (real millimeters,
Y-down image space) into a professional DXF R2018 deliverable — AIA/NCS layers,
ANSI31 wall hatching, door blocks, real DIMENSION entities, and a paperspace
title sheet — plus an optional DWG when the ODA File Converter is installed.

## Run

```sh
cd services/cad-export
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --port 8100
```

Tests (also starts a short-lived uvicorn on port 8100):

```sh
.venv/bin/python test_render.py
```

Golden-fixture regression tests — renders the checked-in payloads in
`goldens/*.json` and compares a structure snapshot (layers, entity counts per
type/layer, `$INSUNITS`, dimension geometry blocks, paperspace viewport, text
styles, layouts) against `goldens/<name>.expected.json`, plus a recipient
pre-flight checklist (explicit mm units, no xrefs, built-in fonts only, no
stray layouts). Any render.py change that alters output structure fails here:

```sh
.venv/bin/python test_golden.py
```

After an *intentional* structural change, regenerate the expectation files
(still gated on the audit and pre-flight checks) and commit the diff:

```sh
.venv/bin/python test_golden.py --update
```

## DWG support (optional)

DWG output requires the [ODA File Converter](https://www.opendesign.com/guestfiles/oda_file_converter)
(free, but EULA-gated — install it yourself; the service never downloads it).
Resolution order:

1. `ODA_CONVERTER_PATH` — absolute path to the `ODAFileConverter` binary
2. `ODAFileConverter` on `PATH`

Without it, `/render` still succeeds with `"dwg": null` and a
`"DWG conversion unavailable"` warning.

## API

### `GET /health`

```json
{ "status": "ok", "engine": "ezdxf", "dwg": false }
```

`dwg` reflects ODA converter availability.

### `POST /render`

All coordinates are millimeters in Y-down image space (the service flips to
CAD y-up internally). `meta` is optional.

Request body:

```json
{
  "geometry": {
    "scale": { "mmPerUnit": 1.0, "source": "detected", "confidence": 0.9, "samples": 4 },
    "wallNetwork": [ { "outer": [[x, y], ...], "holes": [[[x, y], ...], ...] } ],
    "walls": [ { "x1": n, "y1": n, "x2": n, "y2": n, "thickness": n } ],
    "doors": [ {
      "width": n,
      "hinge": [x, y],
      "leaf": { "x1": n, "y1": n, "x2": n, "y2": n },
      "swingArc": { "cx": n, "cy": n, "r": n, "startDeg": n, "endDeg": n }
    } ],
    "windows": [ { "x1": n, "y1": n, "x2": n, "y2": n,
                   "faceLines": [ {..}, {..} ], "glazingLine": {..} } ],
    "rooms": [ { "label": "LIVING", "polygon": [[x, y], ...] } ],
    "dimensions": [ { "text": "3600", "valueMm": n, "x1": n, "y1": n, "x2": n, "y2": n } ],
    "bounds": { "minX": n, "maxX": n, "minY": n, "maxY": n }
  },
  "meta": { "projectName": "My Project", "dateStr": "2026-07-15" }
}
```

Response (`200`):

```json
{
  "dxf": "<full DXF R2018 file as text>",
  "dwg": "<base64 DWG>" ,
  "engine": "ezdxf",
  "warnings": ["DWG conversion unavailable"],
  "audit": { "errors": 0, "fixes": 0, "passed": true }
}
```

`dwg` is `null` whenever conversion is unavailable or fails — DWG problems
never fail the request. An unusable payload returns `422` with a detail
message. Every response is produced from a document whose `ezdxf` audit
reports zero errors; auditor fixes are surfaced in `warnings`.

`audit` is a round-trip integrity gate: the emitted DXF text is parsed back
with `ezdxf.recover` and re-audited. `errors`/`fixes` are the recovery
auditor's counts and `passed` means zero errors after recovery. On audit
failure the DXF is still returned (never a 500): `errors > 0` adds an
`"Export audit found N unrecoverable issue(s)"` warning, and `errors` is `-1`
if the emitted text could not be parsed at all.

## Drawing contents

| Layer | Content | Color |
|---|---|---|
| A-WALL | wall rings as closed LWPOLYLINEs | 1 |
| A-WALL-PATT | ANSI31 hatch (scale 20), holes punched out | 9 |
| A-DOOR | `DOOR` block inserts (scaled/rotated/mirrored per leaf + swing) | 4 |
| A-GLAZ | window face + glazing lines | 3 |
| A-AREA | room polygons | 5 |
| A-ROOM-IDEN | room labels (TEXT h=200, centered) | 5 |
| A-ANNO-DIMS | aligned DIMENSIONs, `ARCH` dimstyle (tick marks) | 7 |
| A-ANNO-TTLB | paperspace border + title block | 7 |

Paperspace layout `SHEET-1` (A3) carries the border, a bottom-right title
block (project name, date, `SCALE 1:100`, `GENERATED DRAFT — VERIFY
DIMENSIONS`), and a viewport fitted to the model extents. Overall width and
height dimensions are added automatically from `bounds`.
