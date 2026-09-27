"""Gemini (REST, no SDK) clip suggestions + post kits — ported from v1 ai.py.
Inputs are passed in (transcript / scenes dicts, source path for keyframes),
outputs are returned; caching in sidecars is the adapter's business."""

from __future__ import annotations

import base64
import json
import logging
import os
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

log = logging.getLogger("gemini")

from .errors import Cancelled
from .ffmpeg import ShouldCancel, Tools

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200"
DEFAULT_MODEL = "gemini-2.5-flash"
# Fallback chain when a model is saturated (503) or rate-limited (429):
# GEMINI_MODELS="a,b,c" overrides; GEMINI_MODEL alone puts that model first.
DEFAULT_CHAIN = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"]
RETRY_DELAYS = (2, 6, 15)            # per model, seconds, before moving to the next
RETRY_STATUSES = {429, 500, 502, 503, 504}
last_used_model: str | None = None   # which model answered the last call (for job results)

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

POSTKIT_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "title": {"type": "STRING", "description": "punchy title, under 80 chars"},
        "description": {"type": "STRING", "description": "1-2 sentence description"},
        "hashtags": {"type": "ARRAY", "items": {"type": "STRING"},
                     "description": "8-12 relevant hashtags, no # symbol"},
    },
    "required": ["title", "description", "hashtags"],
}


def api_key() -> str | None:
    return os.environ.get("GEMINI_API_KEY")


def model_name() -> str:
    return model_chain()[0]


def model_chain() -> list[str]:
    raw = os.environ.get("GEMINI_MODELS")
    if raw:
        chain = [m.strip() for m in raw.split(",") if m.strip()]
        if chain:
            return chain
    single = os.environ.get("GEMINI_MODEL")
    if single:
        return [single] + [m for m in DEFAULT_CHAIN if m != single]
    return list(DEFAULT_CHAIN)


def list_models(key: str | None = None, timeout: int = 30) -> list[dict]:
    """Models this key can call with generateContent (name, display name, limits)."""
    key = key or api_key()
    if not key:
        raise RuntimeError("No Gemini API key.")
    req = urllib.request.Request(MODELS_URL, headers={"x-goog-api-key": key})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.load(resp)
    out = []
    for m in data.get("models", []):
        if "generateContent" not in (m.get("supportedGenerationMethods") or []):
            continue
        out.append({"name": m.get("name", "").removeprefix("models/"), "display": m.get("displayName"),
                    "input_tokens": m.get("inputTokenLimit"), "output_tokens": m.get("outputTokenLimit")})
    return out


def _short_error(body: str) -> str:
    try:
        msg = json.loads(body).get("error", {}).get("message")
        if msg:
            return msg[:200]
    except ValueError:
        pass
    return body[:200]


def generate(parts, schema=None, timeout=180, on_retry=None):
    """One structured call with resilience: retry each model on 429/5xx with
    backoff, then fall through GEMINI_MODELS. `on_retry(note)` gets a
    one-line status for job progress. Raises RuntimeError with the last error."""
    global last_used_model
    key = api_key()
    if not key:
        raise RuntimeError("No Gemini API key — set GEMINI_API_KEY on this worker.")
    body = {"contents": [{"role": "user", "parts": parts}]}
    if schema:
        body["generationConfig"] = {"response_mime_type": "application/json",
                                    "response_schema": schema}
    payload = json.dumps(body).encode()
    errors: list[str] = []
    for model in model_chain():
        for attempt, delay in enumerate((*RETRY_DELAYS, None)):
            req = urllib.request.Request(GEMINI_URL.format(model=model), data=payload,
                                         headers={"Content-Type": "application/json", "x-goog-api-key": key})
            try:
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    data = json.load(resp)
                break
            except urllib.error.HTTPError as exc:
                detail = _short_error(exc.read().decode(errors="replace"))
                errors.append(f"{model}: {exc.code} {detail}")
                if exc.code in RETRY_STATUSES and delay is not None:
                    note = f"{model} busy ({exc.code}), retrying in {delay}s"
                    log.warning(note)
                    if on_retry:
                        on_retry(note)
                    time.sleep(delay)
                    continue
                if exc.code in RETRY_STATUSES or exc.code in (400, 404, 403):
                    # saturated after retries, or this model isn't available to the key → next model
                    if on_retry:
                        on_retry(f"{model} unavailable ({exc.code}), trying the next model")
                    data = None
                    break
                raise RuntimeError(f"Gemini API error {exc.code} ({model}): {detail}")
            except (urllib.error.URLError, TimeoutError, OSError) as exc:
                errors.append(f"{model}: {exc}")
                if delay is not None:
                    if on_retry:
                        on_retry(f"{model} unreachable, retrying in {delay}s")
                    time.sleep(delay)
                    continue
                data = None
                break
        else:
            data = None
        if data is None:
            continue
        try:
            text = data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            raise RuntimeError(f"Gemini returned no content ({model}): {json.dumps(data)[:300]}")
        last_used_model = model
        return json.loads(text) if schema else text
    raise RuntimeError("Gemini is unavailable on every configured model — " + " | ".join(errors[-3:]))


