"""Worker configuration.

Sources, in order: --config PATH, $YT_WORKER_CONFIG, ./worker.toml, or — with
no file at all — environment variables (YT_WORKER_NAME, YT_WORKER_CAPABILITIES,
YT_WORKER_DATABASE_URL, ...) so the brain's compose worker needs no toml.
See worker/examples/*.toml for per-machine templates.
"""

from __future__ import annotations

import os
import tomllib
from dataclasses import dataclass, field
from pathlib import Path

from worker.core.encoders import ENCODERS
from worker.core.transcribe import WhisperConfig


@dataclass
class WorkerConfig:
    name: str
    capabilities: list[str]
    database_url: str
    brain_url: str
    api_secret: str = ""
    fallback: list[str] = field(default_factory=list)   # first-time seed only, like capabilities
    ffmpeg_path: str = "ffmpeg"
    encoder: str = "libx264"
    work_dir: Path = field(default_factory=lambda: Path("work"))
    library_dir: Path | None = None       # set when the library is mounted locally (the brain)
    cookies_file: Path | None = None
    os_name: str | None = None
    poll_interval: float = 3.0
    heartbeat_interval: float = 15.0
    whisper: WhisperConfig = field(default_factory=WhisperConfig)
    path: Path | None = None

    @property
    def job_types(self) -> list[str]:
        # Capability == job type (transcribe, render, download, scenes, ...).
        return list(self.capabilities)


def _find_path(explicit: str | None) -> Path | None:
    for c in (explicit, os.environ.get("YT_WORKER_CONFIG"), "worker.toml"):
        if c and Path(c).is_file():
            return Path(c)
    if explicit:
        raise SystemExit(f"config file not found: {explicit}")
    return None


def _from_env() -> dict:
    p = "YT_WORKER_"
    raw = {k[len(p):].lower(): v for k, v in os.environ.items() if k.startswith(p)}
    for key in ("capabilities", "fallback"):
        if key in raw:
            raw[key] = [c.strip() for c in raw[key].split(",") if c.strip()]
    whisper = {k[len("whisper_"):]: v for k, v in raw.items() if k.startswith("whisper_")}
    if whisper:
        raw["whisper"] = whisper
    return raw


def _build(raw: dict, base: Path, path: Path | None) -> WorkerConfig:
    missing = [k for k in ("name", "capabilities", "database_url", "brain_url") if not raw.get(k)]
    if missing:
        raise SystemExit(f"worker config: missing required keys: {', '.join(missing)}")

    w = raw.get("whisper", {})
    whisper = WhisperConfig(
        model=w.get("model", "small"),
        device=w.get("device", "cpu"),
        compute_type=w.get("compute_type", "int8"),
        language=w.get("language") or None,
        beam_size=int(w.get("beam_size", 5)),
    )

    def _path(v) -> Path | None:
        if not v:
            return None
        p = Path(str(v)).expanduser()
        return p if p.is_absolute() else base / p

    work_dir = _path(raw.get("work_dir")) or base / "work"
    library_dir = _path(raw.get("library_dir"))
    cookies = _path(raw.get("cookies_file"))
    if cookies is None:
        cand = (library_dir / ".config" / "cookies.txt") if library_dir else base / "cookies.txt"
        cookies = cand if cand.is_file() else None

    encoder = raw.get("encoder", "libx264")
    if encoder not in ENCODERS:
        raise SystemExit(f"worker config: encoder must be one of {', '.join(ENCODERS)}")

    # Gemini settings may live in the toml; core/gemini reads the environment.
    for key in ("gemini_api_key", "gemini_model"):
        if raw.get(key):
            os.environ.setdefault(key.upper(), str(raw[key]))

    return WorkerConfig(
        name=raw["name"],
        capabilities=list(raw["capabilities"]),
        fallback=list(raw.get("fallback") or []),
        database_url=raw["database_url"],
        brain_url=str(raw["brain_url"]).rstrip("/"),
        api_secret=raw.get("api_secret", ""),
        ffmpeg_path=raw.get("ffmpeg_path", "ffmpeg"),
        encoder=encoder,
        work_dir=work_dir,
        library_dir=library_dir,
        cookies_file=cookies,
        os_name=raw.get("os"),
        poll_interval=float(raw.get("poll_interval", 3.0)),
        heartbeat_interval=float(raw.get("heartbeat_interval", 15.0)),
        whisper=whisper,
        path=path,
    )


def load_config(explicit: str | None = None) -> WorkerConfig:
    path = _find_path(explicit)
    if path is not None:
        with path.open("rb") as fh:
            raw = tomllib.load(fh)
        return _build(raw, path.parent, path)
    raw = _from_env()
    if not raw:
        raise SystemExit(
            "No worker.toml found and no YT_WORKER_* environment. Pass --config PATH, "
            "set YT_WORKER_CONFIG, or copy worker/examples/<machine>.toml to ./worker.toml"
        )
    return _build(raw, Path.cwd(), None)
