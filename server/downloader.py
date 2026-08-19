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


def _ffmpeg_has_subtitles(binary):
    """True if this ffmpeg build can burn captions (libass subtitles filter)."""
    try:
        out = subprocess.run(
            [str(binary), "-hide_banner", "-filters"],
            capture_output=True, text=True, timeout=15,
        ).stdout
        return " subtitles " in out
    except (OSError, subprocess.TimeoutExpired):
        return False


def _find_ffmpeg_dir():
    """Return the directory containing ffmpeg(.exe), or None.

    Prefers a build with the subtitles filter (needed for caption burn-in):
    Homebrew's plain `ffmpeg` formula is slim (no libass) — `ffmpeg-full`
    has it. Windows WinGet Gyan.FFmpeg builds are full. Falls back to any
    ffmpeg found so the rest of the app keeps working.
    """
    exe = "ffmpeg.exe" if os.name == "nt" else "ffmpeg"
    candidates = []
    for p in ("/opt/homebrew/opt/ffmpeg-full/bin",
              "/usr/local/opt/ffmpeg-full/bin"):
        if (Path(p) / exe).is_file():
            candidates.append(Path(p))
    hit = shutil.which("ffmpeg")
    if hit:
        candidates.append(Path(hit).parent)
    winget_pkgs = Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "WinGet" / "Packages"
    if winget_pkgs.is_dir():
        for pkg_dir in winget_pkgs.iterdir():
            if pkg_dir.name.startswith("Gyan.FFmpeg"):
                for candidate in sorted(pkg_dir.rglob("ffmpeg.exe"), reverse=True):
                    candidates.append(candidate.parent)
                    break

    for c in candidates:
        if _ffmpeg_has_subtitles(c / exe):
            return str(c)
    return str(candidates[0]) if candidates else None


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
                 trim_x=0.0, trim_y=0.0, fg_crop=0.0, captions=False,
                 caption_source="auto", caption_pos="bottom"):
    src = Path(src)
    job = _new_job("export", src.stem)
    job["src"] = str(src)
    thread = threading.Thread(
        target=_export_worker,
        args=(job, _EVENTS[job["id"]], src, float(start), float(end),
              style, vivid, float(trim_x), float(trim_y), float(fg_crop),
              captions, caption_source, caption_pos),
        daemon=True,
    )
    thread.start()
    return job


def run_export(job, event, src, start, end, style="blur", vivid=False,
               trim_x=0.0, trim_y=0.0, fg_crop=0.0, captions=False,
               caption_source="auto", caption_pos="bottom"):
    """Render one 9:16 clip; returns the output path. Raises on failure or
    Cancelled. Percent lands on the given job dict."""
    import tempfile

    src = Path(src)
    shorts_dir = src.parent / "shorts"
    shorts_dir.mkdir(exist_ok=True)
    suffix = "_vivid" if vivid else ""
    if trim_x or trim_y:
        suffix += "_trim"
    if fg_crop:
        suffix += f"_z{int(fg_crop)}"
    if captions:
        suffix += "_cap"
        if caption_source == "manual":
            suffix += "m"
        if caption_pos != "bottom":
            suffix += f"-{caption_pos[:3]}"
    out_path = shorts_dir / f"{src.stem}_9x16_{int(start)}s-{int(end)}s_{style}{suffix}.mp4"
    filt = _export_filter(style, vivid, trim_x, trim_y, fg_crop)

    ass_file = None
    if captions:
        import json as _json

        if not _ffmpeg_has_subtitles(FFMPEG_BIN):
            raise RuntimeError(
                "This ffmpeg build can't burn captions (no libass). "
                "On macOS: brew install ffmpeg-full, then restart the server."
            )
        fd, ass_file = tempfile.mkstemp(suffix=".ass")
        os.close(fd)
        if caption_source == "manual":
            c_path = captions_path_for(src)
            if not c_path.is_file():
                raise RuntimeError(
                    "No manual captions yet — add them in the caption editor."
                )
            manual = _json.loads(c_path.read_text(encoding="utf-8"))
            n = write_manual_captions_ass(
                manual, start, end, ass_file, position=caption_pos
            )
        else:
            t_path = transcript_path_for(src)
            if not t_path.is_file():
                raise RuntimeError("No transcript yet — run Transcribe first.")
            transcript = _json.loads(t_path.read_text(encoding="utf-8"))
            n = write_captions_ass(
                transcript, start, end, ass_file, position=caption_pos
            )
        if n > 0:
            filt += "," + _subtitles_filter_path(ass_file)

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
    try:
        code, stderr = _run_ffmpeg_progress(job, event, cmd, out_path, end - start)
        if event.is_set():
            out_path.unlink(missing_ok=True)
            raise Cancelled()
        if code != 0:
            out_path.unlink(missing_ok=True)
            raise RuntimeError(stderr.strip() or f"ffmpeg exited with code {code}")
        return out_path
    finally:
        if ass_file:
            Path(ass_file).unlink(missing_ok=True)


