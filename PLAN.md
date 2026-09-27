# YT Studio v2 — build plan

v1 (this repo) is a single-machine local web app: FastAPI + yt-dlp + FFmpeg + faster-whisper + Gemini,
React UI, no database, in-memory jobs, sidecar JSON files next to each video. It works, and it already
contains most of the *media logic* v2 needs.

v2 turns it into a three-machine system: a always-on "brain" (Postgres + Hasura v2 + FastAPI + React PWA),
a transcription worker (NVIDIA laptop, GTX 1650), and a render + LLM worker (gaming PC, RX 6750 XT),
all on Tailscale, driven from a phone. Postgres is the single source of truth; workers claim jobs with
`FOR UPDATE SKIP LOCKED`.

> The v1 build plan that used to live in this file is preserved in git history (commit `79224b5` and earlier).

---

## 1. What v1 has, and where each piece goes in v2

### 1.1 Architecture inventory

| Piece | File(s) | What it does |
|---|---|---|
| FastAPI app | `server/main.py` (746 ln) | ~30 REST routes, config loading (config.json + hand-rolled `.env` parser), filesystem library scan, path-safety checks, static file mounts, presets/music/captions CRUD |
| Job engine | `server/downloader.py` top | In-memory `JOBS` dict, one daemon thread per job, `threading.Event` for cancel, `Popen` registry for killing ffmpeg. Jobs die on restart (by design) |
| Download | `downloader.py` | yt-dlp as a library; format selection (best/audio/HDR/height), mkv merge, progress hooks, cookies support, info.json + thumbnail sidecars |
| Convert | `downloader.py` | `_edit.mp4` H.264 CRF16 edit copy for Resolve, ffmpeg `-progress` parsing |
| Export (the big one) | `downloader.py` `run_export` + filter builders | 9:16/16:9 reframe (blur-pad or crop), rotation, border trim, vivid/HDR-look/color grades, Ken-Burns zoom, music bed with sidechain ducking, −14 LUFS loudnorm, burned ASS captions (4 styles, word-timed karaoke) |
| Captions | `downloader.py` | ASS generation from Whisper word timestamps or manual caption JSON; position/style/orientation-aware; libass detection (`ffmpeg-full` on macOS) |
| Transcription | `downloader.py` `run_transcribe` | faster-whisper, CPU int8, word timestamps → `.transcript.json` |
| Scene detection | `downloader.py` `run_scenes` | ffmpeg scene filter @0.30 threshold → `.scenes.json` |
| Clip pack | `downloader.py` | Shreds video into 1–5s montage clips along scene cuts, manifest JSON |
| Silence removal | `downloader.py` | silencedetect → trim/concat filter graph → `_tight.mp4` |
| Import/upload | `downloader.py` + `main.py` | Local file import with chunked copy + progress; browser upload |
| AI | `server/ai.py` (363 ln) | Gemini REST via urllib (no SDK), structured-output schemas. Suggest clips (transcript + scene cuts + 16 keyframes → ranked segments), Auto Shorts (transcribe→scenes→suggest→export each), Post kit (title/description/hashtags) |
| UI | `ui/src` (React 18 + Vite 5, JS not TS) | Ingest panel, jobs panel (1 s polling), library grid, `Player.jsx` — a 979-line monolith with ~40 `useState` hooks holding every export control |
| Config | `config.json`, `.env`, `presets.json`, `cookies.txt` | Shared defaults + per-machine overrides; export presets; YouTube session cookies |

**Data model today:** the filesystem. `downloads/<title>/` holds the media plus sidecars
(`.info.json`, `.transcript.json`, `.scenes.json`, `.captions.json`, `.suggestions.json`,
`.postkit.json`, `shorts/*.mp4`, `clips/` + `clippack.json`). The library is a glob on every request.

### 1.2 v1 → v2 disposition

The single most important finding: **v1 already separates `run_*` (pure work functions taking optional
`job`/`event` params) from `start_*` (thread-spawning wrappers)**. The `run_*` layer is exactly what a
v2 worker executes; only the `start_*`/`JOBS` layer gets replaced by the Postgres queue.

