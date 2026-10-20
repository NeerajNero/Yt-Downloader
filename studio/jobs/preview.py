"""preview: a 540 px draft of a render payload -> work/preview/<video_id>/<hash>.mp4.
Same payload as render (unsaved draft settings, peak, hook / payoff, music);
reuses run_export / run_sequence with the preview switch (proxy profile,
fps <= 30, no loudnorm). Runs on the preview lane; never touches a clip row."""

from __future__ import annotations

from studio import preview
from studio.core import render as core

from . import JobContext
from .render import resolve_inputs


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    p = ctx.payload
    pl = preview.plan(ctx.lib, video, p)      # hash the validated payload exactly as the route did
    p.pop("recipe_id", None)
    if pl.path.is_file():
        preview.touch(pl.path)
        return {"url": pl.url, "hash": pl.hash, "cached": True}
    settings = core.RenderSettings(**p)
    settings.validate()
    inputs = resolve_inputs(ctx, video, settings)
    evicted = preview.evict_lru(ctx.lib.work_dir, protect={pl.path})
    src = ctx.source_file(video)
    pl.path.parent.mkdir(parents=True, exist_ok=True)
    ctx.report(None, "rendering preview")
    core.run_export(src, pl.path, settings, ctx.tools, ctx.encoder, ctx.report, ctx.should_cancel,
                    music_drop_s=pl.music_drop_s, preview=True, **inputs)
    music = core.music_plan(settings, pl.music_drop_s, has_music=inputs["music_path"] is not None)
    out = {"url": pl.url, "hash": pl.hash, "cached": False, "encoder": ctx.encoder, "evicted": len(evicted)}
    if inputs["music_path"] is not None:
        out["music_drop_aligned"] = music["aligned"]
        if not music["aligned"]:
            out["music_drop_reason"] = music["reason"]
    return out
