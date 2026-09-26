"""worker.toml loader.

Lookup order: --config argument, $YT_WORKER_CONFIG, ./worker.toml.
See worker/examples/*.toml for per-machine templates.
"""

from __future__ import annotations

import os
import tomllib
from dataclasses import dataclass, field
from pathlib import Path

from worker.core.transcribe import WhisperConfig


@dataclass
class WorkerConfig:
    name: str
    capabilities: list[str]
    database_url: str
    brain_url: str
    api_secret: str = ""
    ffmpeg_path: str = "ffmpeg"
    work_dir: Path = field(default_factory=lambda: Path("work"))
    os_name: str | None = None
    poll_interval: float = 3.0
    heartbeat_interval: float = 15.0
    whisper: WhisperConfig = field(default_factory=WhisperConfig)
    path: Path | None = None

    @property
    def job_types(self) -> list[str]:
        # Capability == job type for now (transcribe, render, download, noop, ...).
        return list(self.capabilities)


def _find_path(explicit: str | None) -> Path:
    candidates = [explicit, os.environ.get("YT_WORKER_CONFIG"), "worker.toml"]
    for c in candidates:
        if c and Path(c).is_file():
            return Path(c)
    raise SystemExit(
        "No worker.toml found. Pass --config PATH, set YT_WORKER_CONFIG, or copy "
        "worker/examples/<machine>.toml to ./worker.toml"
    )


def load_config(explicit: str | None = None) -> WorkerConfig:
    path = _find_path(explicit)
    with path.open("rb") as fh:
        raw = tomllib.load(fh)

    missing = [k for k in ("name", "capabilities", "database_url", "brain_url") if k not in raw]
    if missing:
        raise SystemExit(f"{path}: missing required keys: {', '.join(missing)}")

    w = raw.get("whisper", {})
    whisper = WhisperConfig(
        model=w.get("model", "small"),
        device=w.get("device", "cpu"),
        compute_type=w.get("compute_type", "int8"),
        language=w.get("language"),
        beam_size=int(w.get("beam_size", 5)),
    )

    work_dir = Path(raw.get("work_dir", "work")).expanduser()
    if not work_dir.is_absolute():
        work_dir = path.parent / work_dir

    return WorkerConfig(
        name=raw["name"],
        capabilities=list(raw["capabilities"]),
        database_url=raw["database_url"],
        brain_url=raw["brain_url"].rstrip("/"),
        api_secret=raw.get("api_secret", ""),
        ffmpeg_path=raw.get("ffmpeg_path", "ffmpeg"),
        work_dir=work_dir,
        os_name=raw.get("os"),
        poll_interval=float(raw.get("poll_interval", 3.0)),
        heartbeat_interval=float(raw.get("heartbeat_interval", 15.0)),
        whisper=whisper,
        path=path,
    )
