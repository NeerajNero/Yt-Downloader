"""Job adapters: `handle(ctx) -> result dict`. One module per job type; the
registry maps `jobs.type` to the handler. Adapters resolve inputs (via
Storage), call a `worker.core` function with report/should_cancel, store the
outputs, and register `assets` / `clips` rows. They never build ffmpeg or
whisper logic themselves.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from worker.agent.config import WorkerConfig
from worker.agent.db import Db
from worker.agent.storage import Storage
from worker.core.ffmpeg import Tools

from .schemas import validate_payload

SIDECAR_SUFFIX = {
    "transcript": ".transcript.json",
    "scenes": ".scenes.json",
    "captions": ".captions.json",
    "suggestions": ".suggestions.json",
    "postkit": ".postkit.json",
}


@dataclass
class JobContext:
    job: dict[str, Any]           # the claimed jobs row
    cfg: WorkerConfig
    db: Db
    storage: Storage
    tools: Tools
    report: Callable[[float | None, str | None], None]
    should_cancel: Callable[[], bool]

    @property
    def id(self) -> str:
        return str(self.job["id"])

    @property
    def encoder(self) -> str:
        return self.cfg.encoder

    @property
    def payload(self) -> dict[str, Any]:
        """The job payload, validated + defaults filled in."""
        return validate_payload(self.job["type"], self.job.get("payload") or {})

    # ---- rows ------------------------------------------------------------

    def video(self) -> dict[str, Any]:
        vid = self.job.get("video_id")
        if not vid:
            raise ValueError("job has no video_id")
        row = self.db.fetch_one("select * from videos where id = %s", (vid,))
        if row is None:
            raise ValueError(f"video {vid} not found")
        return row

    def source_rel(self, video: dict) -> str:
        rel = video.get("storage_path")
        if not rel:
            raise ValueError("video has no source file yet (storage_path is null)")
        return rel

    @staticmethod
    def folder_rel(video: dict) -> str:
        return Path(video["storage_path"]).parent.as_posix()

    @staticmethod
    def stem(video: dict) -> str:
        return Path(video["storage_path"]).stem

    def sidecar_rel(self, video: dict, kind: str) -> str:
        return self.storage.join(self.folder_rel(video), f"{self.stem(video)}{SIDECAR_SUFFIX[kind]}")

    def asset(self, video_id: str, kind: str) -> dict | None:
        return self.db.fetch_one("select * from assets where video_id = %s and kind = %s", (video_id, kind))

    def asset_json(self, video_id: str, kind: str) -> dict | None:
        a = self.asset(video_id, kind)
        if a is None or not a.get("path"):
            return None
        return self.storage.get_json(a["path"])

    def upsert_asset(self, video_id: str, kind: str, path: str | None, data: dict | None = None) -> str:
        row = self.db.fetch_one(
            """insert into assets (video_id, kind, path, data, job_id)
               values (%s, %s, %s, %s::jsonb, %s)
               on conflict (video_id, kind) do update
                 set path = excluded.path, data = excluded.data, job_id = excluded.job_id,
                     created_at = now()
               returning id""",
            (video_id, kind, path, json.dumps(data) if data is not None else None, self.id),
        )
        return str(row["id"])

    def source_file(self, video: dict) -> Path:
        """Local path of the video's source (cached download in HTTP mode)."""
        rel = self.source_rel(video)

        def progress(done: int, total: int | None) -> None:
            note = f"fetching source {done / 1e6:.0f} MB" + (f" / {total / 1e6:.0f} MB" if total else "")
            self.report(None, note)
        return self.storage.get_file(rel, progress)


Handler = Callable[[JobContext], dict[str, Any]]

_MODULES = {
    "noop": "noop", "transcribe": "transcribe", "download": "download", "scenes": "scenes",
    "borders": "borders", "convert": "convert", "render": "render", "clippack": "clippack",
    "tighten": "tighten", "suggest": "suggest", "postkit": "postkit",
}


def get_handler(job_type: str) -> Handler:
    mod = _MODULES.get(job_type)
    if mod is None:
        raise KeyError(f"no handler for job type {job_type!r}")
    import importlib
    return importlib.import_module(f"worker.agent.jobs.{mod}").handle
