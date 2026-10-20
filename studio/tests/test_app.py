"""Store, queue, pipeline and HTTP API against a temporary library — no
ffmpeg needed (noop jobs; media files are stand-ins)."""

from __future__ import annotations

import json
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from studio import context, pipeline
from studio.config import Settings
from studio.core.transcribe import WhisperConfig
from studio.library import Library
from studio.main import create_app
from studio.queue import JobQueue
from studio.store import Store


def _settings(tmp_path: Path) -> Settings:
    return Settings(library_dir=tmp_path / "lib", work_dir=tmp_path / "work", web_dist=tmp_path / "dist",
                    host="127.0.0.1", port=0, ffmpeg_path="ffmpeg", encoder="libx264", whisper=WhisperConfig(),
                    cookies_file=None, open_browser=False, heavy_workers=1, light_workers=1, import_presets=False)


def _fake_video(root: Path, name: str, yt_id: str | None = "abc123def45") -> Path:
    folder = root / name
    folder.mkdir(parents=True)
    main = folder / f"{name}.mkv"
    main.write_bytes(b"\x00" * 1000)
    info = {"title": name, "uploader": "someone", "duration": 30, "width": 1920, "height": 1080,
            "extractor_key": "Youtube" if yt_id else "local", "webpage_url": f"https://youtu.be/{yt_id}"}
    if yt_id:
        info["id"] = yt_id
    (folder / f"{name}.info.json").write_text(json.dumps(info))
    (folder / f"{name}.jpg").write_bytes(b"jpg")
    return main


@pytest.fixture
def client(tmp_path):
    s = _settings(tmp_path)
    _fake_video(s.library_dir, "First video")
    app = create_app(s)
    with TestClient(app) as c:
        yield c


def wait_for(client: TestClient, job_id: str, statuses=("done", "error", "cancelled"), timeout=10.0) -> dict:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        job = next(j for j in client.get("/api/jobs").json() if j["id"] == job_id)
        if job["status"] in statuses:
            return job
        time.sleep(0.05)
    raise AssertionError(f"job {job_id} did not reach {statuses}")


# ---- store ----------------------------------------------------------------------------

def test_store_indexes_disk_and_persists(tmp_path):
    lib = Library(tmp_path / "lib", tmp_path / "work")
    _fake_video(lib.root, "Zoo")
    _fake_video(lib.root, "Local clip", yt_id=None)
    store = Store(lib)
    store.load()
    stats = store.reconcile()
    assert stats == {"added": 2, "missing": 0, "videos": 2}
    zoo = store.find_video(youtube_id="abc123def45")
    assert zoo["status"] == "ready" and zoo["storage_path"] == "Zoo/Zoo.mkv" and zoo["thumb_path"] == "Zoo/Zoo.jpg"
    assert [a["kind"] for a in store.assets(zoo)] == []
    # sidecar appears -> asset appears (after the short cache)
    (lib.root / "Zoo" / "Zoo.scenes.json").write_text(json.dumps({"scenes": [1, 2], "threshold": 0.3}))
    store.invalidate_assets(zoo["id"])
    assert store.asset(zoo, "scenes")["data"] == {"scenes": 2, "threshold": 0.3}
    # clips live next to the media and survive a reload
    c = store.add_clip(zoo["id"], 1, 5, title="hook")
    store.update_clip(c["id"], status="approved")
    assert (lib.root / "Zoo" / "Zoo.clips.json").is_file()
    store2 = Store(lib)
    store2.load()
    assert store2.get_clip(c["id"])["status"] == "approved"
    assert store2.get_video(zoo["id"])["title"] == "Zoo"
    # removing hides the folder from future rescans; default recipe seeded once
    store2.delete_video(zoo["id"])
    assert store2.reconcile()["added"] == 0 and store2.get_video(zoo["id"]) is None
    assert [r["name"] for r in store2.list_recipes()] == ["auto-shorts-default"]
    # missing file is flagged
    (lib.root / "Local clip" / "Local clip.mkv").unlink()
    assert store2.reconcile()["missing"] == 1


