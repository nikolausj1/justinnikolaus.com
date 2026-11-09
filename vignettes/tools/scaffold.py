#!/usr/bin/env python3
"""Create a vignette project folder: python3 tools/scaffold.py <name> "<message>"

Writes hyperframes.json, package.json, meta.json, assets/, and copies lib/ from vignettes/lib.
index.html and BRIEF.md are written by hand from the shot list. Run again to refresh lib/.
"""
import json, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
name = sys.argv[1]
proj = ROOT / "videos" / name
proj.mkdir(parents=True, exist_ok=True)
(proj / "assets").mkdir(exist_ok=True)
(proj / "renders").mkdir(exist_ok=True)
shutil.copytree(ROOT / "lib", proj / "lib", dirs_exist_ok=True)
hf = proj / "hyperframes.json"
if not hf.exists():
    hf.write_text(json.dumps({
        "$schema": "https://hyperframes.heygen.com/schema/hyperframes.json",
        "registry": "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
        "paths": {"blocks": "compositions", "components": "compositions/components", "assets": "assets"},
        "media": {"autoProxy": True},
        "authoringSkill": "general-video",
    }, indent=2) + "\n")
pk = proj / "package.json"
if not pk.exists():
    pk.write_text(json.dumps({
        "name": name, "private": True, "type": "module",
        "scripts": {
            "dev": "npx --yes hyperframes@0.9.23 preview",
            "check": "npx --yes hyperframes@0.9.23 check",
            "render": "npx --yes hyperframes@0.9.23 render",
        },
    }, indent=2) + "\n")
meta = proj / "meta.json"
if not meta.exists():
    meta.write_text(json.dumps({"id": name, "name": name}, indent=2) + "\n")
print("scaffolded", proj)
