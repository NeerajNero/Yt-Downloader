"""H.264 encoder arguments keyed by worker config — never hardcode libx264.

Profiles (what v1 used, now per-encoder):
  final : deliverable renders (v1: libx264 crf 18 preset medium)
  fast  : intermediates re-encoded later — clip packs, tighten (crf 18 veryfast)
  edit  : high-quality edit copy for Resolve (crf 16 preset slow)

AMF (RX 6750 XT) quality at the same bitrate is below libx264; it is the
default on the gaming PC for speed, and `-b:v`-free CQP keeps it predictable.
"""

from __future__ import annotations

ENCODERS = ("libx264", "h264_amf", "h264_nvenc", "h264_videotoolbox")

_X264 = {
    "final": ["-c:v", "libx264", "-crf", "18", "-preset", "medium"],
    "fast": ["-c:v", "libx264", "-crf", "18", "-preset", "veryfast"],
    "edit": ["-c:v", "libx264", "-crf", "16", "-preset", "slow"],
}
_AMF = {
    "final": ["-c:v", "h264_amf", "-usage", "transcoding", "-quality", "quality",
              "-rc", "cqp", "-qp_i", "18", "-qp_p", "20", "-qp_b", "22"],
    "fast": ["-c:v", "h264_amf", "-usage", "transcoding", "-quality", "speed",
             "-rc", "cqp", "-qp_i", "20", "-qp_p", "22", "-qp_b", "24"],
    "edit": ["-c:v", "h264_amf", "-usage", "transcoding", "-quality", "quality",
             "-rc", "cqp", "-qp_i", "16", "-qp_p", "18", "-qp_b", "20"],
}
_NVENC = {
    "final": ["-c:v", "h264_nvenc", "-preset", "p5", "-rc", "constqp", "-qp", "19"],
    "fast": ["-c:v", "h264_nvenc", "-preset", "p2", "-rc", "constqp", "-qp", "21"],
    "edit": ["-c:v", "h264_nvenc", "-preset", "p6", "-rc", "constqp", "-qp", "17"],
}
_VT = {  # macOS dev box
    "final": ["-c:v", "h264_videotoolbox", "-q:v", "65"],
    "fast": ["-c:v", "h264_videotoolbox", "-q:v", "55"],
    "edit": ["-c:v", "h264_videotoolbox", "-q:v", "75"],
}
_TABLE = {"libx264": _X264, "h264_amf": _AMF, "h264_nvenc": _NVENC, "h264_videotoolbox": _VT}


def video_args(encoder: str, profile: str = "final") -> list[str]:
    """ffmpeg video-encoder arguments for the configured encoder + profile.
    Always yuv420p (phones, browsers, YouTube)."""
    table = _TABLE.get(encoder)
    if table is None:
        raise ValueError(f"unknown encoder {encoder!r}; one of {', '.join(ENCODERS)}")
    if profile not in table:
        raise ValueError(f"unknown encode profile {profile!r}")
    return [*table[profile], "-pix_fmt", "yuv420p"]


AUDIO_ARGS = ["-c:a", "aac", "-b:a", "192k"]
MP4_ARGS = ["-movflags", "+faststart"]
