# YT Studio — CLAUDE.md

Personal tool for a gaming-Shorts YouTube editor. v1 (single-machine web app) is being evolved into v2:
a three-machine job system driven from a phone PWA. **Read PLAN.md before starting any v2 work** — it has
the full schema, phase breakdown, and v1→v2 mapping.

## Machine roles (v2)

| Machine | OS | Role | Notes |
|---|---|---|---|
| **Brain** (weak laptop, always on) | Ubuntu Server | Postgres + Hasura v2 + FastAPI (`api/`) + React PWA, via Docker Compose | Single source of truth. Serves the app over `tailscale serve` (HTTPS). Sends Wake-on-LAN |
| **NVIDIA laptop** (GTX 1650, 4 GB VRAM) | Windows 11 | Transcription worker | faster-whisper, native Windows CUDA (no WSL), int8/int8_float16, word timestamps. Runs via Task Scheduler/NSSM |
| **Gaming PC** (Ryzen 5 3600, RX 6750 XT 12 GB, 32 GB RAM) | Windows 11 | Render + LLM worker | FFmpeg with **h264_amf** (Gyan full build); Ollama native Windows (Vulkan/ROCm). Often asleep — woken by WoL (enable NIC magic-packet, disable Fast Startup) |

Dev machine is this Mac; the brain deploys via `git pull` + `docker compose up -d`. No WSL anywhere —
Windows workers run native Python for GPU access and simple WoL.

All machines on Tailscale. Used from an Android phone as an installed PWA.

## Stack

- **DB**: Postgres 16 — the only source of truth. Media files stay on disk; DB stores relative paths + metadata.
- **GraphQL**: Hasura v2. Migrations + metadata managed with the Hasura CLI, committed under `hasura/`.
  Actions → `api/` handlers; event triggers fan out jobs; cron triggers run watchdog + daily idea scan.
- **API**: FastAPI (`api/`) — Action/event/cron handlers, file serving, WoL. Not a general REST API;
  CRUD goes through Hasura.
- **Workers** (`worker/`): Python. `worker/core/` = pure media functions (no queue knowledge);
  `worker/agent/` = claim loop. Jobs claimed by capability with `FOR UPDATE SKIP LOCKED`, 15 s heartbeats,
  progress + cancel via row updates, stale jobs requeued by a cron watchdog.
- **Web** (`web/`): React + Vite + TypeScript PWA, Apollo Client, graphql-codegen (`.graphql` docs → typed hooks).
- **Media**: yt-dlp (as a library, nightly channel when YouTube breaks), FFmpeg (must include libass for
  caption burn-in — `ffmpeg-full` on macOS Homebrew), faster-whisper, Gemini REST (`gemini-2.5-flash`,
  plain urllib, no SDK) for clip suggestions/post kits, local LLM for idea ranking.

## Conventions

- **Paths in DB/payloads are always library-root-relative**; each worker resolves them against its
  configured root. Never store absolute machine paths.
- Job payloads/results are jsonb validated by pydantic schemas in `worker/agent/jobs/`.
- Job statuses: `queued → claimed → running → done | error | cancelled`; cancel = set `cancel_requested`,
  the worker notices and flips to `cancelled`. Progress: `progress` (0–100 or null) + `progress_note`.
- `worker/core/` functions take a `report(percent, note)` callback and a `should_cancel()` check —
  no DB access, no globals. Only `worker/agent/` touches Postgres.
- Encoder selection lives in `worker/core/encoders.py`, keyed by worker config — never hardcode libx264.
- Derived artifacts (transcripts, scenes, rendered clips) are written next to the media (v1 sidecar
  layout) **and** registered as `assets`/`clips` rows.
- Schema changes only via `hasura migrate` — never hand-edit the DB.
- Frontend: subscriptions for live data (jobs dashboard), queries elsewhere; run codegen after changing
  `.graphql` documents.
- Secrets in `.env` files (gitignored, `.env.example` committed): `HASURA_ADMIN_SECRET`, `GEMINI_API_KEY`,
  `GEMINI_MODEL`, `WHISPER_MODEL`, YouTube API keys. `cookies.txt` (YouTube session) lives with the
  download-capable worker; never commit it.
- UI text: sentence case, plain-words errors, dark theme with the amber accent (`#F2A33C`) from v1.

## v1 (legacy, at `server/` + `ui/` until Phase 2 completes)

Single-machine FastAPI app: `server/main.py` (routes), `server/downloader.py` (in-memory job engine +
all ffmpeg/yt-dlp/whisper logic), `server/ai.py` (Gemini). Run with `./run.sh`; docs in README.md.
The `run_*` functions in `downloader.py`/`ai.py` are the port source for `worker/core/` — the tuned
ffmpeg filter graphs (reframe, captions, grades, ducking) are valuable, don't rewrite them from scratch.

## Gotchas

- YouTube download 403s → update yt-dlp nightly: `pip install -U --pre yt-dlp`.
- Homebrew's plain `ffmpeg` lacks libass; captions need `ffmpeg-full`.
- Whisper hallucinates stray words on music/CG-only footage — require ≥20 words before auto-captioning
  (see `_has_speech` in v1 `ai.py`).
- 4K sources are VP9/AV1 → merged to mkv at download; browsers may not play them (use edit copy / renders).
- WoL packets don't cross Tailscale — they need a sender on the target's physical LAN (`machines.wol_via`).
