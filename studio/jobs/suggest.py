"""suggest: transcript + scenes + keyframes -> Gemini -> `.suggestions.json` +
proposed clips (origin ai_suggest). Needs the transcript and scenes first."""

from studio.core import gemini

from . import JobContext


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    transcript = ctx.asset_json(video, "transcript")
    scenes = ctx.asset_json(video, "scenes")
    if transcript is None:
        raise ValueError("No transcript yet — run Transcribe first.")
    if scenes is None:
        raise ValueError("No scene data yet — run Detect scenes first.")
    src = ctx.source_file(video)
    ctx.report(None, "asking gemini")
    data = gemini.suggest_clips(src, video["title"], video.get("duration"), transcript, scenes,
                                ctx.tools, ctx.should_cancel, count=ctx.payload["count"],
                                on_retry=lambda n: ctx.report(None, n))
    data["src"] = video["storage_path"]
    rel = ctx.put_json(ctx.sidecar_rel(video, "suggestions"), data)
    ctx.register_asset(video, "suggestions", rel)
    # Replace the previous unrendered AI proposals with the fresh set.
    ctx.store.delete_clips_where(video["id"], "ai_suggest", "proposed")
    for c in data["clips"]:
        ctx.store.add_clip(video["id"], c["start"], c["end"], title=c["title"], hook=c["hook"],
                           reason=c["reason"], origin="ai_suggest", status="proposed", job_id=ctx.id)
    return {"asset_path": rel, "clips": len(data["clips"]), "model": data["model"]}
