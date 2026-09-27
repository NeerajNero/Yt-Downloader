"""Burned-caption ASS writers — ported unchanged from v1 (server/downloader.py).

Two sources: the Whisper transcript (word-timed) or hand-typed caption items.
Four styles: karaoke (amber word fill), typewriter, pop, minimal.
"""

from __future__ import annotations

from pathlib import Path


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
    Word times are shifted so 0 = clip_start. Returns the event count."""
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
        if group and (len(group) >= max_words or w["s"] - group[-1]["e"] > max_gap):
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
                cs = max(int((min(w["e"], clip_end) - max(w["s"], clip_start)) * 100), 1)
                parts.append(f"{{\\k{cs}}}{_ass_escape(w['w'])}")
            text = " ".join(parts)
        else:
            text = _ass_escape(" ".join(_style_word(style, w["w"]) for w in group))
            if style == "pop":
                events.extend(_pop_events(start, end, text))
                continue
        events.append(f"Dialogue: 0,{_ass_time(start)},{_ass_time(end)},Cap,,0,0,0,,{text}")

    Path(out_path).write_text(
        _ass_header(position, style, orientation) + "\n".join(events) + "\n", encoding="utf-8"
    )
    return len(events)


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
            line = " ".join(f"{{\\k{per_word_cs}}}{_ass_escape(w)}" for w in words)
        else:
            line = _ass_escape(" ".join(words))
            if style == "pop":
                events.extend(_pop_events(start, end, line))
                continue
        events.append(f"Dialogue: 0,{_ass_time(start)},{_ass_time(end)},Cap,,0,0,0,,{line}")
    Path(out_path).write_text(
        _ass_header(position, style, orientation) + "\n".join(events) + "\n", encoding="utf-8"
    )
    return len(events)


def subtitles_filter_path(p):
    """Escape a path for ffmpeg's subtitles= filter (Windows-safe)."""
    p = str(p).replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
    return f"subtitles=filename='{p}'"