def _export_worker(job, event, src, start, end, style, vivid,
                   trim_x, trim_y, fg_crop, captions, caption_source,
                   caption_pos):
    job["status"] = "exporting"
    try:
        out_path = run_export(
            job, event, src, start, end, style, vivid,
            trim_x, trim_y, fg_crop, captions, caption_source, caption_pos,
        )
        job["percent"] = 100.0
        job["path"] = str(out_path)
        job["status"] = "done"
    except Exception as exc:
        if event.is_set() or isinstance(exc, Cancelled):
            job["status"] = "cancelled"
        else:
            job["status"] = "error"
            job["error"] = str(exc)


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


def run_scenes(src, job=None, event=None):
    """Detect scene cuts; writes <stem>.scenes.json and returns the dict."""
    import json as _json
    import re as _re

    src = Path(src)
    out = scenes_path_for(src)
    if out.is_file():
        return _json.loads(out.read_text(encoding="utf-8"))

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
    if job is not None:
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
        if line.startswith("out_time_us=") and duration and job is not None:
            value = line.split("=", 1)[1]
            try:
                job["percent"] = min(
                    int(value) / 1_000_000 / duration * 100, 100.0
                )
            except ValueError:
                pass
    code = proc.wait()
    reader.join(timeout=10)
    if event is not None and event.is_set():
        raise Cancelled()
    if code != 0:
        raise RuntimeError(f"ffmpeg exited with code {code}")
    data = {
        "src": str(src),
        "threshold": SCENE_THRESHOLD,
        "duration": duration,
        "scenes": sorted(set(round(t, 2) for t in times)),
    }
    out.write_text(_json.dumps(data))
    return data


def _scenes_worker(job, event, src):
    job["status"] = "analyzing"
    try:
        run_scenes(src, job=job, event=event)
        job["percent"] = 100.0
        job["path"] = str(scenes_path_for(src))
        job["status"] = "done"
    except Exception as exc:
        if event.is_set() or isinstance(exc, Cancelled):
            job["status"] = "cancelled"
        else:
            job["status"] = "error"
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


# ------------------------------------------------------------- transcribe

def transcript_path_for(src):
    src = Path(src)
    return src.parent / f"{src.stem}.transcript.json"


