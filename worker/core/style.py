"""Style clone: break a reference Short's edit down into (a) hard facts
measured with ffmpeg, (b) Gemini's read of the creative choices from the
video itself, (c) a recipe for our renderer, (d) DaVinci Resolve steps for
what we can't reproduce."""

from __future__ import annotations

import base64
import json
import re
import subprocess
from pathlib import Path

from . import gemini
from .errors import Cancelled
from .ffmpeg import Report, ShouldCancel, Tools
from .media import detect_borders, detect_scenes

MAX_INLINE_BYTES = 14 * 1024 * 1024   # Gemini inline limit is 20 MB after base64 inflation

STYLE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "summary": {"type": "STRING", "description": "2-3 sentences: what makes this edit work"},
        "hook": {"type": "STRING", "description": "what happens in the first 2 seconds to stop the scroll"},
        "captions": {"type": "OBJECT", "properties": {
            "present": {"type": "BOOLEAN"},
            "style": {"type": "STRING", "description": "one of: karaoke, typewriter, pop, minimal, other, none"},
            "position": {"type": "STRING", "description": "bottom, middle or top"},
            "all_caps": {"type": "BOOLEAN"},
            "notes": {"type": "STRING", "description": "font feel, colours, animation, word grouping"},
        }, "required": ["present", "style", "position", "all_caps", "notes"]},
        "framing": {"type": "OBJECT", "properties": {
            "style": {"type": "STRING", "description": "crop (subject fills 9:16), blur (blurred pad around a wider video), full (native vertical), split, other"},
            "notes": {"type": "STRING"},
        }, "required": ["style", "notes"]},
        "cuts": {"type": "OBJECT", "properties": {
            "pace": {"type": "STRING", "description": "slow, medium, fast, frantic"},
            "on_beat": {"type": "BOOLEAN", "description": "cuts land on music beats"},
            "notes": {"type": "STRING"},
        }, "required": ["pace", "on_beat", "notes"]},
        "zooms": {"type": "OBJECT", "properties": {
            "punch_ins": {"type": "BOOLEAN", "description": "sudden zoom-ins for emphasis"},
            "per_10s": {"type": "NUMBER", "description": "approximate punch-ins per 10 seconds"},
            "slow_zoom": {"type": "BOOLEAN", "description": "continuous slow Ken-Burns zoom"},
            "notes": {"type": "STRING"},
        }, "required": ["punch_ins", "per_10s", "slow_zoom", "notes"]},
        "color": {"type": "OBJECT", "properties": {
            "grade": {"type": "STRING", "description": "closest of: none, teal_orange, moody, warm, cool, bw, other"},
            "vivid": {"type": "INTEGER", "description": "0-100 how boosted the saturation/contrast is vs natural"},
            "hdr_look": {"type": "BOOLEAN", "description": "crunchy high local contrast / clarity look"},
            "notes": {"type": "STRING"},
        }, "required": ["grade", "vivid", "hdr_look", "notes"]},
        "audio": {"type": "OBJECT", "properties": {
            "voice": {"type": "BOOLEAN"},
            "music": {"type": "BOOLEAN"},
            "ducking": {"type": "BOOLEAN", "description": "music dips under the voice"},
            "sfx": {"type": "BOOLEAN", "description": "whooshes, hits, risers"},
            "notes": {"type": "STRING", "description": "genre, energy, where the drops are"},
        }, "required": ["voice", "music", "ducking", "sfx", "notes"]},
        "overlays": {"type": "OBJECT", "properties": {
            "watermark": {"type": "BOOLEAN"},
            "watermark_position": {"type": "STRING", "description": "top_left, top_right, bottom_left, bottom_right, top_center, bottom_center or none"},
            "other_text": {"type": "STRING", "description": "titles, callouts, emojis, progress bars"},
        }, "required": ["watermark", "watermark_position", "other_text"]},
        "motion": {"type": "OBJECT", "properties": {
            "speed_ramps": {"type": "BOOLEAN"},
            "transitions": {"type": "STRING", "description": "hard cuts, whip pans, zoom transitions, flashes..."},
            "notes": {"type": "STRING"},
        }, "required": ["speed_ramps", "transitions", "notes"]},
        "resolve_steps": {"type": "ARRAY", "description": "6-12 concrete DaVinci Resolve steps to recreate what the platform cannot",
                          "items": {"type": "OBJECT", "properties": {
                              "panel": {"type": "STRING", "description": "Edit, Cut, Color, Fairlight, Fusion or Deliver"},
                              "step": {"type": "STRING", "description": "one imperative sentence"},
                              "detail": {"type": "STRING", "description": "the exact settings / values to use"},
                          }, "required": ["panel", "step", "detail"]}},
    },
    "required": ["summary", "hook", "captions", "framing", "cuts", "zooms", "color", "audio",
                 "overlays", "motion", "resolve_steps"],
}


