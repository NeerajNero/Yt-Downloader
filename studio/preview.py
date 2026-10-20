"""Draft preview renders: 540 px copies of a render payload, cached under
`<project>/work/preview/<video_id>/<hash>.mp4` (scratch: outside the library,
never an asset, never on a clip row). The hash covers the payload, the track's
beat-grid version and effective drop, and the source file's mtime, so a cached
file is only reused when the output would be identical."""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path

from studio.core import beats as beats_core
from studio.library import Library

PREVIEW_KEEP = 30                      # LRU size per project, evicted when a preview job starts
PREVIEW_NAME = re.compile(r"^[0-9a-f]{16}\.mp4$")


def preview_hash(payload: dict, beats_version: int | None, drop_effective: float | None, source_mtime: float | None) -> str:
    key = {"payload": payload, "beats_version": beats_version, "drop": drop_effective, "mtime": source_mtime}
    return hashlib.sha1(json.dumps(key, sort_keys=True, separators=(",", ":"), default=str).encode()).hexdigest()[:16]


def preview_dir(work_dir: Path, video_id: str) -> Path:
    return Path(work_dir) / "preview" / video_id


def preview_url(video_id: str, h: str) -> str:
    return f"/api/preview/{video_id}/{h}.mp4"


@dataclass(frozen=True)
class PreviewPlan:
    hash: str
    path: Path
    url: str
    music_drop_s: float | None
    beats_version: int | None


def plan(lib: Library, video: dict, payload: dict) -> PreviewPlan:
    """Where a preview of `payload` for `video` lives, and the drop it aligns to."""
    music = payload.get("music") or ""
    grid = lib.read_beats(music) if music else None
    current = beats_core.is_current(grid)
    drop = beats_core.effective_drop(grid) if current else None
    version = grid.get("version") if (grid and current) else None
    try:
        mtime = lib.resolve(video["storage_path"]).stat().st_mtime
    except (OSError, ValueError, KeyError):
        mtime = None
    h = preview_hash(payload, version, drop, mtime)
    return PreviewPlan(hash=h, path=preview_dir(lib.work_dir, video["id"]) / f"{h}.mp4", url=preview_url(video["id"], h),
                       music_drop_s=drop, beats_version=version)


def list_previews(work_dir: Path) -> list[Path]:
    root = Path(work_dir) / "preview"
    if not root.is_dir():
        return []
    return [p for p in root.glob("*/*.mp4") if PREVIEW_NAME.match(p.name)]


def evict_lru(work_dir: Path, keep: int = PREVIEW_KEEP, protect: set[Path] | None = None) -> list[Path]:
    """Delete the least recently used previews beyond `keep`; returns what went."""
    files = sorted(list_previews(work_dir), key=lambda p: p.stat().st_mtime)
    protect = {Path(p).resolve() for p in (protect or set())}
    gone = []
    over = len(files) - keep
    for p in files:
        if over <= 0:
            break
        if p.resolve() in protect:
            continue
        try:
            p.unlink()
            gone.append(p)
            over -= 1
        except OSError:
            continue
    return gone


def touch(path: Path) -> None:
    """A cache hit counts as a use for the LRU."""
    try:
        path.touch()
    except OSError:
        pass
