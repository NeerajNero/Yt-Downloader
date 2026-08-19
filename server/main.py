"""FastAPI app: routes, library scan, static mounts, browser auto-open."""

import json
import os
import subprocess
import sys
import threading
import time
import urllib.parse
import webbrowser
from pathlib import Path

# ── Patch PATH so child tools (ffmpeg, node, deno) are always found ───────────
import shutil as _shutil

def _add_to_path(directory):
    """Prepend a directory to os.environ['PATH'] if it exists."""
    if directory and Path(directory).is_dir():
        os.environ["PATH"] = str(directory) + os.pathsep + os.environ.get("PATH", "")

def _find_exe_dir(name):
    """Find the directory containing `name` (.exe), checking PATH then WinGet."""
    hit = _shutil.which(name)
    if hit:
        return str(Path(hit).parent)
    winget_pkgs = Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "WinGet" / "Packages"
    if winget_pkgs.is_dir():
        for pkg_dir in winget_pkgs.iterdir():
            for exe in pkg_dir.rglob(f"{name}.exe"):
                return str(exe.parent)
            for exe in pkg_dir.rglob(f"{name}.EXE"):
                return str(exe.parent)
    return None

for _tool in ("ffmpeg", "node", "deno"):
    _dir = _find_exe_dir(_tool)
    if _dir:
        _add_to_path(_dir)
# ──────────────────────────────────────────────────────────────────────────────



from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).parent))
import downloader
import ai

ROOT = Path(__file__).resolve().parent.parent

_config = {
    "download_dir": "downloads",
    "port": 8765,
    "cookies_file": "cookies.txt",
    "pipeline_cmd": None,   # e.g. ["python", "D:\\vod-pipeline\\autopipe.py"]
}
config_file = ROOT / "config.json"
if config_file.exists():
    _config.update(json.loads(config_file.read_text()))


def _apply_env_overrides():
    """Overlay machine-local settings from .env (gitignored) and OS env vars.

    config.json holds shared defaults and is committed; per-machine paths go
    in .env so branches never conflict on them. OS environment wins over .env.
    Keys: DOWNLOAD_DIR, PORT, COOKIES_FILE, PIPELINE_CMD (a shell-style string,
    e.g. `python D:\\vod-pipeline\\autopipe.py`).
    """
    values = {}
    env_file = ROOT / ".env"
    if env_file.is_file():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            values[key.strip()] = val.strip()
            # Expose to modules that read os.environ (GEMINI_*, WHISPER_MODEL…);
            # a real environment variable still wins.
            os.environ.setdefault(key.strip(), val.strip().strip("'\""))
    for key in ("DOWNLOAD_DIR", "PORT", "COOKIES_FILE", "PIPELINE_CMD"):
        if key in os.environ:
            values[key] = os.environ[key]

    def unquote(v):
        if len(v) >= 2 and v[0] == v[-1] and v[0] in "'\"":
            return v[1:-1]
        return v

    if values.get("DOWNLOAD_DIR"):
        _config["download_dir"] = unquote(values["DOWNLOAD_DIR"])
    if values.get("PORT"):
        _config["port"] = int(unquote(values["PORT"]))
    if values.get("COOKIES_FILE"):
        _config["cookies_file"] = unquote(values["COOKIES_FILE"])
    if values.get("PIPELINE_CMD"):
        # shlex handles quoting, so paths with spaces work:
        # PIPELINE_CMD="C:\Program Files\Python\python.exe" D:\pipe\autopipe.py
        # Windows needs posix=False or backslashes in paths get eaten.
        import shlex
        if os.name == "nt":
            _config["pipeline_cmd"] = [
                t.strip('"') for t in shlex.split(values["PIPELINE_CMD"], posix=False)
            ]
        else:
            _config["pipeline_cmd"] = shlex.split(values["PIPELINE_CMD"])


_apply_env_overrides()

DOWNLOAD_DIR = Path(_config["download_dir"])
if not DOWNLOAD_DIR.is_absolute():
    DOWNLOAD_DIR = ROOT / DOWNLOAD_DIR
DOWNLOAD_DIR = DOWNLOAD_DIR.resolve()
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
PORT = int(_config["port"])


def _cookiefile():
    """The configured cookies file, or None when it doesn't exist.

    Checked per request so dropping in / refreshing cookies.txt needs no restart.
    """
    p = Path(_config["cookies_file"])
    if not p.is_absolute():
        p = ROOT / p
    return p if p.is_file() else None

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


class ExportBody(BaseModel):
    path: str
    start: float
    end: float
    style: str = "crop"
    vivid: bool = False
    trim_x: float = 0.0
    trim_y: float = 0.0
    fg_crop: float = 0.0
    captions: bool = False


class SuggestBody(BaseModel):
    path: str
    count: int = 5


def _files_url(p):
    return "/files/" + "/".join(
        urllib.parse.quote(part) for part in p.relative_to(DOWNLOAD_DIR).parts
    )


@app.get("/api/config")
def get_config():
    return {
        "download_dir": str(DOWNLOAD_DIR),
        "pipeline_enabled": bool(_config.get("pipeline_cmd")),
        "ai_enabled": bool(ai.api_key()),
        "ai_model": ai.model_name() if ai.api_key() else None,
    }


