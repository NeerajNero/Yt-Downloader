"""scenes: ffmpeg scene detection -> `<stem>.scenes.json`."""

from studio.core import media

from . import JobContext


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    src = ctx.source_file(video)
    data = media.detect_scenes(src, ctx.tools, ctx.report, ctx.should_cancel, threshold=ctx.payload["threshold"])
    data["src"] = video["storage_path"]
    rel = ctx.put_json(ctx.sidecar_rel(video, "scenes"), data)
    ctx.register_asset(video, "scenes", rel)
    return {"asset_path": rel, "scenes": len(data["scenes"])}
