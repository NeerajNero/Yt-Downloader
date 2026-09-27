"""YT Studio worker — claim loop.

    yt-worker --config worker.toml          (or: python -m worker.agent.main)

Startup: upsert own `machines` row (online). Loop: claim one queued job whose
type is in our capabilities (FOR UPDATE SKIP LOCKED), run its adapter with
report()/should_cancel(), finish as done/error/cancelled. A background thread
heartbeats the job + machine every 15 s and notices cancel requests. SIGINT /
SIGTERM requeues the running job and marks the machine offline.
"""

from __future__ import annotations

import argparse
import json
import logging
import platform
import signal
import sys
import threading
import time
import traceback
from typing import Any

from worker.agent.capabilities import detect_supported
from worker.agent.config import WorkerConfig, load_config
from worker.agent.db import Db
from worker.agent.jobs import JobContext, get_handler
from worker.agent.storage import Storage
from worker.core.errors import Cancelled
from worker.core.ffmpeg import Tools

log = logging.getLogger("worker")

CLAIM_SQL = """
update jobs
   set status = 'claimed', claimed_by = %(me)s, claimed_at = now(),
       heartbeat_at = now(), attempts = attempts + 1,
       progress = null, progress_note = null, error = null
 where id = (
   select id from jobs
    where status = 'queued' and run_after <= now() and type = any(%(types)s)
    order by priority, created_at
    limit 1
    for update skip locked
 )
returning *
"""

# Config capabilities only seed the row; afterwards the Machines page owns
# `capabilities`. `supported` is refreshed every start.
REGISTER_SQL = """
insert into machines (name, capabilities, supported, os, status, last_seen_at)
values (%(name)s, %(caps)s, %(supported)s, %(os)s, 'online', now())
on conflict (name) do update
   set capabilities = case when cardinality(machines.capabilities) = 0
                           then excluded.capabilities else machines.capabilities end,
       supported = excluded.supported,
       os = coalesce(excluded.os, machines.os),
       status = 'online', last_seen_at = now()
returning id, capabilities, paused
"""

ASSIGNMENT_SQL = "select capabilities, paused from machines where id = %s"


