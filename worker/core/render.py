"""Shorts/clip export — ported from v1 `run_export` + filter builders
(server/downloader.py). The tuned filter graphs are kept verbatim; what changed:

* paths are explicit inputs (source, output, music) — no sidecar lookups
* transcript / manual captions are passed in as dicts
* the encoder comes from `encoders.video_args()` instead of hardcoded libx264
* progress/cancel go through `report()` / `should_cancel()`
"""

from __future__ import annotations

import os
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

from . import encoders
from .captions import (CAPTION_POS_NAMES, CAPTION_STYLES, subtitles_filter_path,
                       write_captions_ass, write_manual_captions_ass)
from .ffmpeg import Report, ShouldCancel, Tools


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


# HDR look — strong local contrast (clarity) via a wide-radius unsharp, plus
# gentle global contrast and saturation. `sharp` (0-100) scales the sharpening.
def _hdr_filter(sharp=60):
    amount = round(0.5 + (sharp / 100.0) * 1.9, 2)   # 0.5 .. 2.4
    return (f"unsharp=7:7:{amount}:7:7:0.0,"
            "eq=contrast=1.09:saturation=1.15:gamma=0.98")


LOOKS = {"none", "hdr"}


def _look_filter(look, sharp=50):
    if look == "hdr":
        return _hdr_filter(sharp)
    return ""


# Cinematic colour grades — tasteful film looks via real colour tools
# (colorbalance shadows/mids/highlights + eq). colorbalance ranges are -1..1.
GRADES = {
    "none": "",
    "teal_orange": ("colorbalance=rs=-0.08:bs=0.10:rh=0.12:bh=-0.10,"
                    "eq=contrast=1.06:saturation=1.12"),
    "moody": ("colorbalance=rs=-0.05:gs=0.02:bs=0.10:rm=-0.03:bm=0.05,"
              "eq=contrast=1.09:saturation=0.82:brightness=-0.03"),
    "warm": ("colorbalance=rs=0.07:rm=0.06:rh=0.09:bs=-0.05:bh=-0.07,"
             "eq=saturation=1.08"),
    "cool": ("colorbalance=rs=-0.06:bs=0.09:rh=-0.05:bh=0.09,"
             "eq=saturation=1.05"),
    "bw": "hue=s=0,eq=contrast=1.14",
}


def _grade_filter(grade):
    return GRADES.get(grade, "")


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


def _punch_filter(width, height, fps, duration, markers, base_target=None):
    """Punch-in zoom markers (recipe feature): at each marker's time (clip-
    relative seconds) the frame snaps to `zoom` for `duration` seconds with a
    60 ms ease-in, then snaps back. Optionally rides on top of the slow
    Ken-Burns ramp (`base_target`). One zoompan pass, time-driven (in_time)."""
    terms = []
    for m in markers:
        at = max(0.0, float(m["at"]))
        dur = max(0.1, float(m.get("duration", 0.5)))
        z = max(1.0, min(float(m.get("zoom", 1.15)), 3.0))
        terms.append(f"({z - 1:.4f}*between(in_time,{at:.3f},{at + dur:.3f})"
                     f"*min(1,(in_time-{at:.3f})/0.06))")
    base = f"1+{base_target - 1:.4f}*min(1,in_time/{max(duration or 1, 0.1):.3f})" if base_target else "1"
    expr = base + ("+" + "+".join(terms) if terms else "")
    return (
        f"zoompan=z='{expr}':d=1:"
        f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
        f"fps={fps:.4f}:s={width}x{height}"
    )


WATERMARK_POSITIONS = {
    "top_left": "{m}:{m}",
    "top_right": "W-w-{m}:{m}",
    "bottom_left": "{m}:H-h-{m}",
    "bottom_right": "W-w-{m}:H-h-{m}",
    "top_center": "(W-w)/2:{m}",
    "bottom_center": "(W-w)/2:H-h-{m}",
}


def _watermark_chain(width, height, wm: dict, in_label: str, wm_input: int) -> tuple[str, str]:
    """Overlay an image (logo/handle) on the framed video. Returns
    (graph_fragment, out_label). Scale is a fraction of the frame width."""
    scale = max(0.03, min(float(wm.get("scale", 0.15)), 0.6))
    opacity = max(0.05, min(float(wm.get("opacity", 0.85)), 1.0))
    margin = int(max(0, float(wm.get("margin", 0.03))) * min(width, height))
    pos = WATERMARK_POSITIONS.get(wm.get("position", "top_right"), WATERMARK_POSITIONS["top_right"]).format(m=margin)
    frag = (f"[{wm_input}:v]format=rgba,scale={int(width * scale)}:-1,"
            f"colorchannelmixer=aa={opacity:.3f}[wm];"
            f"[{in_label}][wm]overlay={pos}:format=auto[vwm]")
    return frag, "vwm"


