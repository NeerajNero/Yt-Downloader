"""Draft previews: hash, the 540 px / proxy / no-loudnorm switch, the preview
lane, supersede-cancel per video, cache hits and LRU eviction. ffmpeg mocked."""

from __future__ import annotations

import os
import threading
import time
from pathlib import Path
from unittest import mock

from fastapi.testclient import TestClient

from studio import context, preview
from studio.core import render
from studio.core.errors import Cancelled
from studio.core.ffmpeg import Tools
from studio.queue import JobQueue
from studio.tests.test_app import client, wait_for  # noqa: F401  (fixture + helper)


def test_preview_hash_stable_and_sensitive():
    p = {"start": 1, "end": 5, "music": "bed.mp3", "effects": {"grain": 10}}
    h = preview.preview_hash(p, 1, 12.0, 100.0)
    assert h == preview.preview_hash(dict(p), 1, 12.0, 100.0) and len(h) == 16
    assert preview.preview_hash(p, 1, 13.0, 100.0) != h            # the track's drop moved
    assert preview.preview_hash(p, 2, 12.0, 100.0) != h            # beat grid version
    assert preview.preview_hash(p, 1, 12.0, 101.0) != h            # source file changed
    assert preview.preview_hash({**p, "grade": "warm"}, 1, 12.0, 100.0) != h
    assert preview.preview_url("vid", h) == f"/api/preview/vid/{h}.mp4" and preview.PREVIEW_NAME.match(f"{h}.mp4")


def test_preview_graph_is_540px_proxy_without_loudnorm(tmp_path):
    src = tmp_path / "src.mkv"; src.write_bytes(b"x")
    seen = {}

    def fake_run(self, cmd, duration, report, should_cancel, note=None, stderr_sink=None):
        seen["cmd"] = cmd

    def graph():
        return seen["cmd"][seen["cmd"].index("-filter_complex") + 1]

    with mock.patch.object(Tools, "run_progress", fake_run), mock.patch.object(Tools, "probe_fps", return_value=60.0):
        s = render.RenderSettings(start=0, end=5, loudness=True, style="blur", music="")
        render.run_export(src, tmp_path / "o.mp4", s, Tools("ffmpeg"), "libx264", lambda *_: None, lambda: False, preview=True)
        cmd = " ".join(seen["cmd"])
        assert "scale=540:960" in graph() and "fps=30.0000" in graph() and "loudnorm" not in cmd
        assert "-c:v libx264 -crf 30 -preset veryfast" in cmd            # proxy profile
        # the very same settings as a final render: full size, final profile, loudnorm, source fps
        render.run_export(src, tmp_path / "o.mp4", s, Tools("ffmpeg"), "libx264", lambda *_: None, lambda: False)
        cmd = " ".join(seen["cmd"])
        assert "scale=1080:1920" in graph() and "fps=30" not in graph() and "loudnorm" in cmd and "-crf 18 -preset medium" in cmd
        # a montage: every shot is retimed at the capped fps, framed at 540 px; landscape gives 960x540
        s2 = render.RenderSettings(segments=[{"start": 0, "end": 2}, {"start": 4, "end": 6, "speed": 2}], transition={"type": "cut"}, style="crop",
                                   loudness=True, orientation="landscape")
        render.run_export(src, tmp_path / "o.mp4", s2, Tools("ffmpeg"), "libx264", lambda *_: None, lambda: False, preview=True)
        cmd = " ".join(seen["cmd"])
        assert graph().count("fps=30.0000") == 2 and "scale=960:540" in graph() and "loudnorm" not in cmd and "-crf 30" in cmd
        # a 24 fps source is not raised to 30
        with mock.patch.object(Tools, "probe_fps", return_value=24.0):
            render.run_export(src, tmp_path / "o.mp4", s, Tools("ffmpeg"), "libx264", lambda *_: None, lambda: False, preview=True)
        assert "fps=" not in graph()


def test_preview_lane_never_waits_for_a_render():
    gate = threading.Event()

    def handler(job, report, should_cancel):
        if job["type"] == "render":
            gate.wait(5)
        return {"ok": True}

    q = JobQueue(handler, heavy_workers=1, light_workers=1, preview_workers=1)
    q.start()
    try:
        r = q.enqueue("render", video_id="v")
        time.sleep(0.1)
        assert q.get(r["id"])["status"] == "running"
        p = q.enqueue("preview", video_id="v")
        deadline = time.monotonic() + 3
        while time.monotonic() < deadline and q.get(p["id"])["status"] != "done":
            time.sleep(0.02)
        assert q.get(p["id"])["status"] == "done" and q.get(r["id"])["status"] == "running"
        # and the preview worker never picks up light or heavy jobs
        n = q.enqueue("noop", video_id="v")
        deadline = time.monotonic() + 3
        while time.monotonic() < deadline and q.get(n["id"])["status"] != "done":
            time.sleep(0.02)
        assert q.get(n["id"])["status"] == "done"
    finally:
        gate.set()
        q.stop()


