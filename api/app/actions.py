"""Hasura Action handlers. Hasura POSTs {"action": {"name"}, "input": {...}};
we return the output object, or 400 {"message": ...} which Hasura surfaces
as a GraphQL error the PWA shows verbatim (keep messages plain-words)."""

from __future__ import annotations

import json
import re

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from worker.agent.jobs.schemas import NEEDS_VIDEO, validate_payload
from worker.core import ytdlp_ops

from . import settings, wol
from .auth import require_secret
from .db import cursor

router = APIRouter(prefix="/api/actions", tags=["actions"], dependencies=[Depends(require_secret)])

ACTIVE = ["queued", "claimed", "running", "cancel_requested"]


def _fail(msg: str, code: int = 400):
    return JSONResponse(status_code=code, content={"message": msg})


async def _input(request: Request) -> dict:
    body = await request.json()
    return body.get("input") or {}


def _cookiefile() -> str | None:
    p = settings.LIBRARY_DIR / ".config" / "cookies.txt"
    return str(p) if p.is_file() else None


@router.post("/probe_url")
async def probe_url(request: Request):
    inp = await _input(request)
    url = (inp.get("url") or "").strip()
    if not url.lower().startswith(("http://", "https://")):
        return _fail("That doesn't look like a link.")
    try:
        info = ytdlp_ops.probe(url, cookiefile=_cookiefile())
    except Exception as e:  # noqa: BLE001
        return _fail(f"Could not read that link: {str(e)[:300]}")
    existing = None
    if info.get("youtube_id"):
        with cursor() as cur:
            cur.execute("select id from videos where youtube_id = %s and storage_path is not null",
                        (info["youtube_id"],))
            row = cur.fetchone()
            existing = str(row["id"]) if row else None
    return {**info, "existing_video_id": existing}


@router.post("/start_download")
async def start_download(request: Request):
    inp = await _input(request)
    url = (inp.get("url") or "").strip()
    quality = inp.get("quality") or "best"
    if not url:
        return _fail("A link is required.")
    if not re.fullmatch(r"best|audio|hdr|\d{3,4}", quality):
        return _fail("Unknown quality.")
    pipeline = inp.get("pipeline") or "none"
    if pipeline not in ("none", "prepare", "shorts"):
        return _fail("Pipeline must be none, prepare or shorts.")
    yt_id = inp.get("youtube_id") or None
    title = (inp.get("title") or "").strip() or url
    note = (inp.get("note") or "").strip() or None

    with cursor() as cur:
        row = None
        if yt_id:
            cur.execute("select id, storage_path from videos where youtube_id = %s", (yt_id,))
            row = cur.fetchone()
        if row and row["storage_path"]:
            cur.execute("update videos set note = coalesce(%s, note), pipeline = %s where id = %s",
                        (note, pipeline, row["id"]))
            return {"video_id": str(row["id"]), "job_id": None, "existing": True}
        if row:
            vid = row["id"]
            cur.execute("update videos set title = %s, url = %s, note = %s, pipeline = %s, status = 'new' "
                        "where id = %s", (title, url, note, pipeline, vid))
        else:
            cur.execute(
                "insert into videos (source, youtube_id, url, title, status, note, pipeline) "
                "values ('youtube', %s, %s, %s, 'new', %s, %s) returning id",
                (yt_id, url, title, note, pipeline),
            )
            vid = cur.fetchone()["id"]
        cur.execute("select id from jobs where type = 'download' and video_id = %s and status = any(%s)",
                    (vid, ACTIVE))
        active = cur.fetchone()
        if active:
            return {"video_id": str(vid), "job_id": str(active["id"]), "existing": True}
        cur.execute(
            "insert into jobs (type, video_id, payload, priority) values ('download', %s, %s::jsonb, 50) returning id",
            (vid, json.dumps({"url": url, "quality": quality})),
        )
        jid = cur.fetchone()["id"]
    return {"video_id": str(vid), "job_id": str(jid), "existing": False}


