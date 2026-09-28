"""In-memory job queue, v1 style: jobs live in a dict, worker threads pull
from it, everything is gone when the app exits (by design — this is a
run-when-needed tool).

Two lanes so the machine is never asked to do two ffmpeg/whisper jobs at
once, while downloads and Gemini calls (network-bound) run alongside:
  heavy : render, convert, clippack, tighten, transcribe, scenes, borders
  light : download, suggest, postkit, plan, style, noop

Statuses: queued → running → done | error | cancelled. Cancel a running job =
status 'cancel_requested'; the handler's should_cancel() notices and it flips
to 'cancelled'. Progress = `progress` (0–100 or None) + `progress_note`.
"""

from __future__ import annotations

import logging
import threading
import time
import traceback
import uuid
from typing import Any, Callable

from studio.core.errors import Cancelled
from studio.library import now_iso

log = logging.getLogger("queue")

HEAVY = {"render", "convert", "clippack", "tighten", "transcribe", "scenes", "borders"}
ACTIVE = ("queued", "running", "cancel_requested")
FINISHED = ("done", "error", "cancelled")

Handler = Callable[[dict, Callable[[float | None, str | None], None], Callable[[], bool]], dict]


class JobQueue:
    def __init__(self, handler: Handler, on_finished: Callable[[dict], None] | None = None,
                 heavy_workers: int = 1, light_workers: int = 2, keep_finished: int = 200):
        self.handler = handler
        self.on_finished = on_finished
        self.heavy_workers = heavy_workers
        self.light_workers = light_workers
        self.keep_finished = keep_finished
        self.jobs: dict[str, dict] = {}
        self._cancel: dict[str, threading.Event] = {}
        self.lock = threading.Lock()
        self.cond = threading.Condition(self.lock)
        self.stopping = threading.Event()
        self._threads: list[threading.Thread] = []

    # ---- lifecycle ------------------------------------------------------------

    def start(self) -> None:
        for i in range(self.heavy_workers):
            self._spawn(f"heavy-{i}", lambda t: t in HEAVY)
        for i in range(self.light_workers):
            self._spawn(f"light-{i}", lambda t: t not in HEAVY)

    def _spawn(self, name: str, accepts: Callable[[str], bool]) -> None:
        t = threading.Thread(target=self._loop, args=(accepts,), name=name, daemon=True)
        t.start()
        self._threads.append(t)

    def stop(self, timeout: float = 8.0) -> None:
        self.stopping.set()
        with self.cond:
            for j in self.jobs.values():
                if j["status"] in ("running", "cancel_requested"):
                    self._cancel[j["id"]].set()
            self.cond.notify_all()
        deadline = time.monotonic() + timeout
        for t in self._threads:
            t.join(max(0.0, deadline - time.monotonic()))

    # ---- public API -------------------------------------------------------------

    def enqueue(self, jtype: str, video_id: str | None = None, clip_id: str | None = None,
                payload: dict | None = None, priority: int = 100, parent_job_id: str | None = None) -> dict:
        job = {
            "id": str(uuid.uuid4()), "type": jtype, "status": "queued", "priority": int(priority),
            "payload": payload or {}, "result": None, "error": None, "progress": None, "progress_note": None,
            "video_id": video_id, "clip_id": clip_id, "parent_job_id": parent_job_id,
            "attempts": 0, "max_attempts": 1,
            "created_at": now_iso(), "updated_at": now_iso(), "started_at": None, "finished_at": None,
        }
        with self.cond:
            self.jobs[job["id"]] = job
            self._cancel[job["id"]] = threading.Event()
            self._trim()
            self.cond.notify_all()
        log.info("queued %s %s video=%s", job["type"], job["id"][:8], video_id)
        return job

    def get(self, job_id: str) -> dict | None:
        with self.lock:
            return self.jobs.get(job_id)

    def list(self, limit: int | None = None) -> list[dict]:
        with self.lock:
            jobs = sorted(self.jobs.values(), key=lambda j: j["created_at"], reverse=True)
        return jobs[:limit] if limit else jobs

    def for_video(self, video_id: str, active_only: bool = False) -> list[dict]:
        return [j for j in self.list() if j["video_id"] == video_id and (not active_only or j["status"] in ACTIVE)]

    def active(self, jtype: str, video_id: str | None = None, clip_id: str | None = None) -> dict | None:
        with self.lock:
            for j in self.jobs.values():
                if j["type"] != jtype or j["status"] not in ACTIVE:
                    continue
                if clip_id is not None:
                    if j["clip_id"] == clip_id:
                        return j
                elif j["video_id"] == video_id:
                    return j
        return None

    def cancel(self, job_id: str) -> dict | None:
        with self.cond:
            j = self.jobs.get(job_id)
            if j is None:
                return None
            if j["status"] == "queued":
                self._set(j, status="cancelled", progress_note=None, finished_at=now_iso())
            elif j["status"] == "running":
                self._set(j, status="cancel_requested")
                self._cancel[job_id].set()
            return j

    def retry(self, job_id: str) -> dict | None:
        with self.cond:
            j = self.jobs.get(job_id)
            if j is None or j["status"] not in FINISHED:
                return j
            self._set(j, status="queued", error=None, progress=None, progress_note=None, result=None,
                      started_at=None, finished_at=None)
            self._cancel[job_id] = threading.Event()
            self.cond.notify_all()
            return j

    def clear_finished(self) -> int:
        with self.lock:
            gone = [jid for jid, j in self.jobs.items() if j["status"] in FINISHED]
            for jid in gone:
                self.jobs.pop(jid, None)
                self._cancel.pop(jid, None)
        return len(gone)

    # ---- internals ------------------------------------------------------------------

    def _set(self, job: dict, **fields) -> None:
        job.update(fields)
        job["updated_at"] = now_iso()

    def _trim(self) -> None:
        finished = sorted((j for j in self.jobs.values() if j["status"] in FINISHED), key=lambda j: j["updated_at"])
        for j in finished[: max(0, len(finished) - self.keep_finished)]:
            self.jobs.pop(j["id"], None)
            self._cancel.pop(j["id"], None)

    def _claim(self, accepts: Callable[[str], bool]) -> dict | None:
        """Called with the lock held."""
        queued = [j for j in self.jobs.values() if j["status"] == "queued" and accepts(j["type"])]
        if not queued:
            return None
        job = min(queued, key=lambda j: (j["priority"], j["created_at"]))
        self._set(job, status="running", attempts=job["attempts"] + 1, started_at=now_iso(),
                  progress=None, progress_note=None, error=None)
        return job

    def _loop(self, accepts: Callable[[str], bool]) -> None:
        while not self.stopping.is_set():
            with self.cond:
                job = self._claim(accepts)
                if job is None:
                    self.cond.wait(timeout=1.0)
                    continue
            self._run(job)

    def _run(self, job: dict) -> None:
        job_id = job["id"]
        cancel = self._cancel[job_id]
        log.info("job %s %s started (video=%s)", job_id[:8], job["type"], job.get("video_id"))

        def report(percent: float | None, note: str | None) -> None:
            with self.lock:
                if job["status"] in ("running", "cancel_requested"):
                    self._set(job, progress=None if percent is None else round(float(percent), 1), progress_note=note)

        def should_cancel() -> bool:
            return cancel.is_set() or self.stopping.is_set()

        t0 = time.monotonic()
        try:
            result = self.handler(job, report, should_cancel) or {}
            result.setdefault("seconds", round(time.monotonic() - t0, 1))
            with self.lock:
                self._set(job, status="done", result=result, progress=100, progress_note=None, finished_at=now_iso())
            log.info("job %s done in %.0fs", job_id[:8], time.monotonic() - t0)
        except Cancelled:
            with self.lock:
                self._set(job, status="cancelled", progress_note=None, finished_at=now_iso())
            log.info("job %s cancelled", job_id[:8])
        except Exception as e:  # noqa: BLE001 — any failure is the job's failure
            tail = "".join(traceback.format_exception(e)).strip().splitlines()[-8:]
            msg = f"{type(e).__name__}: {e}"
            with self.lock:
                self._set(job, status="error", error=msg[:1000], finished_at=now_iso())
            log.error("job %s failed: %s\n%s", job_id[:8], msg, "\n".join(tail))
        if job["status"] == "done" and self.on_finished and not self.stopping.is_set():
            try:
                self.on_finished(job)
            except Exception:  # noqa: BLE001
                log.exception("on_finished hook failed for job %s", job_id[:8])
