"""YT Studio brain API.

Phase 0: just a health check so the stack wires up end to end.
Later phases add Hasura Action handlers, event-trigger handlers, library
file serving, worker result upload, and Wake-on-LAN.
"""

import os

from fastapi import FastAPI

app = FastAPI(title="YT Studio API")


@app.get("/api/healthz")
def healthz():
    return {
        "ok": True,
        "service": "yt-studio-api",
        "library_dir": os.environ.get("LIBRARY_DIR", "/library"),
    }