def _pre_crop(trim_x, trim_y):
    """Symmetric border trim before styling; even dimensions for yuv420."""
    if not trim_x and not trim_y:
        return None
    w = f"trunc(iw*{(100 - 2 * trim_x) / 100:.4f}/2)*2"
    h = f"trunc(ih*{(100 - 2 * trim_y) / 100:.4f}/2)*2"
    return f"crop={w}:{h}"


RESOLUTIONS = {"1080", "4k"}
ORIENTATIONS = {"portrait", "landscape"}
STYLES = {"crop", "blur"}
ZOOMS = {"none", "in"}
CAPTION_SOURCES = {"auto", "manual"}


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


def export_filter(style, vivid_amount, trim_x=0.0, trim_y=0.0, fg_crop=0.0,
                  width=1080, height=1920, rotate="none", look="none",
                  look_sharp=50, grade="none"):
    rot = _ROTATE_FILTER.get(rotate)
    pre = _pre_crop(trim_x, trim_y)
    # Source-prep chain applied first: rotate, then border trim.
    prep = ",".join(p for p in (rot, pre) if p)
    # Grade chain: vivid boost, then colour grade, then the stylized look.
    grade_parts = []
    if vivid_amount:
        grade_parts.append(_vivid_filter(vivid_amount))
    grade_f = _grade_filter(grade)
    if grade_f:
        grade_parts.append(grade_f)
    look_f = _look_filter(look, look_sharp)
    if look_f:
        grade_parts.append(look_f)
    grade_chain = ("," + ",".join(grade_parts)) if grade_parts else ""
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
        fg += grade_chain
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
    vf += grade_chain
    return vf


@dataclass
class RenderSettings:
    """The v1 ExportBody shape (minus `path`); also the render job payload."""
    start: float
    end: float
    style: str = "blur"
    vivid_amount: int = 0
    trim_x: float = 0.0
    trim_y: float = 0.0
    fg_crop: float = 0.0
    captions: bool = False
    caption_source: str = "auto"
    caption_pos: str = "bottom"
    caption_style: str = "karaoke"
    resolution: str = "1080"
    orientation: str = "portrait"
    rotate: str = "none"
    rotate_captions: bool = False
    loudness: bool = False
    zoom: str = "none"
    look: str = "none"
    look_sharp: int = 50
    grade: str = "none"
    music: str = ""            # music track file name (resolved by the adapter)
    music_gain: int = 60
    duck: bool = True
    # Recipe-only extras (Phase 3). All optional; files are resolved by the adapter.
    watermark: dict | None = None      # {"file", "position", "scale", "opacity", "margin"}
    sfx: list = field(default_factory=list)          # [{"file", "at", "gain"}] clip-relative seconds
    zoom_markers: list = field(default_factory=list) # [{"at", "duration", "zoom"}]
    extra: dict = field(default_factory=dict)

    def validate(self) -> None:
        if self.style not in STYLES:
            raise ValueError("Style must be 'crop' or 'blur'.")
        if self.start < 0 or self.end <= self.start:
            raise ValueError("End time must be after start time.")
        if not (0 <= self.trim_x <= 40 and 0 <= self.trim_y <= 40):
            raise ValueError("Trim must be between 0 and 40 percent.")
        if not (0 <= self.fg_crop <= 40):
            raise ValueError("Video crop must be between 0 and 40 percent.")
        if self.caption_source not in CAPTION_SOURCES:
            raise ValueError("Caption source must be 'auto' or 'manual'.")
        if self.caption_pos not in CAPTION_POS_NAMES:
            raise ValueError("Caption position must be bottom, middle, or top.")
        if self.orientation not in ORIENTATIONS:
            raise ValueError("Orientation must be portrait or landscape.")
        if self.rotate not in ROTATIONS:
            raise ValueError("Rotate must be none, right, left, or 180.")
        if self.zoom not in ZOOMS:
            raise ValueError("Zoom must be none or in.")
        if self.look not in LOOKS:
            raise ValueError("Look must be none or hdr.")
        if not (0 <= self.look_sharp <= 100):
            raise ValueError("Look sharpness must be between 0 and 100.")
        if self.grade not in GRADES:
            raise ValueError("Unknown colour grade.")
        if self.caption_style not in CAPTION_STYLES:
            raise ValueError("Caption style must be one of: " + ", ".join(CAPTION_STYLES))
        if self.resolution not in RESOLUTIONS:
            raise ValueError("Resolution must be one of: " + ", ".join(RESOLUTIONS))
        if not (0 <= self.vivid_amount <= 100):
            raise ValueError("Vivid amount must be between 0 and 100.")


