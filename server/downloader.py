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
    if quality == "audio":
        # YouTube serves m4a/opus, not mp3 — convert for compatibility.
        # preferredquality "0" = best VBR (~V0).
        opts["postprocessors"] = [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "0",
        }]
    else:
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
# Real HDR can't be created from SDR sources — this is an SDR boost, scaled
# 0..100 by the amount slider. 100 is deliberately strong (near-oversaturated).
def _vivid_filter(amount):
    a = max(0.0, min(float(amount), 100.0)) / 100.0
    vibrance = round(a * 1.0, 3)          # 0 .. 1.0
    saturation = round(1 + a * 0.7, 3)    # 1.0 .. 1.7
    contrast = round(1 + a * 0.2, 3)      # 1.0 .. 1.2
    gamma = round(1 - a * 0.06, 3)        # 1.0 .. 0.94 (a touch richer)
    return (f"vibrance=intensity={vibrance},"
            f"eq=contrast={contrast}:saturation={saturation}:gamma={gamma}")


def _probe_fps(src):
    out = subprocess.run(
        [FFPROBE_BIN, "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", str(src)],
        capture_output=True, text=True,
    ).stdout.strip()
    try:
        num, den = out.split("/")
        fps = float(num) / float(den)
        return fps if fps > 0 else 30.0
    except (ValueError, ZeroDivisionError):
        return 30.0


def _zoom_filter(width, height, fps, duration, target=1.12):
    """Smooth Ken-Burns punch-in that reaches `target` zoom over the clip,
    independent of length. Applied after framing, before captions."""
    frames = max(int((duration or 1) * fps), 1)
    inc = round((target - 1.0) / frames, 6)
    return (
        f"zoompan=z='min(zoom+{inc},{target})':d=1:"
        f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
        f"fps={fps:.4f}:s={width}x{height}"
    )


def _pre_crop(trim_x, trim_y):
    """Symmetric border trim before styling; even dimensions for yuv420."""
    if not trim_x and not trim_y:
        return None
    w = f"trunc(iw*{(100 - 2 * trim_x) / 100:.4f}/2)*2"
    h = f"trunc(ih*{(100 - 2 * trim_y) / 100:.4f}/2)*2"
    return f"crop={w}:{h}"


# Output sizes by resolution and orientation. Captions use a matching ASS
# PlayRes so libass scales them to the frame without distortion.
RESOLUTIONS = {"1080", "4k"}
ORIENTATIONS = {"portrait", "landscape"}


def _dims(resolution, orientation):
    if orientation == "landscape":
        return (1920, 1080) if resolution == "1080" else (3840, 2160)
    return (1080, 1920) if resolution == "1080" else (2160, 3840)


# Rotate the source before framing (captions burn on afterwards, staying upright).
ROTATIONS = {"none", "right", "left", "180"}
_ROTATE_FILTER = {
    "right": "transpose=1",              # 90° clockwise
    "left": "transpose=2",               # 90° counter-clockwise
    "180": "transpose=1,transpose=1",
}


