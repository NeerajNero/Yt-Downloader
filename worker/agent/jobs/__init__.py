"""Job adapters: `handle(ctx) -> result dict`. One module per job type; the
registry maps `jobs.type` to the handler. Adapters resolve inputs (download to
scratch), call a `worker.core` function with report/should_cancel, and push
results back (asset upload). They never build ffmpeg/whisper logic themselves.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

from worker.agent.config import WorkerConfig
from worker.agent.db import Db
from worker.agent.storage import Storage


@dataclass
class JobContext:
    job: dict[str, Any]           # the claimed jobs row
    cfg: WorkerConfig
    db: Db
    storage: Storage
    report: Callable[[float | None, str | None], None]
    should_cancel: Callable[[], bool]

    @property
    def id(self) -> str:
        return str(self.job["id"])

    @property
    def payload(self) -> dict[str, Any]:
        return self.job.get("payload") or {}

    def video(self) -> dict[str, Any]:
        vid = self.job.get("video_id")
        if not vid:
            raise ValueError("job has no video_id")
        row = self.db.fetch_one("select * from videos where id = %s", (vid,))
        if row is None:
            raise ValueError(f"video {vid} not found")
        return row


Handler = Callable[[JobContext], dict[str, Any]]


def get_handler(job_type: str) -> Handler:
    if job_type == "noop":
        from . import noop
        return noop.handle
    if job_type == "transcribe":
        from . import transcribe
        return transcribe.handle
    raise KeyError(f"no handler for job type {job_type!r}")
