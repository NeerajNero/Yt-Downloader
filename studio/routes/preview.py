"""Draft previews.

  POST /api/videos/{video_id}/preview {payload}  -> {job_id, cached, url, hash}
  GET  /api/preview/{video_id}/{hash}.mp4        the file (Range OK, so the player can seek)

A new preview for a video supersedes any queued or running preview for it.
"""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import FileResponse
from pydantic import BaseModel

from studio import context, preview
from studio.schemas import validate_payload

from .common import fail, video_or_404

router = APIRouter(prefix="/api", tags=["preview"])


class PreviewIn(BaseModel):
    payload: dict


@router.post("/videos/{video_id}/preview")
def request_preview(video_id: str, body: PreviewIn):
    app = context.app
    v = video_or_404(video_id)
    if not v.get("storage_path"):
        raise fail("That video has no file yet — download it first.")
    if v.get("status") == "missing":
        raise fail("The video file is missing on disk.")
    try:
        payload = validate_payload("preview", body.payload)
    except ValueError as e:
        raise fail(str(e))
    pl = preview.plan(app.lib, v, payload)
    if pl.path.is_file():
        preview.touch(pl.path)
        return {"job_id": None, "cached": True, "url": pl.url, "hash": pl.hash}
    superseded = 0
    for j in app.queue.for_video(video_id, active_only=True):
        if j["type"] == "preview":
            app.queue.cancel(j["id"])
            superseded += 1
    job = app.queue.enqueue("preview", video_id=video_id, payload=payload, priority=10)
    return {"job_id": job["id"], "cached": False, "url": pl.url, "hash": pl.hash, "superseded": superseded}


@router.get("/preview/{video_id}/{name}")
def get_preview(video_id: str, name: str):
    if not preview.PREVIEW_NAME.match(name) or "/" in video_id or video_id.startswith("."):
        raise fail("No such preview.", 404)
    p = preview.preview_dir(context.app.lib.work_dir, video_id) / name
    if not p.is_file():
        raise fail("That preview is gone — render it again.", 404)
    return FileResponse(p, media_type="video/mp4")