def measure(ref: Path, tools: Tools, report: Report, should_cancel: ShouldCancel) -> dict:
    """ffmpeg facts about the reference: dims, cut cadence, loudness, black bars."""
    info = tools.probe_local(ref)
    duration = info["duration"] or 0.0
    report(None, "measuring cuts")
    scenes = detect_scenes(ref, tools, lambda *_: None, should_cancel, threshold=0.30)
    cuts = scenes["scenes"]
    bounds = [0.0] + cuts + [duration]
    shots = [b - a for a, b in zip(bounds, bounds[1:]) if b - a > 0.05]
    shots_sorted = sorted(shots)
    median_shot = shots_sorted[len(shots_sorted) // 2] if shots_sorted else duration

    report(None, "measuring loudness")
    lo = subprocess.run([tools.ffmpeg, "-i", str(ref), "-af", "ebur128=framelog=quiet", "-f", "null", "-"],
                        capture_output=True, text=True).stderr
    m = re.search(r"I:\s+(-?[0-9.]+)\s+LUFS", lo)
    lufs = float(m.group(1)) if m else None
    m = re.search(r"LRA:\s+(-?[0-9.]+)\s+LU", lo)
    lra = float(m.group(1)) if m else None

    borders = detect_borders(ref, tools)
    w, h = info["width"] or 0, info["height"] or 0
    return {
        "width": w, "height": h, "fps": tools.probe_fps(ref), "duration": round(duration, 2),
        "orientation": "portrait" if h >= w else "landscape",
        "cuts": len(cuts), "cuts_per_10s": round(len(cuts) / duration * 10, 2) if duration else 0,
        "median_shot_s": round(median_shot, 2),
        "lufs": lufs, "lra": lra,
        "bars_trim_x": borders["trim_x"], "bars_trim_y": borders["trim_y"],
    }


def _video_part(ref: Path, tools: Tools, scratch: Path) -> dict:
    """Inline video part for Gemini, re-encoded small if the file is too big."""
    src = ref
    if ref.stat().st_size > MAX_INLINE_BYTES:
        small = scratch / "ref_small.mp4"
        subprocess.run([tools.ffmpeg, "-y", "-v", "error", "-i", str(ref), "-vf", "scale=-2:360",
                        "-c:v", "libx264", "-crf", "30", "-preset", "veryfast", "-c:a", "aac", "-b:a", "64k",
                        "-movflags", "+faststart", str(small)], capture_output=True)
        src = small if small.is_file() else ref
    return {"inline_data": {"mime_type": "video/mp4", "data": base64.b64encode(src.read_bytes()).decode()}}


def analyze(ref: Path, title: str, measured: dict, tools: Tools, scratch: Path,
            should_cancel: ShouldCancel) -> dict:
    """Ask Gemini to break the edit down, grounded by the measured facts."""
    if should_cancel():
        raise Cancelled()
    facts = (f"{measured['width']}x{measured['height']} {measured['orientation']}, {measured['duration']} s, "
             f"{measured['cuts']} cuts ({measured['cuts_per_10s']} per 10 s, median shot {measured['median_shot_s']} s), "
             f"loudness {measured['lufs']} LUFS" + (f", black bars {measured['bars_trim_y']}% top/bottom" if measured['bars_trim_y'] else ""))
    prompt = f"""You are a senior short-form editor reverse-engineering another creator's edit so it can be recreated.

Reference: "{title}". Measured facts: {facts}.

Watch the video and describe the EDITING choices (not the content): captions style and position, framing,
cut pace, punch-in zooms, colour grade, music/voice/sfx, overlays, speed ramps and transitions.
Be concrete and honest — say "none" when an element is absent. Then give DaVinci Resolve steps that
recreate the parts a simple renderer cannot (text animations, speed ramps, transitions, sound design),
with exact values where you can (font size relative to frame, zoom %, EQ/compressor settings, LUFS)."""
    parts = [{"text": prompt}, _video_part(ref, tools, scratch)]
    return gemini.generate(parts, schema=STYLE_SCHEMA, timeout=300)


_CAPTION_STYLES = {"karaoke", "typewriter", "pop", "minimal"}
_GRADES = {"none", "teal_orange", "moody", "warm", "cool", "bw"}
_WM = {"top_left", "top_right", "bottom_left", "bottom_right", "top_center", "bottom_center"}


def to_recipe(report: dict, measured: dict) -> dict:
    """Map the breakdown onto our render settings (RecipeSettings shape)."""
    caps = report.get("captions") or {}
    framing = (report.get("framing") or {}).get("style", "crop")
    color = report.get("color") or {}
    zooms = report.get("zooms") or {}
    audio = report.get("audio") or {}
    overlays = report.get("overlays") or {}
    cap_style = caps.get("style", "none")
    if cap_style == "other":
        cap_style = "pop" if caps.get("all_caps") else "karaoke"
    recipe = {
        "orientation": "landscape" if measured.get("orientation") == "landscape" else "portrait",
        "resolution": "1080",
        "style": "blur" if framing == "blur" else "crop",
        "captions": bool(caps.get("present")) and cap_style in _CAPTION_STYLES,
        "caption_source": "auto",
        "caption_style": cap_style if cap_style in _CAPTION_STYLES else "karaoke",
        "caption_pos": caps.get("position") if caps.get("position") in ("bottom", "middle", "top") else "bottom",
        "captions_if_speech": True,
        "grade": color.get("grade") if color.get("grade") in _GRADES else "none",
        "vivid_amount": int(max(0, min(int(color.get("vivid") or 0), 100))),
        "look": "hdr" if color.get("hdr_look") else "none",
        "look_sharp": 50,
        "zoom": "in" if zooms.get("slow_zoom") and not zooms.get("punch_ins") else "none",
        "loudness": True,
        "duck": bool(audio.get("ducking", True)),
        "music_gain": 40 if audio.get("music") else 60,
        "auto_trim": bool(measured.get("bars_trim_y") or measured.get("bars_trim_x")),
    }
    if overlays.get("watermark") and overlays.get("watermark_position") in _WM:
        # The file is the user's own logo — they pick it on the video page; keep the placement.
        recipe["watermark"] = {"file": "", "position": overlays["watermark_position"], "scale": 0.15, "opacity": 0.85, "margin": 0.03}
    return recipe


def resolve_markdown(report: dict, measured: dict) -> str:
    steps = report.get("resolve_steps") or []
    lines = [f"**Summary.** {report.get('summary', '')}", "", f"**Hook.** {report.get('hook', '')}", ""]
    zooms = report.get("zooms") or {}
    if zooms.get("punch_ins"):
        lines.append(f"**Punch-ins.** About {zooms.get('per_10s', 0)} per 10 s — on our side add zoom markers on the "
                     "video page (Add at playhead) at the beats you want; the recipe can't guess the timestamps.")
        lines.append("")
    motion = report.get("motion") or {}
    if motion.get("speed_ramps") or (motion.get("transitions") and motion.get("transitions").lower() not in ("none", "hard cuts", "cuts")):
        lines.append(f"**Needs Resolve.** Speed ramps: {'yes' if motion.get('speed_ramps') else 'no'}; transitions: {motion.get('transitions', 'n/a')}.")
        lines.append("")
    lines.append(f"**Measured.** {measured.get('cuts')} cuts, median shot {measured.get('median_shot_s')} s, "
                 f"{measured.get('lufs')} LUFS.")
    lines.append("")
    lines.append("### DaVinci Resolve steps")
    for i, s in enumerate(steps, 1):
        lines.append(f"{i}. **{s.get('panel', '')}** — {s.get('step', '')}")
        if s.get("detail"):
            lines.append(f"   {s['detail']}")
    return "\n".join(lines)


def chips(report: dict, measured: dict) -> list[str]:
    """Short labels for the UI card."""
    out = [f"{measured.get('orientation', '')}", f"{measured.get('cuts_per_10s', 0)} cuts/10s"]
    caps = report.get("captions") or {}
    out.append(f"captions {caps.get('style')}" if caps.get("present") else "no captions")
    out.append((report.get("framing") or {}).get("style", ""))
    z = report.get("zooms") or {}
    if z.get("punch_ins"):
        out.append("punch-ins")
    c = report.get("color") or {}
    if c.get("grade") and c["grade"] != "none":
        out.append(c["grade"])
    if c.get("hdr_look"):
        out.append("HDR look")
    a = report.get("audio") or {}
    if a.get("music"):
        out.append("music" + (" (ducked)" if a.get("ducking") else ""))
    if a.get("sfx"):
        out.append("sfx")
    m = report.get("motion") or {}
    if m.get("speed_ramps"):
        out.append("speed ramps")
    if (report.get("overlays") or {}).get("watermark"):
        out.append("watermark")
    return [x for x in out if x]
