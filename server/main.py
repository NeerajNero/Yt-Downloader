"""FastAPI app: routes, library scan, static mounts, browser auto-open."""

import json
import subprocess
import sys
import threading
import time
import urllib.parse
import webbrowser
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).parent))
import downloader

ROOT = Path(__file__).resolve().parent.parent

_config = {"download_dir": "downloads", "port": 8765}
config_file = ROOT / "config.json"
if config_file.exists():
    _config.update(json.loads(config_file.read_text()))

DOWNLOAD_DIR = Path(_config["download_dir"])
if not DOWNLOAD_DIR.is_absolute():
    DOWNLOAD_DIR = ROOT / DOWNLOAD_DIR
DOWNLOAD_DIR = DOWNLOAD_DIR.resolve()
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
PORT = int(_config["port"])

app = FastAPI(title="YT Studio")


def _safe_path(raw):
    """Resolve a client-supplied path; reject anything outside the downloads dir."""
    p = Path(raw).resolve()
    if p != DOWNLOAD_DIR and DOWNLOAD_DIR not in p.parents:
        raise HTTPException(400, "That path is outside the downloads folder.")
    return p


class DownloadBody(BaseModel):
    url: str
    quality: str
    title: str | None = None


class PathBody(BaseModel):
    path: str


@app.get("/api/config")
def get_config():
    return {"download_dir": str(DOWNLOAD_DIR)}


@app.get("/api/probe")
def api_probe(url: str):
    try:
        return downloader.probe(url)
    except Exception as exc:
        raise HTTPException(400, f"Could not read that link: {exc}")


@app.post("/api/download")
def api_download(body: DownloadBody):
    return downloader.start_download(
        body.url, body.quality, DOWNLOAD_DIR, title=body.title
    )


@app.get("/api/jobs")
def api_jobs():
    return downloader.list_jobs()


@app.post("/api/jobs/{job_id}/cancel")
def api_cancel(job_id: str):
    if not downloader.cancel_job(job_id):
        raise HTTPException(404, "No job with that id.")
    return {"ok": True}


@app.post("/api/jobs/clear")
def api_clear():
    return {"cleared": downloader.clear_finished()}


@app.get("/api/library")
def api_library():
    items = []
    for info_path in DOWNLOAD_DIR.glob("*/*.info.json"):
        folder = info_path.parent
        try:
            info = json.loads(info_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue

        media = [
            f for f in folder.iterdir()
            if f.suffix.lower() in downloader.MEDIA_EXTS
            and not f.stem.endswith("_edit")
        ]
        if not media:
            continue
        main = max(media, key=lambda f: f.stat().st_size)

        edits = sorted(folder.glob("*_edit.mp4"))
        edit_path = str(edits[0]) if edits else None

        thumb = None
        for f in sorted(folder.iterdir()):
            if f.suffix.lower() in {".webp", ".jpg", ".jpeg", ".png"}:
                thumb = "/files/" + "/".join(
                    urllib.parse.quote(part)
                    for part in f.relative_to(DOWNLOAD_DIR).parts
                )
                break
        if thumb is None:
            thumb = info.get("thumbnail")

        items.append({
            "title": info.get("title") or main.stem,
            "uploader": info.get("uploader"),
            "duration": info.get("duration"),
            "width": info.get("width"),
            "height": info.get("height"),
            "vcodec": info.get("vcodec"),
            "size": main.stat().st_size,
            "path": str(main),
            "edit_path": edit_path,
            "folder": str(folder),
            "thumb": thumb,
            "downloaded_at": info_path.stat().st_mtime,
        })
    items.sort(key=lambda i: i["downloaded_at"], reverse=True)
    return items


@app.post("/api/convert")
def api_convert(body: PathBody):
    src = _safe_path(body.path)
    if not src.is_file():
        raise HTTPException(404, "That file no longer exists.")
    return downloader.start_convert(src)


@app.post("/api/reveal")
def api_reveal(body: PathBody):
    target = _safe_path(body.path)
    if not target.exists():
        raise HTTPException(404, "That path no longer exists.")
    if sys.platform == "win32":
        if target.is_file():
            subprocess.Popen(["explorer", f"/select,{target}"])
        else:
            subprocess.Popen(["explorer", str(target)])
    elif sys.platform == "darwin":
        if target.is_file():
            subprocess.Popen(["open", "-R", str(target)])
        else:
            subprocess.Popen(["open", str(target)])
    else:
        folder = target.parent if target.is_file() else target
        subprocess.Popen(["xdg-open", str(folder)])
    return {"ok": True}


# Static mounts — registered after all API routes.
app.mount("/files", StaticFiles(directory=str(DOWNLOAD_DIR)), name="files")

DIST = ROOT / "ui" / "dist"
if DIST.is_dir():
    app.mount("/", StaticFiles(directory=str(DIST), html=True), name="ui")
else:
    @app.get("/")
    def no_ui():
        return {
            "hint": "UI not built yet. Run `npm install && npm run build` "
                    "inside the ui folder, then restart the server."
        }


def _open_browser():
    time.sleep(1)
    webbrowser.open(f"http://127.0.0.1:{PORT}/")


if __name__ == "__main__":
    import uvicorn

    threading.Thread(target=_open_browser, daemon=True).start()
    uvicorn.run(app, host="127.0.0.1", port=PORT)
