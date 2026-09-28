"""The library on disk. Every path the app stores is relative to the library
root (posix separators); this module is the only place that turns them into
real files, and the only place that knows the sidecar layout:

    <library>/<title>/<stem>.mkv           source
                      <stem>.info.json     yt-dlp metadata (v1 layout)
                      <stem>.jpg|webp      thumbnail
                      <stem>.transcript.json / .scenes.json / .captions.json /
                      .suggestions.json / .postkit.json / .borders.json / .plan.json
                      <stem>.clips.json    clip list + review status (app state)
                      <stem>_edit.mp4      browser/Resolve-friendly copy
                      <stem>_tight.mp4     silences removed
                      shorts/*.mp4         renders
                      clips/ + clippack.json
    <library>/.ytstudio/                   videos index, recipes, styles
    <library>/.music, .overlays, .refs, .cache

"Assets" are not stored anywhere: an asset exists when its file does.
"""

from __future__ import annotations

import json
import os
import shutil
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

from studio.core.ffmpeg import IMAGE_EXTS, MEDIA_EXTS

SIDECAR_SUFFIX = {
    "transcript": ".transcript.json",
    "scenes": ".scenes.json",
    "captions": ".captions.json",
    "suggestions": ".suggestions.json",
    "postkit": ".postkit.json",
    "borders": ".borders.json",
    "plan": ".plan.json",
    "clips": ".clips.json",
}
# asset kind -> how to find it next to <stem>. None = handled specially below.
ASSET_FILES = {
    "transcript": "{stem}.transcript.json",
    "scenes": "{stem}.scenes.json",
    "captions": "{stem}.captions.json",
    "suggestions": "{stem}.suggestions.json",
    "postkit": "{stem}.postkit.json",
    "borders": "{stem}.borders.json",
    "plan": "{stem}.plan.json",
    "edit_copy": "{stem}_edit.mp4",
    "tight": "{stem}_tight.mp4",
    "clip_pack": "clips/clippack.json",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def iso(ts: float) -> str:
    return datetime.fromtimestamp(ts, timezone.utc).isoformat(timespec="milliseconds")


def summarize_asset(kind: str, obj: dict) -> dict | None:
    """Small inline payload the UI shows as badges / uses directly."""
    if kind == "transcript":
        segs = obj.get("segments") or []
        return {"language": obj.get("language"), "segments": len(segs),
                "words": sum(len(s.get("words") or []) for s in segs), "model": obj.get("model")}
    if kind == "scenes":
        return {"scenes": len(obj.get("scenes") or []), "threshold": obj.get("threshold")}
    if kind == "captions":
        return {"items": len(obj.get("items") or []), "speed": obj.get("speed")}
    if kind == "postkit":
        return {k: obj.get(k) for k in ("title", "description", "hashtags")}
    if kind == "suggestions":
        return {"clips": len(obj.get("clips") or []), "model": obj.get("model")}
    if kind == "clip_pack":
        return {k: obj.get(k) for k in ("count", "max_len", "capped")}
    if kind in ("borders", "plan"):
        return obj
    return None


class Library:
    def __init__(self, root: Path, work_dir: Path):
        self.root = Path(root).resolve()
        self.work_dir = Path(work_dir).resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.work_dir.mkdir(parents=True, exist_ok=True)
        self._summary_cache: dict[str, tuple[float, dict | None]] = {}
        self._lock = threading.Lock()

    # ---- paths ------------------------------------------------------------

    def resolve(self, rel: str | None) -> Path:
        if not rel:
            raise ValueError("no file recorded for this item")
        p = (self.root / rel).resolve()
        if self.root not in p.parents and p != self.root:
            raise ValueError(f"path escapes the library: {rel}")
        return p

    def relative(self, p: Path) -> str:
        return Path(p).resolve().relative_to(self.root).as_posix()

    @staticmethod
    def join(folder_rel: str, name: str) -> str:
        return f"{folder_rel.rstrip('/')}/{name}" if folder_rel else name

    @staticmethod
    def folder_rel(video: dict) -> str:
        return Path(video["storage_path"]).parent.as_posix()

    @staticmethod
    def stem(video: dict) -> str:
        return Path(video["storage_path"]).stem

    def sidecar_rel(self, video: dict, kind: str) -> str:
        return self.join(self.folder_rel(video), f"{self.stem(video)}{SIDECAR_SUFFIX[kind]}")

    def sidecar_for(self, source: Path, kind: str, filename: str | None = None) -> Path:
        if filename:
            return source.parent / Path(filename).name
        suffix = SIDECAR_SUFFIX.get(kind)
        if suffix is None:
            raise ValueError(f"asset kind {kind!r} needs a filename")
        return source.parent / f"{source.stem}{suffix}"

    def state_dir(self) -> Path:
        d = self.root / ".ytstudio"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def cache_dir(self, sub: str) -> Path:
        d = self.root / ".cache" / sub
        d.mkdir(parents=True, exist_ok=True)
        return d

    def music_dir(self) -> Path:
        return self.root / ".music"

    def overlays_dir(self) -> Path:
        return self.root / ".overlays"

    # ---- reads / writes -----------------------------------------------------

    def read_json(self, rel: str) -> dict:
        return json.loads(self.resolve(rel).read_text(encoding="utf-8"))

    def put_json(self, rel: str, data: dict) -> str:
        dest = self.resolve(rel)
        write_json_atomic(dest, data)
        return rel

    def output_path(self, rel: str) -> Path:
        p = self.resolve(rel)
        p.parent.mkdir(parents=True, exist_ok=True)
        return p

    def output_dir(self, rel_dir: str) -> Path:
        p = self.resolve(rel_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p

    def job_dir(self, job_id: str) -> Path:
        d = self.work_dir / "jobs" / str(job_id)
        d.mkdir(parents=True, exist_ok=True)
        return d

    def cleanup(self, job_id: str) -> None:
        shutil.rmtree(self.work_dir / "jobs" / str(job_id), ignore_errors=True)

    # ---- assets ------------------------------------------------------------

    def _summary(self, kind: str, p: Path, mtime: float) -> dict | None:
        key = str(p)
        with self._lock:
            hit = self._summary_cache.get(key)
            if hit and hit[0] == mtime:
                return hit[1]
        data = None
        if p.suffix == ".json":
            try:
                data = summarize_asset(kind, json.loads(p.read_text(encoding="utf-8")))
            except (OSError, ValueError):
                data = None
        with self._lock:
            self._summary_cache[key] = (mtime, data)
        return data

    def assets(self, video: dict) -> list[dict]:
        """Every derived file that exists for a video (kind, path, data, created_at)."""
        rel = video.get("storage_path")
        if not rel:
            return []
        src = self.root / rel
        folder, stem = src.parent, src.stem
        out = []
        for kind, pattern in ASSET_FILES.items():
            p = folder / pattern.format(stem=stem)
            try:
                st = p.stat()
            except OSError:
                continue
            out.append({
                "id": f"{video['id']}:{kind}", "kind": kind,
                "path": self.relative(p), "data": self._summary(kind, p, st.st_mtime),
                "created_at": iso(st.st_mtime),
            })
        return out

    # ---- scanning ----------------------------------------------------------

    def scan_folders(self):
        """Yield (info, main media Path, thumb Path|None, folder) for every
        `<folder>/*.info.json` in the library — v1's library scan."""
        for info_path in sorted(self.root.glob("*/*.info.json")):
            folder = info_path.parent
            if folder.name.startswith("."):
                continue
            try:
                info = json.loads(info_path.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                continue
            media = [f for f in folder.iterdir()
                     if f.suffix.lower() in MEDIA_EXTS and not f.stem.endswith(("_edit", "_tight"))]
            if not media:
                continue
            main = max(media, key=lambda f: f.stat().st_size)
            thumb = next((f for f in sorted(folder.iterdir()) if f.suffix.lower() in IMAGE_EXTS), None)
            yield info, main, thumb, folder


def write_json_atomic(dest: Path, data) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_name(dest.name + ".part")
    tmp.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")
    for attempt in range(5):  # Windows: a reader may briefly hold the old file
        try:
            os.replace(tmp, dest)
            return
        except PermissionError:
            time.sleep(0.05 * (attempt + 1))
    os.replace(tmp, dest)
