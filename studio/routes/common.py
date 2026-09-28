from __future__ import annotations

from fastapi import HTTPException

from studio import context
from studio.queue import ACTIVE


def fail(msg: str, code: int = 400) -> HTTPException:
    return HTTPException(status_code=code, detail=msg)


def video_or_404(video_id: str) -> dict:
    v = context.app.store.get_video(video_id)
    if v is None:
        raise fail("Video not found.", 404)
    return v


def job_view(j: dict) -> dict:
    """What the UI shows for a job (payload/result kept small)."""
    return {k: j.get(k) for k in ("id", "type", "status", "priority", "progress", "progress_note", "error",
                                  "attempts", "max_attempts", "created_at", "updated_at", "started_at",
                                  "finished_at", "video_id", "clip_id", "parent_job_id", "result")}


def active_jobs(video_id: str) -> list[dict]:
    return [job_view(j) for j in context.app.queue.for_video(video_id) if j["status"] in ACTIVE]
