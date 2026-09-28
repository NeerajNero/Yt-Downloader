"""Read side: everything the PWA polls."""

from __future__ import annotations

from fastapi import APIRouter

from studio import context
from studio.core import gemini
from studio.queue import ACTIVE

from .common import active_jobs, job_view, video_or_404

router = APIRouter(prefix="/api", tags=["state"])

RENDERED = ("rendered", "approved", "posted")


@router.get("/jobs")
def jobs():
    app = context.app
    out = []
    for j in app.queue.list(limit=80):
        v = app.store.get_video(j["video_id"]) if j.get("video_id") else None
        c = app.store.get_clip(j["clip_id"]) if j.get("clip_id") else None
        out.append({**job_view(j),
                    "video": {"id": v["id"], "title": v["title"]} if v else None,
                    "clip": {"id": c["id"], "title": c.get("title"), "start_s": c["start_s"], "end_s": c["end_s"]} if c else None})
    return out


@router.get("/videos")
def videos():
    app = context.app
    out = []
    for v in app.store.list_videos():
        clips = app.store.clips_for(v["id"])
        out.append({
            **{k: v.get(k) for k in ("id", "title", "channel", "duration", "width", "height", "vcodec", "status",
                                     "pipeline", "note", "storage_path", "thumb_path", "size_bytes", "created_at")},
            "assets": [{"id": a["id"], "kind": a["kind"], "data": a["data"] if a["kind"] != "plan" else None}
                       for a in app.store.assets(v)],
            "clips_count": len(clips),
            "rendered_count": sum(1 for c in clips if c["status"] in RENDERED),
            "jobs": active_jobs(v["id"]),
        })
    return out


@router.get("/videos/{video_id}")
def video_detail(video_id: str):
    app = context.app
    v = video_or_404(video_id)
    return {
        **{k: v.get(k) for k in ("id", "title", "channel", "duration", "width", "height", "vcodec", "status",
                                 "pipeline", "note", "url", "storage_path", "thumb_path", "size_bytes", "created_at")},
        "assets": app.store.assets(v),
        "clips": app.store.clips_for(video_id),
        "jobs": [job_view(j) for j in app.queue.for_video(video_id)][:30],
    }


@router.get("/review")
def review():
    app = context.app
    out = []
    for c in app.store.all_clips():
        if c["status"] not in ("rendered", "approved") or not c.get("output_path"):
            continue
        v = app.store.get_video(c["video_id"])
        if v is None:
            continue
        kit = app.store.asset(v, "postkit")
        r = app.store.get_recipe(c["recipe_id"]) if c.get("recipe_id") else None
        out.append({**c, "recipe": {"id": r["id"], "name": r["name"]} if r else None,
                    "video": {"id": v["id"], "title": v["title"], "note": v.get("note"),
                              "postkit": kit["data"] if kit else None}})
    out.sort(key=lambda c: c["updated_at"], reverse=True)
    return out[:60]


@router.get("/review/count")
def review_count():
    return {"count": sum(1 for c in context.app.store.all_clips()
                         if c["status"] == "rendered" and c.get("output_path"))}


@router.get("/recipes")
def recipes():
    app = context.app
    counts: dict[str, int] = {}
    for c in app.store.all_clips():
        if c.get("recipe_id") and c.get("output_path"):
            counts[c["recipe_id"]] = counts.get(c["recipe_id"], 0) + 1
    return [{**r, "clips_count": counts.get(r["id"], 0)} for r in app.store.list_recipes()]


@router.get("/styles")
def styles():
    app = context.app
    out = []
    for s in app.store.list_styles()[:40]:
        j = app.queue.get(s["job_id"]) if s.get("job_id") else None
        out.append({**s, "job": {k: j[k] for k in ("id", "status", "progress", "progress_note")} if j else None})
    return out


@router.get("/config")
def config():
    s = context.app.settings
    return {
        "gemini": bool(gemini.api_key()), "library_dir": str(s.library_dir), "ffmpeg": s.ffmpeg_path,
        "encoder": s.encoder, "whisper": {"model": s.whisper.model, "device": s.whisper.device,
                                          "compute_type": s.whisper.compute_type},
        "cookies": bool(s.cookies_file), "active_jobs": sum(1 for j in context.app.queue.list() if j["status"] in ACTIVE),
    }


@router.get("/ai/models")
def ai_models():
    chain = gemini.model_chain()
    if not gemini.api_key():
        return {"configured": chain, "key": False, "available": [], "error": "GEMINI_API_KEY is not set in .env."}
    try:
        available = gemini.list_models()
    except Exception as e:  # noqa: BLE001
        return {"configured": chain, "key": True, "available": [], "error": str(e)[:300]}
    names = {m["name"] for m in available}
    return {"configured": chain, "key": True, "available": available, "missing": [m for m in chain if m not in names]}