@app.get("/api/probe")
def api_probe(url: str):
    try:
        return downloader.probe(url, cookiefile=_cookiefile())
    except Exception as exc:
        raise HTTPException(400, f"Could not read that link: {exc}")


@app.post("/api/download")
def api_download(body: DownloadBody):
    return downloader.start_download(
        body.url, body.quality, DOWNLOAD_DIR,
        title=body.title, cookiefile=_cookiefile(),
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
                thumb = _files_url(f)
                break
        if thumb is None:
            thumb = info.get("thumbnail")

        shorts = [
            {"path": str(s), "name": s.name, "url": _files_url(s)}
            for s in sorted((folder / "shorts").glob("*.mp4"))
        ] if (folder / "shorts").is_dir() else []

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
            "media_url": _files_url(main),
            "edit_url": _files_url(Path(edit_path)) if edit_path else None,
            "shorts": shorts,
            "has_scenes": downloader.scenes_path_for(main).is_file(),
            "has_transcript": downloader.transcript_path_for(main).is_file(),
            "has_suggestions": ai.suggestions_path_for(main).is_file(),
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


@app.post("/api/export")
def api_export(body: ExportBody):
    src = _safe_path(body.path)
    if not src.is_file():
        raise HTTPException(404, "That file no longer exists.")
    if body.style not in ("crop", "blur"):
        raise HTTPException(400, "Style must be 'crop' or 'blur'.")
    if body.start < 0 or body.end <= body.start:
        raise HTTPException(400, "End time must be after start time.")
    if not (0 <= body.trim_x <= 40 and 0 <= body.trim_y <= 40):
        raise HTTPException(400, "Trim must be between 0 and 40 percent.")
    if not (0 <= body.fg_crop <= 40):
        raise HTTPException(400, "Video crop must be between 0 and 40 percent.")
    if body.captions and not downloader.transcript_path_for(src).is_file():
        raise HTTPException(400, "No transcript yet — run Transcribe first.")
    return downloader.start_export(
        src, body.start, body.end, style=body.style, vivid=body.vivid,
        trim_x=body.trim_x, trim_y=body.trim_y, fg_crop=body.fg_crop,
        captions=body.captions,
    )


def _meta_for(src):
    """Title + duration for a media file, from its folder's info.json."""
    for info_path in src.parent.glob("*.info.json"):
        try:
            info = json.loads(info_path.read_text(encoding="utf-8"))
            return info.get("title") or src.stem, info.get("duration")
        except (OSError, json.JSONDecodeError):
            pass
    return src.stem, None


@app.post("/api/transcribe")
def api_transcribe(body: PathBody):
    src = _safe_path(body.path)
    if not src.is_file():
        raise HTTPException(404, "That file no longer exists.")
    return downloader.start_transcribe(src)


@app.get("/api/transcript")
def api_transcript(path: str):
    src = _safe_path(path)
    t_path = downloader.transcript_path_for(src)
    if not t_path.is_file():
        raise HTTPException(404, "No transcript yet — run Transcribe first.")
    return json.loads(t_path.read_text(encoding="utf-8"))


@app.post("/api/suggest")
def api_suggest(body: SuggestBody):
    if not ai.api_key():
        raise HTTPException(400, "No Gemini API key — set GEMINI_API_KEY in .env.")
    src = _safe_path(body.path)
    if not src.is_file():
        raise HTTPException(404, "That file no longer exists.")
    title, duration = _meta_for(src)
    return ai.start_suggest(src, title, duration, count=body.count)


@app.get("/api/suggestions")
def api_suggestions(path: str):
    src = _safe_path(path)
    s_path = ai.suggestions_path_for(src)
    if not s_path.is_file():
        raise HTTPException(404, "No suggestions yet — run Suggest clips first.")
    return json.loads(s_path.read_text(encoding="utf-8"))


@app.post("/api/autoshorts")
def api_autoshorts(body: SuggestBody):
    if not ai.api_key():
        raise HTTPException(400, "No Gemini API key — set GEMINI_API_KEY in .env.")
    src = _safe_path(body.path)
    if not src.is_file():
        raise HTTPException(404, "That file no longer exists.")
    title, duration = _meta_for(src)
    return ai.start_autoshorts(src, title, duration, count=body.count)


@app.get("/api/borders")
def api_borders(path: str):
    src = _safe_path(path)
    if not src.is_file():
        raise HTTPException(404, "That file no longer exists.")
    return downloader.detect_borders(src)


@app.post("/api/scenes")
def api_scenes_start(body: PathBody):
    src = _safe_path(body.path)
    if not src.is_file():
        raise HTTPException(404, "That file no longer exists.")
    return downloader.start_scenes(src)


@app.get("/api/scenes")
def api_scenes_get(path: str):
    src = _safe_path(path)
    scenes_file = downloader.scenes_path_for(src)
    if not scenes_file.is_file():
        raise HTTPException(404, "No scene data yet — run detection first.")
    return json.loads(scenes_file.read_text())


@app.post("/api/pipeline")
def api_pipeline(body: PathBody):
    cmd = _config.get("pipeline_cmd")
    if not cmd:
        raise HTTPException(
            400, "No pipeline configured — set pipeline_cmd in config.json."
        )
    if isinstance(cmd, str):
        cmd = [cmd]
    src = _safe_path(body.path)
    if not src.is_file():
        raise HTTPException(404, "That file no longer exists.")
    return downloader.start_pipeline(src, cmd)


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
