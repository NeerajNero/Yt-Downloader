"""tags: scene intervals + keyframes -> Gemini -> `<stem>.tags.json`
(closeup / gameplay / cutscene / menu per scene, plus dialogue overlap
computed locally). Needs scenes; uses dialogue or the transcript if present."""

from studio.core import dialogue as dlg, gemini

from . import JobContext


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    scenes = ctx.asset_json(video, "scenes")
    if scenes is None:
        raise ValueError("No scene data yet — run Detect scenes first.")
    lines = None
    dialogue = ctx.asset_json(video, "dialogue")
    if dialogue:
        lines = dialogue.get("lines") or []
    else:
        transcript = ctx.asset_json(video, "transcript")
        if transcript:
            lines = dlg.from_transcript(transcript)["lines"]
    src = ctx.source_file(video)
    data = gemini.tag_shots(src, video["title"], video.get("duration"), scenes, lines, ctx.tools, ctx.should_cancel,
                            on_progress=ctx.report)
    data["src"] = video["storage_path"]
    rel = ctx.put_json(ctx.sidecar_rel(video, "tags"), data)
    ctx.register_asset(video, "tags", rel)
    return {"asset_path": rel, "shots": len(data["shots"]),
            "closeups": sum(1 for s in data["shots"] if s.get("closeup")), "model": data["model"]}
