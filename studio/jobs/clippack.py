"""clippack: shred into ≤N s shots along scene cuts -> `<folder>/clips/` +
clippack.json. Runs scene detection itself if the video has no scenes yet."""

import json

from studio.core import media

from . import JobContext


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    p = ctx.payload
    src = ctx.source_file(video)
    scenes = ctx.asset_json(video, "scenes")
    if scenes is None:
        scenes = media.detect_scenes(src, ctx.tools, ctx.report, ctx.should_cancel)
        scenes["src"] = video["storage_path"]
        ctx.put_json(ctx.sidecar_rel(video, "scenes"), scenes)
    rel_dir = ctx.lib.join(ctx.folder_rel(video), "clips")
    out_dir = ctx.lib.output_dir(rel_dir)
    data = media.clip_pack(src, out_dir, scenes, ctx.tools, ctx.encoder, ctx.report, ctx.should_cancel,
                           start=p["start"], end=p["end"], max_len=p["max_len"], min_len=p["min_len"])
    data["src"] = video["storage_path"]
    (out_dir / "clippack.json").write_text(json.dumps(data, indent=2), encoding="utf-8")
    ctx.register_asset(video, "clip_pack", ctx.lib.join(rel_dir, "clippack.json"))
    return {"asset_path": ctx.lib.join(rel_dir, "clippack.json"), "count": data["count"], "capped": data["capped"]}
