"""Job engine: probe, download, convert, cancel.

Jobs live in an in-memory dict; each worker is a daemon thread that
mutates its own job dict. A server restart clears jobs — the files on
disk plus the library scan are the source of truth.
"""

import os
import shutil
import subprocess
import threading
import time
import uuid
from pathlib import Path

import yt_dlp


def _find_ffmpeg_dir():
    """Return the directory that contains ffmpeg(.exe), or None.

    Checks PATH first, then the well-known WinGet install location so the
    server works even when launched from an environment that doesn't inherit
    the full user PATH (e.g. launched by an IDE or a service).
    """
    # 1. Already on PATH?
    hit = shutil.which("ffmpeg")
    if hit:
        return str(Path(hit).parent)

    # 2. WinGet default install location (Gyan.FFmpeg)
    winget_pkgs = Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "WinGet" / "Packages"
    if winget_pkgs.is_dir():
        for pkg_dir in winget_pkgs.iterdir():
            if pkg_dir.name.startswith("Gyan.FFmpeg"):
                for candidate in sorted(pkg_dir.rglob("ffmpeg.exe"), reverse=True):
                    return str(candidate.parent)

    return None


FFMPEG_DIR = _find_ffmpeg_dir()          # e.g. "C:\...\bin" or None
FFMPEG_BIN = str(Path(FFMPEG_DIR) / "ffmpeg.exe") if FFMPEG_DIR else "ffmpeg"
FFPROBE_BIN = str(Path(FFMPEG_DIR) / "ffprobe.exe") if FFMPEG_DIR else "ffprobe"


class Cancelled(Exception):
    """Raised from yt-dlp hooks to abort a download mid-flight."""


JOBS = {}
_LOCK = threading.Lock()

# Per-job control handles, kept out of the JSON-serializable job dicts.
_EVENTS = {}    # job id -> threading.Event
_PROCS = {}     # job id -> subprocess.Popen (convert jobs)

TERMINAL = {"done", "error", "cancelled"}

MEDIA_EXTS = {".mkv", ".mp4", ".webm", ".m4a", ".mov", ".mp3", ".opus"}


def _new_job(kind, title):
    job = {
        "id": uuid.uuid4().hex[:10],
        "kind": kind,
        "title": title,
        "status": "queued",
        "percent": 0.0,
        "speed": None,
        "eta": None,
        "error": None,
        "path": None,
        "src": None,
        "created": time.time(),
    }
    with _LOCK:
        JOBS[job["id"]] = job
        _EVENTS[job["id"]] = threading.Event()
    return job


def list_jobs():
    with _LOCK:
        return sorted(JOBS.values(), key=lambda j: j["created"], reverse=True)


def get_job(job_id):
    with _LOCK:
        return JOBS.get(job_id)


def cancel_job(job_id):
    with _LOCK:
        job = JOBS.get(job_id)
        if job is None:
            return False
        event = _EVENTS.get(job_id)
        proc = _PROCS.get(job_id)
    if job["status"] in TERMINAL:
        return True
    job["status"] = "cancelling"
    if event:
        event.set()
    if proc and proc.poll() is None:
        proc.kill()
    return True


def clear_finished():
    with _LOCK:
        gone = [jid for jid, j in JOBS.items() if j["status"] in TERMINAL]
        for jid in gone:
            JOBS.pop(jid, None)
            _EVENTS.pop(jid, None)
            _PROCS.pop(jid, None)
        return len(gone)


# ---------------------------------------------------------------- probe

