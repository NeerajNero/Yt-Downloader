"""Hasura event-trigger handlers: the pipeline fan-out.

videos.status -> 'ready'  (download finished / file uploaded)
    pipeline prepare|shorts : transcribe + scenes (+ borders for shorts)
jobs.status   -> 'done'
    transcribe            : postkit (prepare|shorts)
    transcribe|scenes     : suggest once both assets exist (prepare|shorts)
    suggest               : render every proposed AI clip with the v1 Auto Shorts
                            defaults (shorts only)
Every insert is guarded against duplicates so retries are harmless.
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, Request

from .auth import require_secret
from .db import cursor

log = logging.getLogger("events")
router = APIRouter(prefix="/api/events", tags=["events"], dependencies=[Depends(require_secret)])

ACTIVE = ["queued", "claimed", "running", "cancel_requested"]
MIN_WORDS_FOR_CAPTIONS = 20  # v1 _has_speech


def _enqueue(cur, jtype: str, video_id, payload: dict | None = None, clip_id=None,
             parent_job_id=None, priority: int = 100) -> str | None:
    """Insert unless an identical-type job for the video is already active
    (renders are per clip: dedupe on clip_id instead)."""
    if jtype == "render":
        cur.execute("select id from jobs where type = 'render' and clip_id = %s and status = any(%s)",
                    (clip_id, ACTIVE))
    else:
        cur.execute("select id from jobs where type = %s and video_id = %s and status = any(%s)",
                    (jtype, video_id, ACTIVE))
    if cur.fetchone():
        return None
    cur.execute(
        "insert into jobs (type, video_id, clip_id, payload, parent_job_id, priority) "
        "values (%s, %s, %s, %s::jsonb, %s, %s) returning id",
        (jtype, video_id, clip_id, json.dumps(payload or {}), parent_job_id, priority),
    )
    return str(cur.fetchone()["id"])


def _assets(cur, video_id) -> dict[str, dict]:
    cur.execute("select kind, path, data, created_at from assets where video_id = %s", (video_id,))
    return {r["kind"]: r for r in cur.fetchall()}


def on_video_ready(video: dict) -> list[str]:
    made = []
    pipeline = video.get("pipeline") or "none"
    if pipeline == "none":
        return made
    with cursor() as cur:
        have = _assets(cur, video["id"])
        if "transcript" not in have:
            made.append(_enqueue(cur, "transcribe", video["id"]))
        if "scenes" not in have:
            made.append(_enqueue(cur, "scenes", video["id"]))
        if pipeline == "shorts" and "borders" not in have:
            made.append(_enqueue(cur, "borders", video["id"]))
        if "transcript" in have and "scenes" in have:
            made.append(_enqueue(cur, "suggest", video["id"]))
            made.append(_enqueue(cur, "postkit", video["id"]))
    return [m for m in made if m]


def on_job_done(job: dict) -> list[str]:
    made = []
    vid = job.get("video_id")
    if not vid:
        return made
    with cursor() as cur:
        cur.execute("select id, pipeline, title from videos where id = %s", (vid,))
        video = cur.fetchone()
        if video is None or (video["pipeline"] or "none") == "none":
            return made
        pipeline = video["pipeline"]
        have = _assets(cur, vid)

        if job["type"] == "transcribe" and "postkit" not in have:
            made.append(_enqueue(cur, "postkit", vid, parent_job_id=job["id"]))

        if job["type"] in ("transcribe", "scenes") and "transcript" in have and "scenes" in have:
            # Suggest once per (transcript, scenes) pair: skip if a suggest job
            # was already created after both assets landed.
            newest = max(have["transcript"]["created_at"], have["scenes"]["created_at"])
            cur.execute("select 1 from jobs where type = 'suggest' and video_id = %s and created_at >= %s",
                        (vid, newest))
            if not cur.fetchone():
                made.append(_enqueue(cur, "suggest", vid, parent_job_id=job["id"]))

        if job["type"] == "suggest" and pipeline == "shorts":
            borders = (have.get("borders") or {}).get("data") or {}
            words = ((have.get("transcript") or {}).get("data") or {}).get("words") or 0
            cur.execute("select id, start_s, end_s from clips where video_id = %s and origin = 'ai_suggest' "
                        "and status = 'proposed' order by created_at", (vid,))
            for clip in cur.fetchall():
                payload = {
                    "start": clip["start_s"], "end": clip["end_s"], "style": "blur",
                    "trim_x": borders.get("trim_x", 0.0), "trim_y": borders.get("trim_y", 0.0),
                    "captions": words >= MIN_WORDS_FOR_CAPTIONS,
                }
                made.append(_enqueue(cur, "render", vid, payload, clip_id=clip["id"], parent_job_id=job["id"]))
    return [m for m in made if m]


@router.post("/video")
async def video_event(request: Request):
    body = await request.json()
    data = body.get("event", {}).get("data", {})
    new, old = data.get("new") or {}, data.get("old") or {}
    if new.get("status") == "ready" and (old.get("status") != "ready" or body.get("event", {}).get("op") == "MANUAL"):
        made = on_video_ready(new)
        log.info("video %s ready → %s", new.get("id"), made)
        return {"enqueued": made}
    return {"enqueued": []}


@router.post("/job")
async def job_event(request: Request):
    body = await request.json()
    data = body.get("event", {}).get("data", {})
    new, old = data.get("new") or {}, data.get("old") or {}
    if new.get("status") == "done" and old.get("status") != "done":
        made = on_job_done(new)
        if made:
            log.info("job %s (%s) done → %s", new.get("id"), new.get("type"), made)
        return {"enqueued": made}
    return {"enqueued": []}
