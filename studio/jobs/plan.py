"""plan: AI edit plan for a video -> `.plan.json` (the montage builder loads it)."""

from studio.core import plan as core

from . import JobContext


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    p = ctx.payload
    transcript = ctx.asset_json(video, "transcript")
    scenes = ctx.asset_json(video, "scenes")
    if scenes is None:
        raise ValueError("No scene data yet — run Detect scenes first.")
    style_report = None
    if p.get("style_id"):
        style = ctx.store.get_style(p["style_id"])
        style_report = style["report"] if style and style.get("status") == "ready" else None
    src = ctx.source_file(video)
    ctx.report(None, "planning the edit")
    data = core.make_plan(src, video["title"], video.get("duration"), transcript, scenes, ctx.tools,
                          ctx.should_cancel, target_len=p["target_length"], max_shots=p["max_shots"],
                          style_report=style_report, note=video.get("note"),
                          on_retry=lambda n: ctx.report(None, n))
    data["src"] = video["storage_path"]
    rel = ctx.put_json(ctx.sidecar_rel(video, "plan"), data)
    ctx.register_asset(video, "plan", rel)
    return {"asset_path": rel, "shots": len(data["shots"]), "out_length": data["out_length"], "model": data["model"]}
