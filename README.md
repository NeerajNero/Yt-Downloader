# YT Studio

A local web app for downloading videos at the best possible quality and prepping
them for editing. Paste a URL, check it, pick a quality, download with live
progress. Every download lands in a library where you can open it in your file
manager or create an edit-friendly H.264 copy for DaVinci Resolve.

Localhost only — the server binds to 127.0.0.1 and is unreachable from other
machines. No auth, no database; the library is a filesystem scan of the
downloads folder.

## Requirements

- Python 3.11+
- ffmpeg and ffprobe on PATH
- Node LTS (only needed to build the UI once)

Setting up on a Windows machine instead? Follow [WINDOWS.md](WINDOWS.md).

## First-time setup

```sh
# from the project root
python3 -m venv venv
./venv/bin/pip install --no-cache-dir -r requirements.txt   # Windows: venv\Scripts\pip install ...
cd ui && npm install && npm run build && cd ..
```

## Run

The easy way — the launcher script handles first-time setup (venv, Python
deps, UI build) automatically and just starts the server on later runs:

```sh
./run.sh          # macOS / Linux
run.bat           # Windows
```

Or manually:

```sh
./venv/bin/python server/main.py        # Windows: venv\Scripts\python server\main.py
```

The browser opens automatically at http://127.0.0.1:8765.

## Configuration

Shared defaults live in `config.json` (committed). Machine-specific values go
in `.env` (gitignored) — copy `.env.example` to `.env` and edit. `.env` and OS
environment variables override `config.json`, so the Mac and Windows setups
never conflict in git. Supported keys: `DOWNLOAD_DIR`, `PORT`, `COOKIES_FILE`,
`PIPELINE_CMD`.

`config.json`:

- `download_dir` — where downloads land. A relative value resolves against the
  project root. Default `downloads`.
- `port` — default `8765`.
- `cookies_file` — path to a Netscape-format cookies file, relative paths
  resolve against the project root. Default `cookies.txt`. Used only if the
  file exists; checked per request, so adding or refreshing it needs no
  restart.

## Age-restricted videos

Videos behind age verification need a logged-in YouTube session. Email/password
login is not supported (Google blocks automated sign-ins); instead, hand the
app your browser session's cookies:

1. Log in to YouTube in your browser — use a throwaway/secondary Google
   account, since accounts whose cookies drive automated downloads can get
   flagged.
2. Export cookies for `youtube.com` with a browser extension such as
   "Get cookies.txt LOCALLY".
3. Save the export as `cookies.txt` in the project root. Done — the next
   probe/download picks it up automatically.

Cookies expire: when age-gated videos start failing again, re-export the file.
Keep the browser profile you exported from logged in — logging out invalidates
the cookies immediately. `cookies.txt` is gitignored; treat it like a password
and never commit or share it.

## How it works

- Downloads merge into **mkv** losslessly (4K streams are VP9/AV1 and don't mux
  cleanly into mp4). Audio-only downloads keep their native container.
- **Convert for editing** produces `<name>_edit.mp4` (H.264 CRF 16 / AAC /
  faststart, 8-bit 4:2:0) next to the original — the safe target for Resolve.
- Each video gets its own subfolder with the media file, an `.info.json`
  sidecar, and a thumbnail. The library is rebuilt from these files on every
  request, so it survives server restarts. Jobs are in-memory only and do not.

## When downloads break

Most future download breakage (typically `HTTP Error 403: Forbidden`) is fixed
by updating yt-dlp — YouTube changes constantly and yt-dlp patches fast:

```sh
./venv/bin/pip install -U yt-dlp
```

If the latest stable release still fails, the nightly channel usually has the
fix already:

```sh
./venv/bin/pip install -U --pre yt-dlp
```

Then restart the server.

## Importing local videos

Two ways to get local footage in:

- **The + button** next to the ingest box opens a file picker; the file
  uploads to the server with a progress bar and lands in the library.
- **Paste a file path** into the ingest box — something like
  `/Users/you/Movies/raw.mp4` (or `D:\footage\raw.mp4` on Windows;
  surrounding quotes are fine) and press Check. The card shows the
file's resolution, size, and duration, and **Import to library** copies it
into its own library folder with a generated thumbnail and metadata sidecar,
with copy progress in Jobs. Imported videos get every feature downloads get:
player, scene detection, transcription, captions, 9:16 exports, AI Auto
Shorts, and the pipeline hand-off. Supported types: mkv, mp4, webm, mov,
m4a, mp3, opus.

