"""Write side: probe/download, queue jobs, edit videos/clips/recipes/styles."""

from __future__ import annotations

import re

from fastapi import APIRouter
from pydantic import BaseModel

from studio import context, pipeline
from studio.core import ytdlp_ops
from studio.queue import ACTIVE
from studio.schemas import NEEDS_VIDEO, validate_payload, validate_recipe

from .common import fail, job_view, video_or_404

router = APIRouter(prefix="/api", tags=["actions"])
_YT_ID = re.compile(r"(?:v=|/shorts/|youtu\.be/|/embed/)([A-Za-z0-9_-]{11})")


# ---- ingest ---------------------------------------------------------------------

class ProbeIn(BaseModel):
    url: str


@router.post("/probe")
def probe(body: ProbeIn):
    url = body.url.strip()
    if not url.lower().startswith(("http://", "https://")):
        raise fail("That doesn't look like a link.")
    app = context.app
    try:
        info = ytdlp_ops.probe(url, cookiefile=str(app.settings.cookies_file) if app.settings.cookies_file else None,
                               ffmpeg_dir=app.tools.ffmpeg_dir)
    except Exception as e:  # noqa: BLE001
        raise fail(f"Could not read that link: {str(e)[:300]}")
    existing = app.store.find_video(youtube_id=info["youtube_id"]) if info.get("youtube_id") else None
    return {**info, "existing_video_id": existing["id"] if existing and existing.get("storage_path") else None}


class DownloadIn(BaseModel):
    url: str
    quality: str = "best"
    title: str | None = None
    youtube_id: str | None = None
    note: str | None = None
    pipeline: str = "none"


@router.post("/download")
def start_download(body: DownloadIn):
    app = context.app
    url = body.url.strip()
    if not url:
        raise fail("A link is required.")
    if not re.fullmatch(r"best|audio|hdr|\d{3,4}", body.quality):
        raise fail("Unknown quality.")
    if body.pipeline not in ("none", "prepare", "shorts"):
        raise fail("Pipeline must be none, prepare or shorts.")
    note = (body.note or "").strip() or None
    title = (body.title or "").strip() or url
    video = app.store.find_video(youtube_id=body.youtube_id) if body.youtube_id else None
    if video and video.get("storage_path"):
        app.store.update_video(video["id"], note=note or video.get("note"), pipeline=body.pipeline)
        return {"video_id": video["id"], "job_id": None, "existing": True}
    if video:
        app.store.update_video(video["id"], title=title, url=url, note=note, pipeline=body.pipeline, status="new")
    else:
        video = app.store.add_video(source="youtube", youtube_id=body.youtube_id, url=url, title=title,
                                    note=note, pipeline=body.pipeline)
    active = app.queue.active("download", video_id=video["id"])
    if active:
        return {"video_id": video["id"], "job_id": active["id"], "existing": True}
    job = app.queue.enqueue("download", video_id=video["id"], payload={"url": url, "quality": body.quality}, priority=50)
    return {"video_id": video["id"], "job_id": job["id"], "existing": False}


# ---- jobs ------------------------------------------------------------------------

class EnqueueIn(BaseModel):
    type: str
    video_id: str | None = None
    clip_id: str | None = None
    payload: dict = {}


@router.post("/jobs")
def enqueue_job(body: EnqueueIn):
    app = context.app
    try:
        payload = validate_payload(body.type, body.payload)
    except ValueError as e:
        raise fail(str(e))
    if body.type in NEEDS_VIDEO and not body.video_id:
        raise fail(f"{body.type} needs a video.")
    if body.video_id:
        v = video_or_404(body.video_id)
        if body.type in NEEDS_VIDEO and not v.get("storage_path"):
            raise fail("That video has no file yet — download it first.")
        if v.get("status") == "missing":
            raise fail("The video file is missing on disk.")
    if body.type == "render":
        dup = app.queue.active("render", clip_id=body.clip_id) if body.clip_id else None
    else:
        dup = app.queue.active(body.type, video_id=body.video_id)
    if dup:
        return {"job_id": dup["id"], "existing": True}
    job = app.queue.enqueue(body.type, video_id=body.video_id, clip_id=body.clip_id, payload=payload)
    return {"job_id": job["id"], "existing": False}


@router.post("/jobs/{job_id}/cancel")
def cancel_job(job_id: str):
    j = context.app.queue.cancel(job_id)
    if j is None:
        raise fail("Job not found.", 404)
    return job_view(j)


@router.post("/jobs/{job_id}/retry")
def retry_job(job_id: str):
    j = context.app.queue.retry(job_id)
    if j is None:
        raise fail("Job not found.", 404)
    return job_view(j)


@router.delete("/jobs/finished")
def clear_finished():
    return {"removed": context.app.queue.clear_finished()}


# ---- videos ------------------------------------------------------------------------

class VideoPatch(BaseModel):
    note: str | None = None
    pipeline: str | None = None


