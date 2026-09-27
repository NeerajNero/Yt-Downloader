"""borders: cropdetect black-bar measurement -> `borders` asset (data only)."""

from worker.core import media

from . import JobContext


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    src = ctx.source_file(video)
    ctx.report(None, "measuring bars")
    data = media.detect_borders(src, ctx.tools)
    ctx.upsert_asset(str(video["id"]), "borders", None, data)
    return data