@router.post("/enqueue_job")
async def enqueue_job(request: Request):
    inp = await _input(request)
    jtype = inp.get("type") or ""
    video_id = inp.get("video_id")
    clip_id = inp.get("clip_id")
    try:
        payload = validate_payload(jtype, inp.get("payload") or {})
    except ValueError as e:
        return _fail(str(e))
    if jtype in NEEDS_VIDEO and not video_id:
        return _fail(f"{jtype} needs a video.")
    with cursor() as cur:
        if video_id:
            cur.execute("select storage_path from videos where id = %s", (video_id,))
            v = cur.fetchone()
            if v is None:
                return _fail("Video not found.")
            if jtype in NEEDS_VIDEO and not v["storage_path"]:
                return _fail("That video has no file yet — download it first.")
        # One active job of a kind per video (renders are the exception: many clips).
        if video_id and jtype != "render":
            cur.execute("select id from jobs where type = %s and video_id = %s and status = any(%s)",
                        (jtype, video_id, ACTIVE))
            dup = cur.fetchone()
            if dup:
                return {"job_id": str(dup["id"])}
        cur.execute(
            "insert into jobs (type, video_id, clip_id, payload) values (%s, %s, %s, %s::jsonb) returning id",
            (jtype, video_id, clip_id, json.dumps(payload)),
        )
        jid = cur.fetchone()["id"]
    return {"job_id": str(jid)}


def wake(name: str) -> tuple[bool, str]:
    if not settings.WOL_ENABLED:
        return False, "Wake-on-LAN is turned off. Set WOL_ENABLED=true in the brain's .env to use it."
    with cursor() as cur:
        cur.execute("select id, mac_address, status from machines where name = %s", (name,))
        m = cur.fetchone()
        if m is None:
            return False, "No such machine."
        if not m["mac_address"]:
            return False, f"{name} has no MAC address set (machines.mac_address)."
        try:
            note = wol.send(str(m["mac_address"]), settings.API_SECRET)
        except Exception as e:  # noqa: BLE001
            return False, f"Could not send the wake packet: {e}"
        cur.execute("update machines set status = case when status = 'online' then status else 'waking' end, "
                    "woken_at = now() where id = %s", (m["id"],))
    return True, note


@router.post("/wake_machine")
async def wake_machine(request: Request):
    inp = await _input(request)
    ok, msg = wake(inp.get("name") or "")
    if not ok:
        return _fail(msg)
    return {"ok": True, "message": msg}


_YT_ID = re.compile(r"(?:v=|/shorts/|youtu\.be/|/embed/)([A-Za-z0-9_-]{11})")


@router.post("/analyze_style")
async def analyze_style(request: Request):
    """Insert a `styles` row (dedupe on the YouTube id) and a `style` job."""
    inp = await _input(request)
    url = (inp.get("url") or "").strip()
    if not url.lower().startswith(("http://", "https://")):
        return _fail("That doesn't look like a link.")
    m = _YT_ID.search(url)
    yt_id = m.group(1) if m else None
    with cursor() as cur:
        row = None
        if yt_id:
            cur.execute("select id, status from styles where youtube_id = %s", (yt_id,))
            row = cur.fetchone()
        if row and row["status"] == "ready":
            return {"style_id": str(row["id"]), "job_id": None, "existing": True}
        if row:
            sid = row["id"]
            cur.execute("update styles set url = %s, status = 'new', error = null where id = %s", (url, sid))
        else:
            cur.execute("insert into styles (url, youtube_id, title) values (%s, %s, %s) returning id", (url, yt_id, url))
            sid = cur.fetchone()["id"]
        cur.execute("select id from jobs where type = 'style' and (payload->>'style_id') = %s and status = any(%s)",
                    (str(sid), ACTIVE))
        active = cur.fetchone()
        if active:
            return {"style_id": str(sid), "job_id": str(active["id"]), "existing": True}
        cur.execute("insert into jobs (type, payload, priority) values ('style', %s::jsonb, 60) returning id",
                    (json.dumps({"style_id": str(sid), "url": url}),))
        jid = cur.fetchone()["id"]
    return {"style_id": str(sid), "job_id": str(jid), "existing": False}
