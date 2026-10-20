"""Burned-caption ASS writers — ported from v1 (server/downloader.py), plus
the playbook's hook / payoff blocks and caption safe area (docs/PLAYBOOK.md).

Two regular sources: the Whisper transcript (word-timed) or hand-typed
caption items. Four styles: karaoke (amber word fill), typewriter, pop,
minimal. On top of either (or alone, when captions are off) a `Hook` block
on frame 1 and a `Payoff` block on the peak, never with karaoke fill; while
one is on screen the regular captions are suppressed so two text blocks
never share the frame. Every style keeps its text inside SAFE_AREA.
"""

from __future__ import annotations

from pathlib import Path
from typing import NamedTuple


def _ass_time(t):
    h = int(t // 3600)
    m = int(t % 3600 // 60)
    s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def _ass_escape(text):
    return text.replace("\\", "").replace("{", "(").replace("}", ")")


def _num(v) -> str:
    v = float(v)
    return str(int(v)) if v.is_integer() else f"{v:.1f}"


# Fractions of the frame that captions never enter (docs/PLAYBOOK.md).
SAFE_AREA = {"top": 0.10, "bottom": 0.20, "left": 0.05, "right": 0.15}
CAPTION_POS_NAMES = ("bottom", "middle", "top")
# ASS alignment: 2 = bottom-center, 5 = middle-center, 8 = top-center.
_ALIGN = {"bottom": 2, "middle": 5, "top": 8}
# ASS PlayRes per orientation — matches the output aspect so text isn't stretched.
CAPTION_CANVAS = {"portrait": (1080, 1920), "landscape": (1920, 1080)}


def safe_margins(position: str, orientation: str) -> tuple[int, int, int, int]:
    """(align, margin_l, margin_r, margin_v) in PlayRes pixels so the text box
    of `position` sits inside SAFE_AREA. MarginV is measured from the bottom
    for align 2, from the top for align 8, and ignored by libass for align 5."""
    w, h = CAPTION_CANVAS.get(orientation, CAPTION_CANVAS["portrait"])
    pos = position if position in _ALIGN else "bottom"
    ml, mr = round(w * SAFE_AREA["left"]), round(w * SAFE_AREA["right"])
    mv = {"bottom": round(h * SAFE_AREA["bottom"]), "top": round(h * SAFE_AREA["top"]), "middle": 0}[pos]
    return _ALIGN[pos], ml, mr, mv


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

# Hook / payoff blocks: sized by fit between a ceiling and a floor (× the preset's Cap size).
HOOK_CEIL, HOOK_FLOOR = 1.6, 0.9
PAYOFF_CEIL, PAYOFF_FLOOR = 1.3, 0.8
HP_STROKE_SCALE = 1.5          # outline and shadow ...
HP_OUTLINE_MIN, HP_SHADOW_MAX = 6, 6   # ... but never a thin outline, never a huge shadow
HP_COLOUR = "&H00FFFFFF"       # white text; the stroke carries the contrast
AVG_GLYPH_EM = 0.55            # estimated glyph width as a fraction of the font size (Arial bold, mixed case)
FIT_STEP = 4                   # px between candidate sizes
HOOK_MAX_S, HOOK_GAP_S, PAYOFF_S = 3.0, 0.5, 1.8


def hp_sizes(style: str) -> dict:
    """Ceilings, floors and stroke for the Hook / Payoff styles of a preset."""
    s = CAPTION_STYLES.get(style, CAPTION_STYLES["karaoke"])
    return {"cap": s["size"],
            "hook": round(s["size"] * HOOK_CEIL), "hook_floor": round(s["size"] * HOOK_FLOOR),
            "payoff": round(s["size"] * PAYOFF_CEIL), "payoff_floor": round(s["size"] * PAYOFF_FLOOR),
            "outline": max(s["outline"] * HP_STROKE_SCALE, HP_OUTLINE_MIN),
            "shadow": min(s["shadow"] * HP_STROKE_SCALE, HP_SHADOW_MAX)}


def max_text_px(orientation: str) -> int:
    """Width a caption line may use: PlayRes width minus the left and right safe margins."""
    w, _ = CAPTION_CANVAS.get(orientation, CAPTION_CANVAS["portrait"])
    return w - round(w * SAFE_AREA["left"]) - round(w * SAFE_AREA["right"])


def text_px(text: str, size: float, avg_glyph_em: float = AVG_GLYPH_EM) -> float:
    return len(text) * size * avg_glyph_em


class Fit(NamedTuple):
    size: int
    lines: list[str]
    fits: bool          # False = needed more than two lines even at the floor


def _balanced(words: list[str], n: int) -> list[str]:
    """Split into n lines at the spaces that make the longest line shortest."""
    if n <= 1 or len(words) < n:
        return [" ".join(words)]
    best: tuple[int, list[str]] | None = None
    if n == 2:
        cuts = [(i,) for i in range(1, len(words))]
    else:
        cuts = [(i, j) for i in range(1, len(words) - 1) for j in range(i + 1, len(words))]
    for cut in cuts:
        bounds = [0, *cut, len(words)]
        lines = [" ".join(words[a:b]) for a, b in zip(bounds, bounds[1:])]
        m = max(len(line) for line in lines)
        if best is None or m < best[0]:
            best = (m, lines)
    return best[1] if best else [" ".join(words)]


def _greedy(words: list[str], size: float, max_px: float, avg: float) -> list[str]:
    lines, cur = [], ""
    for w in words:
        cand = f"{cur} {w}".strip()
        if cur and text_px(cand, size, avg) > max_px:
            lines.append(cur)
            cur = w
        else:
            cur = cand
    if cur:
        lines.append(cur)
    return lines


def fit_font_size(text: str, max_px: float, ceiling: int, floor: int, avg_glyph_em: float = AVG_GLYPH_EM) -> Fit:
    """The largest size in [floor, ceiling] (FIT_STEP px apart) at which the
    text wraps into at most two lines inside max_px, lines estimated as
    len * size * avg_glyph_em and split at the most balanced space. When even
    the floor needs three lines, three balanced lines at the floor (fits=False),
    and more if it still does not fit."""
    words = text.split()
    if not words:
        return Fit(int(ceiling), [], True)
    ceiling, floor = int(ceiling), int(floor)
    sizes = list(range(ceiling, floor, -FIT_STEP)) + [floor] if ceiling >= floor else [floor]
    for size in sizes:
        for n in (1, 2):
            lines = _balanced(words, n)
            if len(lines) == n and max(text_px(line, size, avg_glyph_em) for line in lines) <= max_px:
                return Fit(size, lines, True)
    lines = _balanced(words, 3)
    if len(lines) == 3 and max(text_px(line, floor, avg_glyph_em) for line in lines) <= max_px:
        return Fit(floor, lines, False)
    return Fit(floor, _greedy(words, floor, max_px, avg_glyph_em), False)


def fit_warning(hook_text: str | None, payoff_text: str | None, style: str = "karaoke", orientation: str = "portrait") -> str | None:
    """'hook needs 3 lines' / 'payoff needs 3 lines' when a block cannot fit two lines at its floor."""
    hp = hp_sizes(style)
    out = []
    for kind, text, ceil, floor in (("hook", hook_text, hp["hook"], hp["hook_floor"]), ("payoff", payoff_text, hp["payoff"], hp["payoff_floor"])):
        text = (text or "").strip()
        if not text:
            continue
        fit = fit_font_size(text, max_text_px(orientation), ceil, floor)
        if not fit.fits:
            out.append(f"{kind} needs {len(fit.lines)} lines")
    return "; ".join(out) or None


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


def _style_line(name, s, size, outline, shadow, align, ml, mr, mv, primary=None, secondary=None, bold=None):
    return (f"Style: {name},Arial,{size},{primary or s['primary']},{secondary or s['secondary']},"
            f"&H00101317,{s['back']},{s['bold'] if bold is None else bold},0,0,0,100,100,1,0,1,"
            f"{_num(outline)},{_num(shadow)},{align},{ml},{mr},{mv},1\n")


def _ass_header(position, style="karaoke", orientation="portrait"):
    align, ml, mr, mv = safe_margins(position, orientation)
    _, _, _, top = safe_margins("top", orientation)
    play_w, play_h = CAPTION_CANVAS.get(orientation, CAPTION_CANVAS["portrait"])
    s = CAPTION_STYLES.get(style, CAPTION_STYLES["karaoke"])
    hp = hp_sizes(style)
    return (
        "[Script Info]\nScriptType: v4.00+\n"
        f"PlayResX: {play_w}\nPlayResY: {play_h}\nWrapStyle: 0\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
        "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
        "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding\n"
        + _style_line("Cap", s, s["size"], s["outline"], s["shadow"], align, ml, mr, mv)
        + _style_line("Hook", s, hp["hook"], hp["outline"], hp["shadow"], 8, ml, mr, top, HP_COLOUR, HP_COLOUR, 1)
        + _style_line("Payoff", s, hp["payoff"], hp["outline"], hp["shadow"], 5, ml, mr, 0, HP_COLOUR, HP_COLOUR, 1)
        + "\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, "
        "MarginV, Effect, Text\n"
    )


def _style_word(style, word):
    return word.upper() if CAPTION_STYLES[style]["upper"] else word


# ---- hook / payoff ----------------------------------------------------------------

def _fitted(text: str, kind: str, style: str, orientation: str) -> tuple[str, int, int, bool]:
    """(escaped ASS text with \\N, chosen size, line count, fits) for a hook or payoff."""
    hp = hp_sizes(style)
    ceil, floor = (hp["hook"], hp["hook_floor"]) if kind == "Hook" else (hp["payoff"], hp["payoff_floor"])
    fit = fit_font_size(text, max_text_px(orientation), ceil, floor)
    return "\\N".join(_ass_escape(line) for line in fit.lines), fit.size, len(fit.lines), fit.fits


def hook_payoff_events(hook_text: str | None, payoff_text: str | None, peak_out_s: float | None,
                       duration_out: float | None, style: str = "karaoke", orientation: str = "portrait") -> list[dict]:
    """Hook: 0 → min(3.0, peak − 0.5) (0 → 3.0 without a peak). Payoff: peak →
    peak + 1.8, clamped to the clip; none without a peak. Times are output
    (clip-relative) seconds. Each event: {start, end, style, text, fs, lines, fits}
    with the font size chosen by fit_font_size for the orientation's text width."""
    out = []
    hook = (hook_text or "").strip()
    if hook:
        end = HOOK_MAX_S if peak_out_s is None else min(HOOK_MAX_S, float(peak_out_s) - HOOK_GAP_S)
        if duration_out is not None:
            end = min(end, float(duration_out))
        if end > 0.1:
            text, fs, n, fits = _fitted(hook, "Hook", style, orientation)
            out.append({"start": 0.0, "end": round(end, 3), "style": "Hook", "text": text, "fs": fs, "lines": n, "fits": fits})
    payoff = (payoff_text or "").strip()
    if payoff and peak_out_s is not None:
        start = max(0.0, float(peak_out_s))
        end = start + PAYOFF_S
        if duration_out is not None:
            end = min(end, float(duration_out))
        if end - start > 0.1:
            text, fs, n, fits = _fitted(payoff, "Payoff", style, orientation)
            out.append({"start": round(start, 3), "end": round(end, 3), "style": "Payoff", "text": text, "fs": fs, "lines": n, "fits": fits})
    return out


def _hp_dialogue(ev: dict) -> str:
    return f"Dialogue: 2,{_ass_time(ev['start'])},{_ass_time(ev['end'])},{ev['style']},,0,0,0,,{{\\fs{ev['fs']}}}{ev['text']}"


def _covered(start: float, end: float, windows: list[tuple[float, float]]) -> bool:
    return any(start < w1 and end > w0 for w0, w1 in windows)


def _hp_block(hook_text, payoff_text, peak_out_s, duration_out, style, orientation, suppress):
    """(hook/payoff events, windows to suppress regular captions in)."""
    hp = hook_payoff_events(hook_text, payoff_text, peak_out_s, duration_out, style, orientation)
    windows = [(e["start"], e["end"]) for e in hp] if suppress else []
    return hp, windows


def write_overlay_ass(hook_text, payoff_text, peak_out_s, duration_out, out_path,
                      position="bottom", style="karaoke", orientation="portrait"):
    """Hook / payoff only (captions off in the recipe). Returns the event count."""
    if style not in CAPTION_STYLES:
        style = "karaoke"
    hp = hook_payoff_events(hook_text, payoff_text, peak_out_s, duration_out, style, orientation)
    Path(out_path).write_text(_ass_header(position, style, orientation) + "\n".join(_hp_dialogue(e) for e in hp) + "\n",
                              encoding="utf-8")
    return len(hp)


# ---- regular captions -------------------------------------------------------------

def write_captions_ass(transcript, clip_start, clip_end, out_path,
                       max_words=4, max_gap=0.8, position="bottom",
                       style="karaoke", orientation="portrait",
                       hook_text=None, payoff_text=None, peak_out_s=None, suppress_during_hook_payoff=True):
    """Transcript captions for the chosen style and orientation, plus the hook
    and payoff blocks. Word times are shifted so 0 = clip_start; `peak_out_s`
    is already clip-relative. Returns the event count."""
    if style not in CAPTION_STYLES:
        style = "karaoke"
    words = [
        w for seg in transcript["segments"] for w in seg["words"]
        if w["s"] < clip_end and w["e"] > clip_start and w["w"]
    ]
    hp, windows = _hp_block(hook_text, payoff_text, peak_out_s, clip_end - clip_start, style, orientation, suppress_during_hook_payoff)
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
        if end <= start or _covered(start, end, windows):
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
    events.extend(_hp_dialogue(e) for e in hp)

    Path(out_path).write_text(
        _ass_header(position, style, orientation) + "\n".join(events) + "\n", encoding="utf-8"
    )
    return len(events)


def write_manual_captions_ass(manual, clip_start, clip_end, out_path,
                              position="bottom", style="karaoke",
                              orientation="portrait",
                              hook_text=None, payoff_text=None, peak_out_s=None, suppress_during_hook_payoff=True):
    """Hand-typed captions: each item is {text, start, duration}. Karaoke and
    typewriter pace the words at `speed` words/sec, then the line holds until
    its duration ends. Times are shifted so 0 = clip_start. Hook / payoff
    blocks as in write_captions_ass."""
    if style not in CAPTION_STYLES:
        style = "karaoke"
    speed = max(float(manual.get("speed") or 2.5), 0.5)
    hp, windows = _hp_block(hook_text, payoff_text, peak_out_s, clip_end - clip_start, style, orientation, suppress_during_hook_payoff)
    events = []
    for item in manual.get("items", []):
        text = str(item.get("text", "")).strip()
        i_start = float(item["start"])
        i_end = i_start + max(float(item.get("duration") or 0), 0.5)
        if not text or i_start >= clip_end or i_end <= clip_start:
            continue
        start = max(i_start, clip_start) - clip_start
        end = min(i_end, clip_end) - clip_start
        if end - start < 0.2 or _covered(start, end, windows):
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
    events.extend(_hp_dialogue(e) for e in hp)
    Path(out_path).write_text(
        _ass_header(position, style, orientation) + "\n".join(events) + "\n", encoding="utf-8"
    )
    return len(events)


def subtitles_filter_path(p):
    """Escape a path for ffmpeg's subtitles= filter (Windows-safe)."""
    p = str(p).replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
    return f"subtitles=filename='{p}'"
