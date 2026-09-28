"""FastAPI app: API routes + the built PWA, one process, started by run.bat / run.sh."""

from __future__ import annotations

import logging
import threading
import webbrowser
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

from studio import context
from studio.config import ROOT, Settings, load_settings
from studio.jobs import JobContext, get_handler
from studio.library import Library
from studio.queue import JobQueue
from studio.store import Store

log = logging.getLogger("studio")


def build_context(settings: Settings) -> context.AppContext:
    lib = Library(settings.library_dir, settings.work_dir)
    store = Store(lib, presets_file=ROOT / "presets.json" if settings.import_presets else None)
    tools = settings.tools

    def handler(job, report, should_cancel):
        ctx = JobContext(job=job, settings=settings, store=store, lib=lib, tools=tools,
                         report=report, should_cancel=should_cancel)
        return get_handler(job["type"])(ctx)

    def finished(job):
        from studio import pipeline
        pipeline.on_job_done(job)

    queue = JobQueue(handler, on_finished=finished, heavy_workers=settings.heavy_workers,
                     light_workers=settings.light_workers)
    ctx = context.AppContext(settings=settings, lib=lib, store=store, queue=queue, tools=tools)
    context.set_app(ctx)
    return ctx


@asynccontextmanager
async def lifespan(_app: FastAPI):
    ctx = context.app
    ctx.store.load()
    stats = ctx.store.reconcile()
    log.info("library %s: %d videos (%d newly indexed, %d missing files)", ctx.lib.root, stats["videos"],
             stats["added"], stats["missing"])
    ctx.queue.start()
    try:
        yield
    finally:
        ctx.queue.stop()


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()
    build_context(settings)
    app = FastAPI(title="YT Studio", lifespan=lifespan)

    from studio.routes import actions, files, ingest, state
    app.include_router(state.router)
    app.include_router(actions.router)
    app.include_router(files.router)
    app.include_router(ingest.router)

    @app.get("/api/healthz")
    def healthz():
        return {"ok": True, "library_dir": str(settings.library_dir), "encoder": settings.encoder}

    dist = settings.web_dist

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="no such endpoint")
        index = dist / "index.html"
        if not index.is_file():
            raise HTTPException(status_code=503, detail="The web app isn't built yet — run run.sh / run.bat once, or `cd web && npm run build`.")
        target = (dist / path).resolve() if path else index
        if path and dist.resolve() in target.parents and target.is_file():
            return FileResponse(target)
        return FileResponse(index)

    return app


def main() -> int:
    import uvicorn

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s", datefmt="%H:%M:%S")
    settings = load_settings()
    app = create_app(settings)
    log.info("library: %s", settings.library_dir)
    log.info("ffmpeg: %s  encoder: %s  whisper: %s/%s/%s", settings.ffmpeg_path, settings.encoder,
             settings.whisper.model, settings.whisper.device, settings.whisper.compute_type)
    url = f"http://{'127.0.0.1' if settings.host in ('0.0.0.0', '::') else settings.host}:{settings.port}"
    if settings.open_browser:
        threading.Timer(1.5, lambda: webbrowser.open(url)).start()
    print(f"YT Studio at {url} — press Ctrl+C to stop.")
    uvicorn.run(app, host=settings.host, port=settings.port, log_level="warning")
    return 0