def _export_filter(style, vivid_amount, trim_x=0.0, trim_y=0.0, fg_crop=0.0,
                   width=1080, height=1920, rotate="none"):
    rot = _ROTATE_FILTER.get(rotate)
    pre = _pre_crop(trim_x, trim_y)
    # Source-prep chain applied first: rotate, then border trim.
    prep = ",".join(p for p in (rot, pre) if p)
    grade = ("," + _vivid_filter(vivid_amount)) if vivid_amount else ""
    # Blur radius scales with the frame's short side so it's never under-blurred.
    sigma = round(24 * min(width, height) / 1080, 1)
    ar = width / height  # target aspect
    if style == "blur":
        # Blurred-pad: the frame fills a blurred WxH canvas, the video is
        # scaled to fit and overlaid centered. fg_crop trims the video's
        # sides so it sits taller in the frame; the blur stays full-frame.
        fg = ""
        if fg_crop:
            fg = f"crop=trunc(iw*{(100 - 2 * fg_crop) / 100:.4f}/2)*2:ih,"
        fg += (f"scale={width}:{height}:force_original_aspect_ratio=decrease"
               ":force_divisible_by=2")
        fg += grade
        head = f"[0:v]{prep},split=2" if prep else "[0:v]split=2"
        return (
            f"{head}[bgin][fgin];"
            f"[bgin]scale={width}:{height}:force_original_aspect_ratio=increase,"
            f"crop={width}:{height},gblur=sigma={sigma},eq=brightness=-0.08[bg];"
            f"[fgin]{fg}[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2"
        )
    # Center crop to the target aspect, then scale.
    vf = (f"crop=min(iw\\,ih*{ar:.5f}):min(ih\\,iw/{ar:.5f}),"
          f"scale={width}:{height}")
    if prep:
        vf = prep + "," + vf
    vf += grade
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
                 caption_source="auto", caption_pos="bottom",
                 caption_style="karaoke", resolution="1080", vivid_amount=0,
                 orientation="portrait", rotate="none", rotate_captions=False,
                 loudness=False, zoom="none"):
    src = Path(src)
    job = _new_job("export", src.stem)
    job["src"] = str(src)
    thread = threading.Thread(
        target=_export_worker,
        args=(job, _EVENTS[job["id"]], src, float(start), float(end),
              style, vivid, float(trim_x), float(trim_y), float(fg_crop),
              captions, caption_source, caption_pos, caption_style, resolution,
              vivid_amount, orientation, rotate, rotate_captions, loudness, zoom),
        daemon=True,
    )
    thread.start()
    return job