class Worker:
    def __init__(self, cfg: WorkerConfig):
        self.cfg = cfg
        self.db = Db(cfg.database_url)
        self.storage = Storage(cfg.brain_url, cfg.api_secret, cfg.work_dir, cfg.library_dir)
        self.tools = Tools(cfg.ffmpeg_path)
        self.machine_id: str | None = None
        self.supported: list[str] = []
        self.assigned: list[str] = []      # from the machines row, refreshed each heartbeat
        self.paused = False
        self.stopping = threading.Event()
        # current job bookkeeping (shared with the heartbeat thread)
        self._lock = threading.Lock()
        self._job_id: str | None = None
        self._cancel = threading.Event()
        self._last_report = 0.0

    # ---- lifecycle --------------------------------------------------------

    def register(self) -> None:
        self.supported = detect_supported(self.cfg)
        row = self.db.fetch_one(REGISTER_SQL, {
            "name": self.cfg.name,
            "caps": self.cfg.capabilities,
            "supported": self.supported,
            "os": self.cfg.os_name or f"{platform.system().lower()}-{platform.release()}",
        })
        self.machine_id = str(row["id"])
        self._apply_assignment(row)
        log.info("registered as %s (%s) library=%s encoder=%s", self.cfg.name, self.machine_id,
                 self.cfg.library_dir or "http", self.cfg.encoder)
        log.info("can run: %s", ",".join(self.supported))
        self._log_assignment()

    def _apply_assignment(self, row: dict[str, Any]) -> None:
        assigned = list(row.get("capabilities") or [])
        paused = bool(row.get("paused"))
        changed = assigned != self.assigned or paused != self.paused
        self.assigned, self.paused = assigned, paused
        if changed:
            self._log_assignment()

    def _log_assignment(self) -> None:
        skipped = [c for c in self.assigned if c not in self.supported]
        log.info("assigned (Machines page): %s%s%s", ",".join(self.job_types) or "nothing",
                 f" — not installed here: {','.join(skipped)}" if skipped else "",
                 " — PAUSED" if self.paused else "")

    @property
    def job_types(self) -> list[str]:
        return [c for c in self.assigned if c in self.supported]

    def run_forever(self) -> None:
        self.register()
        hb = threading.Thread(target=self._heartbeat_loop, name="heartbeat", daemon=True)
        hb.start()
        log.info("polling for jobs every %.0fs", self.cfg.poll_interval)
        try:
            while not self.stopping.is_set():
                job = self.claim()
                if job is None:
                    self.stopping.wait(self.cfg.poll_interval)
                    continue
                self.run_job(job)
        finally:
            self.shutdown()

    def _requeue(self, job_id: str) -> None:
        """Give a job back to the queue (graceful shutdown) without burning an attempt."""
        self.db.execute(
            "update jobs set status = 'queued', claimed_by = null, claimed_at = null, "
            "heartbeat_at = null, progress = null, progress_note = 'worker shut down, requeued', "
            "attempts = greatest(attempts - 1, 0) "
            "where id = %s and status in ('claimed', 'running', 'cancel_requested')",
            (job_id,),
        )

    def shutdown(self) -> None:
        self.stopping.set()
        with self._lock:
            job_id = self._job_id
        if job_id:  # only if a handler swallowed Cancelled; normally run_job already requeued
            self._requeue(job_id)
        if self.machine_id:
            self.db.execute("update machines set status = 'offline', last_seen_at = now() where id = %s",
                            (self.machine_id,))
        self.db.close()
        log.info("offline")

    # ---- queue ------------------------------------------------------------

    def claim(self) -> dict[str, Any] | None:
        if self.paused or not self.job_types:
            return None
        try:
            return self.db.fetch_one(CLAIM_SQL, {"me": self.machine_id, "types": self.job_types})
        except Exception as e:  # noqa: BLE001 — keep polling through DB outages
            log.warning("claim failed: %s", e)
            self.stopping.wait(self.cfg.poll_interval)
            return None

    def run_job(self, job: dict[str, Any]) -> None:
        job_id = str(job["id"])
        with self._lock:
            self._job_id = job_id
            self._cancel.clear()
            self._last_report = 0.0
        log.info("job %s %s attempt %s video=%s", job_id, job["type"], job["attempts"], job.get("video_id"))
        self.db.execute("update jobs set status = 'running' where id = %s and status = 'claimed'", (job_id,))

        ctx = JobContext(job=job, cfg=self.cfg, db=self.db, storage=self.storage, tools=self.tools,
                         report=self._report, should_cancel=self._should_cancel)
        t0 = time.monotonic()
        try:
            handler = get_handler(job["type"])
            result = handler(ctx) or {}
            result.setdefault("seconds", round(time.monotonic() - t0, 1))
            self._finish(job_id, "done", result=result)
            log.info("job %s done in %.0fs", job_id, time.monotonic() - t0)
        except Cancelled:
            if self.stopping.is_set() and not self._cancel.is_set():
                self._requeue(job_id)          # we are shutting down, not cancelling
                log.info("job %s requeued (worker stopping)", job_id)
            else:
                self._finish(job_id, "cancelled")
                log.info("job %s cancelled", job_id)
        except Exception as e:  # noqa: BLE001 — any failure is the job's failure
            tail = "".join(traceback.format_exception(e)).strip().splitlines()[-8:]
            msg = f"{type(e).__name__}: {e}"
            log.error("job %s failed: %s\n%s", job_id, msg, "\n".join(tail))
            self._finish(job_id, "error", error=msg)
        finally:
            with self._lock:
                self._job_id = None

    def _finish(self, job_id: str, status: str, result: dict | None = None, error: str | None = None) -> None:
        if status == "done":
            self.db.execute(
                "update jobs set status = 'done', result = %s::jsonb, progress = 100, "
                "progress_note = null, heartbeat_at = now() where id = %s",
                (json.dumps(result or {}), job_id),
            )
        elif status == "cancelled":
            self.db.execute(
                "update jobs set status = 'cancelled', progress_note = null, heartbeat_at = now() where id = %s",
                (job_id,),
            )
        else:
            self.db.execute(
                "update jobs set status = 'error', error = %s, heartbeat_at = now() where id = %s",
                (error, job_id),
            )

    # ---- callbacks handed to adapters --------------------------------------

    def _report(self, percent: float | None, note: str | None) -> None:
        """Throttled to ~1 write/s; every write also re-reads status for cancels."""
        now = time.monotonic()
        with self._lock:
            job_id = self._job_id
            if job_id is None:
                return
            if now - self._last_report < 1.0 and percent is not None and percent < 99:
                return
            self._last_report = now
        row = self.db.fetch_one(
            "update jobs set progress = %s, progress_note = %s, heartbeat_at = now() "
            "where id = %s returning status",
            (None if percent is None else round(float(percent), 1), note, job_id),
        )
        if row and row["status"] == "cancel_requested":
            self._cancel.set()

    def _should_cancel(self) -> bool:
        return self._cancel.is_set() or self.stopping.is_set()

    # ---- heartbeat thread --------------------------------------------------

    def _heartbeat_loop(self) -> None:
        interval = self.cfg.heartbeat_interval
        while not self.stopping.wait(interval):
            try:
                row = self.db.fetch_one(
                    "update machines set last_seen_at = now(), status = 'online' where id = %s "
                    "returning capabilities, paused", (self.machine_id,))
                if row:
                    self._apply_assignment(row)
                with self._lock:
                    job_id = self._job_id
                if job_id:
                    row = self.db.fetch_one(
                        "update jobs set heartbeat_at = now() where id = %s returning status", (job_id,))
                    if row and row["status"] == "cancel_requested":
                        self._cancel.set()
            except Exception as e:  # noqa: BLE001
                log.warning("heartbeat failed: %s", e)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="YT Studio worker")
    ap.add_argument("--config", help="path to worker.toml")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )
    cfg = load_config(args.config)
    cfg.work_dir.mkdir(parents=True, exist_ok=True)
    worker = Worker(cfg)

    def _stop(signum, _frame):
        log.info("signal %s — stopping after current step", signum)
        worker.stopping.set()

    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    worker.run_forever()
    return 0


if __name__ == "__main__":
    sys.exit(main())
