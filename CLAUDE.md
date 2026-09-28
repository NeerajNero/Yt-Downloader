# YT Studio — CLAUDE.md

Personal tool for a gaming-Shorts YouTube editor. **v3 = one machine, one process, run when needed.**
`run.bat` / `run.sh` starts a FastAPI app with an in-memory job queue and the React PWA; nothing else to
run. No database, no Docker, no workers. The earlier multi-machine design (Postgres + Hasura + worker
agents, tag `v2-multimachine`) was dropped on 2026-09-28 because the always-on brain wasn't wanted.
Read PLAN.md for what exists, what is next and why.

## Machines

- **Gaming PC** (Ryzen 5 3600, RX 6750 XT, Windows 11) — where the app runs. ffmpeg = Gyan full build
  (`h264_amf` + libass), encoder auto-detected. OBS recordings live here too.
- **NVIDIA laptop** (GTX 1650) — optional. Transcription is CPU faster-whisper on the PC by default;
  a remote transcribe helper on the laptop is a possible later addition (not built).
- **Dev machine** — this Mac (`h264_videotoolbox`, `ffmpeg-full` from Homebrew).
- **Phone** — opens the app over the LAN / Tailscale while the PC is on (`HOST=0.0.0.0`).

## Layout

```
studio/            the app (python -m studio)
  config.py        .env → Settings; ffmpeg + encoder auto-detect
  library.py       library-relative paths, sidecar layout, assets = files on disk
  store.py         JSON state: <library>/.ytstudio/{videos,recipes,styles}.json + <stem>.clips.json
  queue.py         in-memory job queue, heavy (ffmpeg/whisper, 1 at a time) + light lanes
  jobs/            adapters: payload → studio.core function → files + store updates
  pipeline.py      the automatic chain (prepare / shorts) after downloads and finished jobs
  routes/          JSON API (state.py reads, actions.py writes, files.py, ingest.py)
  core/            pure media functions (ffmpeg, yt-dlp, whisper, Gemini) — no app state
  schemas.py       pydantic payload/recipe schemas
  tests/           pytest (no ffmpeg needed)
web/               React + Vite + TS PWA; polls the API every second (lib/poll.ts)
```

## Conventions

- **Paths stored anywhere are library-root-relative** (posix). `studio/library.py` resolves them.
- **Assets are files.** A transcript exists when `<stem>.transcript.json` exists — there is no
  registry. Derived artifacts go next to the media (v1 sidecar layout). Clips + review status are
  `<stem>.clips.json`; app-level state is `<library>/.ytstudio/`.
- Jobs: `queued → running → done | error | cancelled`; cancel = `cancel_requested`, the handler's
  `should_cancel()` notices. Jobs die with the process — that is the design.
- `studio/core/` functions take `report(percent, note)` + `should_cancel()` and never touch the
  store. Only `studio/jobs/`, `studio/pipeline.py` and `studio/routes/` do.
- Encoder from `studio/core/encoders.py`, keyed by `Settings.encoder` — never hardcode libx264.
- Payloads validated by `studio/schemas.py` (render payload rejects unknown keys).
- Frontend: `usePoll(url)` for reads; every mutation in `web/src/lib/api.ts` calls `invalidate()`.
  Types in `web/src/lib/types.ts` mirror `studio/routes/state.py`.
- Settings in `.env` (gitignored; `.env.example` documents every key). `cookies.txt` never committed.
- UI text: sentence case, plain-words errors, dark theme with the amber accent (`#F2A33C`).

## Gotchas

- YouTube download 403s → `venv/bin/pip install -U --pre yt-dlp` (nightly).
- Homebrew's plain `ffmpeg` lacks libass; captions need `ffmpeg-full`. Windows: Gyan *full* build.
- Whisper hallucinates on music-only footage — recipes with `captions_if_speech` need ≥20 words.
- 4K sources are VP9/AV1 mkv; the browser player may not play them — Prepare → Preview copy.
- `ffmpeg -encoders` lists encoders the build has, not ones the GPU can run; config tests a
  0.2 s encode before picking one. Force with `ENCODER=` if the guess is wrong.
- Removing a video from the library hides its folder from rescans (`hidden` in videos.json); delete
  the folder by hand if you want the space back.
