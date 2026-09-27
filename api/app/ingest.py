"""Phone/browser ingest that isn't a job: file upload straight into the
library, and music beds for renders.

  POST /api/upload?filename=&note=&pipeline=   stream a media file -> videos row (status ready)
  GET  /api/music                               list music beds (<library>/.music)
  POST /api/music?filename=                     upload a music bed
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from worker.core import media
from worker.core.ffmpeg import MEDIA_EXTS, Tools

from . import library, settings
from .auth import require_secret
from .db import cursor

router = APIRouter(prefix="/api", tags=["ingest"])
AUDIO_EXTS = {".mp3", ".m4a", ".aac", ".wav", ".ogg", ".opus", ".flac"}
PIPELINES = {"none", "prepare", "shorts"}


@router.post("/upload", dependencies=[Depends(require_secret)])
async def upload(request: Request, filename: str = Query(...), note: str | None = None,
                 pipeline: str = "none"):
    ext = Path(filename).suffix.lower()
    if ext not in MEDIA_EXTS:
        raise HTTPException(status_code=400, detail=f"Can't import {ext or 'that'} files — supported: "
                            + ", ".join(sorted(MEDIA_EXTS)))
    if pipeline not in PIPELINES:
        raise HTTPException(status_code=400, detail="pipeline must be none, prepare or shorts")
    folder = media.allocate_folder(settings.LIBRARY_DIR, media.safe_stem(filename))
    dest = folder / f"{folder.name}{ext}"
    try:
        with dest.open("wb") as fh:
            async for chunk in request.stream():
                fh.write(chunk)
        if dest.stat().st_size == 0:
            raise HTTPException(status_code=400, detail="The upload was empty.")
        meta = media.finalize_import(dest, Tools(settings.FFMPEG))
        thumb = folder / f"{folder.name}.jpg"
        with cursor() as cur:
            cur.execute(
                """insert into videos (source, title, channel, duration, width, height, vcodec, size_bytes,
                                       storage_path, thumb_path, status, meta, note, pipeline)
                   values ('import', %s, 'Local import', %s, %s, %s, %s, %s, %s, %s, 'ready', %s::jsonb, %s, %s)
                   returning id""",
                (folder.name, meta["duration"], meta["width"], meta["height"], meta["vcodec"], meta["size"],
                 library.relative(dest), library.relative(thumb) if thumb.is_file() else None,
                 json.dumps({"imported": True}), note or None, pipeline),
            )
            vid = cur.fetchone()["id"]
    except Exception:
        shutil.rmtree(folder, ignore_errors=True)
        raise
    return {"ok": True, "video_id": str(vid), "title": folder.name}


IMAGE_EXTS_OK = {".png", ".webp"}


@router.get("/overlays")
def overlays_list():
    """Watermark / logo images for recipes (<library>/.overlays)."""
    d = settings.LIBRARY_DIR / ".overlays"
    if not d.is_dir():
        return []
    return sorted(f.name for f in d.iterdir() if f.suffix.lower() in IMAGE_EXTS_OK)


@router.post("/overlays", dependencies=[Depends(require_secret)])
async def overlays_upload(request: Request, filename: str = Query(...)):
    name = Path(filename).name
    if Path(name).suffix.lower() not in IMAGE_EXTS_OK:
        raise HTTPException(status_code=400, detail="Use a PNG or WebP with transparency.")
    safe = media.safe_stem(name) + Path(name).suffix.lower()
    d = settings.LIBRARY_DIR / ".overlays"
    d.mkdir(parents=True, exist_ok=True)
    dest = d / safe
    with dest.open("wb") as fh:
        async for chunk in request.stream():
            fh.write(chunk)
    if dest.stat().st_size == 0:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="The upload was empty.")
    return {"ok": True, "name": safe}


@router.get("/music")
def music_list():
    d = settings.LIBRARY_DIR / ".music"
    if not d.is_dir():
        return []
    return sorted(f.name for f in d.iterdir() if f.suffix.lower() in AUDIO_EXTS)


@router.post("/music", dependencies=[Depends(require_secret)])
async def music_upload(request: Request, filename: str = Query(...)):
    name = Path(filename).name
    if Path(name).suffix.lower() not in AUDIO_EXTS:
        raise HTTPException(status_code=400, detail="Not a supported audio file.")
    safe = media.safe_stem(name) + Path(name).suffix.lower()
    d = settings.LIBRARY_DIR / ".music"
    d.mkdir(parents=True, exist_ok=True)
    dest = d / safe
    with dest.open("wb") as fh:
        async for chunk in request.stream():
            fh.write(chunk)
    if dest.stat().st_size == 0:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="The upload was empty.")
    return {"ok": True, "name": safe}