| v1 piece | v2 fate | Why |
|---|---|---|
| `run_export`, filter builders, ASS caption writer, grades/looks/zoom | **Reuse nearly as-is** → `worker/core/render.py`, `captions.py` | This is months of tuned ffmpeg filter-graph work — the heart of your repeated-edit automation. Only changes: parameterize the encoder (libx264 → h264_amf/VAAPI on the gaming PC) and take paths relative to a library root |
| `run_transcribe` | **Reuse with a device switch** → transcription worker | Same faster-whisper call; on the GTX 1650 use `device="cuda", compute_type="int8_float16"` (fits in 4 GB with `small`/`medium`) |
| `run_scenes`, `detect_borders`, clip pack, tighten, convert, import | **Reuse as-is** → `worker/core/media.py` | Pure ffmpeg subprocess code, machine-agnostic |
| yt-dlp download (`_download_worker`, `probe`, format selection) | **Reuse** → `worker/core/ytdlp_ops.py` | Progress hooks change from mutating a dict to updating the job row — same shape |
| `ai.py` Gemini calls, prompts, schemas | **Reuse** → `worker/core/gemini.py` | Keep Gemini for vision-based clip suggestions (per your earlier decision); the local LLM on the gaming PC is for Phase 4 idea ranking, where volume is high and vision isn't needed |
| Job engine (`JOBS`, `_EVENTS`, `_PROCS`, daemon threads) | **Replace** with Postgres jobs table + worker claim loop | In-memory jobs can't survive restarts, can't span machines, can't retry |
| Library scan (`api_library` glob) | **Replace** with `videos`/`assets` tables | Postgres becomes the source of truth; a one-time importer script ingests existing sidecars so your current library carries over |
| FastAPI routes | **Replace/shrink** → Hasura (CRUD/subscriptions) + FastAPI Actions handlers (enqueue, WoL, file serving) | Most GET routes become GraphQL queries; most POST routes become "insert a job row" |
| React UI | **Replace** with the TS PWA, **port the UX** | Polling → GraphQL subscriptions; `Player.jsx` gets decomposed; the export-controls UX and presets concept survive as "recipes" |
| `presets.json` | **Migrate** → `recipes` table | Your existing preset (`cinematic-insta-4k-no-caption-HDR`) is literally the first recipe row |
| Sidecar JSON files | **Keep files, index in DB** | Transcripts/scenes stay on disk next to media (they're worker inputs); `assets` rows record path + small payloads. DB stores paths/metadata only, as planned |
| `run.sh`/`run.bat`, browser auto-open, WinGet PATH patching | **Drop** | Docker Compose + systemd/launchd worker services replace launcher scripts |
| `cookies.txt` handling | **Keep**, lives with whichever worker has the `download` capability | |

### 1.3 Code-quality issues that matter for the migration

Things that would bite when turning features into background jobs (none are fatal — the seams are good):

1. **Absolute local paths everywhere.** Sidecars and API bodies carry `/Users/.../downloads/...` paths.
   Across three machines these are meaningless. v2 must store **library-relative paths** and let each
   worker resolve them against its own configured root/mount. This touches every ported function's entry point.
2. **`ai.py` reaches into `downloader` privates** (`downloader._new_job`, `downloader._EVENTS`) —
   the job engine has no public interface. Fine to ignore since the engine is being replaced, but it means
   `ai.py`'s `start_*` wrappers can't be ported mechanically.
3. **Progress = mutating a shared dict.** Porting means threading a `report(percent, status)` callback
   through `run_*` functions instead of `job["percent"] = …`. The functions already take an optional
   `job` param, so this is a signature change, not a rewrite.
4. **Cancellation = `threading.Event`.** In v2 a cancel is a DB status flip the worker must poll between
   progress updates (and on heartbeat). Same check sites as today's `event.is_set()`.
5. **Encoder hardcoded to libx264/CPU** in five places (convert, export, clippack, tighten, import thumb).
   Needs one `encoder_args()` helper keyed by worker config (libx264 / h264_amf / h264_vaapi) — note AMF
   quality at same bitrate is worse than libx264; for final uploads consider libx264 on the Ryzen 3600 as a
   quality option, AMF for fast previews.
6. **Environment discovery is host-specific**: ffmpeg-full lookup on macOS Homebrew paths, WinGet package
   scanning on Windows. In v2, each worker gets an explicit `FFMPEG_PATH` in its config; delete the magic.
7. **No tests, no types, no lint** on the Python side. Acceptable for v1; v2 workers should get at least
   smoke tests for the queue claim/heartbeat/requeue logic (the part that's genuinely tricky) — the ffmpeg
   functions are validated by using them.
8. **Unbounded concurrency**: every API call spawns a thread; two 4K exports run simultaneously. The v2
   queue fixes this for free (a worker claims one job at a time per capability slot).
9. Minor: hand-rolled `.env` parser with quirky quote handling; `_meta_for` grabs an arbitrary
   `*.info.json` in the folder; `presets.json` is gitignored but was committed before the ignore rule;
   `cookies.txt` sits in the repo folder (gitignored, but keep it out of any new `worker/` sync).
10. **Nothing broken or unfinished** found: the README's "not built yet" list (playlists, websockets) is
    honest; the `PIPELINE_CMD` hook works but you presumably have no external pipeline — v2's job system
    replaces that concept entirely.

---

## 2. Proposed v2 repo structure

Monorepo, evolving this repo in place. v1 stays runnable at `server/` + `ui/` until Phase 2 reaches
feature parity, then gets deleted (history keeps it).

```
yt-studio/
├── docker-compose.yml          # brain stack: postgres, hasura, api, web (static), caddy optional
├── .env.example                # brain secrets template (HASURA_ADMIN_SECRET, GEMINI_API_KEY, …)
├── hasura/
│   ├── migrations/             # hasura CLI managed, in git
│   ├── metadata/               # tables, permissions, Actions, event triggers, cron triggers
│   └── config.yaml
├── api/                        # FastAPI "brain" service (runs in compose)
│   ├── app/
│   │   ├── actions.py          # Hasura Action handlers: start_pipeline, enqueue_job, wake_machine…
│   │   ├── events.py           # Hasura event-trigger handlers (fan-out: video ingested → jobs)
│   │   ├── files.py            # library file serving + worker upload/download endpoints
│   │   ├── wol.py              # Wake-on-LAN
│   │   └── ideas/              # Phase 4: trends, RSS, analytics fetchers
│   ├── tests/
│   └── pyproject.toml
├── worker/
│   ├── core/                   # shared package — the ported v1 media logic (no queue knowledge)
│   │   ├── render.py           # run_export + filter builders   ← from downloader.py
│   │   ├── captions.py         # ASS writers, styles            ← from downloader.py
│   │   ├── media.py            # scenes, borders, convert, clippack, tighten, probe, import
│   │   ├── transcribe.py       # faster-whisper                 ← from downloader.py
│   │   ├── ytdlp_ops.py        # probe/download                 ← from downloader.py
│   │   ├── gemini.py           # suggest/postkit                ← from ai.py
│   │   └── encoders.py         # NEW: libx264 / h264_amf / vaapi arg builder
│   ├── agent/                  # the worker runtime (one binary, capabilities via config)
│   │   ├── main.py             # claim loop: FOR UPDATE SKIP LOCKED, heartbeat thread, cancel poll
│   │   ├── jobs/               # thin adapters: job payload → core function → result/asset rows
│   │   ├── storage.py          # resolve library-relative paths; download/upload when not mounted
│   │   └── config.toml.example # machine name, capabilities, FFMPEG_PATH, library root/mode
│   └── tests/
├── web/                        # React PWA — Vite + TypeScript + Apollo + graphql-codegen
│   ├── src/
│   │   ├── routes/             # dashboard, library, video, review, ideas
│   │   ├── graphql/            # .graphql documents → codegen types/hooks
│   │   └── components/
│   └── package.json
├── scripts/
│   ├── import_v1_library.py    # one-time: scan downloads/, insert videos/assets/clips rows
│   └── dev.sh
├── docs/
├── CLAUDE.md
└── PLAN.md
```

How v1 code physically moves (Phase 2): `downloader.py` is split by section markers it already has
(`# ---- download`, `# ---- export`, `# ---- scenes`, …) into `worker/core/*`; `ai.py` → `gemini.py`
minus its `start_*` wrappers; `main.py`'s validation logic (the ExportBody checks) becomes the
`render` job-payload schema; everything else in `main.py` dies or moves to `api/`.

---

## 3. Draft Postgres schema

Conventions: `uuid` PKs (`gen_random_uuid()`), `timestamptz`, snake_case, `updated_at` triggers.
All media paths are **relative to the library root**.

```sql
create table machines (
  id            uuid primary key default gen_random_uuid(),
  name          text unique not null,            -- 'brain', 'nvidia-laptop', 'gaming-pc'
  capabilities  text[] not null default '{}',    -- {'transcribe'} / {'render','llm','download'}
  os            text,
  tailscale_ip  inet,
  mac_address   macaddr,                          -- for Wake-on-LAN (gaming PC)
  wol_via       uuid references machines(id),     -- machine on the same LAN that relays the magic packet
  status        text not null default 'offline',  -- online | offline | waking
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now()
);

create table jobs (
  id            uuid primary key default gen_random_uuid(),
  type          text not null,                    -- download | transcribe | scenes | render | convert |
                                                  -- clippack | tighten | suggest | postkit | import |
                                                  -- idea_scan | stats_fetch …
  status        text not null default 'queued',   -- queued | claimed | running | done | error |
                                                  -- cancelled | cancel_requested
  priority      int  not null default 100,        -- lower = sooner
  payload       jsonb not null default '{}',      -- e.g. render settings (v1 ExportBody shape)
  result        jsonb,                            -- output paths, counts, timings
  error         text,
  progress      real,                             -- 0–100, null = indeterminate
  progress_note text,                             -- 'merging', 'clip 2/3', …
  video_id      uuid references videos(id) on delete cascade,
  clip_id       uuid references clips(id)  on delete set null,
  parent_job_id uuid references jobs(id),         -- pipeline fan-out lineage
  claimed_by    uuid references machines(id),
  claimed_at    timestamptz,
  heartbeat_at  timestamptz,
  attempts      int not null default 0,
  max_attempts  int not null default 2,
  run_after     timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index jobs_claim_idx on jobs (status, priority, created_at)
  where status = 'queued';
-- Claim: UPDATE jobs SET status='claimed', claimed_by=$1, claimed_at=now(), heartbeat_at=now()
-- WHERE id = (SELECT id FROM jobs WHERE status='queued' AND run_after<=now() AND type=ANY($2)
--             ORDER BY priority, created_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *;
-- Requeue (cron/watchdog): running/claimed with heartbeat older than N min → queued, attempts+1;
-- attempts >= max_attempts → error.

create table videos (
  id            uuid primary key default gen_random_uuid(),
  source        text not null default 'youtube',  -- youtube | import
  youtube_id    text unique,
  url           text,
  title         text not null,
  channel       text,                             -- uploader
  duration      real,
  width         int, height int, vcodec text, size_bytes bigint,
  storage_path  text,                             -- 'BATMAN…/BATMAN….mkv' (relative), null until downloaded
  thumb_path    text,
  status        text not null default 'new',      -- new | downloading | ready | failed
  meta          jsonb not null default '{}',      -- pruned info.json
  idea_id       uuid references ideas(id),
  created_at    timestamptz not null default now()
);

create table assets (                              -- everything derived from a video
  id            uuid primary key default gen_random_uuid(),
  video_id      uuid not null references videos(id) on delete cascade,
  kind          text not null,                    -- transcript | scenes | captions | suggestions |
                                                  -- postkit | edit_copy | tight | clip_pack | thumbnail
  path          text,                             -- sidecar/output file, relative
  data          jsonb,                            -- small payloads inline (postkit, borders)
  job_id        uuid references jobs(id),
  created_at    timestamptz not null default now(),
  unique (video_id, kind)
);

create table recipes (                             -- Phase 3 edit templates (v1 presets, formalized)
  id            uuid primary key default gen_random_uuid(),
  name          text unique not null,
  settings      jsonb not null,                   -- v1 export settings shape + recipe-only keys (sfx, watermark)
  auto_apply    boolean not null default false,   -- render automatically for every new video
  created_at    timestamptz not null default now()
);

create table clips (                               -- a segment of a video, possibly rendered
  id            uuid primary key default gen_random_uuid(),
  video_id      uuid not null references videos(id) on delete cascade,
  recipe_id     uuid references recipes(id),
  start_s       real not null,
  end_s         real not null,
  title         text,
  hook          text,
  origin        text not null default 'manual',   -- manual | ai_suggest | recipe
  status        text not null default 'proposed', -- proposed | approved | rendering | rendered |
                                                  -- rejected | posted
  output_path   text,
  render_settings jsonb,                          -- the exact settings used (denormalized from recipe)
  created_at    timestamptz not null default now()
);

create table ideas (                               -- Phase 4
  id            uuid primary key default gen_random_uuid(),
  day           date not null default current_date,
  source        text not null,                    -- trending | source_channel_rss | own_analytics | llm
  title         text not null,
  summary       text,
  source_url    text,
  score         real,                             -- LLM/heuristic ranking
  scoring       jsonb,                            -- reasoning, factors
  status        text not null default 'new',      -- new | shortlisted | used | dismissed
  created_at    timestamptz not null default now()
);

create table posts (                               -- Phase 5
  id                uuid primary key default gen_random_uuid(),
  clip_id           uuid references clips(id),
  idea_id           uuid references ideas(id),
  platform          text not null default 'youtube_shorts',
  platform_video_id text,
  url               text,
  title             text,
  posted_at         timestamptz,
  created_at        timestamptz not null default now()
);

create table post_metrics (                        -- Phase 5 time series (feeds idea ranking)
  post_id       uuid not null references posts(id) on delete cascade,
  captured_at   timestamptz not null default now(),
  views         bigint, likes bigint, comments bigint,
  avg_view_pct  real,
  primary key (post_id, captured_at)
);
```

Relationships Hasura will track: machine ⇄ jobs, video ⇄ jobs/assets/clips, recipe ⇄ clips,
clip ⇄ posts, idea ⇄ videos/posts, post ⇄ metrics. Subscriptions on `jobs` power the live dashboard.

---

## 4. Phase-by-phase breakdown

Each phase ends with something you can run from your phone (or at least your browser).

### Phase 0 — Foundation (brain only) ✅ built, verified locally 2026-09-27 — awaiting server deploy
1. Restructure repo per §2 (v1 untouched and still runnable).
2. `docker-compose.yml`: Postgres 16, Hasura v2 (admin secret, console off, metadata/migrations from
   `hasura/`), `api` (FastAPI, near-empty), `web` (built PWA served statically — by the api container or Caddy).
3. Hasura CLI project: initial migration = schema §3 (machines, jobs, videos, assets only — the rest
   land in their phases); metadata in git.
4. PWA shell: Vite + React + TS, manifest + service worker (installable), Apollo wired to Hasura
   (`x-hasura-admin-secret` from a build-time env is fine — the tailnet is the security boundary),
   graphql-codegen pipeline, one page that lists `machines` via subscription.
5. `tailscale serve` the brain's compose stack over HTTPS; install the PWA on your phone.
6. Seed `machines` rows for the three machines.

**Test:** phone opens the PWA over Tailscale, sees the machines list live; `hasura migrate apply` is repeatable on a clean volume.

### Phase 1 — Job queue + first worker (transcription) + live dashboard ✅ built, verified locally 2026-09-27 — awaiting server deploy + laptop install (1h)

Goal: from the phone, transcribe a library video on the NVIDIA laptop with live progress,
surviving worker crashes. Detailed task list (in build order, each step testable):

**1a. Worker package skeleton** — `worker/` becomes an installable package (`pyproject.toml`,
plain `pip install -e .` on the Windows machines; deps: `psycopg[binary]`, `requests`,
`faster-whisper` as an extra `[transcribe]`).
- `worker/agent/config.py`: loads `worker.toml` — `name`, `capabilities = [...]`,
  `database_url` (tailnet address of the brain, e.g. `postgres://ytstudio:…@<brain-ts-ip>:5432/ytstudio`),
  `brain_url` (e.g. `http://<brain-ts-ip>:8080`), `ffmpeg_path`, `work_dir` (local scratch),
  `whisper = { model = "small", device = "cuda", compute_type = "int8_float16" }`.
- `worker/worker.toml.example` per machine.

**1b. Claim loop** — `worker/agent/main.py`:
- On startup: upsert own `machines` row by name (`status='online'`, `last_seen_at=now()`).
- Loop: claim with
  `UPDATE jobs SET status='claimed', claimed_by=$me, claimed_at=now(), heartbeat_at=now(), attempts=attempts+1
   WHERE id = (SELECT id FROM jobs WHERE status='queued' AND run_after <= now() AND type = ANY($caps)
   ORDER BY priority, created_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *` — else sleep 3 s.
- Run the job's adapter with `report(percent, note)` (throttled UPDATE ~1/s) and `should_cancel()`
  (reads `status='cancel_requested'` on each report; also checked by the heartbeat thread).
- Heartbeat thread: every 15 s `UPDATE jobs SET heartbeat_at=now()` + `UPDATE machines SET last_seen_at=now()`.
- Finish: `status='done', result=…, progress=100` / `status='error', error=…`. Graceful shutdown
  (SIGINT/SIGTERM): flip own running job back to `queued`, machine to `offline`.
- Test on the Mac first with a `noop` job type (sleeps, reports progress) before touching Whisper.

**1c. Watchdog** — Hasura cron trigger (every minute) → `POST /api/internal/watchdog` on `api`
(guard with the admin secret header): requeue `claimed|running` jobs with `heartbeat_at` older than
2 min (`attempts >= max_attempts` → `error`, note "worker died"); mark machines `offline` when
`last_seen_at` > 90 s. Add the cron trigger to Hasura metadata (`cron_triggers.yaml`) so it deploys with git.

**1d. File transfer v0** — in `api/app/files.py`:
- `GET /api/files/{video_id}/source` — stream the source file from the library.
- `GET /api/files/{video_id}/audio` — cached `ffmpeg -vn -c:a aac` extract (the api container image
  must add ffmpeg) so the laptop pulls ~50 MB instead of 5 GB.
- `POST /api/files/{video_id}/assets/{kind}` — worker uploads a result file (e.g. `transcript.json`);
  api writes it into the video's library folder and upserts the `assets` row.
- `worker/agent/storage.py` wraps download-to-scratch / upload-result against these endpoints.

**1e. Transcribe job type** — port v1 `run_transcribe` (server/downloader.py:937) →
`worker/core/transcribe.py`: pure function `(audio_path, model_cfg, report, should_cancel) → transcript dict`;
adapter in `worker/agent/jobs/transcribe.py` does download-audio → transcribe → upload asset.
Same output JSON shape as v1 (segments + word timestamps) so v1 sidecars stay compatible.

**1f. Library import** — `scripts/import_v1_library.py`: walk `LIBRARY_DIR` for `*/*.info.json`
(reuse v1's scan logic from server/main.py:api_library), insert `videos` + `assets` rows
(relative `storage_path`), idempotent by `(source, youtube_id)` / path. Run it against the copied
v1 `downloads/` on the server.

**1g. PWA: jobs dashboard + library v0** —
- `jobs.graphql` subscription (status, type, progress, progress_note, machine{name}, video{title}, error);
  Jobs page with progress bars; cancel button = mutation setting `cancel_requested`; retry = back to `queued`.
- Library v0 page: `videos` list (title, thumb via `/api/files/...`, duration, has-transcript badge)
  with a **Transcribe** button = `insert_jobs_one(type:"transcribe", video_id:…)` (plain mutation; Actions come in Phase 2).
- Machines page: green dot goes live now that workers report `last_seen_at`.

**1h. Windows install** — on the NVIDIA laptop: Python 3.12, `pip install -e worker[transcribe]`,
CUDA runtime (cuBLAS/cuDNN wheels via `pip install nvidia-cublas-cu12 nvidia-cudnn-cu12` if needed),
`worker.toml`, Task Scheduler at-logon task (`docs/WORKER-WINDOWS.md` with the exact steps).

**Phase-1 exit test:** phone → library video → Transcribe → job queued → laptop claims → live progress
on the dashboard → transcript asset appears. Kill the worker mid-job → watchdog requeues within ~2 min →
job completes after worker restart. Cancel works from the phone.

### Phase 2 — All v1 features as job types (v1 retired at the end) ✅ built, verified locally 2026-09-27 — awaiting server deploy + phone test (step 8 pending)
1. Port the rest of `worker/core/`: `ytdlp_ops` (download/probe), `media` (scenes, borders, convert,
   clippack, tighten, import), `render` + `captions` (export), `gemini` (suggest, postkit) —
   library-relative paths, `report()` callback, cancel checks, `encoders.py` (libx264 default, h264_amf
   on the gaming PC behind a config flag).
2. Job adapters + payload schemas (pydantic) for each type; `payload` mirrors v1's `ExportBody` so the
   validation logic ports straight across.
3. Hasura Actions: `probe_url`, `start_download(url, quality)`, `enqueue_job(type, video_id, payload)` —
   handled by `api`, which inserts rows.
4. Event triggers (fan-out): on `videos.status → 'ready'` insert scenes + transcribe jobs; on suggest-job
   done insert `clips` rows (`origin='ai_suggest'`); "Auto Shorts" becomes an event chain rather than one
   mega-job (each step retryable on its capable machine).
5. Wake-on-LAN: `api/wol.py` sends the magic packet (see §5 for the relay caveat); "Wake gaming PC"
   button + auto-wake when a `render`/`llm` job sits unclaimed for N minutes with the PC offline.
6. PWA: library page (videos grid from DB), video page (player streaming from the brain's file endpoint,
   transcribe/scenes/suggest/export controls — port the `Player.jsx` UX, decomposed into components),
   job cancel/retry.
7. **Ideas inbox ("queue this for later")** — the phone-first flow the whole system exists for:
   paste a URL + a note from the phone, pick a pipeline (`prepare` = download → transcribe + scenes
   → suggest clips; `shorts` = also render every suggested clip with default settings), and the
   machines do the work while you're out. `videos.note` + `videos.pipeline` columns; the fan-out in
   step 4 reads `pipeline` to decide how far to go. The library shows "ready to edit" items with the
   note, so at home you open the video page and the clips/transcript/renders are already there.
8. Retire `server/` + `ui/` (delete; `git tag v1` first) — once the phone test below passes on the
   real machines, not before.

**Test:** full v1 workflow phone-first: paste URL → download (gaming PC or brain) → auto transcribe+scenes → suggest clips → export a captioned 9:16 → play the result on the phone. Gaming PC asleep → render job wakes it.

### Phase 3 — Edit recipes  ← NEXT
1. `recipes` table + CRUD in PWA; migrate `presets.json` as seed data. Extend the settings JSON for your
   every-short edits: watermark overlay, SFX layers (reuse the music/duck machinery), punch-in zoom markers.
2. `auto_apply` recipes: event trigger on video ready (after transcribe/scenes) → render jobs per recipe.
3. Review screen (the phone payoff): rendered clips as swipeable cards — approve / reject / tweak-and-rerender;
   approve moves `clips.status → 'approved'` and surfaces the postkit.
4. Optional: DaVinci Resolve timeline export — generate FCPXML from a clip list (start/end/source),
   downloadable from the PWA, for edits that need hand-finishing.

**Test:** new download → recipe renders automatically overnight → morning phone review → approved file + title/hashtags ready to post.

### Phase 4 — Idea engine
1. `ideas` table. Fetchers in `api/app/ideas/`: YouTube Data API (trending gaming videos, keyword
   searches), source-channel RSS (`/feeds/videos.xml?channel_id=`, no quota), own-channel stats
   (YouTube Analytics API, OAuth).
2. Ranking as an `llm` job the gaming PC claims (Ollama/llama.cpp via Vulkan on the 6750 XT — Gemini
   fallback so it also works with the PC asleep): score ideas against your channel's niche and past
   performance, write `score` + `scoring`.
3. Hasura cron trigger (daily, morning): fetch → dedupe → rank → notify (PWA badge; push later).
4. PWA ideas page: today's ranked list; "use this" → creates a video row with the source URL →
   download pipeline takes over.

**Test:** wake up, open the PWA, see ~10 ranked ideas with reasons; tap one and the footage is downloading.

### Phase 5 — Feedback loop
1. `posts` + `post_metrics`. Posting stays manual; a small PWA form (or share-target) links a published
   Short's URL/ID to its clip.
2. Nightly cron: YouTube Analytics fetch per post → `post_metrics` rows.
3. Feed performance back into Phase 4 ranking (which sources/games/hooks over/under-perform → prompt
   context for the ranking LLM). PWA performance page.

**Test:** after a week of posts, the ideas list visibly reflects what worked.

---

## 5. Risks, open questions, decisions I need from you

**Machines & OS — DECIDED:**
1. **Brain = Ubuntu Server.** Ideal for the compose stack: Docker Engine + Compose plugin, `tailscaled`
   as a systemd service, `tailscale serve` for HTTPS. Dev happens on this Mac; deploy = `git pull` +
   `docker compose up -d` on the server.
2. **NVIDIA laptop = Windows 11.** faster-whisper on Windows CUDA works natively (no WSL needed) —
   Python + cuDNN/cuBLAS wheels. Worker runs as a startup task (Task Scheduler "at logon", or NSSM as a
   service). Keep the laptop's power settings from sleeping while plugged in, or accept it only works when open.
3. **Gaming PC = Windows 11.** AMD encode = **`h264_amf`** (needs an ffmpeg build with AMF — Gyan.FFmpeg
   full has it). Local LLM: Ollama's native Windows build uses Vulkan/ROCm on the 6750 XT. No WSL anywhere —
   native Windows workers keep GPU access and WoL simple. Both Windows workers reach Postgres over the
   tailnet (`sslmode=disable` inside the tailnet is fine).

**Storage — DECIDED:**
4. **Library lives on the Ubuntu server's disk (1 TB); workers transfer over HTTP** (option a).
   All machines share one LAN at 1 Gbps and Tailscale takes the direct LAN path, so a 5 GB 4K source
   moves in under a minute. The `api` service serves library files and accepts worker result uploads.
   Transcription jobs get an audio-only extract to keep pulls tiny.
5. Cleanup policy: revisit when the disk passes ~70% (v1's library is 5.4 GB for 5 videos — 1 TB is
   roughly 500–900 source videos). Add a "purge source, keep renders + sidecars" job type later if needed.

**Wake-on-LAN:**
6. **DECIDED: all machines share one physical LAN**, so the Ubuntu server sends magic packets directly
   (no relay needed; `machines.wol_via` stays for future flexibility). Windows 11 checklist for the gaming
   PC: enable Wake-on-Magic-Packet in the NIC driver, disable Fast Startup (it breaks WoL from shutdown),
   Ethernet strongly preferred — WoL over Wi-Fi is unreliable.

**APIs & AI:**
7. **YouTube Data API key** (Phase 4) and **OAuth for YouTube Analytics** on your channel (Phases 4–5) —
   you'll need a Google Cloud project; quota (10k units/day) is plenty for this.
8. **DECIDED**: **Gemini for clip suggestions + post kits** (vision + quality, ~fractions of a cent),
   **local LLM for idea ranking** (high-volume, text-only, free), with Gemini fallback when the PC is asleep.
9. Whisper model for the GTX 1650 — `small` (current) or try `medium`? 4 GB VRAM fits medium at int8.

**Other risks, noted:**
- **yt-dlp breakage** is chronic (your 403 history). Mitigation: pin nightly channel, keep `cookies.txt`
  on the download-capable worker, and make download job errors loud in the dashboard.
- **AMF quality < libx264** at equal bitrate. Plan: AMF for preview/review renders, optional libx264
  final pass for the approved clip (Ryzen 3600 handles 1080p60 Shorts fine).
- **Hasura admin secret in the PWA**: acceptable single-user-on-tailnet; if the tailnet is ever shared,
  switch to JWT + permission rules (schema is designed to allow it).
- **Phone uploads/streaming through `tailscale serve`** are proxied by the brain — fine for Shorts-sized
  files; source-file streaming to the phone player should use the edit copy / rendered clip, not 4K mkv.
- **Scope creep** is the real enemy: Phases 0–2 deliver "v1 but from my phone with a real queue" — resist
  adding recipe/idea features before that's solid.