def output_name(stem: str, s: RenderSettings, has_music: bool) -> str:
    """v1's descriptive output filename: <stem>_9x16_12s-40s_blur_vivid60_cap.mp4"""
    amount = int(s.vivid_amount)
    suffix = f"_vivid{amount}" if amount else ""
    if s.trim_x or s.trim_y:
        suffix += "_trim"
    if s.fg_crop:
        suffix += f"_z{int(s.fg_crop)}"
    if s.captions:
        suffix += "_cap"
        if s.caption_source == "manual":
            suffix += "m"
        if s.caption_style != "karaoke":
            suffix += f"-{s.caption_style[:4]}"
        if s.caption_pos != "bottom":
            suffix += f"-{s.caption_pos[:3]}"
    if s.resolution != "1080":
        suffix += f"_{s.resolution}"
    if s.rotate != "none":
        suffix += f"_rot{s.rotate}"
        if s.rotate_captions:
            suffix += "cap"
    if s.zoom != "none":
        suffix += "_zoom"
    if s.look != "none":
        suffix += f"_{s.look}"
    if s.grade != "none":
        suffix += f"_{s.grade}"
    if s.loudness:
        suffix += "_norm"
    if has_music:
        suffix += "_music"
    if s.watermark:
        suffix += "_wm"
    if s.sfx:
        suffix += "_sfx"
    if s.zoom_markers:
        suffix += f"_punch{len(s.zoom_markers)}"
    aspect = "16x9" if s.orientation == "landscape" else "9x16"
    return f"{stem}_{aspect}_{int(s.start)}s-{int(s.end)}s_{s.style}{suffix}.mp4"


