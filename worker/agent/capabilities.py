"""What this machine can physically run, detected at startup. The Machines
page assigns job types from this list; the worker claims the intersection of
its assignment (DB) and this."""

from __future__ import annotations

import importlib.util
import os
import shutil

from worker.agent.config import WorkerConfig
from worker.core.ffmpeg import Tools

ALL_JOB_TYPES = ["download", "transcribe", "scenes", "borders", "convert", "render",
                 "clippack", "tighten", "suggest", "postkit", "style", "plan", "noop"]

FFMPEG_JOBS = ["scenes", "borders", "convert", "render", "clippack", "tighten"]


def detect_supported(cfg: WorkerConfig) -> list[str]:
    have: list[str] = ["noop"]
    tools = Tools(cfg.ffmpeg_path)
    ffmpeg_ok = shutil.which(cfg.ffmpeg_path) is not None or os.path.isfile(cfg.ffmpeg_path)
    if ffmpeg_ok:
        have += FFMPEG_JOBS
        if not tools.has_subtitles_filter():
            pass  # render still works, captions will error with a clear message
    if importlib.util.find_spec("yt_dlp") is not None and ffmpeg_ok:
        have.append("download")
    if importlib.util.find_spec("faster_whisper") is not None:
        have.append("transcribe")
    if os.environ.get("GEMINI_API_KEY") and ffmpeg_ok:
        have += ["suggest", "postkit", "plan"]
        if "download" in have:
            have.append("style")
    return [t for t in ALL_JOB_TYPES if t in have]
