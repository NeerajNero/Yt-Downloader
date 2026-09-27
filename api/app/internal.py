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
    woken = auto_wake()
    return {"requeued": requeued, "cancelled": cancelled, "offline": offline, "woken": woken}


def auto_wake() -> list[str]:
    """A job has waited AUTO_WAKE_AFTER with no online machine able to run it,
    and an offline machine with a MAC address can: send a magic packet
    (at most once per AUTO_WAKE_RETRY)."""
    from .actions import wake

    woken: list[str] = []
    with cursor() as cur:
        cur.execute(
            """select distinct m.name
                 from jobs j
                 join machines m on j.type = any(m.capabilities)
                where j.status = 'queued' and j.run_after <= now()
                  and j.created_at < now() - %s::interval
                  and m.status <> 'online' and m.mac_address is not null
                  and (m.woken_at is null or m.woken_at < now() - %s::interval)
                  and not exists (select 1 from machines o
                                   where o.status = 'online' and j.type = any(o.capabilities))""",
            (f"{settings.AUTO_WAKE_AFTER} seconds", f"{settings.AUTO_WAKE_RETRY} seconds"),
        )
        names = [r["name"] for r in cur.fetchall()]
    for name in names:
        ok, _ = wake(name)
        if ok:
            woken.append(name)
    return woken


@router.post("/watchdog")
def watchdog():
    return run_watchdog()
