"""Settings. Everything comes from `.env` in the project root (gitignored; see
.env.example) or real environment variables — the environment wins. Nothing
else to configure: ffmpeg and the H.264 encoder are auto-detected unless set."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

from studio.core.encoders import ENCODERS
from studio.core.ffmpeg import Tools
from studio.core.transcribe import WhisperConfig

ROOT = Path(__file__).resolve().parent.parent


def load_dotenv(path: Path = ROOT / ".env") -> None:
    """KEY=VALUE lines into os.environ (existing variables win)."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        val = val.strip()
        if len(val) >= 2 and val[0] == val[-1] and val[0] in "'\"":
            val = val[1:-1]
        os.environ.setdefault(key.strip(), val)


def _truthy(v: str | None, default: bool) -> bool:
    if v is None or v == "":
        return default
    return v.strip().lower() in ("1", "true", "yes", "on")


def find_ffmpeg(explicit: str | None) -> str:
    """FFMPEG_PATH, else Homebrew ffmpeg-full (libass), else PATH, else WinGet's Gyan build."""
    if explicit:
        return explicit
    for cand in ("/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg", "/usr/local/opt/ffmpeg-full/bin/ffmpeg"):
        if Path(cand).is_file():
            return cand
    hit = shutil.which("ffmpeg")
    if hit:
        return hit
    if sys.platform == "win32":
        winget = Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "WinGet" / "Packages"
        if winget.is_dir():
            for exe in winget.rglob("ffmpeg.exe"):
                return str(exe)
        for cand in ("C:/ffmpeg/bin/ffmpeg.exe",):
            if Path(cand).is_file():
                return cand
    return "ffmpeg"


def encoder_works(tools: Tools, encoder: str) -> bool:
    """`ffmpeg -encoders` lists every encoder the build was compiled with, even
    when the GPU/driver isn't there — so try a 0.1 s encode."""
    if not tools.has_encoder(encoder):
        return False
    cmd = [tools.ffmpeg, "-v", "error", "-f", "lavfi", "-i", "color=black:s=128x128:d=0.2:r=30",
           "-c:v", encoder, "-f", "null", "-"]
    try:
        return subprocess.run(cmd, capture_output=True, timeout=30).returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False


def pick_encoder(explicit: str | None, tools: Tools) -> str:
    if explicit and explicit != "auto":
        if explicit not in ENCODERS:
            raise SystemExit(f"ENCODER must be one of {', '.join(ENCODERS)} (or auto)")
        return explicit
    prefs = {"win32": ["h264_amf", "h264_nvenc"], "darwin": ["h264_videotoolbox"]}.get(sys.platform, ["h264_nvenc"])
    for enc in prefs:
        if encoder_works(tools, enc):
            return enc
    return "libx264"


@dataclass(frozen=True)
class Settings:
    library_dir: Path
    work_dir: Path
    web_dist: Path
    host: str
    port: int
    ffmpeg_path: str
    encoder: str
    whisper: WhisperConfig
    cookies_file: Path | None
    open_browser: bool
    heavy_workers: int
    light_workers: int
    import_presets: bool = True

    @property
    def tools(self) -> Tools:
        return Tools(self.ffmpeg_path)


def load_settings() -> Settings:
    load_dotenv()
    env = os.environ.get

    def _path(v: str | None, default: str) -> Path:
        p = Path(v or default).expanduser()
        return (p if p.is_absolute() else ROOT / p).resolve()

    library_dir = _path(env("LIBRARY_DIR") or env("DOWNLOAD_DIR"), "downloads")
    ffmpeg_path = find_ffmpeg(env("FFMPEG_PATH"))
    tools = Tools(ffmpeg_path)
    encoder = pick_encoder(env("ENCODER"), tools)
    cookies = _path(env("COOKIES_FILE"), "cookies.txt")
    whisper = WhisperConfig(
        model=env("WHISPER_MODEL") or "small",
        device=env("WHISPER_DEVICE") or "cpu",
        compute_type=env("WHISPER_COMPUTE") or ("int8_float16" if (env("WHISPER_DEVICE") or "cpu") == "cuda" else "int8"),
        language=env("WHISPER_LANGUAGE") or None,
    )
    return Settings(
        library_dir=library_dir,
        work_dir=_path(env("WORK_DIR"), "work"),
        web_dist=ROOT / "web" / "dist",
        host=env("HOST") or "127.0.0.1",
        port=int(env("PORT") or 8765),
        ffmpeg_path=ffmpeg_path,
        encoder=encoder,
        whisper=whisper,
        cookies_file=cookies if cookies.is_file() else None,
        open_browser=_truthy(env("OPEN_BROWSER"), True),
        heavy_workers=max(1, int(env("HEAVY_JOBS") or 1)),
        light_workers=max(1, int(env("LIGHT_JOBS") or 2)),
    )
