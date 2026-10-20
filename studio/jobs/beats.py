"""beats: one music track in <library>/.music -> `<name>.beats.json` (bpm,
beats, downbeats, drop). Light lane. Keeps `drop_s_manual` from the previous
file across re-runs and version bumps."""

from __future__ import annotations

import json
from pathlib import Path

from studio.core import beats as core

from . import JobContext


def handle(ctx: JobContext) -> dict:
    name = ctx.payload["name"]
    track = ctx.lib.music_dir() / name
    if not track.is_file():
        raise FileNotFoundError(f"{name} is not in the library's .music folder.")
    rel = ctx.lib.beats_rel(name)
    previous = None
    old = ctx.lib.root / rel
    if old.is_file():
        try:
            previous = json.loads(old.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            previous = None
    data = core.analyze_track(Path(track), ctx.tools, ctx.should_cancel, report=ctx.report, name=name)
    data["drop_s_manual"] = (previous or {}).get("drop_s_manual")
    ctx.put_json(rel, data)
    return {"asset_path": rel, "bpm": data["bpm"], "beats": len(data["beats"]), "downbeats": len(data["downbeats"]),
            "drop_s": data["drop_s"], "drop_s_manual": data["drop_s_manual"]}
