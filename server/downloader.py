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
_EXE = ".exe" if os.name == "nt" else ""
FFMPEG_BIN = str(Path(FFMPEG_DIR) / f"ffmpeg{_EXE}") if FFMPEG_DIR else "ffmpeg"
FFPROBE_BIN = str(Path(FFMPEG_DIR) / f"ffprobe{_EXE}") if FFMPEG_DIR else "ffprobe"


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


def _run_ffmpeg_progress(job, event, cmd, out_path, duration):
    """Run an ffmpeg command that emits -progress on stdout; update job percent.

    Shared by convert/export/scenes workers. Returns (exit_code, stderr_text).
    """
    proc = subprocess.Popen(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
    )
    with _LOCK:
        _PROCS[job["id"]] = proc
    stderr_lines = []
    reader = threading.Thread(
        target=lambda: stderr_lines.extend(proc.stderr), daemon=True
    )
    reader.start()
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
    code = proc.wait()
    reader.join(timeout=5)
    return code, "".join(stderr_lines)


def _convert_worker(job, event, src):
    out_path = src.with_name(src.stem + "_edit.mp4")
    job["status"] = "converting"
    try:
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
        code, stderr = _run_ffmpeg_progress(job, event, cmd, out_path, duration)
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


# ------------------------------------------------------- 9:16 shorts export

# "Vivid" grade: the punchy high-saturation look people associate with HDR.
# Real HDR can't be created from SDR sources — this is a tasteful SDR boost.
VIVID_FILTER = "vibrance=intensity=0.35,eq=contrast=1.05:saturation=1.08"


def _pre_crop(trim_x, trim_y):
    """Symmetric border trim before styling; even dimensions for yuv420."""
    if not trim_x and not trim_y:
        return None
    w = f"trunc(iw*{(100 - 2 * trim_x) / 100:.4f}/2)*2"
    h = f"trunc(ih*{(100 - 2 * trim_y) / 100:.4f}/2)*2"
    return f"crop={w}:{h}"


def _export_filter(style, vivid, trim_x=0.0, trim_y=0.0, fg_crop=0.0):
    pre = _pre_crop(trim_x, trim_y)
    if style == "blur":
        # Blurred-pad: the frame fills a blurred 1080x1920 canvas, the video
        # is scaled to fit and overlaid centered. fg_crop trims the video's
        # sides so it sits taller in the frame; the blur stays full-frame.
        fg = ""
        if fg_crop:
            fg = f"crop=trunc(iw*{(100 - 2 * fg_crop) / 100:.4f}/2)*2:ih,"
        fg += ("scale=1080:1920:force_original_aspect_ratio=decrease"
               ":force_divisible_by=2")
        if vivid:
            fg += "," + VIVID_FILTER
        head = f"[0:v]{pre},split=2" if pre else "[0:v]split=2"
        return (
            f"{head}[bgin][fgin];"
            "[bgin]scale=1080:1920:force_original_aspect_ratio=increase,"
            "crop=1080:1920,gblur=sigma=24,eq=brightness=-0.08[bg];"
            f"[fgin]{fg}[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2"
        )
    # Center crop to 9:16.
    vf = "crop=min(iw\\,ih*9/16):ih,scale=1080:1920"
    if pre:
        vf = pre + "," + vf
    if vivid:
        vf += "," + VIVID_FILTER
    return vf


