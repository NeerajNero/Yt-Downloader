"""download: yt-dlp into `<library>/<title>/`, then fill in the videos row
(storage_path, metadata, status='ready'). The status flip fires the Hasura
event trigger that fans out transcribe/scenes/... per `videos.pipeline`."""

from __future__ import annotations

import json
from pathlib import Path

from worker.core import ytdlp_ops

from . import JobContext


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    p = ctx.payload
    url = p["url"] or video.get("url")
    if not url:
        raise ValueError("no url to download")

    ctx.db.execute("update videos set status = 'downloading' where id = %s", (video["id"],))
    root = ctx.storage.library_dir if ctx.storage.local else ctx.storage.job_dir(ctx.id)
    folder = None
    try:
        out = ytdlp_ops.download(url, p["quality"], root, ctx.report, ctx.should_cancel,
                                 cookiefile=str(ctx.cfg.cookies_file) if ctx.cfg.cookies_file else None,
                                 ffmpeg_dir=ctx.tools.ffmpeg_dir)
        folder = out["folder"]
        folder_rel = folder.name
        if not ctx.storage.local:
            ctx.report(None, "uploading to the brain")
            ctx.storage.put_dir(folder_rel, folder)

        info = out["info"]
        filepath: Path = out["filepath"]
        storage_rel = ctx.storage.join(folder_rel, filepath.name)
        thumb_rel = ctx.storage.join(folder_rel, out["thumb"].name) if out["thumb"] else None
        probe = ctx.tools.probe_local(filepath)
        meta = {k: v for k, v in info.items() if k not in ("id", "title", "uploader", "channel",
                                                            "duration", "width", "height", "vcodec")}
        yt_id = info.get("id") if (info.get("extractor_key") or "").lower().startswith("youtube") else None
        ctx.db.execute(
            """update videos
                  set title = %s, channel = %s, url = %s, youtube_id = coalesce(%s, youtube_id),
                      duration = %s, width = %s, height = %s, vcodec = %s, size_bytes = %s,
                      storage_path = %s, thumb_path = %s, meta = %s::jsonb, status = 'ready'
                where id = %s""",
            (info.get("title") or filepath.stem, info.get("uploader") or info.get("channel"),
             info.get("webpage_url") or url, yt_id,
             probe["duration"] or info.get("duration"), probe["width"] or info.get("width"),
             probe["height"] or info.get("height"), probe["vcodec"] or info.get("vcodec"),
             probe["size"], storage_rel, thumb_rel, json.dumps(meta), video["id"]),
        )
    except BaseException:
        ctx.db.execute("update videos set status = 'failed' where id = %s and storage_path is null",
                       (video["id"],))
        if folder and not ctx.storage.local:
            ytdlp_ops.cleanup_partial(folder)
        raise
    finally:
        ctx.storage.cleanup(ctx.id)

    return {"storage_path": storage_rel, "title": info.get("title"), "bytes": probe["size"]}