def run_export(src: Path, out_path: Path, s: RenderSettings, tools: Tools, encoder: str,
               report: Report, should_cancel: ShouldCancel,
               transcript: dict | None = None, manual_captions: dict | None = None,
               music_path: Path | None = None, watermark_path: Path | None = None,
               sfx_paths: list[tuple[Path, float, float]] | None = None) -> Path:
    """Render one clip (portrait 9:16 or landscape 16:9) to `out_path`.
    `sfx_paths` = [(file, at_seconds, gain_0_100)]. Raises Cancelled /
    RuntimeError. Returns out_path."""
    s.validate()
    src = Path(src)
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    start, end = float(s.start), float(s.end)
    amount = int(s.vivid_amount)

    final_w, final_h = _dims(s.resolution, s.orientation)
    match_rotate = bool(s.rotate_captions) and s.rotate != "none"
    if match_rotate:
        # Build the whole frame (video + captions) in the pre-rotation
        # orientation, then rotate the composite so captions rotate WITH the
        # video. 90° swaps the build dims + caption canvas; 180° keeps them.
        if s.rotate in ("right", "left"):
            build_w, build_h = final_h, final_w
            build_orient = "landscape" if s.orientation == "portrait" else "portrait"
        else:
            build_w, build_h = final_w, final_h
            build_orient = s.orientation
        source_rotate, composite_rotate = "none", s.rotate
    else:
        build_w, build_h = final_w, final_h
        build_orient = s.orientation
        source_rotate, composite_rotate = s.rotate, "none"

    filt = export_filter(s.style, amount, s.trim_x, s.trim_y, s.fg_crop,
                         build_w, build_h, source_rotate, s.look, s.look_sharp, s.grade)
    # Zoom the framed video before captions/rotation so captions don't zoom.
    if s.zoom_markers:
        filt += "," + _punch_filter(build_w, build_h, tools.probe_fps(src), end - start, s.zoom_markers,
                                    base_target=1.12 if s.zoom == "in" else None)
    elif s.zoom == "in":
        filt += "," + _zoom_filter(build_w, build_h, tools.probe_fps(src), end - start)

    ass_file = None
    if s.captions:
        if not tools.has_subtitles_filter():
            raise RuntimeError("This ffmpeg build can't burn captions (no libass). "
                               "Use a full build (Gyan full on Windows, ffmpeg-full on macOS).")
        fd, ass_file = tempfile.mkstemp(suffix=".ass")
        os.close(fd)
        if s.caption_source == "manual":
            if not manual_captions:
                raise RuntimeError("No manual captions yet — add them in the caption editor.")
            n = write_manual_captions_ass(manual_captions, start, end, ass_file,
                                          position=s.caption_pos, style=s.caption_style,
                                          orientation=build_orient)
        else:
            if not transcript:
                raise RuntimeError("No transcript yet — run Transcribe first.")
            n = write_captions_ass(transcript, start, end, ass_file,
                                   position=s.caption_pos, style=s.caption_style,
                                   orientation=build_orient)
        if n > 0:
            filt += "," + subtitles_filter_path(ass_file)

    # Matched rotation: turn the finished frame (video + burned captions).
    if composite_rotate != "none":
        filt += "," + _ROTATE_FILTER[composite_rotate]

    loudnorm = "loudnorm=I=-14:TP=-1.5:LRA=11"
    inputs = ["-ss", str(start), "-to", str(end), "-i", str(src)]
    next_input = 1

    # ---- video graph: always a filter_complex ending in [v] ----------------
    vgraph = filt if s.style == "blur" else f"[0:v]{filt}"
    if watermark_path and Path(watermark_path).is_file() and s.watermark:
        vgraph += "[vbase];"
        frag, vlabel = _watermark_chain(final_w, final_h, s.watermark, "vbase", next_input)
        inputs += ["-i", str(watermark_path)]
        next_input += 1
        vgraph += frag.replace("[vwm]", "[v]")
    else:
        vgraph += "[v]"

    # ---- audio graph: source (+ ducked music bed) (+ sfx layers) -----------
    use_music = bool(music_path and Path(music_path).is_file())
    sfx_paths = [(p, at, g) for p, at, g in (sfx_paths or []) if Path(p).is_file()]
    aparts: list[str] = []
    mix_inputs = ["[0:a]"]
    if use_music:
        gain = round(max(0.0, min(s.music_gain, 100.0)) / 100.0 * 1.2, 3)
        inputs += ["-stream_loop", "-1", "-i", str(music_path)]
        aparts.append(f"[{next_input}:a]volume={gain}[mus]")
        next_input += 1
        if s.duck:
            # Duck the music under speech via sidechain compression.
            aparts.append("[mus][0:a]sidechaincompress=threshold=0.02:ratio=8:attack=15:release=350[duckmus]")
            mix_inputs.append("[duckmus]")
        else:
            mix_inputs.append("[mus]")
    for i, (p, at, g) in enumerate(sfx_paths):
        inputs += ["-i", str(p)]
        ms = int(max(0.0, at) * 1000)
        vol = round(max(0.0, min(g, 100.0)) / 100.0 * 1.5, 3)
        aparts.append(f"[{next_input}:a]adelay={ms}|{ms},volume={vol}[sfx{i}]")
        mix_inputs.append(f"[sfx{i}]")
        next_input += 1

    if len(mix_inputs) > 1:
        # v1's music mix used amix's default normalisation (2 inputs); with sfx
        # layers on top we keep the source at full level instead.
        norm = ":normalize=0" if sfx_paths else ""
        aparts.append("".join(mix_inputs) + f"amix=inputs={len(mix_inputs)}:duration=first:dropout_transition=0{norm}[amix]")
        aparts.append(f"[amix]{loudnorm}[a]" if s.loudness else "[amix]anull[a]")
        graph = vgraph + ";" + ";".join(aparts)
        av_args = ["-filter_complex", graph, "-map", "[v]", "-map", "[a]"]
    else:
        av_args = ["-filter_complex", vgraph, "-map", "[v]", "-map", "0:a?"] + (["-af", loudnorm] if s.loudness else [])

    cmd = [
        tools.ffmpeg, "-y", *inputs, *av_args,
        *encoders.video_args(encoder, "final"), *encoders.AUDIO_ARGS, *encoders.MP4_ARGS,
        "-progress", "pipe:1", "-nostats", "-loglevel", "error",
        str(out_path),
    ]
    try:
        tools.run_progress(cmd, end - start, report, should_cancel, note="rendering")
        return out_path
    except BaseException:
        out_path.unlink(missing_ok=True)
        raise
    finally:
        if ass_file:
            Path(ass_file).unlink(missing_ok=True)
