"""Uploads that aren't jobs: a media file straight into the library, music
beds and watermark images.

  POST /api/upload?filename=&note=&pipeline=   -> video record (status ready)
  GET/POST /api/music                           <library>/.music (upload queues a beats job)
  GET      /api/music/{name}/beats              the track's beat grid (404 until analysed)
  PATCH    /api/music/{name}/beats              {"drop_s_manual": seconds | null} override
  POST     /api/music/beats/rescan              queue beats for tracks missing a current grid
  GET/POST /api/overlays                        <library>/.overlays
  GET/POST /api/fx                              <library>/.fx  (overlay effect clips)
"""

from __future__ import annotations

import shutil
from pathlib import Path

from fastapi import APIRouter, Query, Request
from pydantic import BaseModel

from studio import context, pipeline
from studio.core import beats, media
from studio.core.ffmpeg import MEDIA_EXTS
from studio.library import AUDIO_EXTS

from .common import fail

router = APIRouter(prefix="/api", tags=["ingest"])
IMAGE_EXTS_OK = {".png", ".webp"}
FX_EXTS = {".mp4", ".mov", ".webm", ".mkv", ".m4v"}


@router.post("/upload")
async def upload(request: Request, filename: str = Query(...), note: str | None = None, pipeline_: str = Query("none", alias="pipeline")):
    app = context.app
    ext = Path(filename).suffix.lower()
    if ext not in MEDIA_EXTS:
        raise fail(f"Can't import {ext or 'that'} files — supported: " + ", ".join(sorted(MEDIA_EXTS)))
    if pipeline_ not in ("none", "prepare", "shorts"):
        raise fail("pipeline must be none, prepare or shorts")
    folder = media.allocate_folder(app.lib.root, media.safe_stem(filename))
    dest = folder / f"{folder.name}{ext}"
    try:
        with dest.open("wb") as fh:
            async for chunk in request.stream():
                fh.write(chunk)
        if dest.stat().st_size == 0:
            raise fail("The upload was empty.")
        meta = media.finalize_import(dest, app.tools)
        thumb = folder / f"{folder.name}.jpg"
        video = app.store.add_video(
            source="import", title=folder.name, channel="Local import", duration=meta["duration"],
            width=meta["width"], height=meta["height"], vcodec=meta["vcodec"], size_bytes=meta["size"],
            storage_path=app.lib.relative(dest), thumb_path=app.lib.relative(thumb) if thumb.is_file() else None,
            status="ready", meta={"imported": True}, note=(note or "").strip() or None, pipeline=pipeline_,
        )
    except Exception:
        shutil.rmtree(folder, ignore_errors=True)
        raise
    pipeline.on_video_ready(video)
    return {"ok": True, "video_id": video["id"], "title": folder.name}


async def _store_upload(request: Request, d: Path, name: str, allowed: set[str], what: str) -> str:
    name = Path(name).name
    if Path(name).suffix.lower() not in allowed:
        raise fail(what)
    safe = media.safe_stem(name) + Path(name).suffix.lower()
    d.mkdir(parents=True, exist_ok=True)
    dest = d / safe
    with dest.open("wb") as fh:
        async for chunk in request.stream():
            fh.write(chunk)
    if dest.stat().st_size == 0:
        dest.unlink(missing_ok=True)
        raise fail("The upload was empty.")
    return safe


@router.get("/music")
def music_list():
    return context.app.lib.music_names()


@router.post("/music")
async def music_upload(request: Request, filename: str = Query(...)):
    name = await _store_upload(request, context.app.lib.music_dir(), filename, AUDIO_EXTS, "Not a supported audio file.")
    made = pipeline.ensure_beats([name])
    return {"ok": True, "name": name, "beats_job_id": made[0]["id"] if made else None}


def _track_name(name: str) -> str:
    name = Path(name).name
    if name not in context.app.lib.music_names():
        raise fail("That track is not in the music folder.", 404)
    return name


@router.get("/music/{name}/beats")
def music_beats(name: str):
    grid = context.app.lib.read_beats(_track_name(name))
    if grid is None:
        raise fail("No beat grid yet — the track is still being analysed.", 404)
    return {**grid, "drop_effective": beats.effective_drop(grid), "current": beats.is_current(grid)}


class DropIn(BaseModel):
    drop_s_manual: float | None = None


@router.patch("/music/{name}/beats")
async def music_drop(name: str, body: DropIn):
    """Set or clear the manual drop. Works before analysis too: a stub grid
    (version 0) holds the value and the next rescan re-analyses around it."""
    app = context.app
    name = _track_name(name)
    if body.drop_s_manual is not None and body.drop_s_manual < 0:
        raise fail("The drop must be at or after 0 s.")
    grid = app.lib.read_beats(name) or {**beats.empty_grid(name), "version": 0}
    grid["drop_s_manual"] = None if body.drop_s_manual is None else round(float(body.drop_s_manual), 3)
    app.lib.put_json(app.lib.beats_rel(name), grid)
    if not beats.is_current(grid):
        pipeline.ensure_beats([name])
    return {**grid, "drop_effective": beats.effective_drop(grid), "current": beats.is_current(grid)}


@router.post("/music/beats/rescan")
def music_beats_rescan():
    return {"queued": len(pipeline.ensure_beats())}


@router.get("/fx")
def fx_list():
    d = context.app.lib.fx_dir()
    return sorted(f.name for f in d.iterdir() if f.suffix.lower() in FX_EXTS) if d.is_dir() else []


@router.post("/fx")
async def fx_upload(request: Request, filename: str = Query(...)):
    name = await _store_upload(request, context.app.lib.fx_dir(), filename, FX_EXTS,
                               "Use a video clip (mp4, mov, webm) — flares and light leaks on a black background.")
    return {"ok": True, "name": name}


@router.get("/overlays")
def overlays_list():
    d = context.app.lib.overlays_dir()
    return sorted(f.name for f in d.iterdir() if f.suffix.lower() in IMAGE_EXTS_OK) if d.is_dir() else []


@router.post("/overlays")
async def overlays_upload(request: Request, filename: str = Query(...)):
    name = await _store_upload(request, context.app.lib.overlays_dir(), filename, IMAGE_EXTS_OK,
                               "Use a PNG or WebP with transparency.")
    return {"ok": True, "name": name}
