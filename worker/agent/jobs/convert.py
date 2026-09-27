"""convert: `<stem>_edit.mp4` H.264 edit copy -> `edit_copy` asset."""

from worker.core import media

from . import JobContext


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    src = ctx.source_file(video)
    rel = ctx.storage.join(ctx.folder_rel(video), f"{ctx.stem(video)}_edit.mp4")
    out = ctx.storage.output_path(rel, ctx.id)
    try:
        media.edit_copy(src, out, ctx.tools, ctx.encoder, ctx.report, ctx.should_cancel)
        if not ctx.storage.local:
            ctx.report(99.0, "uploading")
        ctx.storage.put_file(rel, out)
    finally:
        ctx.storage.cleanup(ctx.id)
    ctx.upsert_asset(str(video["id"]), "edit_copy", rel, {"encoder": ctx.encoder})
    return {"asset_path": rel}
