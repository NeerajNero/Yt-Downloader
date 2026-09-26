"""Queue tests run against a real Postgres (the compose stack). Set
DATABASE_URL (default: the local dev stack on 5433); tests skip if unreachable."""

import os
import uuid

import pytest

from worker.agent.config import WorkerConfig
from worker.agent.db import Db
from worker.agent.main import Worker

DB_URL = os.environ.get("DATABASE_URL", "postgres://ytstudio:devpass@localhost:5433/ytstudio")


@pytest.fixture(scope="session")
def db():
    d = Db(DB_URL)
    try:
        d.fetch_one("select 1")
    except Exception as e:  # noqa: BLE001
        pytest.skip(f"no database at {DB_URL}: {e}")
    return d


@pytest.fixture
def job_type(db):
    """A unique job type per test so tests never see each other's rows."""
    t = f"noop-test-{uuid.uuid4().hex[:8]}"
    yield t
    db.execute("delete from jobs where type = %s", (t,))


@pytest.fixture
def worker(db, job_type, tmp_path):
    name = f"test-{uuid.uuid4().hex[:6]}"
    cfg = WorkerConfig(name=name, capabilities=[job_type], database_url=DB_URL,
                       brain_url="http://localhost:0", work_dir=tmp_path,
                       poll_interval=0.2, heartbeat_interval=0.5)
    w = Worker(cfg)
    w.register()
    yield w
    w.stopping.set()
    db.execute("delete from jobs where claimed_by = %s", (w.machine_id,))
    db.execute("delete from machines where name = %s", (name,))


def enqueue(db, job_type, payload=None, **cols):
    cols = {"type": job_type, "payload": payload or {}, **cols}
    keys = ", ".join(cols)
    vals = ", ".join("%s::jsonb" if k == "payload" else "%s" for k in cols)
    import json
    params = [json.dumps(v) if k == "payload" else v for k, v in cols.items()]
    return db.fetch_one(f"insert into jobs ({keys}) values ({vals}) returning *", params)
