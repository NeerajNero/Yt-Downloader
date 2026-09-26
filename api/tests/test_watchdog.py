"""Watchdog rules against a real Postgres (DATABASE_URL; default = local dev stack).
Run from the repo root:  cd api && DATABASE_URL=... python -m pytest"""

import os
import uuid

import pytest

os.environ.setdefault("DATABASE_URL", "postgres://ytstudio:devpass@localhost:5433/ytstudio")

from app.db import cursor, pool  # noqa: E402
from app.internal import run_watchdog  # noqa: E402


@pytest.fixture(scope="module", autouse=True)
def _pool():
    try:
        pool.open()
        with cursor() as cur:
            cur.execute("select 1")
    except Exception as e:  # noqa: BLE001
        pytest.skip(f"no database: {e}")
    yield
    pool.close()


@pytest.fixture
def machine():
    name = f"wd-test-{uuid.uuid4().hex[:6]}"
    with cursor() as cur:
        cur.execute("insert into machines (name, status, last_seen_at) values (%s, 'online', now()) returning id", (name,))
        mid = cur.fetchone()["id"]
    yield mid, name
    with cursor() as cur:
        cur.execute("delete from jobs where claimed_by = %s or type like 'wd-test-%%'", (mid,))
        cur.execute("delete from machines where id = %s", (mid,))


def _job(mid, status, attempts, age="5 minutes", max_attempts=2):
    with cursor() as cur:
        cur.execute(
            "insert into jobs (type, status, attempts, max_attempts, claimed_by, heartbeat_at) "
            "values ('wd-test', %s, %s, %s, %s, now() - %s::interval) returning id",
            (status, attempts, max_attempts, mid, age),
        )
        return cur.fetchone()["id"]


def _status(jid):
    with cursor() as cur:
        cur.execute("select status, attempts, error, claimed_by from jobs where id = %s", (jid,))
        return cur.fetchone()


def test_stale_running_job_is_requeued_then_errored(machine):
    mid, _ = machine
    first = _job(mid, "running", attempts=1)
    last = _job(mid, "claimed", attempts=2)
    fresh = _job(mid, "running", attempts=1, age="10 seconds")
    out = run_watchdog()
    assert str(first) in out["requeued"]
    assert _status(first)["status"] == "queued" and _status(first)["claimed_by"] is None
    assert _status(last)["status"] == "error" and "stopped responding" in _status(last)["error"]
    assert _status(fresh)["status"] == "running"


def test_orphaned_cancel_request_becomes_cancelled(machine):
    mid, _ = machine
    jid = _job(mid, "cancel_requested", attempts=1)
    live = _job(mid, "cancel_requested", attempts=1, age="5 seconds")
    out = run_watchdog()
    assert str(jid) in out["cancelled"]
    assert _status(live)["status"] == "cancel_requested"


def test_silent_machine_goes_offline(machine):
    mid, name = machine
    with cursor() as cur:
        cur.execute("update machines set last_seen_at = now() - interval '5 minutes' where id = %s", (mid,))
    out = run_watchdog()
    assert name in out["offline"]