def run_export(job, event, src, start, end, style="blur", vivid=False,
               trim_x=0.0, trim_y=0.0, fg_crop=0.0, captions=False,
               caption_source="auto", caption_pos="bottom",
               caption_style="karaoke", resolution="1080", vivid_amount=0,
               orientation="portrait", rotate="none", rotate_captions=False,
               loudness=False, zoom="none"):
    """Render one clip (portrait 9:16 or landscape 16:9); returns the output
    path. Raises on failure or Cancelled. Percent lands on the given job."""
    import tempfile

    src = Path(src)
    shorts_dir = src.parent / "shorts"
    shorts_dir.mkdir(exist_ok=True)
    # vivid bool (from Auto Shorts) means "default amount"; an explicit
    # slider value overrides it.
    amount = int(vivid_amount) if vivid_amount else (60 if vivid else 0)
    suffix = f"_vivid{amount}" if amount else ""
    if trim_x or trim_y:
        suffix += "_trim"
    if fg_crop:
        suffix += f"_z{int(fg_crop)}"
    if captions:
        suffix += "_cap"
        if caption_source == "manual":
            suffix += "m"
        if caption_style != "karaoke":
            suffix += f"-{caption_style[:4]}"
        if caption_pos != "bottom":
            suffix += f"-{caption_pos[:3]}"

    final_w, final_h = _dims(resolution, orientation)
    match_rotate = bool(rotate_captions) and rotate != "none"
    if match_rotate:
        # Build the whole frame (video + captions) in the pre-rotation
        # orientation, then rotate the composite so captions rotate WITH the
        # video. 90° swaps the build dims + caption canvas; 180° keeps them.
        if rotate in ("right", "left"):
            build_w, build_h = final_h, final_w
            build_orient = "landscape" if orientation == "portrait" else "portrait"
        else:
            build_w, build_h = final_w, final_h
            build_orient = orientation
        source_rotate, composite_rotate = "none", rotate
    else:
        # Rotate the source only; captions burn on afterwards, staying upright.
        build_w, build_h = final_w, final_h
        build_orient = orientation
        source_rotate, composite_rotate = rotate, "none"

    if resolution != "1080":
        suffix += f"_{resolution}"
    if rotate != "none":
        suffix += f"_rot{rotate}"
        if match_rotate:
            suffix += "cap"
    if zoom != "none":
        suffix += "_zoom"
    if loudness:
        suffix += "_norm"
    aspect = "16x9" if orientation == "landscape" else "9x16"
    out_path = shorts_dir / f"{src.stem}_{aspect}_{int(start)}s-{int(end)}s_{style}{suffix}.mp4"
    filt = _export_filter(style, amount, trim_x, trim_y, fg_crop,
                          build_w, build_h, source_rotate)
    # Zoom the framed video before captions/rotation so captions don't zoom.
    if zoom == "in":
        filt += "," + _zoom_filter(
            build_w, build_h, _probe_fps(src), end - start
        )

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
                manual, start, end, ass_file,
                position=caption_pos, style=caption_style,
                orientation=build_orient,
            )
        else:
            t_path = transcript_path_for(src)
            if not t_path.is_file():
                raise RuntimeError("No transcript yet — run Transcribe first.")
            transcript = _json.loads(t_path.read_text(encoding="utf-8"))
            n = write_captions_ass(
                transcript, start, end, ass_file,
                position=caption_pos, style=caption_style,
                orientation=build_orient,
            )
        if n > 0:
            filt += "," + _subtitles_filter_path(ass_file)

    # Matched rotation: turn the finished frame (video + burned captions).
    if composite_rotate != "none":
        filt += "," + _ROTATE_FILTER[composite_rotate]

    filter_args = (
        ["-filter_complex", filt] if style == "blur" else ["-vf", filt]
    )
    # loudnorm to -14 LUFS — the common target for social platforms.
    audio_args = (
        ["-af", "loudnorm=I=-14:TP=-1.5:LRA=11"] if loudness else []
    )
    cmd = [
        FFMPEG_BIN, "-y", "-ss", str(start), "-to", str(end), "-i", str(src),
        *filter_args, *audio_args,
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
                   caption_pos, caption_style, resolution, vivid_amount,
                   orientation, rotate, rotate_captions, loudness, zoom):
    job["status"] = "exporting"
    try:
        out_path = run_export(
            job, event, src, start, end, style, vivid,
            trim_x, trim_y, fg_crop, captions, caption_source, caption_pos,
            caption_style, resolution, vivid_amount, orientation, rotate,
            rotate_captions, loudness, zoom,
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
# Values are (alignment, vertical-margin) tuned per orientation canvas.
CAPTION_POSITIONS = {
    "portrait": {"bottom": (2, 340), "middle": (5, 0), "top": (8, 220)},
    "landscape": {"bottom": (2, 90), "middle": (5, 0), "top": (8, 70)},
}
CAPTION_POS_NAMES = ("bottom", "middle", "top")
# ASS PlayRes per orientation — matches the output aspect so text isn't stretched.
CAPTION_CANVAS = {"portrait": (1080, 1920), "landscape": (1920, 1080)}

# Caption style presets. Colors are ASS &HAABBGGRR (amber F2A33C -> 3CA3F2).
# karaoke:    white text, the spoken word fills amber (the default)
# typewriter: words appear one by one as spoken and accumulate
# pop:        bold uppercase chunks that bounce in with amber glow + shadow
# minimal:    small clean static lines, no animation
CAPTION_STYLES = {
    "karaoke": {"size": 88, "primary": "&H003CA3F2", "secondary": "&H00FFFFFF",
                "bold": 1, "outline": 6, "upper": False,
                "shadow": 2, "back": "&H80101317"},
    "typewriter": {"size": 88, "primary": "&H00FFFFFF", "secondary": "&HFFFFFFFF",
                   "bold": 1, "outline": 6, "upper": False,
                   "shadow": 2, "back": "&H80101317"},
    "pop": {"size": 96, "primary": "&H00FFFFFF", "secondary": "&H00FFFFFF",
            "bold": 1, "outline": 8, "upper": True,
            "shadow": 9, "back": "&H60000000"},
    "minimal": {"size": 64, "primary": "&H00FFFFFF", "secondary": "&H00FFFFFF",
                "bold": 0, "outline": 3, "upper": False,
                "shadow": 2, "back": "&H80101317"},
}

# Bounce-in used by "pop".
_POP_TAG = "{\\fscx70\\fscy70\\t(0,120,\\fscx106\\fscy106)\\t(120,220,\\fscx100\\fscy100)}"
# Layer under the pop text: invisible fill, fat blurred amber border -> a
# glow rim that reaches past the white text's black outline.
_POP_GLOW_TAG = "{\\1a&HFF&\\shad0\\bord22\\3c&H003CA3F2&\\3a&H30&\\blur16}"


def _pop_events(start, end, text):
    """Two stacked events: amber glow underneath, white bounce on top."""
    t = f"{_ass_time(start)},{_ass_time(end)}"
    return [
        f"Dialogue: 0,{t},Cap,,0,0,0,,{_POP_GLOW_TAG}{_POP_TAG}{text}",
        f"Dialogue: 1,{t},Cap,,0,0,0,,{_POP_TAG}{text}",
    ]

# Styles whose word timing is expressed with \k karaoke tags.
_K_STYLES = {"karaoke", "typewriter"}


def _ass_header(position, style="karaoke", orientation="portrait"):
    positions = CAPTION_POSITIONS.get(orientation, CAPTION_POSITIONS["portrait"])
    align, margin_v = positions.get(position, positions["bottom"])
    play_w, play_h = CAPTION_CANVAS.get(orientation, CAPTION_CANVAS["portrait"])
    s = CAPTION_STYLES.get(style, CAPTION_STYLES["karaoke"])
    return (
        "[Script Info]\nScriptType: v4.00+\n"
        f"PlayResX: {play_w}\nPlayResY: {play_h}\nWrapStyle: 0\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
        "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
        "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding\n"
        f"Style: Cap,Arial,{s['size']},{s['primary']},{s['secondary']},"
        f"&H00101317,{s['back']},{s['bold']},0,0,0,100,100,1,0,1,"
        f"{s['outline']},{s['shadow']},{align},60,60,{margin_v},1\n\n"
        "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, "
        "MarginV, Effect, Text\n"
    )


def _style_word(style, word):
    return word.upper() if CAPTION_STYLES[style]["upper"] else word


def write_captions_ass(transcript, clip_start, clip_end, out_path,
                       max_words=4, max_gap=0.8, position="bottom",
                       style="karaoke", orientation="portrait"):
    """Transcript captions for the chosen style and orientation.
    Word times are shifted so 0 = clip_start."""
    if style not in CAPTION_STYLES:
        style = "karaoke"
    words = [
        w for seg in transcript["segments"] for w in seg["words"]
        if w["s"] < clip_end and w["e"] > clip_start and w["w"]
    ]
    events = []
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

    for group in lines:
        start = max(group[0]["s"] - clip_start, 0)
        end = min(group[-1]["e"], clip_end) - clip_start
        if end <= start:
            continue
        if style in _K_STYLES:
            parts = []
            for w in group:
                cs = max(int(
                    (min(w["e"], clip_end) - max(w["s"], clip_start)) * 100
                ), 1)
                parts.append(f"{{\\k{cs}}}{_ass_escape(w['w'])}")
            text = " ".join(parts)
        else:
            text = _ass_escape(" ".join(
                _style_word(style, w["w"]) for w in group
            ))
            if style == "pop":
                events.extend(_pop_events(start, end, text))
                continue
        events.append(
            f"Dialogue: 0,{_ass_time(start)},{_ass_time(end)},Cap,,0,0,0,,{text}"
        )

    Path(out_path).write_text(
        _ass_header(position, style) + "\n".join(events) + "\n", encoding="utf-8"
    )
    return len(events)


def captions_path_for(src):
    src = Path(src)
    return src.parent / f"{src.stem}.captions.json"


def write_manual_captions_ass(manual, clip_start, clip_end, out_path,
                              position="bottom", style="karaoke",
                              orientation="portrait"):
    """Hand-typed captions: each item is {text, start, duration}. Karaoke and
    typewriter pace the words at `speed` words/sec, then the line holds until
    its duration ends. Times are shifted so 0 = clip_start."""
    if style not in CAPTION_STYLES:
        style = "karaoke"
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
        words = [_style_word(style, w) for w in text.split()]

        if style in _K_STYLES:
            fill_time = min(end - start, len(words) / speed)
            per_word_cs = max(int(fill_time / len(words) * 100), 1)
            line = " ".join(
                f"{{\\k{per_word_cs}}}{_ass_escape(w)}" for w in words
            )
        else:
            line = _ass_escape(" ".join(words))
            if style == "pop":
                events.extend(_pop_events(start, end, line))
                continue
        events.append(
            f"Dialogue: 0,{_ass_time(start)},{_ass_time(end)},Cap,,0,0,0,,{line}"
        )
    Path(out_path).write_text(
        _ass_header(position, style, orientation) + "\n".join(events) + "\n",
        encoding="utf-8",
    )
    return len(events)


def _subtitles_filter_path(p):
    """Escape a path for ffmpeg's subtitles= filter (Windows-safe)."""
    p = str(p).replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
    return f"subtitles=filename='{p}'"


# ---------------------------------------------------------------- import

def probe_local(src):
    """ffprobe metadata for a local media file (import preview)."""
    import json as _json

    src = Path(src)
    out = subprocess.run(
        [FFPROBE_BIN, "-v", "error", "-print_format", "json",
         "-show_format", "-show_streams", str(src)],
        capture_output=True, text=True,
    )
    if out.returncode != 0:
        raise RuntimeError("ffprobe can't read that file — is it a video?")
    info = _json.loads(out.stdout)
    video = next(
        (s for s in info.get("streams", []) if s.get("codec_type") == "video"),
        {},
    )
    duration = info.get("format", {}).get("duration")
    return {
        "local": True,
        "title": src.stem,
        "path": str(src),
        "duration": float(duration) if duration else None,
        "width": video.get("width"),
        "height": video.get("height"),
        "vcodec": video.get("codec_name"),
        "size": src.stat().st_size,
        "uploader": "Local file",
        "thumbnail": None,
        "webpage_url": None,
        "heights": [],
    }


def allocate_import_folder(download_dir, stem):
    """One folder per video, like downloads; suffix on name collisions."""
    folder = Path(download_dir) / stem
    n = 2
    while folder.exists():
        folder = Path(download_dir) / f"{stem} ({n})"
        n += 1
    folder.mkdir(parents=True)
    return folder


def finalize_import(dest, source=None):
    """Write the info.json sidecar and thumbnail for an imported media file."""
    import json as _json

    dest = Path(dest)
    folder, stem = dest.parent, dest.stem
    meta = probe_local(dest)
    info = {
        "title": stem,
        "uploader": "Local import",
        "duration": meta["duration"],
        "width": meta["width"],
        "height": meta["height"],
        "vcodec": meta["vcodec"],
    }
    if source:
        info["imported_from"] = str(source)
    (folder / f"{stem}.info.json").write_text(
        _json.dumps(info), encoding="utf-8"
    )
    ss = (meta["duration"] or 4) * 0.25
    subprocess.run(
        [FFMPEG_BIN, "-ss", str(ss), "-i", str(dest),
         "-frames:v", "1", "-vf", "scale=640:-2", "-q:v", "4",
         "-y", "-loglevel", "error", str(folder / f"{stem}.jpg")],
        capture_output=True,
    )


def start_import(src, download_dir):
    src = Path(src)
    job = _new_job("import", src.stem)
    job["src"] = str(src)
    thread = threading.Thread(
        target=_import_worker,
        args=(job, _EVENTS[job["id"]], src, Path(download_dir)),
        daemon=True,
    )
    thread.start()
    return job


def _import_worker(job, event, src, download_dir):
    import json as _json

    job["status"] = "importing"
    folder = None
    try:
        probe_local(src)  # fail fast on unreadable files
        folder = allocate_import_folder(download_dir, src.stem)
        stem = folder.name
        dest = folder / f"{stem}{src.suffix.lower()}"

        # Chunked copy so percent and cancel work on multi-GB files.
        total = src.stat().st_size
        copied = 0
        started = time.time()
        with open(src, "rb") as fin, open(dest, "wb") as fout:
            while True:
                if event.is_set():
                    raise Cancelled()
                chunk = fin.read(8 * 1024 * 1024)
                if not chunk:
                    break
                fout.write(chunk)
                copied += len(chunk)
                job["percent"] = copied / total * 100
                elapsed = time.time() - started
                if elapsed > 0.5:
                    job["speed"] = copied / elapsed
                    remaining = total - copied
                    job["eta"] = remaining / (copied / elapsed)

        finalize_import(dest, source=src)

        job["percent"] = 100.0
        job["speed"] = None
        job["eta"] = None
        job["path"] = str(dest)
        job["status"] = "done"
    except Exception as exc:
        if folder is not None:
            shutil.rmtree(folder, ignore_errors=True)
        if event.is_set() or isinstance(exc, Cancelled):
            job["status"] = "cancelled"
        else:
            job["status"] = "error"
            job["error"] = str(exc)


# ----------------------------------------------------- clip pack (shredder)

def clips_dir_for(src):
    return Path(src).parent / "clips"


def start_clippack(src, start=0.0, end=0.0, max_len=3.0, min_len=0.6):
    src = Path(src)
    job = _new_job("clippack", src.stem)
    job["src"] = str(src)
    thread = threading.Thread(
        target=_clippack_worker,
        args=(job, _EVENTS[job["id"]], src, float(start), float(end),
              float(max_len), float(min_len)),
        daemon=True,
    )
    thread.start()
    return job


def _clippack_worker(job, event, src, start, end, max_len, min_len):
    import json as _json

    job["status"] = "shredding"
    try:
        # Scene cuts define shot boundaries (auto-runs detection if needed).
        scenes = run_scenes(src, event=event)
        duration = scenes.get("duration") or _probe_duration(src) or 0
        if not end or end > duration:
            end = duration
        start = max(0.0, start)
        if end <= start:
            raise RuntimeError("Nothing to shred — check the time range.")

        cuts = [c for c in scenes["scenes"] if start < c < end]
        bounds = [start] + cuts + [end]

        # Within each shot, take consecutive chunks up to max_len. Long shots
        # (or cut-less footage) yield several clips; trailing scraps < min_len
        # are dropped. Never crosses a scene cut.
        chunks = []
        for a, b in zip(bounds, bounds[1:]):
            t = a
            while b - t >= min_len:
                clen = min(max_len, b - t)
                chunks.append((round(t, 3), round(t + clen, 3)))
                t += clen

        MAX_CLIPS = 500
        capped = len(chunks) > MAX_CLIPS
        chunks = chunks[:MAX_CLIPS]
        if not chunks:
            raise RuntimeError("No usable clips found in that range.")

        outdir = clips_dir_for(src)
        outdir.mkdir(exist_ok=True)
        manifest = []
        total = len(chunks)
        for i, (cs, ce) in enumerate(chunks, 1):
            if event.is_set():
                job["status"] = "cancelled"
                return
            mmss = f"{int(cs // 60):02d}m{int(cs % 60):02d}s"
            out = outdir / f"{src.stem}_clip{i:03d}_{mmss}.mp4"
            # Fast preset: these are editing intermediates (re-encoded again
            # in DaVinci), so speed matters more than compression efficiency.
            cmd = [
                FFMPEG_BIN, "-y", "-ss", str(cs), "-i", str(src),
                "-t", str(round(ce - cs, 3)),
                "-c:v", "libx264", "-crf", "18", "-preset", "veryfast",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "192k",
                "-movflags", "+faststart", "-loglevel", "error",
                str(out),
            ]
            r = subprocess.run(cmd, capture_output=True, text=True)
            if r.returncode == 0:
                manifest.append({
                    "file": out.name, "start": round(cs, 2),
                    "end": round(ce, 2), "len": round(ce - cs, 2),
                })
            job["percent"] = i / total * 100

        (outdir / "clippack.json").write_text(_json.dumps({
            "src": str(src), "count": len(manifest),
            "max_len": max_len, "capped": capped, "clips": manifest,
        }, indent=2), encoding="utf-8")

        job["percent"] = 100.0
        job["path"] = str(outdir)
        job["status"] = "done"
    except Exception as exc:
        if event.is_set() or isinstance(exc, Cancelled):
            job["status"] = "cancelled"
        else:
            job["status"] = "error"
            job["error"] = str(exc)
