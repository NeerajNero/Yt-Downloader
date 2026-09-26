"""Internal endpoints called by Hasura cron triggers (x-api-secret guarded).

POST /api/internal/watchdog — every minute (hasura/metadata/cron_triggers.yaml):
  * claimed/running jobs whose heartbeat is older than JOB_STALE_AFTER → back to
    queued, or error once attempts >= max_attempts
  * cancel_requested jobs nobody is heartbeating → cancelled
  * machines not seen for MACHINE_OFFLINE_AFTER → offline
"""

from fastapi import APIRouter, Depends

from . import settings
from .auth import require_secret
from .db import cursor

router = APIRouter(prefix="/api/internal", tags=["internal"], dependencies=[Depends(require_secret)])


def run_watchdog() -> dict:
    stale = f"{settings.JOB_STALE_AFTER} seconds"
    with cursor() as cur:
        cur.execute(
            """update jobs
                  set status = case when attempts >= max_attempts then 'error' else 'queued' end,
                      error = case when attempts >= max_attempts
                                   then 'worker stopped responding after ' || attempts || ' attempt(s)'
                                   else error end,
                      progress = null,
                      progress_note = case when attempts >= max_attempts then progress_note
                                           else 'requeued: worker lost' end,
                      claimed_by = null, claimed_at = null, heartbeat_at = null
                where status in ('claimed', 'running')
                  and heartbeat_at < now() - %s::interval
                returning id, status""",
            (stale,),
        )
        requeued = [str(r["id"]) for r in cur.fetchall() if r["status"] == "queued"]
        cur.execute(
            """update jobs set status = 'cancelled', claimed_by = null, progress_note = null
                where status = 'cancel_requested'
                  and (heartbeat_at is null or heartbeat_at < now() - %s::interval)
                returning id""",
            (stale,),
        )
        cancelled = [str(r["id"]) for r in cur.fetchall()]
        cur.execute(
            """update machines set status = 'offline'
                where status <> 'offline'
                  and (last_seen_at is null or last_seen_at < now() - %s::interval)
                returning name""",
            (f"{settings.MACHINE_OFFLINE_AFTER} seconds",),
        )
        offline = [r["name"] for r in cur.fetchall()]
    return {"requeued": requeued, "cancelled": cancelled, "offline": offline}


@router.post("/watchdog")
def watchdog():
    return run_watchdog()
