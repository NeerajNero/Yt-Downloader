"""Library-root path helpers. Every path stored in the DB is relative to the
library root; this module is the only place that turns them into real files.

Sidecar layout (v1-compatible): `<folder>/<stem>.<kind>.json` next to the media.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException

from . import settings

MEDIA_EXTS = {".mkv", ".mp4", ".webm", ".m4a", ".mov", ".mp3", ".opus"}
IMAGE_EXTS = {".webp", ".jpg", ".jpeg", ".png"}

# asset kind -> sidecar suffix (JSON kinds). Other kinds pass an explicit filename.
SIDECAR_SUFFIX = {
    "transcript": ".transcript.json",
    "scenes": ".scenes.json",
    "captions": ".captions.json",
    "suggestions": ".suggestions.json",
    "postkit": ".postkit.json",
    "borders": ".borders.json",
}


def resolve(rel: str | None) -> Path:
    """Library-relative → absolute, refusing anything that escapes the root."""
    if not rel:
        raise HTTPException(status_code=404, detail="no file recorded for this item")
    p = (settings.LIBRARY_DIR / rel).resolve()
    if settings.LIBRARY_DIR not in p.parents and p != settings.LIBRARY_DIR:
        raise HTTPException(status_code=400, detail="path escapes the library")
    return p


def relative(p: Path) -> str:
    return p.resolve().relative_to(settings.LIBRARY_DIR).as_posix()


def sidecar_for(source: Path, kind: str, filename: str | None = None) -> Path:
    """Where an asset of `kind` lives for a given source media file."""
    if filename:
        name = Path(filename).name  # strip any directory part
        return source.parent / name
    suffix = SIDECAR_SUFFIX.get(kind)
    if suffix is None:
        raise HTTPException(status_code=400, detail=f"asset kind {kind!r} needs ?filename=")
    return source.parent / f"{source.stem}{suffix}"


def cache_dir(sub: str) -> Path:
    d = settings.LIBRARY_DIR / ".cache" / sub
    d.mkdir(parents=True, exist_ok=True)
    return d
