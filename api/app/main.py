"""YT Studio brain API.

Not a general REST API — CRUD goes through Hasura. This service handles what
GraphQL can't: library file serving + worker result uploads (files.py), cron
webhooks (internal.py), and later Hasura Action/event handlers and Wake-on-LAN.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from . import files, internal, settings
from .db import pool


@asynccontextmanager
async def lifespan(_app: FastAPI):
    pool.open()
    try:
        yield
    finally:
        pool.close()


app = FastAPI(title="YT Studio API", lifespan=lifespan)
app.include_router(files.router)
app.include_router(internal.router)


@app.get("/api/healthz")
def healthz():
    return {"ok": True, "service": "yt-studio-api", "library_dir": str(settings.LIBRARY_DIR)}