def test_preview_api_supersedes_caches_and_streams(client: TestClient, monkeypatch):  # noqa: F811
    app = context.app
    vid = app.store.list_videos()[0]["id"]
    starts: list[str] = []
    release = threading.Event()

    def slow_export(src, out, s, tools, encoder, report, should_cancel, **kw):
        starts.append(Path(out).name)
        while not should_cancel() and not release.is_set():
            time.sleep(0.02)
        if should_cancel():
            raise Cancelled()
        Path(out).write_bytes(b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 64)
        return out

    monkeypatch.setattr("studio.jobs.preview.core.run_export", slow_export)
    no_inputs = {"transcript": None, "manual_captions": None, "music_path": None, "watermark_path": None, "sfx_paths": [], "fx_paths": []}
    monkeypatch.setattr("studio.jobs.preview.resolve_inputs", lambda ctx, v, s: no_inputs)

    r1 = client.post(f"/api/videos/{vid}/preview", json={"payload": {"start": 0, "end": 3}}).json()
    assert r1["cached"] is False and r1["url"] == f"/api/preview/{vid}/{r1['hash']}.mp4"
    deadline = time.monotonic() + 3
    while time.monotonic() < deadline and len(starts) < 1:
        time.sleep(0.02)
    assert starts == [f"{r1['hash']}.mp4"]
    # a new preview for the same video cancels the running one
    r2 = client.post(f"/api/videos/{vid}/preview", json={"payload": {"start": 0, "end": 4}}).json()
    assert r2["superseded"] == 1 and r2["hash"] != r1["hash"]
    assert wait_for(client, r1["job_id"])["status"] == "cancelled"
    deadline = time.monotonic() + 3
    while time.monotonic() < deadline and len(starts) < 2:
        time.sleep(0.02)
    release.set()
    done = wait_for(client, r2["job_id"])
    assert done["status"] == "done" and done["result"]["cached"] is False and done["result"]["url"] == r2["url"]
    # the file exists under work/preview, counts as nothing in the library, and a cache hit needs no job
    f = app.lib.work_dir / "preview" / vid / f"{r2['hash']}.mp4"
    assert f.is_file() and [a["kind"] for a in app.store.assets(app.store.get_video(vid))] == []
    app.store.reconcile()
    assert f.is_file()
    r3 = client.post(f"/api/videos/{vid}/preview", json={"payload": {"start": 0, "end": 4}}).json()
    assert r3 == {"job_id": None, "cached": True, "url": r2["url"], "hash": r2["hash"]}
    assert len(starts) == 2
    # streams with range support so the player can seek
    g = client.get(r2["url"])
    assert g.status_code == 200 and g.headers["content-type"] == "video/mp4" and g.headers.get("accept-ranges") == "bytes"
    g = client.get(r2["url"], headers={"Range": "bytes=0-7"})
    assert g.status_code == 206 and len(g.content) == 8
    assert client.get(f"/api/preview/{vid}/nope.mp4").status_code == 404
    assert client.get(f"/api/preview/{vid}/{'0' * 16}.mp4").status_code == 404
    # payloads are validated like a render's
    assert client.post(f"/api/videos/{vid}/preview", json={"payload": {"start": 5, "end": 2}}).status_code == 400
    assert client.post(f"/api/videos/{vid}/preview", json={"payload": {"start": 0, "end": 2, "bogus": 1}}).status_code == 400
    # the job never touched a clip row
    assert app.store.clips_for(vid) == []


def test_preview_lru_eviction(tmp_path):
    work = tmp_path / "work"
    for i in range(33):
        p = preview.preview_dir(work, f"v{i % 3}") / f"{i:016x}.mp4"
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(b"x")
        os.utime(p, (1000 + i, 1000 + i))
    protect = preview.preview_dir(work, "v0") / f"{0:016x}.mp4"   # the oldest, but the one being rendered now
    gone = preview.evict_lru(work, keep=30, protect={protect})
    assert sorted(int(p.stem, 16) for p in gone) == [1, 2, 3] and protect.is_file()
    assert len(preview.list_previews(work)) == 30
    # a cache hit refreshes recency: the touched file survives the next eviction, the stale one goes
    touched = preview.preview_dir(work, "v1") / f"{4:016x}.mp4"
    preview.touch(touched)
    gone = preview.evict_lru(work, keep=29)
    assert [int(p.stem, 16) for p in gone] == [0] and touched.is_file()
    # files that don't look like previews are never touched
    stray = work / "preview" / "v0" / "notes.txt"
    stray.write_text("x")
    preview.evict_lru(work, keep=0)
    assert stray.is_file() and preview.list_previews(work) == []
