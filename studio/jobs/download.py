"""download: yt-dlp into `<library>/<title>/`, then fill in the video record
(storage_path, metadata, status='ready'). The pipeline fan-out runs when the
job finishes (studio.pipeline.on_job_done)."""

from __future__ import annotations

from pathlib import Path

from studio.core import ytdlp_ops

from . import JobContext


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    p = ctx.payload
    url = p["url"] or video.get("url")
    if not url:
        raise ValueError("no url to download")

    ctx.store.update_video(video["id"], status="downloading")
    try:
        out = ytdlp_ops.download(url, p["quality"], ctx.lib.root, ctx.report, ctx.should_cancel,
                                 cookiefile=ctx.cookies, ffmpeg_dir=ctx.tools.ffmpeg_dir)
        folder: Path = out["folder"]
        folder_rel = folder.name
        info = out["info"]
        filepath: Path = out["filepath"]
        storage_rel = ctx.lib.join(folder_rel, filepath.name)
        thumb_rel = ctx.lib.join(folder_rel, out["thumb"].name) if out["thumb"] else None
        probe = ctx.tools.probe_local(filepath)
        meta = {k: v for k, v in info.items() if k not in ("id", "title", "uploader", "channel",
                                                            "duration", "width", "height", "vcodec")}
        yt_id = info.get("id") if (info.get("extractor_key") or "").lower().startswith("youtube") else None
        ctx.store.update_video(
            video["id"], title=info.get("title") or filepath.stem,
            channel=info.get("uploader") or info.get("channel"), url=info.get("webpage_url") or url,
            youtube_id=yt_id or video.get("youtube_id"),
            duration=probe["duration"] or info.get("duration"), width=probe["width"] or info.get("width"),
            height=probe["height"] or info.get("height"), vcodec=probe["vcodec"] or info.get("vcodec"),
            size_bytes=probe["size"], storage_path=storage_rel, thumb_path=thumb_rel, meta=meta, status="ready",
        )
    except BaseException:
        if not ctx.store.get_video(video["id"]).get("storage_path"):
            ctx.store.update_video(video["id"], status="failed")
        raise
    ctx.store.invalidate_assets(video["id"])
    return {"storage_path": storage_rel, "title": info.get("title"), "bytes": probe["size"]}
