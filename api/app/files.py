"""Library file endpoints.

  GET  /api/files/{video_id}/source          stream the source media
  GET  /api/files/{video_id}/thumb           thumbnail image
  GET  /api/files/{video_id}/audio           cached AAC audio-only extract (for transcription)
  GET  /api/files/{video_id}/asset/{kind}    a sidecar / derived file
  POST /api/files/{video_id}/assets/{kind}   worker uploads a result (x-api-secret)
"""

from __future__ import annotations

import json
import subprocess
import threading
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse

from . import library, settings
from .auth import require_secret
from .db import cursor

router = APIRouter(prefix="/api/files", tags=["files"])

IMAGE_TYPES = {".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}

_audio_locks: dict[str, threading.Lock] = {}
_audio_locks_guard = threading.Lock()


def _video(video_id: str) -> dict:
    with cursor() as cur:
        cur.execute("select id, title, storage_path, thumb_path, duration from videos where id = %s",
                    (video_id,))
        row = cur.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="video not found")
    return row


def _existing(p: Path) -> Path:
    if not p.is_file():
        raise HTTPException(status_code=404, detail=f"file missing on disk: {library.relative(p)}")
    return p


@router.get("/{video_id}/source")
def source(video_id: str):
    v = _video(video_id)
    p = _existing(library.resolve(v["storage_path"]))
    return FileResponse(p, filename=p.name)


@router.get("/{video_id}/thumb")
def thumb(video_id: str):
    v = _video(video_id)
    p = _existing(library.resolve(v["thumb_path"]))
    return FileResponse(p, media_type=IMAGE_TYPES.get(p.suffix.lower(), "application/octet-stream"),
                        headers={"cache-control": "public, max-age=86400"})


@router.get("/{video_id}/audio")
def audio(video_id: str):
    """Mono 64 kbps AAC extract, cached under <library>/.cache/audio/<video_id>.m4a.
    Whisper resamples to 16 kHz mono anyway, so this loses nothing it needs."""
    v = _video(video_id)
    src = _existing(library.resolve(v["storage_path"]))
    out = library.cache_dir("audio") / f"{video_id}.m4a"

    with _audio_locks_guard:
        lock = _audio_locks.setdefault(video_id, threading.Lock())
    with lock:  # second concurrent request waits for the first extraction
        if not out.is_file() or out.stat().st_mtime < src.stat().st_mtime:
            tmp = out.with_suffix(".part.m4a")
            cmd = [settings.FFMPEG, "-y", "-v", "error", "-i", str(src), "-vn", "-sn", "-dn",
                   "-map", "0:a:0", "-ac", "1", "-c:a", "aac", "-b:a", "64k", str(tmp)]
            proc = subprocess.run(cmd, capture_output=True, text=True)
            if proc.returncode != 0:
                tmp.unlink(missing_ok=True)
                raise HTTPException(status_code=500, detail=f"audio extract failed: {proc.stderr[-400:]}")
            tmp.replace(out)
    return FileResponse(out, media_type="audio/mp4", filename=f"{Path(v['storage_path']).stem}.m4a")


@router.get("/{video_id}/asset/{kind}")
def asset(video_id: str, kind: str):
    with cursor() as cur:
        cur.execute("select path from assets where video_id = %s and kind = %s", (video_id, kind))
        row = cur.fetchone()
    if row is None or not row["path"]:
        raise HTTPException(status_code=404, detail="asset not found")
    p = _existing(library.resolve(row["path"]))
    return FileResponse(p, filename=p.name)


def _summarize(kind: str, body: bytes) -> dict | None:
    """Small inline payload for the assets.data column (cheap badges in the UI)."""
    try:
        obj = json.loads(body)
    except ValueError:
        return None
    if kind == "transcript":
        segs = obj.get("segments") or []
        return {"language": obj.get("language"), "segments": len(segs),
                "words": sum(len(s.get("words") or []) for s in segs), "model": obj.get("model")}
    if kind == "scenes":
        return {"scenes": len(obj.get("scenes") or []), "threshold": obj.get("threshold")}
    if kind == "captions":
        return {"items": len(obj.get("items") or [])}
    return None


@router.post("/{video_id}/assets/{kind}", dependencies=[Depends(require_secret)])
async def upload_asset(video_id: str, kind: str, request: Request,
                       job_id: str | None = Query(default=None),
                       filename: str | None = Query(default=None)):
    v = _video(video_id)
    src = library.resolve(v["storage_path"])
    dest = library.sidecar_for(src, kind, filename)
    library.resolve(library.relative(dest))  # re-check containment after filename join

    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="empty upload")
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_name(dest.name + ".part")
    tmp.write_bytes(body)
    tmp.replace(dest)

    rel = library.relative(dest)
    data = _summarize(kind, body) if dest.suffix == ".json" else None
    with cursor() as cur:
        cur.execute(
            """insert into assets (video_id, kind, path, data, job_id)
               values (%s, %s, %s, %s::jsonb, %s)
               on conflict (video_id, kind) do update
                 set path = excluded.path, data = excluded.data, job_id = excluded.job_id,
                     created_at = now()
               returning id""",
            (video_id, kind, rel, json.dumps(data) if data is not None else None, job_id),
        )
        asset_id = cur.fetchone()["id"]
    return {"ok": True, "asset_id": str(asset_id), "kind": kind, "path": rel, "bytes": len(body), "data": data}