def _extract_keyframes(src, times, tmpdir, tools: Tools):
    """One small JPEG per timestamp; returns [(t, b64), ...]."""
    frames = []
    for i, t in enumerate(times):
        out = Path(tmpdir) / f"kf_{i}.jpg"
        subprocess.run(
            [tools.ffmpeg, "-ss", str(t), "-i", str(src), "-frames:v", "1",
             "-vf", "scale=480:-2", "-q:v", "6", "-y", "-loglevel", "error", str(out)],
            capture_output=True,
        )
        if out.is_file():
            frames.append((t, base64.b64encode(out.read_bytes()).decode()))
    return frames


def _pick_keyframe_times(scenes, duration):
    """Midpoints of scene intervals, thinned to MAX_KEYFRAMES."""
    cuts = [0.0] + list(scenes) + ([duration] if duration else [])
    mids = [(a + b) / 2 for a, b in zip(cuts, cuts[1:]) if b - a > 0.5]
    if len(mids) > MAX_KEYFRAMES:
        step = len(mids) / MAX_KEYFRAMES
        mids = [mids[int(i * step)] for i in range(MAX_KEYFRAMES)]
    return mids


def compact_transcript(transcript):
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


def suggest_clips(src: Path, title: str, duration: float | None, transcript: dict, scenes: dict,
                  tools: Tools, should_cancel: ShouldCancel, count: int = 5, on_retry=None) -> dict:
    """Transcript + scenes + keyframes -> Gemini -> {"model", "clips": [...]}."""
    duration = duration or scenes.get("duration") or transcript.get("duration")
    times = _pick_keyframe_times(scenes["scenes"], duration)
    parts = []
    with tempfile.TemporaryDirectory() as tmpdir:
        frames = _extract_keyframes(src, times, tmpdir, tools)
        transcript_text = compact_transcript(transcript) or "(no speech detected)"
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
        if should_cancel():
            raise Cancelled()
        result = generate(parts, schema=CLIP_SCHEMA, on_retry=on_retry)

    clips = []
    for c in result.get("clips", []):
        start = max(0.0, float(c["start"]))
        end = min(float(c["end"]), duration or float(c["end"]))
        if end - start < 3:
            continue
        clips.append({"start": round(start, 1), "end": round(end, 1),
                      "title": c["title"], "hook": c["hook"], "reason": c["reason"]})
    return {"src": None, "model": last_used_model or model_name(), "clips": clips}


def post_kit(title: str, transcript: dict, on_retry=None) -> dict:
    text = compact_transcript(transcript) or "(no speech — judge from the title)"
    prompt = f"""You are a social media manager for short-form video (YouTube Shorts, TikTok, Reels).

Video title: "{title}"
Transcript:
{text}

Write:
- title: a punchy, specific title under 80 characters (no ALL CAPS, no clickbait lies)
- description: 1-2 natural sentences summarizing the hook
- hashtags: 8-12 relevant, specific hashtags (lowercase, no # symbol, no spaces)"""
    result = generate([{"text": prompt}], schema=POSTKIT_SCHEMA, on_retry=on_retry)
    return {
        "src": None,
        "title": result.get("title", ""),
        "description": result.get("description", ""),
        "hashtags": [h.lstrip("#").strip() for h in result.get("hashtags", []) if h.strip()],
    }
