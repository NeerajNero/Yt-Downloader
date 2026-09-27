"""yt-dlp probe + download, ported from v1 (server/downloader.py).

Downloads land in `<library>/<title>/<title>.<ext>` with the info.json and
thumbnail sidecars — the same layout the v1 importer indexes.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from .errors import Cancelled
from .ffmpeg import Report, ShouldCancel

QUALITIES = ("best", "audio", "hdr")  # or a height like "1080"


def _base_opts(cookiefile: str | None, ffmpeg_dir: str | None) -> dict:
    opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "remote_components": ["ejs:github"],
        "js_runtimes": {"deno": {"path": None}, "node": {"path": None}},
    }
    if ffmpeg_dir:
        opts["ffmpeg_location"] = ffmpeg_dir
    if cookiefile and Path(cookiefile).is_file():
        opts["cookiefile"] = str(cookiefile)
    return opts


def probe(url: str, cookiefile: str | None = None, ffmpeg_dir: str | None = None) -> dict:
    """Metadata only — nothing downloaded. Raises on unreadable URLs."""
    import yt_dlp

    opts = {**_base_opts(cookiefile, ffmpeg_dir), "skip_download": True}
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)

    vformats = [f for f in info.get("formats", [])
                if f.get("height") and f.get("vcodec") not in (None, "none")]
    heights = sorted({f["height"] for f in vformats}, reverse=True)
    # HDR streams report a dynamic_range other than "SDR" (HDR/HLG/PQ/DV).
    has_hdr = any((f.get("dynamic_range") or "SDR").upper() != "SDR" for f in vformats)
    return {
        "title": info.get("title"),
        "uploader": info.get("uploader"),
        "duration": info.get("duration"),
        "thumbnail": info.get("thumbnail"),
        "webpage_url": info.get("webpage_url"),
        "youtube_id": info.get("id") if (info.get("extractor_key") or "").lower().startswith("youtube") else None,
        "heights": heights,
        "hdr": has_hdr,
    }


def format_for(quality: str) -> str:
    if quality == "best":
        return "bv*+ba/b"
    if quality == "audio":
        return "ba/b"
    if quality == "hdr":
        # Prefer any non-SDR video stream; fall back to best if none merged.
        return "bv*[dynamic_range!=SDR]+ba/bv*+ba/b"
    h = int(quality)
    return f"bv*[height<={h}]+ba/b[height<={h}]"


def download(url: str, quality: str, library_dir: Path, report: Report, should_cancel: ShouldCancel,
             cookiefile: str | None = None, ffmpeg_dir: str | None = None) -> dict:
    """Download into `<library>/<title>/`. Returns {"info": pruned info dict,
    "filepath": Path, "folder": Path}. Raises Cancelled / RuntimeError."""
    import yt_dlp

    def hook(d):
        if should_cancel():
            raise Cancelled()
        if d["status"] == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            pct = d.get("downloaded_bytes", 0) / total * 100 if total else None
            speed = d.get("speed")
            note = "downloading" + (f" {speed / 1e6:.1f} MB/s" if speed else "")
            report(pct, note)
        elif d["status"] == "finished":
            report(None, "merging")

    def pp_hook(d):
        if should_cancel():
            raise Cancelled()
        if d["status"] == "started":
            report(None, "merging")

    opts = {
        **_base_opts(cookiefile, ffmpeg_dir),
        "format": format_for(quality),
        "outtmpl": str(Path(library_dir) / "%(title)s" / "%(title)s.%(ext)s"),
        "writeinfojson": True,
        "writethumbnail": True,
        "windowsfilenames": True,
        "noprogress": True,
        "progress_hooks": [hook],
        "postprocessor_hooks": [pp_hook],
    }
    if quality == "audio":
        # YouTube serves m4a/opus, not mp3 — convert for compatibility.
        opts["postprocessors"] = [{"key": "FFmpegExtractAudio",
                                   "preferredcodec": "mp3", "preferredquality": "0"}]
    else:
        opts["merge_output_format"] = "mkv"

    report(None, "starting")
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
    except Cancelled:
        raise
    except Exception as exc:  # yt-dlp wraps our Cancelled in DownloadError sometimes
        if should_cancel():
            raise Cancelled() from exc
        raise RuntimeError(str(exc)) from exc

    downloads = info.get("requested_downloads") or []
    filepath = Path(downloads[0]["filepath"]) if downloads and downloads[0].get("filepath") else None
    if filepath is None or not filepath.is_file():
        raise RuntimeError("yt-dlp finished but no output file was reported")
    if quality == "audio":  # post-processed to mp3
        mp3 = filepath.with_suffix(".mp3")
        if mp3.is_file():
            filepath = mp3

    folder = filepath.parent
    thumb = next((f for f in sorted(folder.iterdir())
                  if f.suffix.lower() in {".webp", ".jpg", ".jpeg", ".png"}), None)
    pruned = {k: info.get(k) for k in (
        "id", "title", "uploader", "channel", "channel_id", "duration", "width", "height",
        "vcodec", "fps", "ext", "webpage_url", "thumbnail", "upload_date", "description",
        "tags", "categories", "view_count", "like_count", "dynamic_range", "extractor_key",
    ) if info.get(k) is not None}
    if isinstance(pruned.get("description"), str):
        pruned["description"] = pruned["description"][:2000]
    return {"info": pruned, "filepath": filepath, "folder": folder, "thumb": thumb}


def cleanup_partial(folder: Path) -> None:
    """Remove a folder left behind by a failed/cancelled download."""
    shutil.rmtree(folder, ignore_errors=True)
