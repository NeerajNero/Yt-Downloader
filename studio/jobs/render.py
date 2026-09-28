"""render: one clip export (v1 run_export / run_sequence) -> `<folder>/shorts/<name>.mp4`,
recorded as a clip (updated when the job carries clip_id, added otherwise)."""

from __future__ import annotations

from studio.core import render as core

from . import JobContext


def _library_file(ctx: JobContext, sub: str, name: str):
    p = ctx.lib.resolve(ctx.lib.join(sub, name))
    if not p.is_file():
        raise ValueError(f"{name} is not in the library's {sub} folder.")
    return p


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    p = ctx.payload
    recipe_id = p.pop("recipe_id", None)
    settings = core.RenderSettings(**p)
    settings.validate()
    clip_id = ctx.job.get("clip_id")

    if clip_id:
        ctx.store.update_clip(clip_id, status="rendering", job_id=ctx.id)

    transcript = manual = None
    if settings.captions:
        if settings.caption_source == "manual":
            manual = ctx.asset_json(video, "captions")
            if not manual:
                raise ValueError("No manual captions yet — add them in the caption editor.")
        else:
            transcript = ctx.asset_json(video, "transcript")
            if not transcript:
                raise ValueError("No transcript yet — run Transcribe first.")

    music_path = _library_file(ctx, ".music", settings.music) if settings.music else None
    watermark_path = None
    if settings.watermark and settings.watermark.get("file"):
        watermark_path = _library_file(ctx, ".overlays", settings.watermark["file"])
    sfx_paths = [(_library_file(ctx, ".music", l["file"]), float(l.get("at", 0)), float(l.get("gain", 80)))
                 for l in settings.sfx if l.get("file")]
    fx_paths = [(_library_file(ctx, ".fx", l["file"]), float(l.get("at", 0)), float(l.get("opacity", 80)),
                 str(l.get("blend", "screen")), bool(l.get("flip")), float(l.get("speed", 1.0) or 1.0))
                for l in settings.fx if l.get("file")]

    src = ctx.source_file(video)
    name = core.output_name(ctx.stem(video), settings, music_path is not None)
    rel = ctx.lib.join(ctx.lib.join(ctx.folder_rel(video), "shorts"), name)
    out = ctx.lib.output_path(rel)
    try:
        core.run_export(src, out, settings, ctx.tools, ctx.encoder, ctx.report, ctx.should_cancel,
                        transcript=transcript, manual_captions=manual, music_path=music_path,
                        watermark_path=watermark_path, sfx_paths=sfx_paths, fx_paths=fx_paths)
    except BaseException:
        if clip_id:
            clip = ctx.store.get_clip(clip_id)
            if clip and clip["status"] == "rendering":
                ctx.store.update_clip(clip_id, status="rendered" if clip.get("output_path") else "proposed")
        raise

    if clip_id and ctx.store.get_clip(clip_id):
        clip = ctx.store.update_clip(clip_id, status="rendered", output_path=rel, render_settings=p,
                                     start_s=settings.range_start, end_s=settings.range_end,
                                     recipe_id=recipe_id or ctx.store.get_clip(clip_id).get("recipe_id"))
    else:
        clip = ctx.store.add_clip(video["id"], settings.range_start, settings.range_end,
                                  origin="recipe" if recipe_id else "manual", status="rendered",
                                  output_path=rel, render_settings=p, job_id=ctx.id, recipe_id=recipe_id)
    return {"output_path": rel, "clip_id": clip["id"], "encoder": ctx.encoder}
