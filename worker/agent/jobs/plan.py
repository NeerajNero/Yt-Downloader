"""plan: AI edit plan for a video -> `.plan.json` sidecar + `plan` asset (data
inline so the montage builder can load it straight from the subscription)."""

from worker.core import plan as core

from . import JobContext


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    vid = str(video["id"])
    p = ctx.payload
    transcript = ctx.asset_json(vid, "transcript")
    scenes = ctx.asset_json(vid, "scenes")
    if scenes is None:
        raise ValueError("No scene data yet — run Detect scenes first.")
    style_report = None
    if p.get("style_id"):
        row = ctx.db.fetch_one("select report from styles where id = %s and status = 'ready'", (p["style_id"],))
        style_report = row["report"] if row else None
    src = ctx.source_file(video)
    ctx.report(None, "planning the edit")
    data = core.make_plan(src, video["title"], video.get("duration"), transcript, scenes, ctx.tools,
                          ctx.should_cancel, target_len=p["target_length"], max_shots=p["max_shots"],
                          style_report=style_report, note=video.get("note"),
                          on_retry=lambda n: ctx.report(None, n))
    data["src"] = video["storage_path"]
    rel = ctx.storage.put_json(ctx.storage.join(ctx.folder_rel(video), f"{ctx.stem(video)}.plan.json"), data)
    ctx.upsert_asset(vid, "plan", rel, data)
    return {"asset_path": rel, "shots": len(data["shots"]), "out_length": data["out_length"], "model": data["model"]}
