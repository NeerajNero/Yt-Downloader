"""tighten: silence removal -> `<stem>_tight.mp4`, registered as the `tight` asset."""

from worker.core import media

from . import JobContext


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    p = ctx.payload
    src = ctx.source_file(video)
    rel = ctx.storage.join(ctx.folder_rel(video), f"{ctx.stem(video)}_tight.mp4")
    out = ctx.storage.output_path(rel, ctx.id)
    try:
        info = media.tighten(src, out, ctx.tools, ctx.encoder, ctx.report, ctx.should_cancel,
                             threshold_db=p["threshold_db"], min_silence=p["min_silence"], pad=p["pad"])
        if not ctx.storage.local:
            ctx.report(99.0, "uploading")
        ctx.storage.put_file(rel, out)
    finally:
        ctx.storage.cleanup(ctx.id)
    ctx.upsert_asset(str(video["id"]), "tight", rel, info)
    return {"asset_path": rel, **info}
