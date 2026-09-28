"""The one process-wide bundle of settings, library, store and queue.
Populated by studio.main at startup; routes and adapters import `app`."""

from __future__ import annotations

from dataclasses import dataclass

from studio.config import Settings
from studio.core.ffmpeg import Tools
from studio.library import Library
from studio.queue import JobQueue
from studio.store import Store


@dataclass
class AppContext:
    settings: Settings
    lib: Library
    store: Store
    queue: JobQueue
    tools: Tools


app: AppContext = None  # type: ignore[assignment]


def set_app(ctx: AppContext) -> None:
    global app
    app = ctx