def detect_borders(src):
    """Measure baked-in black bars with cropdetect; returns trim percents."""
    import re as _re

    src = Path(src)
    duration = _probe_duration(src) or 0
    ss = max(0.0, duration * 0.25)
    cmd = [
        FFMPEG_BIN, "-ss", str(ss), "-t", "8", "-i", str(src),
        "-vf", "cropdetect=limit=24:round=2:reset=0",
        "-an", "-f", "null", "-",
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    matches = _re.findall(r"crop=(\d+):(\d+):(\d+):(\d+)", proc.stderr)
    if not matches:
        return {"trim_x": 0.0, "trim_y": 0.0}
    w, h, x, y = map(int, matches[-1])
    dims = subprocess.run(
        [FFPROBE_BIN, "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height", "-of", "csv=p=0", str(src)],
        capture_output=True, text=True,
    ).stdout.strip().split(",")
    iw, ih = int(dims[0]), int(dims[1])
    # Symmetric trim: take the larger of the two sides so both bars go.
    trim_x = round(max(x, iw - w - x) / iw * 100, 1)
    trim_y = round(max(y, ih - h - y) / ih * 100, 1)
    return {"trim_x": min(max(trim_x, 0.0), 40.0),
            "trim_y": min(max(trim_y, 0.0), 40.0)}


def start_export(src, start, end, style="crop", vivid=False,
                 trim_x=0.0, trim_y=0.0, fg_crop=0.0):
    src = Path(src)
    job = _new_job("export", src.stem)
    job["src"] = str(src)
    thread = threading.Thread(
        target=_export_worker,
        args=(job, _EVENTS[job["id"]], src, float(start), float(end),
              style, vivid, float(trim_x), float(trim_y), float(fg_crop)),
        daemon=True,
    )
    thread.start()
    return job


def _export_worker(job, event, src, start, end, style, vivid,
                   trim_x, trim_y, fg_crop):
    shorts_dir = src.parent / "shorts"
    shorts_dir.mkdir(exist_ok=True)
    suffix = "_vivid" if vivid else ""
    if trim_x or trim_y:
        suffix += "_trim"
    if fg_crop:
        suffix += f"_z{int(fg_crop)}"
    out_path = shorts_dir / f"{src.stem}_9x16_{int(start)}s-{int(end)}s_{style}{suffix}.mp4"
    filt = _export_filter(style, vivid, trim_x, trim_y, fg_crop)
    filter_args = (
        ["-filter_complex", filt] if style == "blur" else ["-vf", filt]
    )
    cmd = [
        FFMPEG_BIN, "-y", "-ss", str(start), "-to", str(end), "-i", str(src),
        *filter_args,
        "-c:v", "libx264", "-crf", "18", "-preset", "medium",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        "-progress", "pipe:1", "-nostats", "-loglevel", "error",
        str(out_path),
    ]
    job["status"] = "exporting"
    try:
        code, stderr = _run_ffmpeg_progress(job, event, cmd, out_path, end - start)
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


# ---------------------------------------------------------- scene detection

SCENE_THRESHOLD = 0.30


def scenes_path_for(src):
    src = Path(src)
    return src.parent / f"{src.stem}.scenes.json"


def start_scenes(src):
    src = Path(src)
    job = _new_job("scenes", src.stem)
    job["src"] = str(src)
    thread = threading.Thread(
        target=_scenes_worker, args=(job, _EVENTS[job["id"]], src), daemon=True
    )
    thread.start()
    return job


def _scenes_worker(job, event, src):
    import json as _json
    import re as _re

    job["status"] = "analyzing"
    try:
        duration = _probe_duration(src)
        # Decode at reduced size for speed; scene scores print to stderr via
        # the metadata filter while -progress feeds percent on stdout.
        cmd = [
            FFMPEG_BIN, "-i", str(src),
            "-vf", f"scale=480:-2,select='gt(scene,{SCENE_THRESHOLD})',metadata=print",
            "-an", "-f", "null", "-",
            "-progress", "pipe:1", "-nostats", "-loglevel", "info",
        ]
        proc = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
        )
        with _LOCK:
            _PROCS[job["id"]] = proc
        times = []
        pattern = _re.compile(r"pts_time:([0-9.]+)")
        reader = threading.Thread(
            target=lambda: [
                times.append(float(m.group(1)))
                for line in proc.stderr
                for m in [pattern.search(line)] if m
            ],
            daemon=True,
        )
        reader.start()
        for line in proc.stdout:
            line = line.strip()
            if line.startswith("out_time_us=") and duration:
                value = line.split("=", 1)[1]
                try:
                    job["percent"] = min(
                        int(value) / 1_000_000 / duration * 100, 100.0
                    )
                except ValueError:
                    pass
        code = proc.wait()
        reader.join(timeout=10)
        if event.is_set():
            job["status"] = "cancelled"
        elif code == 0:
            out = scenes_path_for(src)
            out.write_text(_json.dumps({
                "src": str(src),
                "threshold": SCENE_THRESHOLD,
                "duration": duration,
                "scenes": sorted(set(round(t, 2) for t in times)),
            }))
            job["percent"] = 100.0
            job["path"] = str(out)
            job["status"] = "done"
        else:
            job["status"] = "error"
            job["error"] = f"ffmpeg exited with code {code}"
    except Exception as exc:
        job["status"] = "cancelled" if event.is_set() else "error"
        if job["status"] == "error":
            job["error"] = str(exc)


# ------------------------------------------------------------- VOD pipeline

def start_pipeline(src, command):
    """Hand a file to the external VOD pipeline: `command <file>`.

    `command` is a list (e.g. ["python", "D:/vod-pipeline/autopipe.py"]).
    """
    src = Path(src)
    job = _new_job("pipeline", src.stem)
    job["src"] = str(src)
    thread = threading.Thread(
        target=_pipeline_worker,
        args=(job, _EVENTS[job["id"]], src, list(command)),
        daemon=True,
    )
    thread.start()
    return job


def _pipeline_worker(job, event, src, command):
    job["status"] = "running"
    job["percent"] = None  # indeterminate — the pipeline owns its own progress
    try:
        proc = subprocess.Popen(
            command + [str(src)],
            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True,
        )
        with _LOCK:
            _PROCS[job["id"]] = proc
        _, stderr = proc.communicate()
        if event.is_set():
            job["status"] = "cancelled"
        elif proc.returncode == 0:
            job["percent"] = 100.0
            job["status"] = "done"
        else:
            job["status"] = "error"
            tail = (stderr or "").strip().splitlines()
            job["error"] = (
                tail[-1] if tail else f"pipeline exited with code {proc.returncode}"
            )
    except Exception as exc:
        job["status"] = "cancelled" if event.is_set() else "error"
        if job["status"] == "error":
            job["error"] = str(exc)
