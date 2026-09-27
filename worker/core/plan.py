"""AI edit plan: transcript + scene cuts + keyframes (+ optionally a Style's
breakdown) -> an ordered list of shots with speed and punch-ins, a transition,
caption/grade choices, and notes. The plan pre-fills the montage builder."""

from __future__ import annotations

import tempfile
from pathlib import Path

from . import gemini
from .errors import Cancelled
from .ffmpeg import ShouldCancel, Tools
from .gemini import _extract_keyframes, _pick_keyframe_times, compact_transcript
from .render import TRANSITIONS

PLAN_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "title": {"type": "STRING", "description": "punchy title for the finished Short"},
        "hook": {"type": "STRING", "description": "what the first 2 seconds show/say and why it stops the scroll"},
        "summary": {"type": "STRING", "description": "the story of the edit in 2-3 sentences"},
        "shots": {"type": "ARRAY", "description": "ordered shots, first = the hook; 3-12 shots",
                  "items": {"type": "OBJECT", "properties": {
                      "start": {"type": "NUMBER", "description": "source start, seconds"},
                      "end": {"type": "NUMBER", "description": "source end, seconds"},
                      "speed": {"type": "NUMBER", "description": "1 = normal; 0.5 slow-mo for a big moment; 2-3 to rush setup"},
                      "punch": {"type": "BOOLEAN", "description": "punch-in zoom at the start of this shot"},
                      "why": {"type": "STRING", "description": "one short reason this shot is in"},
                  }, "required": ["start", "end", "speed", "punch", "why"]}},
        "transition": {"type": "STRING", "description": "one of: cut, fade, fadeblack, fadewhite, dissolve, zoomin, slideleft, slideup, wipeleft, circleopen, pixelize, hblur"},
        "transition_duration": {"type": "NUMBER", "description": "0.15-0.6 seconds"},
        "caption_style": {"type": "STRING", "description": "karaoke, typewriter, pop, minimal or none"},
        "caption_pos": {"type": "STRING", "description": "bottom, middle or top"},
        "grade": {"type": "STRING", "description": "none, teal_orange, moody, warm, cool or bw"},
        "vivid": {"type": "INTEGER", "description": "0-100 saturation/contrast boost"},
        "music_vibe": {"type": "STRING", "description": "what music bed would fit (genre, energy, tempo)"},
        "sfx_ideas": {"type": "ARRAY", "items": {"type": "STRING"}, "description": "where a whoosh/hit/riser would land, referencing shot numbers"},
        "resolve_notes": {"type": "ARRAY", "items": {"type": "STRING"}, "description": "things worth doing by hand in DaVinci Resolve"},
    },
    "required": ["title", "hook", "summary", "shots", "transition", "transition_duration", "caption_style",
                 "caption_pos", "grade", "vivid", "music_vibe", "sfx_ideas", "resolve_notes"],
}

_CAPS = {"karaoke", "typewriter", "pop", "minimal"}
_GRADES = {"none", "teal_orange", "moody", "warm", "cool", "bw"}


def make_plan(src: Path, title: str, duration: float | None, transcript: dict | None, scenes: dict,
              tools: Tools, should_cancel: ShouldCancel, target_len: float = 30.0, max_shots: int = 8,
              style_report: dict | None = None, note: str | None = None, on_retry=None) -> dict:
    duration = duration or scenes.get("duration") or (transcript or {}).get("duration") or 0
    times = _pick_keyframe_times(scenes["scenes"], duration)
    parts = []
    with tempfile.TemporaryDirectory() as tmpdir:
        frames = _extract_keyframes(src, times, tmpdir, tools)
        transcript_text = compact_transcript(transcript) if transcript else ""
        scene_list = ", ".join(f"{t:.1f}s" for t in scenes["scenes"]) or "none"
        style_txt = ""
        if style_report:
            style_txt = ("\nMatch this reference edit's style: " + (style_report.get("summary") or "") +
                         f" Captions: {(style_report.get('captions') or {}).get('style')}. "
                         f"Cuts: {(style_report.get('cuts') or {}).get('pace')}. "
                         f"Zooms: {(style_report.get('zooms') or {}).get('notes')}. "
                         f"Colour: {(style_report.get('color') or {}).get('grade')}. "
                         f"Audio: {(style_report.get('audio') or {}).get('notes')}.\n")
        note_txt = f"\nThe creator's note about what they want: \"{note}\"\n" if note else ""
        prompt = f"""You are a short-form editor planning ONE vertical Short from this recording.

Video: "{title}" — {duration:.0f} seconds long. Target length: about {target_len:.0f} seconds, at most {max_shots} shots.
Scene cuts at: {scene_list}
{note_txt}{style_txt}
Transcript (may be empty for gameplay without commentary — then plan from the frames):
{transcript_text or "(no speech)"}

The frames below are sampled at these timestamps (seconds): {", ".join(f"{t:.1f}" for t, _ in frames)}

Plan the edit:
- Open with the strongest moment as the hook, even if it happens late in the source; then the setup, then the payoff.
- Every shot: exact start/end in source seconds within [0, {duration:.0f}], ≥ 1.5 s; use speed 0.5 for a hero moment, 2-3 to compress boring setup, else 1.
- Use punch-ins sparingly for emphasis (impacts, reactions, punchlines).
- Pick a transition that suits the energy (hard cuts for gameplay, crossfades for calm, zoomin/flash for hype).
- Captions only if there is speech; pick the caption style and colour grade that match the content.
Explain each shot in a few words."""
        parts.append({"text": prompt})
        for _, b64 in frames:
            parts.append({"inline_data": {"mime_type": "image/jpeg", "data": b64}})
        if should_cancel():
            raise Cancelled()
        result = gemini.generate(parts, schema=PLAN_SCHEMA, timeout=240, on_retry=on_retry)

    shots = []
    for sh in result.get("shots", [])[:max_shots]:
        a, b = max(0.0, float(sh["start"])), float(sh["end"])
        if duration:
            b = min(b, duration)
        if b - a < 0.5:
            continue
        sp = float(sh.get("speed") or 1.0)
        sp = min(4.0, max(0.25, sp))
        shots.append({"start": round(a, 2), "end": round(b, 2), "speed": round(sp, 2),
                      "punch": bool(sh.get("punch")), "why": sh.get("why", "")})
    trans = result.get("transition", "cut")
    if trans not in TRANSITIONS:
        trans = "cut"
    has_speech = bool(transcript) and sum(len(s.get("words") or []) for s in transcript.get("segments", [])) >= 20
    cap = result.get("caption_style", "none")
    out_len = sum((s["end"] - s["start"]) / s["speed"] for s in shots)
    return {
        "src": None,
        "model": gemini.last_used_model,
        "title": result.get("title", ""),
        "hook": result.get("hook", ""),
        "summary": result.get("summary", ""),
        "shots": shots,
        "out_length": round(out_len, 1),
        "transition": {"type": trans, "duration": min(2.0, max(0.1, float(result.get("transition_duration") or 0.3)))},
        "captions": has_speech and cap in _CAPS,
        "caption_style": cap if cap in _CAPS else "karaoke",
        "caption_pos": result.get("caption_pos") if result.get("caption_pos") in ("bottom", "middle", "top") else "bottom",
        "grade": result.get("grade") if result.get("grade") in _GRADES else "none",
        "vivid": int(max(0, min(int(result.get("vivid") or 0), 100))),
        "music_vibe": result.get("music_vibe", ""),
        "sfx_ideas": result.get("sfx_ideas") or [],
        "resolve_notes": result.get("resolve_notes") or [],
    }
