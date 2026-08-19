# YT Studio — v1 build plan

A local web app for downloading full videos at the best possible quality and prepping them for editing. Paste a URL, check it, pick a quality, download with live progress. Every download lands in a library where the owner can open it in the file manager (to edit manually in DaVinci Resolve) or create an edit-friendly H.264 copy. A disabled "Pipeline" button reserves the v2 hook into an existing, separate VOD-analysis pipeline — not built in v1.

> Note: the original plan targeted Windows 11 (`D:\yt-studio`). This build runs on macOS at
> `~/Desktop/projects/yt-downloader`; platform-specific bits (reveal in file manager, browser
> auto-open) use platform detection so the same code works on Windows unchanged.

## Stack (fixed)

- Backend: FastAPI + uvicorn. yt-dlp used **as a Python library** (not shelled out). ffmpeg via subprocess. Python deps exactly: `fastapi`, `uvicorn`, `yt-dlp`.
- Frontend: React 18 + Vite 5 single-page app. Deps: `react`, `react-dom`; dev: `vite`, `@vitejs/plugin-react`. No Tailwind, no router, no state library.
- No database. The library is a filesystem scan of the downloads folder using yt-dlp's `.info.json` sidecar files.
- Progress via the frontend polling `GET /api/jobs` every 1000 ms. No websockets in v1.

## Data contracts

Job object (returned by `/api/jobs`, `/api/download`, `/api/convert`):

```json
{
  "id": "a1b2c3d4e5", "kind": "download", "title": "…", "status": "downloading",
  "percent": 42.5, "speed": 3145728, "eta": 61, "error": null,
  "path": null, "src": null, "created": 1734531200.1
}
```

- `kind`: `"download" | "convert"`.
- `status`: `queued | starting | downloading | merging | converting | done | error | cancelled | cancelling`.
- `speed` bytes/sec or null; `eta` seconds or null; `path` final file once known; `src` source file for convert jobs.

Library item (`GET /api/library`, newest first): `title, uploader, duration, width, height, vcodec, size, path, edit_path, folder, thumb, downloaded_at`.

`config.json`: `download_dir` (relative resolves against the project root) and `port`. Defaults `{"download_dir": "downloads", "port": 8765}`.

## API

- `GET /api/config` → `{ download_dir }`
- `GET /api/probe?url=` → `{ title, uploader, duration, thumbnail, webpage_url, heights }`; metadata only; unreadable URL → 400.
- `POST /api/download` `{url, quality, title?}` → Job. `quality` ∈ `"best" | "audio" |` numeric height string.
- `GET /api/jobs` → Job[] newest first.
- `POST /api/jobs/{id}/cancel` → `{ok: true}`; 404 unknown.
- `POST /api/jobs/clear` → `{cleared: n}`.
- `GET /api/library` → LibraryItem[].
- `POST /api/convert` `{path}` → Job. 404 missing file, 400 outside downloads dir.
- `POST /api/reveal` `{path}` → `{ok: true}`. Windows `explorer /select,`, macOS `open -R`, Linux `xdg-open`.
- Static mounts after all API routes: `/files` → downloads dir, `/` → `ui/dist` (`html=True`); missing dist → JSON hint.

## Critical implementation rules

### Download (yt-dlp as a library, one daemon thread per job)

Format selector: `best` → `bv*+ba/b`; `audio` → `ba/b`; height `H` → `bv*[height<=H]+ba/b[height<=H]`.

Options: outtmpl `%(title)s/%(title)s.%(ext)s` under the downloads dir; `merge_output_format: mkv` (OMIT for audio-only); `writeinfojson`, `writethumbnail`, `noplaylist`, `windowsfilenames`, quiet flags, progress + postprocessor hooks.

- mkv because 4K streams are VP9/AV1 and don't mux cleanly into mp4; the edit-friendly mp4 is the convert job's problem, never a re-encode at download time.
- Progress hook: `percent = downloaded_bytes / (total_bytes or total_bytes_estimate) * 100` plus speed/eta; `finished` → `merging`; pp hook `started` → `merging`.
- Cancel: per-job `threading.Event`; both hooks check it and raise a custom `Cancelled` exception. yt-dlp may wrap it in `DownloadError`, so the worker also treats "event is set" as a clean cancel.
- Final path: `info["requested_downloads"][0]["filepath"]`; job title updated from `info["title"]`.

### Convert-for-editing

`ffmpeg -y -i SRC -c:v libx264 -crf 16 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -progress pipe:1 -nostats -loglevel error OUT` → `<stem>_edit.mp4` next to the original. Percent from `out_time_us` / ffprobe duration (guard `N/A`). Keep the Popen handle; cancel kills the process and deletes the partial output. `yuv420p` because sources can be 10-bit and 8-bit 4:2:0 H.264 is the safe Resolve target.

### Safety

- Every path-taking endpoint resolves the path and rejects anything not under the downloads dir.
- uvicorn host 127.0.0.1 only; browser auto-opens ~1 s after startup from a daemon thread.
- Jobs are in-memory only; library scan is the source of truth after restarts.
- Library scan: glob `*/*.info.json`; main media = largest `{mkv,mp4,webm,m4a,mov,mp3,opus}` whose stem doesn't end `_edit`; edit copy = `*_edit.mp4`; thumb = first local image else remote thumbnail URL.

## UI — "ingest deck"

Dark slate surfaces; one amber accent used like a REC light; metadata in monospace; progress bars as timeline scrubbers with faint tick marks. Tokens: `--bg:#101317 --panel:#171C22 --panel2:#1F262E --border:#2A323C --text:#E7EBEF --muted:#8C97A3 --accent:#F2A33C --ok:#3FB27F --danger:#E5534B`, radius 12px. Sentence case; buttons say exactly what they do; errors in plain words.

Layout (max ~1080 px): header (amber dot + "YT Studio" + downloads path) → ingest row (URL input + Check, inline errors) → probe card (thumb, title, mono meta, quality select, amber Download) → jobs panel (glyph, title, status chip, scrubber, mono readout, Cancel, Clear finished) → library grid (16:9 thumb, clamped title, mono meta, VP9/AV1 badge, Open folder / Convert for editing / Edit copy ✓ / disabled Pipeline) → empty state.

Poll `/api/jobs` every 1 s; refetch library the first time a job id is seen `done`. All fetch errors inline. `:focus-visible` outlines; respect `prefers-reduced-motion`.

## Out of scope for v1

- Wiring the "Pipeline" button (v2: hands the file to the external VOD pipeline).
- 9:16 Shorts clip exporter, scene detection, in-app player with markers, playlist support, websockets.
