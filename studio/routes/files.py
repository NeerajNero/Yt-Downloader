"""Library file endpoints.

  GET  /api/files/{video_id}/source          the source media (Range OK)
  GET  /api/files/{video_id}/thumb           thumbnail
  GET  /api/files/{video_id}/asset/{kind}    a sidecar / derived file
  GET  /api/files/get?path=<rel>             any library file by relative path (player, downloads)
  POST /api/files/{video_id}/assets/{kind}   store a sidecar (manual captions from the editor)
  GET  /api/files/{video_id}/timeline.fcpxml Resolve hand-off
"""

from __future__ import annotations

import json
from fractions import Fraction
from pathlib import Path
from xml.sax.saxutils import escape

from fastapi import APIRouter, Query, Request
from fastapi.responses import FileResponse, Response

from studio import context, pipeline

from .common import fail, video_or_404

router = APIRouter(prefix="/api/files", tags=["files"])

IMAGE_TYPES = {".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}
MEDIA_TYPES = {".mp4": "video/mp4", ".mkv": "video/x-matroska", ".webm": "video/webm",
               ".mov": "video/quicktime", ".m4a": "audio/mp4", ".mp3": "audio/mpeg",
               ".opus": "audio/ogg", ".json": "application/json", ".ass": "text/plain", ".fcpxml": "application/xml"}


def _resolve(rel: str | None) -> Path:
    try:
        p = context.app.lib.resolve(rel)
    except ValueError as e:
        raise fail(str(e), 400 if rel else 404)
    if not p.is_file():
        raise fail(f"file missing on disk: {rel}", 404)
    return p


def _serve(p: Path, download_name: str | None = None) -> FileResponse:
    media_type = MEDIA_TYPES.get(p.suffix.lower()) or IMAGE_TYPES.get(p.suffix.lower())
    return FileResponse(p, media_type=media_type, filename=download_name)


@router.get("/get")
@router.head("/get")
def get_any(path: str = Query(...)):
    return _serve(_resolve(path))


@router.get("/{video_id}/source")
def source(video_id: str):
    v = video_or_404(video_id)
    p = _resolve(v.get("storage_path"))
    return _serve(p, p.name)


@router.get("/{video_id}/thumb")
def thumb(video_id: str):
    v = video_or_404(video_id)
    p = _resolve(v.get("thumb_path"))
    return FileResponse(p, media_type=IMAGE_TYPES.get(p.suffix.lower(), "application/octet-stream"),
                        headers={"cache-control": "public, max-age=86400"})


@router.get("/{video_id}/asset/{kind}")
def asset(video_id: str, kind: str):
    v = video_or_404(video_id)
    a = context.app.store.asset(v, kind)
    if a is None:
        raise fail("asset not found", 404)
    p = _resolve(a["path"])
    return _serve(p, p.name)


@router.post("/{video_id}/assets/{kind}")
async def upload_asset(video_id: str, kind: str, request: Request, filename: str | None = Query(default=None)):
    """Write a sidecar next to the media (the caption editor uses kind=captions)."""
    app = context.app
    v = video_or_404(video_id)
    src = app.lib.resolve(v.get("storage_path"))
    try:
        dest = app.lib.sidecar_for(src, kind, filename)
        app.lib.resolve(app.lib.relative(dest))
    except ValueError as e:
        raise fail(str(e))
    body = await request.body()
    if not body:
        raise fail("empty upload")
    if dest.suffix == ".json":
        try:
            json.loads(body)
        except ValueError:
            raise fail("body must be JSON")
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_name(dest.name + ".part")
    tmp.write_bytes(body)
    tmp.replace(dest)
    app.store.invalidate_assets(video_id)
    a = app.store.asset(v, kind)
    return {"ok": True, "kind": kind, "path": app.lib.relative(dest), "bytes": len(body), "data": a["data"] if a else None}


# ---- DaVinci Resolve timeline -----------------------------------------------------------

STATUSES = {"approved": ["approved", "posted"], "rendered": ["rendered", "approved", "posted"], "all": None}


def _t(seconds: float, fps: int) -> str:
    return f"{round(seconds * fps)}/{fps}s"


def build_fcpxml(video: dict, clips: list[dict], fps: int = 30) -> str:
    w, h = video.get("width") or 1920, video.get("height") or 1080
    src_name = Path(video["storage_path"]).name
    dur = float(video.get("duration") or max((c["end_s"] for c in clips), default=60))
    frame = Fraction(1, fps)
    spine, offset = [], 0.0
    for i, c in enumerate(clips):
        length = max(float(c["end_s"]) - float(c["start_s"]), 1 / fps)
        name = escape(c.get("title") or f"clip {i + 1}")
        spine.append(f'      <asset-clip name="{name}" ref="r2" offset="{_t(offset, fps)}" '
                     f'start="{_t(float(c["start_s"]), fps)}" duration="{_t(length, fps)}" format="r1" tcFormat="NDF"/>')
        offset += length
    body = "\n".join(spine)
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
  <resources>
    <format id="r1" name="FFVideoFormat{h}p{fps}" frameDuration="{frame.numerator}/{frame.denominator}s" width="{w}" height="{h}"/>
    <asset id="r2" name="{escape(src_name)}" src="file://./{escape(src_name)}" start="0s" duration="{_t(dur, fps)}" hasVideo="1" hasAudio="1" format="r1"/>
  </resources>
  <library>
    <event name="YT Studio">
      <project name="{escape(video["title"])} — clips">
        <sequence format="r1" duration="{_t(offset, fps)}" tcStart="0s" tcFormat="NDF">
          <spine>
{body}
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>
'''


@router.get("/{video_id}/timeline.fcpxml")
def timeline(video_id: str, status: str = Query("all")):
    if status not in STATUSES:
        raise fail("status must be approved, rendered or all")
    v = video_or_404(video_id)
    if not v.get("storage_path"):
        raise fail("video has no file", 404)
    wanted = STATUSES[status]
    clips = [c for c in context.app.store.clips_for(video_id)
             if (c["status"] in wanted if wanted else c["status"] != "rejected")]
    clips.sort(key=lambda c: c["start_s"])
    if not clips:
        raise fail("no clips to export", 404)
    fps = int(round(float((v.get("meta") or {}).get("fps") or 30)))
    xml = build_fcpxml(v, clips, fps=fps if fps in (24, 25, 30, 50, 60) else 30)
    fname = f"{Path(v['storage_path']).stem}.fcpxml"
    return Response(content=xml, media_type="application/xml",
                    headers={"content-disposition": f'attachment; filename="{fname}"'})


_ = pipeline  # imported for side effects in main; keeps the module graph explicit