# ---- queue --------------------------------------------------------------------------------

def test_queue_runs_cancels_and_retries():
    seen = []

    def handler(job, report, should_cancel):
        seen.append(job["type"])
        for i in range(20):
            if should_cancel():
                from studio.core.errors import Cancelled
                raise Cancelled()
            report(i * 5, f"step {i}")
            time.sleep(0.02)
        if job["payload"].get("fail"):
            raise RuntimeError("boom")
        return {"ok": True}

    done = []
    q = JobQueue(handler, on_finished=lambda j: done.append(j["id"]), heavy_workers=1, light_workers=1)
    q.start()
    try:
        a = q.enqueue("noop", payload={})
        b = q.enqueue("noop", payload={"fail": True})
        c = q.enqueue("render", payload={})
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline and not all(q.get(x)["status"] in ("done", "error") for x in (a["id"], b["id"], c["id"])):
            time.sleep(0.02)
        assert q.get(a["id"])["status"] == "done" and q.get(a["id"])["result"]["ok"] is True
        assert q.get(b["id"])["status"] == "error" and "boom" in q.get(b["id"])["error"]
        assert q.get(c["id"])["status"] == "done"
        assert done == [a["id"], c["id"]] or set(done) == {a["id"], c["id"]}
        # retry the failed one with a fixed payload
        q.get(b["id"])["payload"]["fail"] = False
        q.retry(b["id"])
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline and q.get(b["id"])["status"] != "done":
            time.sleep(0.02)
        assert q.get(b["id"])["status"] == "done" and q.get(b["id"])["attempts"] == 2
        # cancel a running job
        d = q.enqueue("noop", payload={})
        time.sleep(0.1)
        assert q.get(d["id"])["status"] == "running"
        q.cancel(d["id"])
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline and q.get(d["id"])["status"] != "cancelled":
            time.sleep(0.02)
        assert q.get(d["id"])["status"] == "cancelled"
        assert q.clear_finished() == 4
    finally:
        q.stop()


# ---- api + pipeline ---------------------------------------------------------------------------

