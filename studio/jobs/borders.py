"""borders: cropdetect black-bar measurement -> `<stem>.borders.json`."""

from studio.core import media

from . import JobContext


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    src = ctx.source_file(video)
    ctx.report(None, "measuring bars")
    data = media.detect_borders(src, ctx.tools)
    ctx.register_asset(video, "borders", None, data)
    return data
