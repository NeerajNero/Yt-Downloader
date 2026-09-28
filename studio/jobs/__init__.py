"""Job adapters: `handle(ctx) -> result dict`, one module per job type.
Adapters resolve inputs, call a `studio.core` function with report/should_cancel,
write outputs next to the media and update the store. They never build ffmpeg
or whisper logic themselves.
"""

from __future__ import annotations

import importlib
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from studio.config import Settings
from studio.core.ffmpeg import Tools
from studio.library import Library, write_json_atomic
from studio.schemas import validate_payload
from studio.store import Store


@dataclass
class JobContext:
    job: dict[str, Any]
    settings: Settings
    store: Store
    lib: Library
    tools: Tools
    report: Callable[[float | None, str | None], None]
    should_cancel: Callable[[], bool]

    @property
    def id(self) -> str:
        return str(self.job["id"])

    @property
    def encoder(self) -> str:
        return self.settings.encoder

    @property
    def payload(self) -> dict[str, Any]:
        return validate_payload(self.job["type"], self.job.get("payload") or {})

    @property
    def cookies(self) -> str | None:
        return str(self.settings.cookies_file) if self.settings.cookies_file else None

    # ---- records --------------------------------------------------------------

    def video(self) -> dict[str, Any]:
        vid = self.job.get("video_id")
        if not vid:
            raise ValueError("job has no video")
        row = self.store.get_video(vid)
        if row is None:
            raise ValueError("video not found (removed from the library?)")
        return row

    @staticmethod
    def source_rel(video: dict) -> str:
        rel = video.get("storage_path")
        if not rel:
            raise ValueError("video has no file yet — download it first")
        return rel

    def folder_rel(self, video: dict) -> str:
        return self.lib.folder_rel(video)

    def stem(self, video: dict) -> str:
        return self.lib.stem(video)

    def sidecar_rel(self, video: dict, kind: str) -> str:
        return self.lib.sidecar_rel(video, kind)

    def source_file(self, video: dict) -> Path:
        p = self.lib.resolve(self.source_rel(video))
        if not p.is_file():
            raise FileNotFoundError(f"source file missing on disk: {video['storage_path']}")
        return p

    # ---- assets (files next to the media) ----------------------------------------

    def asset_json(self, video: dict, kind: str) -> dict | None:
        a = self.store.asset(video, kind)
        if a is None or not a.get("path"):
            return None
        return self.lib.read_json(a["path"])

    def put_json(self, rel: str, data: dict) -> str:
        return self.lib.put_json(rel, data)

    def register_asset(self, video: dict, kind: str, path: str | None = None, data: dict | None = None) -> None:
        """Assets exist when their file does. Data-only kinds (borders) get a sidecar."""
        if path is None and data is not None:
            write_json_atomic(self.lib.resolve(self.sidecar_rel(video, kind)), data)
        self.store.invalidate_assets(video["id"])

    # ---- scratch -----------------------------------------------------------------

    def job_dir(self) -> Path:
        return self.lib.job_dir(self.id)

    def cleanup(self) -> None:
        self.lib.cleanup(self.id)


Handler = Callable[[JobContext], dict[str, Any]]

JOB_TYPES = ["download", "transcribe", "scenes", "borders", "convert", "render",
             "clippack", "tighten", "suggest", "postkit", "style", "plan", "noop"]


def get_handler(job_type: str) -> Handler:
    if job_type not in JOB_TYPES:
        raise KeyError(f"no handler for job type {job_type!r}")
    return importlib.import_module(f"studio.jobs.{job_type}").handle