def test_api_library_jobs_clips_recipes(client: TestClient):
    videos = client.get("/api/videos").json()
    assert len(videos) == 1 and videos[0]["title"] == "First video" and videos[0]["status"] == "ready"
    vid = videos[0]["id"]

    r = client.post("/api/jobs", json={"type": "noop", "video_id": vid, "payload": {"seconds": 0.2}})
    assert r.status_code == 200
    job_id = r.json()["job_id"]
    # duplicate active job of the same type is returned, not queued twice
    assert client.post("/api/jobs", json={"type": "noop", "video_id": vid, "payload": {}}).json()["job_id"] == job_id
    assert wait_for(client, job_id)["status"] == "done"
    detail = client.get(f"/api/videos/{vid}").json()
    assert detail["jobs"][0]["status"] == "done"

    # payload validation surfaces plain errors
    r = client.post("/api/jobs", json={"type": "render", "video_id": vid, "payload": {"start": 5, "end": 2}})
    assert r.status_code == 400 and "after start" in r.json()["detail"]
    r = client.post("/api/jobs", json={"type": "render", "video_id": vid, "payload": {"start": 0, "end": 2, "bogus": 1}})
    assert r.status_code == 400 and "bogus" in r.json()["detail"]

    # clips + review
    c = client.post("/api/clips", json={"video_id": vid, "start_s": 1, "end_s": 4, "title": "t"}).json()
    assert c["peak_s"] is None
    assert client.patch(f"/api/clips/{c['id']}", json={"status": "approved"}).json()["status"] == "approved"
    # peak_s round-trip: set, keep when not sent, move the range, clear with null
    assert client.post("/api/clips", json={"video_id": vid, "start_s": 1, "end_s": 4, "peak_s": -2}).status_code == 400
    c2 = client.post("/api/clips", json={"video_id": vid, "start_s": 10, "end_s": 18, "peak_s": 12.5}).json()
    assert c2["peak_s"] == 12.5
    assert client.patch(f"/api/clips/{c['id']}", json={"peak_s": 2.25}).json()["peak_s"] == 2.25
    assert client.patch(f"/api/clips/{c['id']}", json={"title": "moved"}).json()["peak_s"] == 2.25
    r = client.patch(f"/api/clips/{c['id']}", json={"start_s": 0.5, "end_s": 9.5}).json()
    assert (r["start_s"], r["end_s"], r["peak_s"]) == (0.5, 9.5, 2.25)
    assert client.patch(f"/api/clips/{c['id']}", json={"end_s": 0.2}).status_code == 400
    assert client.patch(f"/api/clips/{c['id']}", json={"peak_s": -1}).status_code == 400
    assert client.patch(f"/api/clips/{c['id']}", json={"peak_s": None}).json()["peak_s"] is None
    assert next(x for x in client.get(f"/api/videos/{vid}").json()["clips"] if x["id"] == c2["id"])["peak_s"] == 12.5
    client.delete(f"/api/clips/{c2['id']}")
    assert client.get("/api/review/count").json() == {"count": 0}  # no output file yet
    assert client.get(f"/api/files/{vid}/timeline.fcpxml?status=approved").status_code == 200
    client.delete(f"/api/clips/{c['id']}")
    assert client.get(f"/api/videos/{vid}").json()["clips"] == []

    # recipes
    r = client.post("/api/recipes", json={"name": "mine", "settings": {"style": "crop", "captions": False}})
    assert r.status_code == 200
    rid = r.json()["id"]
    assert client.post("/api/recipes", json={"name": "mine", "settings": {}}).status_code == 400
    assert client.patch(f"/api/recipes/{rid}", json={"auto_apply": True}).json()["auto_apply"] is True
    assert client.patch(f"/api/recipes/{rid}", json={"settings": {"nope": 1}}).status_code == 400
    names = [x["name"] for x in client.get("/api/recipes").json()]
    assert names == ["auto-shorts-default", "mine"]

    # note + pipeline edits, removal
    assert client.patch(f"/api/videos/{vid}", json={"note": " idea ", "pipeline": "prepare"}).json()["note"] == "idea"
    assert client.delete(f"/api/videos/{vid}").json() == {"ok": True}
    assert client.get(f"/api/videos/{vid}").status_code == 404
    assert client.get("/api/videos").json() == []


