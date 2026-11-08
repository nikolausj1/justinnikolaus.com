#!/usr/bin/env python3
"""Build the four Mosaic prototype variants from src/template.html.

device-mark, device-nomark, bare-mark, bare-nomark land in compositions/.
index.html is the device-mark build so Studio has something to open.
"""
from pathlib import Path

ROOT = Path(__file__).parent
TEMPLATE = (ROOT / "src" / "template.html").read_text()

VARIANTS = []
for variant in ("device", "bare"):
    for mark in (True, False):
        VARIANTS.append({
            "name": f"{variant}-{'mark' if mark else 'nomark'}",
            "VARIANT": variant,
            "MARK": "true" if mark else "false",
            "DUR": "8.2" if mark else "7.0",
            "V0": "0.9" if mark else "0",
        })

out_dir = ROOT / "compositions"
out_dir.mkdir(exist_ok=True)
for v in VARIANTS:
    html = TEMPLATE
    for key in ("VARIANT", "MARK", "DUR", "V0"):
        html = html.replace(f"__{key}__", v[key])
    # Asset paths are relative to the project root in index.html; compositions/ sits one level down.
    (out_dir / f"{v['name']}.html").write_text(html.replace('src="assets/', 'src="../assets/'))
    if v["name"] == "device-mark":
        (ROOT / "index.html").write_text(html)
    print("built", v["name"])