## Player, scene detection, and 9:16 clips

Click a library thumbnail to open the player. It prefers the edit copy when
one exists — mkv/AV1 originals don't play in every browser (if playback fails,
convert for editing first).

- **Detect scenes** runs ffmpeg scene-cut detection (threshold 0.30) and saves
  a `<name>.scenes.json` sidecar; cuts appear as amber markers under the video,
  click one to jump there.
- **Export clip** renders a vertical H.264 clip from the chosen time range
  into a `shorts/` subfolder, at **1080p** (1080×1920) or **4K** (2160×3840) —
  pick from the resolution dropdown (4K takes noticeably longer to render and
  produces larger files). Styles: *Blurred pad* (whole frame over a blurred
  background) or *Center crop*. Times accept `1:23` or plain seconds;
  "Set start/end" grabs the current playhead. Captions scale automatically to
  the chosen resolution.
- **Vivid color boost** applies a saturation/contrast grade — the punchy look
  people associate with HDR. Real HDR can't be created from SDR sources; for
  true grading use the mkv original in Resolve.

## Transcripts and captions

- **Transcribe** (in the player) runs Whisper locally via faster-whisper — no
  cloud, no cost. The first run downloads the model (~500 MB for the default
  `small`; change with `WHISPER_MODEL` in `.env`). Output is a
  `<name>.transcript.json` sidecar with word-level timestamps.
- **Captions** (checkbox in the export panel) burns word-timed captions into
  the 9:16 clip. Four styles, selectable next to the checkbox:
  *Karaoke* (default — white text, the spoken word fills amber),
  *Typewriter* (words appear one by one as spoken and accumulate),
  *Pop* (bold uppercase chunks that bounce in with an amber glow and drop
  shadow), and *Minimal* (small clean static lines). All styles work with
  both auto (transcript) and manual captions, at any position.
- **Manual captions** — "Edit captions manually" in the player opens an
  editor where each caption has its own text, start time, and on-screen
  duration; "Add caption at playhead" pre-fills the start time. A global
  words/sec speed controls how fast the amber fill sweeps the words. Saved
  as a `<name>.captions.json` sidecar. At export, pick the caption source
  (Auto transcript / Manual) and position (Bottom / Middle / Top) — the
  position applies to both sources. Long lines wrap automatically.
- macOS note: Homebrew's plain `ffmpeg` formula is built without libass and
  can't burn captions — install `brew install ffmpeg-full` (the server prefers
  it automatically). Windows WinGet builds already include libass.

## AI clip suggestions and Auto Shorts (Google Gemini)

Set `GEMINI_API_KEY` in `.env` (get a key at https://aistudio.google.com/apikey)
and restart the server. The model defaults to `gemini-2.5-flash`; override with
`GEMINI_MODEL`. Calls go directly to Google's REST API — no extra dependency.

- **Suggest clips** — Gemini reads the transcript, scene cuts, and sampled
  keyframes, and returns ranked clip suggestions (time range, title, hook).
  Works on dialogue-free videos too, judging from the frames. Suggestions are
  cached as `<name>.suggestions.json`; delete that file to re-analyze.
- **Auto Shorts** — the full pipeline in one click: transcribe → detect scenes
  → ask Gemini for the top clips → export each as a blurred-pad 9:16 with
  auto-trimmed black bars and burned captions (when the video has speech).
  Prerequisite steps are skipped automatically when their sidecar files
  already exist.

Typical Gemini cost is a fraction of a cent per video with `gemini-2.5-flash`.
The transcript and scene detection stay fully local — only the compact
transcript text and ~16 small keyframes are sent to Google.

## VOD pipeline hand-off

Set `PIPELINE_CMD` in `.env` to enable the Pipeline button on library cards,
e.g. `PIPELINE_CMD=python D:\vod-pipeline\autopipe.py`. Clicking it runs that
command with the video file path appended as the last argument and tracks it
as a job (done/error follows the command's exit code).

## Not built yet

Playlist support and websocket progress remain future work.

## Data files per video

Everything lives next to the media file, so the library survives restarts and
folder moves:

| File | Written by |
| --- | --- |
| `<name>.info.json`, thumbnail | download |
| `<name>_edit.mp4` | Convert for editing |
| `<name>.scenes.json` | scene detection |
| `<name>.transcript.json` | Transcribe |
| `<name>.captions.json` | manual caption editor |
| `<name>.suggestions.json` | AI Suggest clips |
| `shorts/*.mp4` | clip exports / Auto Shorts |
