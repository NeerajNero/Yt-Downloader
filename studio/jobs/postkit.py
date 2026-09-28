"""postkit: transcript -> Gemini -> title/description/hashtags -> `.postkit.json`."""

from studio.core import gemini

from . import JobContext


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    transcript = ctx.asset_json(video, "transcript")
    if transcript is None:
        raise ValueError("No transcript yet — run Transcribe first.")
    ctx.report(None, "writing post kit")
    data = gemini.post_kit(video["title"], transcript, on_retry=lambda n: ctx.report(None, n))
    data["src"] = video["storage_path"]
    rel = ctx.put_json(ctx.sidecar_rel(video, "postkit"), data)
    ctx.register_asset(video, "postkit", rel)
    return {"asset_path": rel, "title": data["title"]}
