"""Pure ffmpeg tasks ported from v1 (server/downloader.py): scene detection,
border detection, edit copy, clip pack, silence removal, import finalize.
Every function takes explicit input/output paths, a `Tools`, and the
report/should_cancel callbacks."""

from __future__ import annotations

import json
import re
import subprocess
import threading
from pathlib import Path

from . import encoders
from .errors import Cancelled
from .ffmpeg import Report, ShouldCancel, Tools

SCENE_THRESHOLD = 0.30


def detect_scenes(src: Path, tools: Tools, report: Report, should_cancel: ShouldCancel,
                  threshold: float = SCENE_THRESHOLD) -> dict:
    """Scene cuts via ffmpeg's scene filter at reduced size. Returns the v1
    `.scenes.json` dict (src filled in by the adapter)."""
    duration = tools.probe_duration(src)
    cmd = [
        tools.ffmpeg, "-i", str(src),
        "-vf", f"scale=480:-2,select='gt(scene,{threshold})',metadata=print",
        "-an", "-f", "null", "-",
        "-progress", "pipe:1", "-nostats", "-loglevel", "info",
    ]
    times: list[float] = []
    pattern = re.compile(r"pts_time:([0-9.]+)")

    def sink(line: str) -> None:
        m = pattern.search(line)
        if m:
            times.append(float(m.group(1)))

    tools.run_progress(cmd, duration, report, should_cancel, note="detecting scenes", stderr_sink=sink)
    return {
        "src": None,
        "threshold": threshold,
        "duration": duration,
        "scenes": sorted(set(round(t, 2) for t in times)),
    }