def probe(url, cookiefile=None):
    """Metadata only — nothing downloaded. Raises on unreadable URLs."""
    base_opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "skip_download": True,
        "remote_components": ["ejs:github"],
        "js_runtimes": {"deno": {"path": None}, "node": {"path": None}},
    }
    if FFMPEG_DIR:
        base_opts["ffmpeg_location"] = FFMPEG_DIR
    if cookiefile:
        base_opts["cookiefile"] = str(cookiefile)

    with yt_dlp.YoutubeDL(base_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    heights = sorted(
        {f["height"] for f in info.get("formats", [])
         if f.get("height") and f.get("vcodec") not in (None, "none")},
        reverse=True,
    )
    return {
        "title": info.get("title"),
        "uploader": info.get("uploader"),
        "duration": info.get("duration"),
        "thumbnail": info.get("thumbnail"),
        "webpage_url": info.get("webpage_url"),
        "heights": heights,
    }


# ------------------------------------------------------------- download

def _format_for(quality):
    if quality == "best":
        return "bv*+ba/b"
    if quality == "audio":
        return "ba/b"
    h = int(quality)
    return f"bv*[height<={h}]+ba/b[height<={h}]"


def start_download(url, quality, download_dir, title=None, cookiefile=None):
    job = _new_job("download", title or url)
    event = _EVENTS[job["id"]]
    thread = threading.Thread(
        target=_download_worker,
        args=(job, event, url, quality, Path(download_dir), cookiefile),
        daemon=True,
    )
    thread.start()
    return job


def _download_worker(job, event, url, quality, download_dir, cookiefile=None):
    def hook(d):
        if event.is_set():
            raise Cancelled()
        if d["status"] == "downloading":
            job["status"] = "downloading"
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            if total:
                job["percent"] = d.get("downloaded_bytes", 0) / total * 100
            job["speed"] = d.get("speed")
            job["eta"] = d.get("eta")
        elif d["status"] == "finished":
            job["status"] = "merging"
            job["speed"] = None
            job["eta"] = None

    def pp_hook(d):
        if event.is_set():
            raise Cancelled()
        if d["status"] == "started":
            job["status"] = "merging"

    opts = {
        "format": _format_for(quality),
        "outtmpl": str(download_dir / "%(title)s" / "%(title)s.%(ext)s"),
        "writeinfojson": True,
        "writethumbnail": True,
        "noplaylist": True,
        "windowsfilenames": True,
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "progress_hooks": [hook],
        "postprocessor_hooks": [pp_hook],
        "remote_components": ["ejs:github"],
        "js_runtimes": {"deno": {"path": None}, "node": {"path": None}},
    }
    if FFMPEG_DIR:
        opts["ffmpeg_location"] = FFMPEG_DIR
    if quality != "audio":
        opts["merge_output_format"] = "mkv"
    if cookiefile:
        opts["cookiefile"] = str(cookiefile)

    job["status"] = "starting"
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
        job["title"] = info.get("title") or job["title"]
        downloads = info.get("requested_downloads") or []
        if downloads:
            job["path"] = downloads[0].get("filepath")
        job["percent"] = 100.0
        job["speed"] = None
        job["eta"] = None
        job["status"] = "done"
    except Exception as exc:
        if event.is_set() or isinstance(exc, Cancelled):
            job["status"] = "cancelled"
        else:
            job["status"] = "error"
            job["error"] = str(exc)


# -------------------------------------------------------------- convert

def _probe_duration(src):
    out = subprocess.run(
        [FFPROBE_BIN, "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(src)],
        capture_output=True, text=True,
    ).stdout.strip()
    try:
        return float(out)
    except ValueError:
        return None


def start_convert(src):
    src = Path(src)
    job = _new_job("convert", src.stem)
    job["src"] = str(src)
    thread = threading.Thread(
        target=_convert_worker, args=(job, _EVENTS[job["id"]], src), daemon=True
    )
    thread.start()
    return job


def _convert_worker(job, event, src):
    out_path = src.with_name(src.stem + "_edit.mp4")
    duration = _probe_duration(src)
    cmd = [
        FFMPEG_BIN, "-y", "-i", str(src),
        "-c:v", "libx264", "-crf", "16", "-preset", "slow",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        "-progress", "pipe:1", "-nostats", "-loglevel", "error",
        str(out_path),
    ]
    job["status"] = "converting"
    try:
        proc = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
        )
        with _LOCK:
            _PROCS[job["id"]] = proc
        for line in proc.stdout:
            line = line.strip()
            if line.startswith("out_time_us=") and duration:
                value = line.split("=", 1)[1]
                try:
                    job["percent"] = min(
                        int(value) / 1_000_000 / duration * 100, 100.0
                    )
                except ValueError:
                    pass  # ffmpeg emits "N/A" early on
        stderr = proc.stderr.read()
        code = proc.wait()
        if event.is_set():
            job["status"] = "cancelled"
            out_path.unlink(missing_ok=True)
        elif code == 0:
            job["percent"] = 100.0
            job["path"] = str(out_path)
            job["status"] = "done"
        else:
            job["status"] = "error"
            job["error"] = stderr.strip() or f"ffmpeg exited with code {code}"
            out_path.unlink(missing_ok=True)
    except Exception as exc:
        if event.is_set():
            job["status"] = "cancelled"
        else:
            job["status"] = "error"
            job["error"] = str(exc)
        out_path.unlink(missing_ok=True)
