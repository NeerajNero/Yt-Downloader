"""ffmpeg/ffprobe helpers shared by the core modules.

`Tools` carries the configured binaries (worker.toml `ffmpeg_path`; ffprobe is
assumed to sit next to it). `run_progress` runs an ffmpeg command that emits
`-progress pipe:1`, calling `report()` with a percentage and killing the process
when `should_cancel()` flips.
"""

from __future__ import annotations

import json
import os
import subprocess
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from .errors import Cancelled

Report = Callable[[float | None, str | None], None]
ShouldCancel = Callable[[], bool]

MEDIA_EXTS = {".mkv", ".mp4", ".webm", ".m4a", ".mov", ".mp3", ".opus"}
IMAGE_EXTS = {".webp", ".jpg", ".jpeg", ".png"}


@dataclass(frozen=True)
class Tools:
    ffmpeg: str = "ffmpeg"

    @property
    def ffprobe(self) -> str:
        p = Path(self.ffmpeg)
        if p.name.lower().startswith("ffmpeg") and p.parent != Path("."):
            exe = ".exe" if p.suffix.lower() == ".exe" else ""
            cand = p.parent / f"ffprobe{exe}"
            if cand.is_file():
                return str(cand)
        return "ffprobe"

    @property
    def ffmpeg_dir(self) -> str | None:
        p = Path(self.ffmpeg)
        return str(p.parent) if p.parent != Path(".") else None

    # ---- probes ----------------------------------------------------------

    def probe_duration(self, src) -> float | None:
        out = subprocess.run(
            [self.ffprobe, "-v", "error", "-show_entries", "format=duration",
             "-of", "default=nw=1:nk=1", str(src)],
            capture_output=True, text=True,
        ).stdout.strip()
        try:
            return float(out)
        except ValueError:
            return None

    def probe_fps(self, src) -> float:
        out = subprocess.run(
            [self.ffprobe, "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", str(src)],
            capture_output=True, text=True,
        ).stdout.strip()
        try:
            num, den = out.split("/")
            fps = float(num) / float(den)
            return fps if fps > 0 else 30.0
        except (ValueError, ZeroDivisionError):
            return 30.0

    def probe_dims(self, src) -> tuple[int, int]:
        out = subprocess.run(
            [self.ffprobe, "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=width,height", "-of", "csv=p=0", str(src)],
            capture_output=True, text=True,
        ).stdout.strip().split(",")
        return int(out[0]), int(out[1])

    def probe_local(self, src) -> dict:
        """ffprobe metadata for a local media file (v1 `probe_local`)."""
        src = Path(src)
        out = subprocess.run(
            [self.ffprobe, "-v", "error", "-print_format", "json",
             "-show_format", "-show_streams", str(src)],
            capture_output=True, text=True,
        )
        if out.returncode != 0:
            raise RuntimeError("ffprobe can't read that file — is it a video?")
        info = json.loads(out.stdout)
        video = next((s for s in info.get("streams", []) if s.get("codec_type") == "video"), {})
        duration = info.get("format", {}).get("duration")
        return {
            "title": src.stem,
            "duration": float(duration) if duration else None,
            "width": video.get("width"),
            "height": video.get("height"),
            "vcodec": video.get("codec_name"),
            "size": src.stat().st_size,
        }

    def has_subtitles_filter(self) -> bool:
        """True if this ffmpeg build can burn captions (libass subtitles filter)."""
        try:
            out = subprocess.run([self.ffmpeg, "-hide_banner", "-filters"],
                                 capture_output=True, text=True, timeout=15).stdout
            return " subtitles " in out
        except (OSError, subprocess.TimeoutExpired):
            return False

    def has_encoder(self, name: str) -> bool:
        try:
            out = subprocess.run([self.ffmpeg, "-hide_banner", "-encoders"],
                                 capture_output=True, text=True, timeout=15).stdout
            return f" {name} " in out
        except (OSError, subprocess.TimeoutExpired):
            return False

    def thumbnail(self, src, out, at: float, width: int = 640) -> None:
        subprocess.run(
            [self.ffmpeg, "-ss", str(at), "-i", str(src), "-frames:v", "1",
             "-vf", f"scale={width}:-2", "-q:v", "4", "-y", "-loglevel", "error", str(out)],
            capture_output=True,
        )

    # ---- progress runner ---------------------------------------------------

    def run_progress(self, cmd: list[str], duration: float | None, report: Report,
                     should_cancel: ShouldCancel, note: str | None = None,
                     stderr_sink: Callable[[str], None] | None = None) -> None:
        """Run an ffmpeg command carrying `-progress pipe:1 -nostats`.

        Reports percent from out_time_us / duration. Raises Cancelled (after
        killing ffmpeg) or RuntimeError with ffmpeg's stderr tail.
        """
        creation = {}
        if os.name == "nt":
            creation["creationflags"] = subprocess.CREATE_NO_WINDOW  # type: ignore[attr-defined]
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                text=True, **creation)
        stderr_lines: list[str] = []

        def _drain():
            for line in proc.stderr:  # type: ignore[union-attr]
                stderr_lines.append(line)
                if stderr_sink:
                    stderr_sink(line)
        reader = threading.Thread(target=_drain, daemon=True)
        reader.start()

        cancelled = False
        stop = threading.Event()

        def _cancel_watch():
            while not stop.wait(0.5):
                if should_cancel():
                    try:
                        proc.kill()
                    except OSError:
                        pass
                    return
        watch = threading.Thread(target=_cancel_watch, daemon=True)
        watch.start()

        try:
            for line in proc.stdout:  # type: ignore[union-attr]
                line = line.strip()
                if line.startswith("out_time_us=") and duration:
                    value = line.split("=", 1)[1]
                    try:
                        report(min(int(value) / 1_000_000 / duration * 100, 100.0), note)
                    except ValueError:
                        pass  # ffmpeg emits "N/A" early on
            code = proc.wait()
        finally:
            stop.set()
            reader.join(timeout=5)
            cancelled = should_cancel()
        if cancelled:
            raise Cancelled()
        if code != 0:
            tail = "".join(stderr_lines).strip()
            raise RuntimeError(tail[-800:] or f"ffmpeg exited with code {code}")