def detect_borders(src: Path, tools: Tools) -> dict:
    """Measure baked-in black bars with cropdetect; returns trim percents."""
    duration = tools.probe_duration(src) or 0
    ss = max(0.0, duration * 0.25)
    cmd = [
        tools.ffmpeg, "-ss", str(ss), "-t", "8", "-i", str(src),
        "-vf", "cropdetect=limit=24:round=2:reset=0",
        "-an", "-f", "null", "-",
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    matches = re.findall(r"crop=(\d+):(\d+):(\d+):(\d+)", proc.stderr)
    if not matches:
        return {"trim_x": 0.0, "trim_y": 0.0}
    w, h, x, y = map(int, matches[-1])
    iw, ih = tools.probe_dims(src)
    # Symmetric trim: take the larger of the two sides so both bars go.
    trim_x = round(max(x, iw - w - x) / iw * 100, 1)
    trim_y = round(max(y, ih - h - y) / ih * 100, 1)
    return {"trim_x": min(max(trim_x, 0.0), 40.0),
            "trim_y": min(max(trim_y, 0.0), 40.0)}


def edit_copy(src: Path, out_path: Path, tools: Tools, encoder: str,
              report: Report, should_cancel: ShouldCancel) -> Path:
    """`<stem>_edit.mp4`: H.264 high-quality copy for Resolve and for browsers
    that can't play the VP9/AV1 mkv source."""
    duration = tools.probe_duration(src)
    cmd = [
        tools.ffmpeg, "-y", "-i", str(src),
        *encoders.video_args(encoder, "edit"), *encoders.AUDIO_ARGS, *encoders.MP4_ARGS,
        "-progress", "pipe:1", "-nostats", "-loglevel", "error",
        str(out_path),
    ]
    try:
        tools.run_progress(cmd, duration, report, should_cancel, note="converting")
    except BaseException:
        Path(out_path).unlink(missing_ok=True)
        raise
    return Path(out_path)


def clip_pack(src: Path, out_dir: Path, scenes: dict, tools: Tools, encoder: str,
              report: Report, should_cancel: ShouldCancel,
              start: float = 0.0, end: float = 0.0, max_len: float = 3.0,
              min_len: float = 0.6) -> dict:
    """Shred the video into ≤max_len clips along scene cuts; writes
    clips/*.mp4 + clippack.json. Returns the manifest dict."""
    duration = scenes.get("duration") or tools.probe_duration(src) or 0
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

    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = []
    total = len(chunks)
    for i, (cs, ce) in enumerate(chunks, 1):
        if should_cancel():
            raise Cancelled()
        mmss = f"{int(cs // 60):02d}m{int(cs % 60):02d}s"
        out = out_dir / f"{src.stem}_clip{i:03d}_{mmss}.mp4"
        # Fast profile: these are editing intermediates (re-encoded again
        # in DaVinci), so speed matters more than compression efficiency.
        cmd = [
            tools.ffmpeg, "-y", "-ss", str(cs), "-i", str(src),
            "-t", str(round(ce - cs, 3)),
            *encoders.video_args(encoder, "fast"), *encoders.AUDIO_ARGS, *encoders.MP4_ARGS,
            "-loglevel", "error", str(out),
        ]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode == 0:
            manifest.append({"file": out.name, "start": round(cs, 2),
                             "end": round(ce, 2), "len": round(ce - cs, 2)})
        report(i / total * 100, f"clip {i}/{total}")

    data = {"src": None, "count": len(manifest), "max_len": max_len,
            "capped": capped, "clips": manifest}
    (out_dir / "clippack.json").write_text(json.dumps(data, indent=2), encoding="utf-8")
    return data


def detect_silences(src: Path, tools: Tools, threshold_db: float = -30.0, min_silence: float = 0.5) -> list[tuple[float, float]]:
    """ffmpeg silencedetect → [(start, end), ...] in source seconds (audio-only decode)."""
    det = subprocess.run(
        [tools.ffmpeg, "-i", str(src), "-vn",
         "-af", f"silencedetect=n={threshold_db}dB:d={min_silence}",
         "-f", "null", "-"],
        capture_output=True, text=True,
    )
    starts = [float(m) for m in re.findall(r"silence_start: ([0-9.]+)", det.stderr)]
    ends = [float(m) for m in re.findall(r"silence_end: ([0-9.]+)", det.stderr)]
    return list(zip(starts, ends))


def tighten(src: Path, out_path: Path, tools: Tools, encoder: str,
            report: Report, should_cancel: ShouldCancel,
            threshold_db: float = -30.0, min_silence: float = 0.5, pad: float = 0.06) -> dict:
    """Silence removal: silencedetect → trim/concat graph → `<stem>_tight.mp4`."""
    duration = tools.probe_duration(src) or 0
    report(None, "finding silences")
    silences = detect_silences(src, tools, threshold_db, min_silence)
    if should_cancel():
        raise Cancelled()

    # Build keep segments (complement), padding so cuts aren't abrupt.
    keeps = []
    cursor = 0.0
    for s, e in silences:
        seg_end = min(s + pad, duration)
        if seg_end - cursor > 0.15:
            keeps.append((round(cursor, 3), round(seg_end, 3)))
        cursor = max(e - pad, cursor)
    if duration - cursor > 0.15:
        keeps.append((round(cursor, 3), round(duration, 3)))

    if not keeps:
        raise RuntimeError("Everything was detected as silent — try a lower threshold.")
    kept = sum(b - a for a, b in keeps)
    if len(keeps) <= 1 or kept >= duration - 0.2:
        raise RuntimeError("No removable silence found in this video.")

    parts = []
    for i, (a, b) in enumerate(keeps):
        parts.append(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS[v{i}];"
                     f"[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS[a{i}]")
    concat_in = "".join(f"[v{i}][a{i}]" for i in range(len(keeps)))
    graph = ";".join(parts) + f";{concat_in}concat=n={len(keeps)}:v=1:a=1[v][a]"

    cmd = [
        tools.ffmpeg, "-y", "-i", str(src),
        "-filter_complex", graph, "-map", "[v]", "-map", "[a]",
        *encoders.video_args(encoder, "fast"), *encoders.AUDIO_ARGS, *encoders.MP4_ARGS,
        "-progress", "pipe:1", "-nostats", "-loglevel", "error",
        str(out_path),
    ]
    try:
        tools.run_progress(cmd, kept, report, should_cancel, note="cutting silences")
    except BaseException:
        Path(out_path).unlink(missing_ok=True)
        raise
    return {"duration": duration, "kept": round(kept, 2), "cuts": len(keeps)}


def finalize_import(dest: Path, tools: Tools, source: str | None = None) -> dict:
    """Write the v1-style info.json sidecar + a jpg thumbnail for an imported
    media file; returns the probed metadata."""
    dest = Path(dest)
    folder, stem = dest.parent, dest.stem
    meta = tools.probe_local(dest)
    info = {"title": stem, "uploader": "Local import", "duration": meta["duration"],
            "width": meta["width"], "height": meta["height"], "vcodec": meta["vcodec"],
            "extractor_key": "local"}
    if source:
        info["imported_from"] = str(source)
    (folder / f"{stem}.info.json").write_text(json.dumps(info), encoding="utf-8")
    tools.thumbnail(dest, folder / f"{stem}.jpg", (meta["duration"] or 4) * 0.25)
    return meta


def allocate_folder(library_dir: Path, stem: str) -> Path:
    """One folder per video, like downloads; suffix on name collisions."""
    folder = Path(library_dir) / stem
    n = 2
    while folder.exists():
        folder = Path(library_dir) / f"{stem} ({n})"
        n += 1
    folder.mkdir(parents=True)
    return folder


def safe_stem(name: str) -> str:
    return re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", Path(name).stem).strip() or "import"
