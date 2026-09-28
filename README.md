# YT Studio

A personal Shorts pipeline for gaming footage: download or import a video, transcribe it, find the
best moments (with Gemini), and render captioned 9:16 clips — or whole montages — with saved looks.
Review the results, approve, post. One machine, one command, nothing running when you're not using it.

## Quickstart

Needs Python 3.11+, ffmpeg (Windows: `winget install Gyan.FFmpeg` — the *full* build;
macOS: `brew install ffmpeg-full`) and Node/npm once to build the web app.

```sh
./run.sh          # macOS / Linux
run.bat           # Windows
```

First run creates `venv/`, installs Python packages, builds `web/`, then opens
`http://127.0.0.1:8765`. Every later run just starts the app.

Settings go in `.env` (copy `.env.example`): library folder, port, `GEMINI_API_KEY` for the AI
features, Whisper model, encoder override. Nothing else to configure.

Your library is `downloads/` (or `LIBRARY_DIR`): one folder per video with the source, its sidecars
(transcript, scenes, captions, plan, clips) and a `shorts/` folder of renders. Copy a folder from
another machine and tap **Rescan** in the Library to index it. Everything the app knows lives in
those folders plus `<library>/.ytstudio/` — no database.

## What it does

- **Add**: paste a YouTube link (best / 4K / HDR / audio) or upload a file. Choose what happens
  next: just download, *Prepare* (transcript, scene cuts, AI clip picks, AI edit plan, post kit) or
  *Auto Shorts* (prepare, then render every AI pick with each auto-apply recipe).
- **Video page**: Prepare checklist → Clips (AI picks, your ranges) → Edit → Tools.
  Edit covers one range or a montage of shots (speed, punch-ins, 23 transitions), 9:16 / 16:9 framing
  (crop or blurred pad), rotation, bar trimming, colour grades, vivid, HDR look, slow zoom, four
  caption styles (word-timed from the transcript or hand-typed), music bed with ducking, sound
  effects, loudness normalisation, watermark. Save any setup as a recipe.
- **Review**: rendered clips as cards — approve, reject, tweak and re-render, mark posted, post kit
  (title / description / hashtags) ready to paste.
- **Styles**: paste a Short you like; the app measures it and has Gemini break the edit down into a
  recipe plus DaVinci Resolve notes.
- **Tools**: shred into shots along scene cuts, remove silences, FCPXML timeline for Resolve.
- **Jobs**: live progress, cancel, retry. ffmpeg / whisper jobs run one at a time; downloads and
  Gemini calls alongside. Jobs are forgotten when the app closes.

Phone use: see `docs/PHONE.md`. Architecture and roadmap: `PLAN.md`. For Claude Code: `CLAUDE.md`.

## When downloads break

YouTube changes often. Symptoms: 403s, "Sign in to confirm you're not a bot", missing formats.

```sh
venv/bin/pip install -U --pre yt-dlp        # Windows: venv\Scripts\pip install -U --pre yt-dlp
```

For age-restricted videos export your browser cookies (Netscape format) to `cookies.txt` in the
project folder (or set `COOKIES_FILE`).

## Data files per video

| File | What |
|---|---|
| `<title>.mkv/.mp4` + `.info.json` + `.webp` | source, yt-dlp metadata, thumbnail |
| `<title>.transcript.json` | faster-whisper segments with word timestamps |
| `<title>.scenes.json` / `.borders.json` | scene-cut times / measured black bars |
| `<title>.captions.json` | hand-typed captions |
| `<title>.suggestions.json` / `.plan.json` / `.postkit.json` | Gemini outputs |
| `<title>.clips.json` | the clip list with review status and render settings |
| `<title>_edit.mp4` / `_tight.mp4` | preview/edit copy, silences removed |
| `shorts/*.mp4` | renders (name encodes range + settings) |
| `clips/` + `clippack.json` | shredded shots |

Library-level: `.ytstudio/` (index, recipes, styles), `.music/`, `.overlays/`, `.refs/` (style
references), `.cache/`.

## Tests

```sh
venv/bin/pip install pytest httpx && venv/bin/python -m pytest studio/tests -q
cd web && npm run typecheck
```

## Older versions

`git tag v1-last` is the original single-machine app; `v2-multimachine` is the three-machine
Postgres/Hasura job system that this version replaced.
