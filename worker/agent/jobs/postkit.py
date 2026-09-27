"""postkit: transcript -> Gemini -> title/description/hashtags, stored inline
on the `postkit` asset (and as the `.postkit.json` sidecar)."""

from worker.core import gemini

from . import JobContext


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    vid = str(video["id"])
    transcript = ctx.asset_json(vid, "transcript")
    if transcript is None:
        raise ValueError("No transcript yet — run Transcribe first.")
    ctx.report(None, "writing post kit")
    data = gemini.post_kit(video["title"], transcript, on_retry=lambda n: ctx.report(None, n))
    data["src"] = video["storage_path"]
    rel = ctx.storage.put_json(ctx.sidecar_rel(video, "postkit"), data)
    ctx.upsert_asset(vid, "postkit", rel, {k: data[k] for k in ("title", "description", "hashtags")})
    return {"asset_path": rel, "title": data["title"]}
