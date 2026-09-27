"""Library access for workers.

Two modes, same interface:
* local  — the library is mounted (the brain's compose worker): paths resolve
           straight to files, outputs are written in place.
* http   — inputs are fetched from the brain's file endpoints into a scratch
           dir, outputs are uploaded back. Sources are cached per video so
           rendering five clips pulls the 5 GB mkv once.

All `rel` paths are library-root-relative (posix separators).
"""

from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path
from typing import Callable

import requests

Progress = Callable[[int, int | None], None]  # (bytes_done, bytes_total)


class Storage:
    def __init__(self, brain_url: str, api_secret: str, work_dir: Path, library_dir: Path | None = None):
        self.brain_url = brain_url.rstrip("/")
        self.work_dir = Path(work_dir)
        self.library_dir = Path(library_dir).resolve() if library_dir else None
        self.session = requests.Session()
        if api_secret:
            self.session.headers["x-api-secret"] = api_secret

    @property
    def local(self) -> bool:
        return self.library_dir is not None

    # ---- scratch space ---------------------------------------------------

    def job_dir(self, job_id: str) -> Path:
        d = self.work_dir / "jobs" / str(job_id)
        d.mkdir(parents=True, exist_ok=True)
        return d

    def cleanup(self, job_id: str) -> None:
        shutil.rmtree(self.work_dir / "jobs" / str(job_id), ignore_errors=True)

    # ---- path helpers -----------------------------------------------------

    def resolve(self, rel: str) -> Path:
        """Local mode only: library-relative -> absolute, contained in the root."""
        if not self.local:
            raise RuntimeError("resolve() needs a mounted library (library_dir)")
        p = (self.library_dir / rel).resolve()
        if self.library_dir not in p.parents and p != self.library_dir:
            raise ValueError(f"path escapes the library: {rel}")
        return p

    @staticmethod
    def join(folder_rel: str, name: str) -> str:
        return f"{folder_rel.rstrip('/')}/{name}" if folder_rel else name

    # ---- reads ------------------------------------------------------------

    def _download(self, url: str, dest: Path, progress: Progress | None = None, params=None) -> Path:
        tmp = dest.with_name(dest.name + ".part")
        with self.session.get(url, stream=True, timeout=(10, 3600), params=params) as r:
            r.raise_for_status()
            total = int(r.headers.get("content-length") or 0) or None
            done = 0
            with tmp.open("wb") as fh:
                for chunk in r.iter_content(chunk_size=1 << 20):
                    fh.write(chunk)
                    done += len(chunk)
                    if progress:
                        progress(done, total)
        tmp.replace(dest)
        return dest

    def get_file(self, rel: str, progress: Progress | None = None) -> Path:
        """A local path for a library file. Local mode: the file itself.
        HTTP mode: fetched into work_dir/cache (reused across jobs)."""
        if self.local:
            p = self.resolve(rel)
            if not p.is_file():
                raise FileNotFoundError(rel)
            return p
        key = hashlib.sha1(rel.encode()).hexdigest()[:16]
        dest = self.work_dir / "cache" / f"{key}_{Path(rel).name}"
        dest.parent.mkdir(parents=True, exist_ok=True)
        head = self.session.head(f"{self.brain_url}/api/files/get", params={"path": rel}, timeout=30)
        head.raise_for_status()
        size = int(head.headers.get("content-length") or 0)
        if dest.is_file() and size and dest.stat().st_size == size:
            return dest
        return self._download(f"{self.brain_url}/api/files/get", dest, progress, params={"path": rel})

    def get_json(self, rel: str) -> dict:
        if self.local:
            return json.loads(self.resolve(rel).read_text(encoding="utf-8"))
        r = self.session.get(f"{self.brain_url}/api/files/get", params={"path": rel}, timeout=120)
        r.raise_for_status()
        return r.json()

    def fetch_audio(self, video_id: str, dest_dir: Path, progress: Progress | None = None) -> Path:
        """Mono AAC extract of a video's source (HTTP mode: ~0.5 MB/min)."""
        return self._download(f"{self.brain_url}/api/files/{video_id}/audio",
                              dest_dir / "audio.m4a", progress)

    # ---- writes -----------------------------------------------------------

    def put_file(self, rel: str, local_path: Path, move: bool = True) -> str:
        """Store a produced file at `rel` in the library. Returns rel."""
        local_path = Path(local_path)
        if self.local:
            dest = self.resolve(rel)
            if dest.resolve() != local_path.resolve():
                dest.parent.mkdir(parents=True, exist_ok=True)
                if move:
                    shutil.move(str(local_path), str(dest))
                else:
                    shutil.copy2(local_path, dest)
            return rel
        with local_path.open("rb") as fh:
            r = self.session.put(f"{self.brain_url}/api/files/put", params={"path": rel},
                                 data=fh, timeout=(10, 3600))
        r.raise_for_status()
        if move:
            local_path.unlink(missing_ok=True)
        return rel

    def put_json(self, rel: str, data: dict) -> str:
        body = json.dumps(data).encode("utf-8")
        if self.local:
            dest = self.resolve(rel)
            dest.parent.mkdir(parents=True, exist_ok=True)
            tmp = dest.with_name(dest.name + ".part")
            tmp.write_bytes(body)
            tmp.replace(dest)
            return rel
        r = self.session.put(f"{self.brain_url}/api/files/put", params={"path": rel},
                             data=body, headers={"content-type": "application/json"}, timeout=120)
        r.raise_for_status()
        return rel

    def output_path(self, rel: str, job_id: str) -> Path:
        """Where a core function should write a file that ends up at `rel`:
        the final location in local mode, scratch otherwise (then put_file)."""
        if self.local:
            p = self.resolve(rel)
            p.parent.mkdir(parents=True, exist_ok=True)
            return p
        p = self.job_dir(job_id) / Path(rel).name
        return p

    def output_dir(self, rel_dir: str, job_id: str) -> Path:
        if self.local:
            p = self.resolve(rel_dir)
            p.mkdir(parents=True, exist_ok=True)
            return p
        p = self.job_dir(job_id) / Path(rel_dir).name
        p.mkdir(parents=True, exist_ok=True)
        return p

    def put_dir(self, rel_dir: str, local_dir: Path) -> None:
        """Upload every file in local_dir under rel_dir (no-op in local mode)."""
        if self.local:
            return
        for f in sorted(Path(local_dir).iterdir()):
            if f.is_file():
                self.put_file(self.join(rel_dir, f.name), f, move=False)
