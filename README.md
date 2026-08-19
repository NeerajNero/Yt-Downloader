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

```sh
./venv/bin/python server/main.py        # Windows: venv\Scripts\python server\main.py
```

The browser opens automatically at http://127.0.0.1:8765.

## Configuration

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

## Not built yet (v2)

The disabled **Pipeline** button on library cards is a reserved hook for
handing a file to the external VOD-analysis pipeline. Also out of scope for
v1: the 9:16 Shorts exporter, scene detection, in-app player, playlists,
websockets.