@router.patch("/videos/{video_id}")
def patch_video(video_id: str, body: VideoPatch):
    video_or_404(video_id)
    fields = {}
    if "note" in body.model_fields_set:
        fields["note"] = (body.note or "").strip() or None
    if body.pipeline is not None:
        if body.pipeline not in ("none", "prepare", "shorts"):
            raise fail("Pipeline must be none, prepare or shorts.")
        fields["pipeline"] = body.pipeline
    return context.app.store.update_video(video_id, **fields)


@router.delete("/videos/{video_id}")
def delete_video(video_id: str):
    app = context.app
    video_or_404(video_id)
    for j in app.queue.for_video(video_id, active_only=True):
        app.queue.cancel(j["id"])
    app.store.delete_video(video_id)
    return {"ok": True}


@router.post("/library/rescan")
def rescan():
    return context.app.store.reconcile()


# ---- clips --------------------------------------------------------------------------

class ClipIn(BaseModel):
    video_id: str
    start_s: float
    end_s: float
    title: str | None = None


@router.post("/clips")
def add_clip(body: ClipIn):
    video_or_404(body.video_id)
    if body.end_s <= body.start_s:
        raise fail("End time must be after start time.")
    return context.app.store.add_clip(body.video_id, body.start_s, body.end_s, title=body.title, origin="manual")


class ClipPatch(BaseModel):
    status: str | None = None
    title: str | None = None


@router.patch("/clips/{clip_id}")
def patch_clip(clip_id: str, body: ClipPatch):
    fields = {}
    if body.status is not None:
        if body.status not in ("proposed", "approved", "rendering", "rendered", "rejected", "posted"):
            raise fail("Unknown clip status.")
        fields["status"] = body.status
    if body.title is not None:
        fields["title"] = body.title.strip() or None
    c = context.app.store.update_clip(clip_id, **fields)
    if c is None:
        raise fail("Clip not found.", 404)
    return c


@router.delete("/clips/{clip_id}")
def delete_clip(clip_id: str):
    context.app.store.delete_clip(clip_id)
    return {"ok": True}


# ---- recipes ------------------------------------------------------------------------------

class RecipeIn(BaseModel):
    name: str
    description: str | None = None
    settings: dict
    auto_apply: bool = False


@router.post("/recipes")
def add_recipe(body: RecipeIn):
    name = body.name.strip()
    if not name:
        raise fail("A recipe needs a name.")
    try:
        settings = validate_recipe(body.settings)
        return context.app.store.add_recipe(name, body.description, settings, body.auto_apply)
    except ValueError as e:
        raise fail(str(e))


class RecipePatch(BaseModel):
    name: str | None = None
    description: str | None = None
    settings: dict | None = None
    auto_apply: bool | None = None


@router.patch("/recipes/{recipe_id}")
def patch_recipe(recipe_id: str, body: RecipePatch):
    fields: dict = {}
    if body.name is not None:
        fields["name"] = body.name.strip()
        if not fields["name"]:
            raise fail("A recipe needs a name.")
    if "description" in body.model_fields_set:
        fields["description"] = body.description
    if body.settings is not None:
        try:
            fields["settings"] = validate_recipe(body.settings)
        except ValueError as e:
            raise fail(str(e))
    if body.auto_apply is not None:
        fields["auto_apply"] = body.auto_apply
    try:
        r = context.app.store.update_recipe(recipe_id, **fields)
    except ValueError as e:
        raise fail(str(e))
    if r is None:
        raise fail("Recipe not found.", 404)
    return r


@router.delete("/recipes/{recipe_id}")
def delete_recipe(recipe_id: str):
    context.app.store.delete_recipe(recipe_id)
    return {"ok": True}


# ---- styles ----------------------------------------------------------------------------------

class StyleIn(BaseModel):
    url: str


@router.post("/styles")
def analyze_style(body: StyleIn):
    app = context.app
    url = body.url.strip()
    if not url.lower().startswith(("http://", "https://")):
        raise fail("That doesn't look like a link.")
    m = _YT_ID.search(url)
    yt_id = m.group(1) if m else None
    style = app.store.find_style(yt_id) if yt_id else None
    if style and style["status"] == "ready":
        return {"style_id": style["id"], "job_id": None, "existing": True}
    if style:
        app.store.update_style(style["id"], url=url, status="new", error=None)
    else:
        style = app.store.add_style(url, yt_id, url)
    for j in app.queue.list():
        if j["type"] == "style" and j["status"] in ACTIVE and j["payload"].get("style_id") == style["id"]:
            return {"style_id": style["id"], "job_id": j["id"], "existing": True}
    job = app.queue.enqueue("style", payload={"style_id": style["id"], "url": url}, priority=60)
    app.store.update_style(style["id"], job_id=job["id"])
    return {"style_id": style["id"], "job_id": job["id"], "existing": False}


@router.delete("/styles/{style_id}")
def delete_style(style_id: str):
    context.app.store.delete_style(style_id)
    return {"ok": True}


# Re-export for main.py's queue hook.
on_job_done = pipeline.on_job_done
