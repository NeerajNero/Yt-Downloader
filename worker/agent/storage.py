"""Library access for workers without a mounted library: download inputs from
the brain's file endpoints into a scratch dir, upload results back.

Paths in job rows are library-relative; the brain resolves them. Workers only
ever see video ids here.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Callable

import requests

Progress = Callable[[int, int | None], None]  # (bytes_done, bytes_total)


class Storage:
    def __init__(self, brain_url: str, api_secret: str, work_dir: Path):
        self.brain_url = brain_url.rstrip("/")
        self.work_dir = work_dir
        self.session = requests.Session()
        if api_secret:
            self.session.headers["x-api-secret"] = api_secret

    # ---- scratch space ---------------------------------------------------

    def job_dir(self, job_id: str) -> Path:
        d = self.work_dir / str(job_id)
        d.mkdir(parents=True, exist_ok=True)
        return d

    def cleanup(self, job_id: str) -> None:
        shutil.rmtree(self.work_dir / str(job_id), ignore_errors=True)

    # ---- downloads --------------------------------------------------------

    def _download(self, url: str, dest: Path, progress: Progress | None = None) -> Path:
        tmp = dest.with_suffix(dest.suffix + ".part")
        with self.session.get(url, stream=True, timeout=(10, 600)) as r:
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

    def fetch_audio(self, video_id: str, dest_dir: Path, progress: Progress | None = None) -> Path:
        """AAC audio-only extract of the source (small: ~0.5 MB/min)."""
        return self._download(f"{self.brain_url}/api/files/{video_id}/audio",
                              dest_dir / "audio.m4a", progress)

    def fetch_source(self, video_id: str, dest_dir: Path, filename: str,
                     progress: Progress | None = None) -> Path:
        return self._download(f"{self.brain_url}/api/files/{video_id}/source",
                              dest_dir / filename, progress)

    # ---- uploads ----------------------------------------------------------

    def upload_asset(self, video_id: str, kind: str, data: bytes | dict,
                     job_id: str | None = None, filename: str | None = None) -> dict:
        """POST a result file; the brain writes it next to the media and upserts
        the `assets` row. JSON kinds (transcript, scenes, ...) may pass a dict."""
        if isinstance(data, dict):
            body = json.dumps(data).encode("utf-8")
            content_type = "application/json"
        else:
            body = data
            content_type = "application/octet-stream"
        params = {}
        if job_id:
            params["job_id"] = str(job_id)
        if filename:
            params["filename"] = filename
        r = self.session.post(
            f"{self.brain_url}/api/files/{video_id}/assets/{kind}",
            params=params, data=body, headers={"content-type": content_type},
            timeout=(10, 600),
        )
        r.raise_for_status()
        return r.json()
