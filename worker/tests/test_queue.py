import threading
import time
from unittest import mock

from worker.agent.jobs import get_handler as real_get_handler
from worker.core.errors import Cancelled

from conftest import enqueue


def job(db, id_):
    return db.fetch_one("select * from jobs where id = %s", (id_,))


def test_claim_respects_type_priority_and_run_after(db, worker, job_type):
    from datetime import datetime, timedelta, timezone
    later = enqueue(db, job_type, priority=1, run_after=datetime.now(timezone.utc) + timedelta(hours=1))
    low = enqueue(db, job_type, priority=200)
    high = enqueue(db, job_type, priority=10)
    other = enqueue(db, job_type + "-other")

    first = worker.claim()
    assert first["id"] == high["id"]
    assert first["status"] == "claimed" and first["attempts"] == 1
    assert str(first["claimed_by"]) == worker.machine_id

    second = worker.claim()
    assert second["id"] == low["id"]
    assert worker.claim() is None  # `later` is not due, `other` is not our type
    assert job(db, later["id"])["status"] == "queued"
    assert job(db, other["id"])["status"] == "queued"
    db.execute("delete from jobs where type = %s", (job_type + "-other",))


def test_claim_is_exclusive_across_workers(db, worker, job_type):
    enqueue(db, job_type)
    from worker.agent.main import Worker
    from dataclasses import replace
    w2 = Worker(replace(worker.cfg, name=worker.cfg.name + "-b"))
    w2.register()
    try:
        got = [w for w in (worker.claim(), w2.claim()) if w is not None]
        assert len(got) == 1
    finally:
        db.execute("delete from jobs where claimed_by = %s", (w2.machine_id,))
        db.execute("delete from machines where name = %s", (w2.cfg.name,))


def _noop_handler(ctx):
    # ~3 s; report() is throttled to one DB write per second, so a cancel set
    # early is picked up by the second or third write.
    for i in range(30):
        if ctx.should_cancel():
            raise Cancelled()
        ctx.report(i * 100 / 30, f"step {i}")
        time.sleep(0.1)
    return {"ok": True}


def test_run_job_done_writes_result_and_progress(db, worker, job_type):
    row = enqueue(db, job_type)
    with mock.patch("worker.agent.main.get_handler", return_value=_noop_handler):
        worker.run_job(worker.claim())
    j = job(db, row["id"])
    assert j["status"] == "done"
    assert j["progress"] == 100
    assert j["result"]["ok"] is True and "seconds" in j["result"]


def test_run_job_error(db, worker, job_type):
    row = enqueue(db, job_type)

    def boom(ctx):
        raise ValueError("bad payload")

    with mock.patch("worker.agent.main.get_handler", return_value=boom):
        worker.run_job(worker.claim())
    j = job(db, row["id"])
    assert j["status"] == "error"
    assert j["error"] == "ValueError: bad payload"


def test_unknown_type_errors_cleanly(db, worker, job_type):
    row = enqueue(db, job_type)
    worker.run_job(worker.claim())  # real registry has no handler for this type
    assert job(db, row["id"])["status"] == "error"
    assert "no handler" in job(db, row["id"])["error"]


def test_cancel_requested_is_noticed_via_report(db, worker, job_type):
    row = enqueue(db, job_type)
    claimed = worker.claim()

    def cancel_soon():
        time.sleep(0.25)
        db.execute("update jobs set status = 'cancel_requested' where id = %s", (row["id"],))

    threading.Thread(target=cancel_soon).start()
    with mock.patch("worker.agent.main.get_handler", return_value=_noop_handler):
        worker.run_job(claimed)
    assert job(db, row["id"])["status"] == "cancelled"


def test_cancel_requested_is_noticed_via_heartbeat(db, worker, job_type):
    """A handler that never calls report() is still stopped by the heartbeat thread."""
    row = enqueue(db, job_type)
    claimed = worker.claim()
    hb = threading.Thread(target=worker._heartbeat_loop, daemon=True)
    hb.start()

    def silent(ctx):
        for _ in range(50):
            if ctx.should_cancel():
                raise Cancelled()
            time.sleep(0.1)
        return {}

    def cancel_soon():
        time.sleep(0.3)
        db.execute("update jobs set status = 'cancel_requested' where id = %s", (row["id"],))

    threading.Thread(target=cancel_soon).start()
    with mock.patch("worker.agent.main.get_handler", return_value=silent):
        worker.run_job(claimed)
    assert job(db, row["id"])["status"] == "cancelled"
    assert job(db, row["id"])["heartbeat_at"] is not None


def test_stop_signal_requeues_without_burning_attempt(db, worker, job_type):
    row = enqueue(db, job_type)
    claimed = worker.claim()

    def stop_soon():
        time.sleep(0.25)
        worker.stopping.set()

    threading.Thread(target=stop_soon).start()
    with mock.patch("worker.agent.main.get_handler", return_value=_noop_handler):
        worker.run_job(claimed)
    j = job(db, row["id"])
    assert j["status"] == "queued"
    assert j["attempts"] == 0 and j["claimed_by"] is None


def test_register_upserts_machine_online(db, worker):
    m = db.fetch_one("select * from machines where id = %s", (worker.machine_id,))
    assert m["status"] == "online" and m["capabilities"] == worker.cfg.capabilities
    worker.shutdown()
    m = db.fetch_one("select * from machines where id = %s", (worker.machine_id,))
    assert m["status"] == "offline"


def test_real_registry_has_transcribe_and_noop():
    assert real_get_handler("noop")
    assert real_get_handler("transcribe")
