"""suggest: transcript + scenes + keyframes -> Gemini -> `.suggestions.json`
asset + `clips` rows (origin ai_suggest, status proposed). Needs the transcript
and scenes assets already present (the event chain guarantees the order)."""

from worker.core import gemini

from . import JobContext


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    vid = str(video["id"])
    transcript = ctx.asset_json(vid, "transcript")
    scenes = ctx.asset_json(vid, "scenes")
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
    rel = ctx.storage.put_json(ctx.sidecar_rel(video, "suggestions"), data)
    ctx.upsert_asset(vid, "suggestions", rel, {"clips": len(data["clips"]), "model": data["model"]})

    # Replace the previous unrendered AI proposals with the fresh set.
    ctx.db.execute("delete from clips where video_id = %s and origin = 'ai_suggest' and status = 'proposed'", (vid,))
    for c in data["clips"]:
        ctx.db.execute(
            "insert into clips (video_id, start_s, end_s, title, hook, reason, origin, status, job_id) "
            "values (%s, %s, %s, %s, %s, %s, 'ai_suggest', 'proposed', %s)",
            (vid, c["start"], c["end"], c["title"], c["hook"], c["reason"], ctx.id),
        )
    return {"asset_path": rel, "clips": len(data["clips"]), "model": data["model"]}
