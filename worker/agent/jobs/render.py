"""render: one clip export (v1 run_export) -> `<folder>/shorts/<name>.mp4`,
recorded as a `clips` row (updated when the job carries clip_id, inserted
otherwise)."""

from __future__ import annotations

import json

from worker.core import render as core

from . import JobContext


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    p = ctx.payload
    recipe_id = p.pop("recipe_id", None)
    settings = core.RenderSettings(**p)
    settings.validate()
    vid = str(video["id"])
    clip_id = ctx.job.get("clip_id")

    if clip_id:
        ctx.db.execute("update clips set status = 'rendering', job_id = %s where id = %s", (ctx.id, clip_id))

    transcript = manual = None
    if settings.captions:
        if settings.caption_source == "manual":
            manual = ctx.asset_json(vid, "captions")
            if not manual:
                raise ValueError("No manual captions yet — add them in the caption editor.")
        else:
            transcript = ctx.asset_json(vid, "transcript")
            if not transcript:
                raise ValueError("No transcript yet — run Transcribe first.")

    music_path = None
    if settings.music:
        music_path = ctx.storage.get_file(ctx.storage.join(".music", settings.music))
    watermark_path = None
    if settings.watermark and settings.watermark.get("file"):
        watermark_path = ctx.storage.get_file(ctx.storage.join(".overlays", settings.watermark["file"]))
    sfx_paths = [(ctx.storage.get_file(ctx.storage.join(".music", l["file"])), float(l.get("at", 0)), float(l.get("gain", 80)))
                 for l in settings.sfx if l.get("file")]

    src = ctx.source_file(video)
    name = core.output_name(ctx.stem(video), settings, music_path is not None)
    rel = ctx.storage.join(ctx.storage.join(ctx.folder_rel(video), "shorts"), name)
    out = ctx.storage.output_path(rel, ctx.id)
    try:
        core.run_export(src, out, settings, ctx.tools, ctx.encoder, ctx.report, ctx.should_cancel,
                        transcript=transcript, manual_captions=manual, music_path=music_path,
                        watermark_path=watermark_path, sfx_paths=sfx_paths)
        if not ctx.storage.local:
            ctx.report(99.0, "uploading render")
        ctx.storage.put_file(rel, out)
    except BaseException:
        if clip_id:
            ctx.db.execute("update clips set status = 'proposed' where id = %s and status = 'rendering'", (clip_id,))
        raise
    finally:
        ctx.storage.cleanup(ctx.id)

    if clip_id:
        ctx.db.execute(
            "update clips set status = 'rendered', output_path = %s, render_settings = %s::jsonb, "
            "start_s = %s, end_s = %s, recipe_id = coalesce(%s::uuid, recipe_id) where id = %s",
            (rel, json.dumps(p), settings.range_start, settings.range_end, recipe_id, clip_id),
        )
    else:
        row = ctx.db.fetch_one(
            """insert into clips (video_id, start_s, end_s, origin, status, output_path, render_settings, job_id, recipe_id)
               values (%s, %s, %s, %s, 'rendered', %s, %s::jsonb, %s, %s::uuid) returning id""",
            (vid, settings.range_start, settings.range_end, "recipe" if recipe_id else "manual", rel, json.dumps(p), ctx.id, recipe_id),
        )
        clip_id = str(row["id"])
    return {"output_path": rel, "clip_id": str(clip_id), "encoder": ctx.encoder}
