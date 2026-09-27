"""DaVinci Resolve hand-off: an FCPXML timeline with one clip per selected
segment of a video, cut from the source file. Resolve relinks the media on
import (File → Import → Timeline), so the path only needs the file name.

  GET /api/files/{video_id}/timeline.fcpxml?status=approved|rendered|all
"""

from __future__ import annotations

from fractions import Fraction
from pathlib import Path
from xml.sax.saxutils import escape

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from .db import cursor

router = APIRouter(prefix="/api/files", tags=["timeline"])

STATUSES = {"approved": ["approved", "posted"], "rendered": ["rendered", "approved", "posted"], "all": None}


def _t(seconds: float, fps: int) -> str:
    """FCPXML rational time on the frame grid: '1200/30s'."""
    frames = round(seconds * fps)
    return f"{frames}/{fps}s"


def build_fcpxml(video: dict, clips: list[dict], fps: int = 30) -> str:
    w, h = video.get("width") or 1920, video.get("height") or 1080
    src_name = Path(video["storage_path"]).name
    dur = float(video.get("duration") or max((c["end_s"] for c in clips), default=60))
    frame = Fraction(1, fps)
    spine = []
    offset = 0.0
    for i, c in enumerate(clips):
        length = max(float(c["end_s"]) - float(c["start_s"]), 1 / fps)
        name = escape(c.get("title") or f"clip {i + 1}")
        spine.append(
            f'      <asset-clip name="{name}" ref="r2" offset="{_t(offset, fps)}" '
            f'start="{_t(float(c["start_s"]), fps)}" duration="{_t(length, fps)}" '
            f'format="r1" tcFormat="NDF"/>'
        )
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
        raise HTTPException(status_code=400, detail="status must be approved, rendered or all")
    with cursor() as cur:
        cur.execute("select id, title, storage_path, width, height, duration, meta from videos where id = %s", (video_id,))
        video = cur.fetchone()
        if video is None or not video["storage_path"]:
            raise HTTPException(status_code=404, detail="video not found")
        wanted = STATUSES[status]
        if wanted:
            cur.execute("select start_s, end_s, title from clips where video_id = %s and status = any(%s) "
                        "order by start_s", (video_id, wanted))
        else:
            cur.execute("select start_s, end_s, title from clips where video_id = %s and status <> 'rejected' "
                        "order by start_s", (video_id,))
        clips = cur.fetchall()
    if not clips:
        raise HTTPException(status_code=404, detail="no clips to export")
    fps = int(round(float((video.get("meta") or {}).get("fps") or 30)))
    xml = build_fcpxml(video, clips, fps=fps if fps in (24, 25, 30, 50, 60) else 30)
    fname = f"{Path(video['storage_path']).stem}.fcpxml"
    return Response(content=xml, media_type="application/xml",
                    headers={"content-disposition": f'attachment; filename="{fname}"'})
