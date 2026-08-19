"""AI features backed by Google Gemini (REST, no SDK dependency).

Set GEMINI_API_KEY in .env to enable. GEMINI_MODEL overrides the default.
Suggestions are cached as <stem>.suggestions.json next to the media file.
"""

import base64
import json
import os
import subprocess
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

import downloader
from downloader import Cancelled

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
DEFAULT_MODEL = "gemini-2.5-flash"

MAX_KEYFRAMES = 16
MAX_TRANSCRIPT_CHARS = 16000

CLIP_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "clips": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "start": {"type": "NUMBER", "description": "clip start in seconds"},
                    "end": {"type": "NUMBER", "description": "clip end in seconds"},
                    "title": {"type": "STRING", "description": "short punchy title"},
                    "hook": {"type": "STRING", "description": "one-line reason a viewer keeps watching"},
                    "reason": {"type": "STRING", "description": "why this segment was picked"},
                },
                "required": ["start", "end", "title", "hook", "reason"],
            },
        },
    },
    "required": ["clips"],
}


def api_key():
    return os.environ.get("GEMINI_API_KEY")


def model_name():
    return os.environ.get("GEMINI_MODEL", DEFAULT_MODEL)


def suggestions_path_for(src):
    src = Path(src)
    return src.parent / f"{src.stem}.suggestions.json"


