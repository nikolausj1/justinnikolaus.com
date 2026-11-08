#!/usr/bin/env python3
"""Build the Mosaic prototype variants from src/template.html.

device-mark, device-nomark, bare-mark, bare-nomark (round 1) and device-mark-r2 (round 2) land in compositions/.
index.html is the device-mark-r2 build so Studio has something to open.
"""
from pathlib import Path

ROOT = Path(__file__).parent
TEMPLATE = (ROOT / "src" / "template.html").read_text()

def variant(kind, mark, cam="r1"):
    return {
        "name": f"{kind}-{'mark' if mark else 'nomark'}" + ("" if cam == "r1" else f"-{cam}"),
        "VARIANT": kind,
        "MARK": "true" if mark else "false",
        "CAM": cam,
        "DUR": "12.5" if mark else "10.9",
        "VLEN": "10.47",
        "V0": "1.3" if mark else "0",
    }

VARIANTS = [variant(k, m) for k in ("device", "bare") for m in (True, False)]
# Round 2 (2026-11-08): device plus mark, with the bare cut's tight push held through the assemble.
VARIANTS.append(variant("device", True, "r2"))

out_dir = ROOT / "compositions"
out_dir.mkdir(exist_ok=True)
for v in VARIANTS:
    html = TEMPLATE
    for key in ("VARIANT", "MARK", "CAM", "DUR", "V0", "VLEN"):
        html = html.replace(f"__{key}__", v[key])
    # Asset paths are relative to the project root in index.html; compositions/ sits one level down.
    (out_dir / f"{v['name']}.html").write_text(html.replace('src="assets/', 'src="../assets/'))
    if v["name"] == "device-mark-r2":
        (ROOT / "index.html").write_text(html)
    print("built", v["name"])