def run_transcribe(src, job=None, event=None):
    """Whisper transcription via faster-whisper; writes <stem>.transcript.json.

    Returns the transcript dict. Raises Cancelled if event is set mid-run.
    Model downloads once to the HF cache on first use (~500MB for 'small').
    """
    import json as _json

    from faster_whisper import WhisperModel

    src = Path(src)
    out_path = transcript_path_for(src)
    if out_path.is_file():
        return _json.loads(out_path.read_text(encoding="utf-8"))

    model_name = os.environ.get("WHISPER_MODEL", "small")
    duration = _probe_duration(src)
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, info = model.transcribe(str(src), word_timestamps=True)

    seg_list = []
    for seg in segments:
        if event is not None and event.is_set():
            raise Cancelled()
        seg_list.append({
            "start": round(seg.start, 2),
            "end": round(seg.end, 2),
            "text": seg.text.strip(),
            "words": [
                {"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2)}
                for w in (seg.words or [])
            ],
        })
        if job is not None and duration:
            job["percent"] = min(seg.end / duration * 100, 100.0)

    transcript = {
        "src": str(src),
        "language": info.language,
        "duration": duration,
        "model": model_name,
        "segments": seg_list,
    }
    out_path.write_text(_json.dumps(transcript), encoding="utf-8")
    return transcript


def start_transcribe(src):
    src = Path(src)
    job = _new_job("transcribe", src.stem)
    job["src"] = str(src)

    def worker(job=job, event=_EVENTS[job["id"]], src=src):
        job["status"] = "transcribing"
        try:
            run_transcribe(src, job=job, event=event)
            job["percent"] = 100.0
            job["path"] = str(transcript_path_for(src))
            job["status"] = "done"
        except Exception as exc:
            if event.is_set() or isinstance(exc, Cancelled):
                job["status"] = "cancelled"
            else:
                job["status"] = "error"
                job["error"] = str(exc)

    threading.Thread(target=worker, daemon=True).start()
    return job


# --------------------------------------------------------- burned captions

def _ass_time(t):
    h = int(t // 3600)
    m = int(t % 3600 // 60)
    s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def _ass_escape(text):
    return text.replace("\\", "").replace("{", "(").replace("}", ")")


# ASS alignment: 2 = bottom-center, 5 = middle-center, 8 = top-center.
CAPTION_POSITIONS = {
    "bottom": (2, 340),
    "middle": (5, 0),
    "top": (8, 220),
}


def _ass_header(position):
    align, margin_v = CAPTION_POSITIONS.get(position, CAPTION_POSITIONS["bottom"])
    return (
        "[Script Info]\nScriptType: v4.00+\n"
        "PlayResX: 1080\nPlayResY: 1920\nWrapStyle: 0\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
        "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
        "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding\n"
        # Primary = amber fill (karaoke sung), Secondary = white (unsung)
        "Style: Cap,Arial,88,&H003CA3F2,&H00FFFFFF,&H00101317,&H80101317,"
        f"1,0,0,0,100,100,1,0,1,6,2,{align},60,60,{margin_v},1\n\n"
        "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, "
        "MarginV, Effect, Text\n"
    )


def write_captions_ass(transcript, clip_start, clip_end, out_path,
                       max_words=4, max_gap=0.8, position="bottom"):
    """Karaoke-style captions for a 1080x1920 clip: white text, the spoken
    word fills amber. Word times are shifted so 0 = clip_start."""
    words = [
        w for seg in transcript["segments"] for w in seg["words"]
        if w["s"] < clip_end and w["e"] > clip_start and w["w"]
    ]
    header = _ass_header(position)
    lines = []
    group = []
    for w in words:
        if group and (
            len(group) >= max_words or w["s"] - group[-1]["e"] > max_gap
        ):
            lines.append(group)
            group = []
        group.append(w)
    if group:
        lines.append(group)

    events = []
    for group in lines:
        start = max(group[0]["s"] - clip_start, 0)
        end = min(group[-1]["e"], clip_end) - clip_start
        if end <= start:
            continue
        parts = []
        for w in group:
            cs = max(int((min(w["e"], clip_end) - max(w["s"], clip_start)) * 100), 1)
            parts.append(f"{{\\k{cs}}}{_ass_escape(w['w'])}")
        events.append(
            f"Dialogue: 0,{_ass_time(start)},{_ass_time(end)},Cap,,0,0,0,,"
            + " ".join(parts)
        )
    Path(out_path).write_text(header + "\n".join(events) + "\n", encoding="utf-8")
    return len(events)


def captions_path_for(src):
    src = Path(src)
    return src.parent / f"{src.stem}.captions.json"


def write_manual_captions_ass(manual, clip_start, clip_end, out_path,
                              position="bottom"):
    """Hand-typed captions: each item is {text, start, duration}. The amber
    fill sweeps the words at `speed` words/sec, then the line holds until
    its duration ends. Times are shifted so 0 = clip_start."""
    speed = max(float(manual.get("speed") or 2.5), 0.5)
    events = []
    for item in manual.get("items", []):
        text = str(item.get("text", "")).strip()
        i_start = float(item["start"])
        i_end = i_start + max(float(item.get("duration") or 0), 0.5)
        if not text or i_start >= clip_end or i_end <= clip_start:
            continue
        start = max(i_start, clip_start) - clip_start
        end = min(i_end, clip_end) - clip_start
        if end - start < 0.2:
            continue
        words = text.split()
        fill_time = min(end - start, len(words) / speed)
        per_word_cs = max(int(fill_time / len(words) * 100), 1)
        line = " ".join(
            f"{{\\k{per_word_cs}}}{_ass_escape(w)}" for w in words
        )
        events.append(
            f"Dialogue: 0,{_ass_time(start)},{_ass_time(end)},Cap,,0,0,0,,{line}"
        )
    Path(out_path).write_text(
        _ass_header(position) + "\n".join(events) + "\n", encoding="utf-8"
    )
    return len(events)


def _subtitles_filter_path(p):
    """Escape a path for ffmpeg's subtitles= filter (Windows-safe)."""
    p = str(p).replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
    return f"subtitles=filename='{p}'"
