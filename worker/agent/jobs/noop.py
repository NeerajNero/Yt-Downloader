"""Queue smoke test: sleeps for payload.seconds (default 10), reporting progress.
payload.fail = true raises at 50 % to exercise the error path."""

import time

from worker.core.errors import Cancelled

from . import JobContext


def handle(ctx: JobContext) -> dict:
    seconds = float(ctx.payload.get("seconds", 10))
    fail = bool(ctx.payload.get("fail", False))
    steps = max(1, int(seconds * 2))
    for i in range(steps):
        if ctx.should_cancel():
            raise Cancelled()
        pct = i / steps * 100
        if fail and pct >= 50:
            raise RuntimeError("noop job asked to fail")
        ctx.report(pct, f"step {i + 1}/{steps}")
        time.sleep(seconds / steps)
    return {"slept": seconds}
