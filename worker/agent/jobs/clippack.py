"""clippack: shred into ≤N s shots along scene cuts -> `<folder>/clips/` +
clippack.json, registered as the `clip_pack` asset. Runs scene detection
itself if the video has no scenes asset yet."""

from worker.core import media

from . import JobContext


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    vid = str(video["id"])
    p = ctx.payload
    src = ctx.source_file(video)

    scenes = ctx.asset_json(vid, "scenes")
    if scenes is None:
        scenes = media.detect_scenes(src, ctx.tools, ctx.report, ctx.should_cancel)
        scenes["src"] = video["storage_path"]
        srel = ctx.storage.put_json(ctx.sidecar_rel(video, "scenes"), scenes)
        ctx.upsert_asset(vid, "scenes", srel, {"scenes": len(scenes["scenes"]), "threshold": scenes["threshold"]})

    rel_dir = ctx.storage.join(ctx.folder_rel(video), "clips")
    out_dir = ctx.storage.output_dir(rel_dir, ctx.id)
    try:
        data = media.clip_pack(src, out_dir, scenes, ctx.tools, ctx.encoder, ctx.report, ctx.should_cancel,
                               start=p["start"], end=p["end"], max_len=p["max_len"], min_len=p["min_len"])
        data["src"] = video["storage_path"]
        (out_dir / "clippack.json").write_text(__import__("json").dumps(data, indent=2), encoding="utf-8")
        if not ctx.storage.local:
            ctx.report(99.0, "uploading clips")
            ctx.storage.put_dir(rel_dir, out_dir)
    finally:
        ctx.storage.cleanup(ctx.id)
    rel = ctx.storage.join(rel_dir, "clippack.json")
    ctx.upsert_asset(vid, "clip_pack", rel, {"count": data["count"], "max_len": data["max_len"], "capped": data["capped"]})
    return {"asset_path": rel, "count": data["count"], "capped": data["capped"]}
