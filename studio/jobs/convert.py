"""convert: `<stem>_edit.mp4` H.264 edit / preview copy."""

from studio.core import media

from . import JobContext


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    src = ctx.source_file(video)
    rel = ctx.lib.join(ctx.folder_rel(video), f"{ctx.stem(video)}_edit.mp4")
    out = ctx.lib.output_path(rel)
    media.edit_copy(src, out, ctx.tools, ctx.encoder, ctx.report, ctx.should_cancel)
    ctx.register_asset(video, "edit_copy", rel)
    return {"asset_path": rel, "encoder": ctx.encoder}