def test_music_upload_queues_beats_and_keeps_manual_drop(client: TestClient, monkeypatch):
    from studio.core import beats

    def fake_analyze(path, tools, should_cancel, report=None, name=None, load=None):
        return {**beats.empty_grid(name or Path(path).name, 30.0), "bpm": 120.0,
                "beats": [0.5, 1.0, 1.5, 2.0], "downbeats": [0.5], "drop_s": 1.5}

    monkeypatch.setattr(beats, "analyze_track", fake_analyze)
    r = client.post("/api/music?filename=song.mp3", content=b"\x00" * 100)
    assert r.status_code == 200 and r.json()["name"] == "song.mp3"
    job_id = r.json()["beats_job_id"]
    assert job_id and wait_for(client, job_id)["status"] == "done"
    assert client.get("/api/music").json() == ["song.mp3"]
    g = client.get("/api/music/song.mp3/beats").json()
    assert g["bpm"] == 120.0 and g["drop_s"] == 1.5 and g["drop_effective"] == 1.5 and g["current"] is True
    assert g["drop_s_manual"] is None and g["downbeats_method"] == "onset_phase_4_4"
    lib = context.app.lib
    assert (lib.root / ".music" / "song.mp3.beats.json").is_file()
    assert "song.mp3.beats.json" not in client.get("/api/music").json()
    # manual drop wins and survives a re-analysis after a version bump
    g = client.patch("/api/music/song.mp3/beats", json={"drop_s_manual": 9.25}).json()
    assert g["drop_s_manual"] == 9.25 and g["drop_effective"] == 9.25
    assert client.patch("/api/music/song.mp3/beats", json={"drop_s_manual": -1}).status_code == 400
    assert client.patch("/api/music/nope.mp3/beats", json={"drop_s_manual": 1}).status_code == 404
    stale = lib.read_beats("song.mp3")
    stale["version"] = 0
    lib.put_json(lib.beats_rel("song.mp3"), stale)
    assert client.get("/api/music/song.mp3/beats").json()["current"] is False
    r = client.post("/api/library/rescan").json()
    assert r["beats_queued"] == 1 and r["videos"] == 1
    job = next(j for j in client.get("/api/jobs").json() if j["type"] == "beats" and j["status"] != "done")
    assert wait_for(client, job["id"])["status"] == "done"
    g = client.get("/api/music/song.mp3/beats").json()
    assert g["current"] is True and g["drop_s"] == 1.5 and g["drop_s_manual"] == 9.25 and g["drop_effective"] == 9.25
    # nothing to do now: rescan queues no beats job, and a track never analysed gets one
    assert client.post("/api/library/rescan").json()["beats_queued"] == 0
    (lib.music_dir() / "other.wav").write_bytes(b"\x00" * 10)
    assert client.post("/api/music/beats/rescan").json()["queued"] == 1
    assert client.post("/api/music/beats/rescan").json()["queued"] == 0  # already active: deduped on name
    # clearing the override
    g = client.patch("/api/music/song.mp3/beats", json={"drop_s_manual": None}).json()
    assert g["drop_s_manual"] is None and g["drop_effective"] == 1.5
    # setting a drop before any analysis writes a stub and queues the job
    (lib.music_dir() / "third.mp3").write_bytes(b"\x00" * 10)
    g = client.patch("/api/music/third.mp3/beats", json={"drop_s_manual": 4.0}).json()
    assert g["current"] is False and g["drop_effective"] == 4.0
    assert sum(1 for j in client.get("/api/jobs").json() if j["type"] == "beats") == 4  # song x2, other, third
    for j in client.get("/api/jobs").json():
        if j["status"] in ("queued", "running"):
            client.post(f"/api/jobs/{j['id']}/cancel")


def test_pipeline_fans_out(client: TestClient, tmp_path):
    app = context.app
    v = app.store.list_videos()[0]
    app.store.update_video(v["id"], pipeline="shorts")
    made = pipeline.on_video_ready(app.store.get_video(v["id"]))
    assert sorted(j["type"] for j in made) == ["borders", "scenes", "transcribe"]
    # a second call is a no-op while those are active
    assert pipeline.on_video_ready(app.store.get_video(v["id"])) == []
    # the auto-shorts render fan-out: one render per proposed AI clip per auto-apply recipe
    src = app.lib.resolve(v["storage_path"])
    (src.parent / f"{src.stem}.transcript.json").write_text(json.dumps({"segments": [{"words": [{}] * 30}]}))
    (src.parent / f"{src.stem}.scenes.json").write_text(json.dumps({"scenes": [3.0]}))
    app.store.invalidate_assets(v["id"])
    app.store.add_clip(v["id"], 0, 5, origin="ai_suggest", status="proposed", title="a")
    app.store.add_clip(v["id"], 6, 9, origin="ai_suggest", status="proposed", title="b")
    app.store.add_recipe("second", None, {"style": "crop"}, True)
    have = {a["kind"]: a for a in app.store.assets(app.store.get_video(v["id"]))}
    renders = pipeline.auto_render(app.store.get_video(v["id"]), have)
    assert len(renders) == 4
    assert len(app.store.clips_for(v["id"])) == 4
    payloads = [r["payload"] for r in renders]
    assert all("auto_trim" not in p and "captions_if_speech" not in p for p in payloads)
    assert all("peak_s" not in p for p in payloads)  # AI picks carry no peak yet
    assert any(p.get("captions") for p in payloads)  # 30 words -> captions kept
    for r in renders:
        app.queue.cancel(r["id"])
