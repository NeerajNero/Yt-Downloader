"""tighten: silence removal -> `<stem>_tight.mp4`."""

from studio.core import media

from . import JobContext


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    p = ctx.payload
    src = ctx.source_file(video)
    rel = ctx.lib.join(ctx.folder_rel(video), f"{ctx.stem(video)}_tight.mp4")
    out = ctx.lib.output_path(rel)
    info = media.tighten(src, out, ctx.tools, ctx.encoder, ctx.report, ctx.should_cancel,
                         threshold_db=p["threshold_db"], min_silence=p["min_silence"], pad=p["pad"])
    ctx.register_asset(video, "tight", rel)
    return {"asset_path": rel, **info}