def _gemini_generate(parts, schema=None, timeout=180):
    key = api_key()
    if not key:
        raise RuntimeError("No Gemini API key — set GEMINI_API_KEY in .env.")
    body = {"contents": [{"role": "user", "parts": parts}]}
    if schema:
        body["generationConfig"] = {
            "response_mime_type": "application/json",
            "response_schema": schema,
        }
    req = urllib.request.Request(
        GEMINI_URL.format(model=model_name()),
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.load(resp)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")[:400]
        raise RuntimeError(f"Gemini API error {exc.code}: {detail}")
    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        raise RuntimeError(f"Gemini returned no content: {json.dumps(data)[:300]}")
    return json.loads(text) if schema else text


def _extract_keyframes(src, times, tmpdir):
    """One small JPEG per timestamp; returns [(t, b64), ...]."""
    frames = []
    for i, t in enumerate(times):
        out = Path(tmpdir) / f"kf_{i}.jpg"
        subprocess.run(
            [downloader.FFMPEG_BIN, "-ss", str(t), "-i", str(src),
             "-frames:v", "1", "-vf", "scale=480:-2", "-q:v", "6",
             "-y", "-loglevel", "error", str(out)],
            capture_output=True,
        )
        if out.is_file():
            frames.append((t, base64.b64encode(out.read_bytes()).decode()))
    return frames


def _pick_keyframe_times(scenes, duration):
    """Midpoints of scene intervals, thinned to MAX_KEYFRAMES."""
    cuts = [0.0] + list(scenes) + ([duration] if duration else [])
    mids = [
        (a + b) / 2 for a, b in zip(cuts, cuts[1:]) if b - a > 0.5
    ]
    if len(mids) > MAX_KEYFRAMES:
        step = len(mids) / MAX_KEYFRAMES
        mids = [mids[int(i * step)] for i in range(MAX_KEYFRAMES)]
    return mids


def _compact_transcript(transcript):
    lines = []
    total = 0
    for seg in transcript["segments"]:
        line = f"[{seg['start']:.0f}-{seg['end']:.0f}s] {seg['text']}"
        total += len(line)
        if total > MAX_TRANSCRIPT_CHARS:
            lines.append("… (transcript truncated)")
            break
        lines.append(line)
    return "\n".join(lines)


def run_suggest(src, title, duration, count=5, job=None, event=None):
    """Transcript + scenes + keyframes -> Gemini -> suggestions.json."""
    src = Path(src)
    cached = suggestions_path_for(src)
    if cached.is_file():
        return json.loads(cached.read_text(encoding="utf-8"))

    if job is not None:
        job["status"] = "transcribing"
        job["percent"] = 0.0
    transcript = downloader.run_transcribe(src, job=job, event=event)

    if job is not None:
        job["status"] = "analyzing"
        job["percent"] = 0.0
    scenes = downloader.run_scenes(src, job=job, event=event)
    if event is not None and event.is_set():
        raise Cancelled()

    if job is not None:
        job["status"] = "suggesting"
        job["percent"] = None  # indeterminate while Gemini thinks

    duration = duration or scenes.get("duration") or transcript.get("duration")
    times = _pick_keyframe_times(scenes["scenes"], duration)
    parts = []
    with tempfile.TemporaryDirectory() as tmpdir:
        frames = _extract_keyframes(src, times, tmpdir)
        transcript_text = _compact_transcript(transcript) or "(no speech detected)"
        scene_list = ", ".join(f"{t:.1f}s" for t in scenes["scenes"]) or "none"
        prompt = f"""You are an expert short-form video editor. Pick the {count} best segments of this video to publish as vertical Shorts/Reels/TikToks.

Video: "{title}" — {duration:.0f} seconds long.
Scene cuts at: {scene_list}

Transcript (may be empty for music/CG content — then judge from the frames):
{transcript_text}

The numbered frames below are sampled at these timestamps (seconds): {", ".join(f"{t:.1f}" for t, _ in frames)}

Rules:
- Each clip 8-30 seconds, within [0, {duration:.0f}].
- Prefer segments with a strong visual or spoken hook in the first 2 seconds.
- Align clip boundaries with scene cuts or sentence boundaries when possible.
- Titles: short, punchy, no clickbait ALL CAPS.
Return exactly {count} clips ranked best first."""
        parts.append({"text": prompt})
        for _, b64 in frames:
            parts.append({"inline_data": {"mime_type": "image/jpeg", "data": b64}})

        if event is not None and event.is_set():
            raise Cancelled()
        result = _gemini_generate(parts, schema=CLIP_SCHEMA)

    clips = []
    for c in result.get("clips", []):
        start = max(0.0, float(c["start"]))
        end = min(float(c["end"]), duration or float(c["end"]))
        if end - start < 3:
            continue
        clips.append({
            "start": round(start, 1),
            "end": round(end, 1),
            "title": c["title"],
            "hook": c["hook"],
            "reason": c["reason"],
        })
    data = {"src": str(src), "model": model_name(), "clips": clips}
    cached.write_text(json.dumps(data), encoding="utf-8")
    return data


def start_suggest(src, title, duration, count=5):
    src = Path(src)
    job = downloader._new_job("suggest", title or src.stem)
    job["src"] = str(src)

    def worker(job=job, event=downloader._EVENTS[job["id"]]):
        try:
            run_suggest(src, title, duration, count=count, job=job, event=event)
            job["percent"] = 100.0
            job["path"] = str(suggestions_path_for(src))
            job["status"] = "done"
        except Exception as exc:
            if event.is_set() or isinstance(exc, Cancelled):
                job["status"] = "cancelled"
            else:
                job["status"] = "error"
                job["error"] = str(exc)

    import threading
    threading.Thread(target=worker, daemon=True).start()
    return job


# ---------------------------------------------------------- P4: auto shorts

def start_autoshorts(src, title, duration, count=3):
    """URL-to-Shorts tail end: transcribe -> scenes -> suggest -> export each
    suggested clip as a captioned blurred-pad 9:16 with auto border trim."""
    src = Path(src)
    job = downloader._new_job("autoshorts", title or src.stem)
    job["src"] = str(src)

    def worker(job=job, event=downloader._EVENTS[job["id"]]):
        base_title = job["title"]
        try:
            suggestions = run_suggest(
                src, title, duration, count=count, job=job, event=event
            )
            borders = downloader.detect_borders(src)
            clips = suggestions["clips"][:count]
            has_words = _has_speech(src)
            outputs = []
            for i, clip in enumerate(clips):
                if event.is_set():
                    raise Cancelled()
                job["title"] = f"{base_title} — clip {i + 1}/{len(clips)}"
                job["status"] = "exporting"
                job["percent"] = 0.0
                out = downloader.run_export(
                    job, event, src, clip["start"], clip["end"],
                    style="blur",
                    trim_x=borders["trim_x"], trim_y=borders["trim_y"],
                    captions=has_words,
                )
                outputs.append(str(out))
            job["title"] = base_title
            job["percent"] = 100.0
            job["path"] = outputs[-1] if outputs else None
            job["status"] = "done"
        except Exception as exc:
            job["title"] = base_title
            if event.is_set() or isinstance(exc, Cancelled):
                job["status"] = "cancelled"
            else:
                job["status"] = "error"
                job["error"] = str(exc)

    import threading
    threading.Thread(target=worker, daemon=True).start()
    return job


def _has_speech(src):
    """True only for a substantial transcript — Whisper hallucinates a few
    stray words on music/CG content, which shouldn't become captions."""
    t_path = downloader.transcript_path_for(src)
    if not t_path.is_file():
        return False
    transcript = json.loads(t_path.read_text(encoding="utf-8"))
    words = sum(len(seg["words"]) for seg in transcript["segments"])
    return words >= 20
