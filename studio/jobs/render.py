"""render: one clip export (v1 run_export / run_sequence) -> `<folder>/shorts/<name>.mp4`,
recorded as a clip (updated when the job carries clip_id, added otherwise)."""

from __future__ import annotations

from studio.core import beats as beats_core
from studio.core import render as core

from . import JobContext


def _library_file(ctx: JobContext, sub: str, name: str):
    p = ctx.lib.resolve(ctx.lib.join(sub, name))
    if not p.is_file():
        raise ValueError(f"{name} is not in the library's {sub} folder.")
    return p


def resolve_inputs(ctx: JobContext, video: dict, settings: core.RenderSettings) -> dict:
    """The files a render (or preview) needs: transcript / manual captions when
    captions are on, the music bed, watermark, sfx and overlay-effect clips.
    Keys match run_export's keyword arguments."""
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
    return {"transcript": transcript, "manual_captions": manual, "music_path": music_path,
            "watermark_path": watermark_path, "sfx_paths": sfx_paths, "fx_paths": fx_paths}


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    p = ctx.payload
    recipe_id = p.pop("recipe_id", None)
    settings = core.RenderSettings(**p)   # peak_s stays in the payload: the music drop aligns to it
    settings.validate()
    clip_id = ctx.job.get("clip_id")

    if clip_id:
        ctx.store.update_clip(clip_id, status="rendering", job_id=ctx.id)

    inputs = resolve_inputs(ctx, video, settings)
    transcript, manual, music_path = inputs["transcript"], inputs["manual_captions"], inputs["music_path"]
    watermark_path, sfx_paths, fx_paths = inputs["watermark_path"], inputs["sfx_paths"], inputs["fx_paths"]

    # The track's drop (manual override first) when its beat grid is current.
    music_drop_s = None
    if music_path is not None:
        grid = ctx.lib.read_beats(settings.music)
        if beats_core.is_current(grid):
            music_drop_s = beats_core.effective_drop(grid)
    plan = core.music_plan(settings, music_drop_s, has_music=music_path is not None)
    music_info: dict = {}
    warn = core.captions_warning(settings)
    if warn:
        music_info["captions_warning"] = warn
    if music_path is not None:
        music_info["music_drop_aligned"] = plan["aligned"]
        if plan["aligned"]:
            music_info.update(music_seek_s=plan["seek_s"], music_delay_ms=plan["delay_ms"], drop_at_output_s=plan["drop_at_output_s"])
        else:
            music_info["music_drop_reason"] = plan["reason"]

    src = ctx.source_file(video)
    name = core.output_name(ctx.stem(video), settings, music_path is not None, aligned=plan["aligned"])
    rel = ctx.lib.join(ctx.lib.join(ctx.folder_rel(video), "shorts"), name)
    out = ctx.lib.output_path(rel)
    try:
        core.run_export(src, out, settings, ctx.tools, ctx.encoder, ctx.report, ctx.should_cancel,
                        transcript=transcript, manual_captions=manual, music_path=music_path,
                        watermark_path=watermark_path, sfx_paths=sfx_paths, fx_paths=fx_paths,
                        music_drop_s=music_drop_s)
    except BaseException:
        if clip_id:
            clip = ctx.store.get_clip(clip_id)
            if clip and clip["status"] == "rendering":
                ctx.store.update_clip(clip_id, status="rendered" if clip.get("output_path") else "proposed")
        raise

    if clip_id and ctx.store.get_clip(clip_id):
        existing = ctx.store.get_clip(clip_id)
        clip = ctx.store.update_clip(clip_id, status="rendered", output_path=rel, render_settings=p,
                                     start_s=settings.range_start, end_s=settings.range_end,
                                     recipe_id=recipe_id or existing.get("recipe_id"),
                                     peak_s=settings.peak_s if settings.peak_s is not None else existing.get("peak_s"),
                                     hook_text=settings.hook_text if settings.hook_text is not None else existing.get("hook_text"),
                                     payoff_text=settings.payoff_text if settings.payoff_text is not None else existing.get("payoff_text"),
                                     **music_info)
    else:
        clip = ctx.store.add_clip(video["id"], settings.range_start, settings.range_end,
                                  origin="recipe" if recipe_id else "manual", status="rendered",
                                  output_path=rel, render_settings=p, job_id=ctx.id, recipe_id=recipe_id,
                                  peak_s=settings.peak_s, hook_text=settings.hook_text, payoff_text=settings.payoff_text, **music_info)
    return {"output_path": rel, "clip_id": clip["id"], "encoder": ctx.encoder, **music_info}
