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
                   (dialogue = speech lines from the transcript; tags = Gemini shot labels per scene;
                   beats = beat grid for one music track, light lane, keeps drop_s_manual across re-runs)
  pipeline.py      the automatic chain (prepare / shorts) after downloads and finished jobs
  routes/          JSON API (state.py reads, actions.py writes, files.py, ingest.py)
  core/            pure media functions (ffmpeg, yt-dlp, whisper, Gemini) — no app state
  core/beats.py    beat grid: ffmpeg decode → librosa (only there) → bpm, beats, 4/4 downbeat guess,
                   drop; plus the playbook's default_range / nearest_beat maths
  schemas.py       pydantic payload/recipe schemas
  tests/           pytest (no ffmpeg needed)
web/               React + Vite + TS PWA; polls the API every second (lib/poll.ts)
  src/lib/beats.ts     mirror of core/beats default_range / nearest_beat (change both together)
  src/lib/captions.ts  mirror of core/captions hook / payoff timing and fit_font_size sizing
  src/lib/snap.ts      montage beat snapping: sequence_layout mirror, beats in output time, snapCut
docs/PLAYBOOK.md   the Shorts rules the Phase 1 features implement (peak, drop, hook, payoff, safe area)
```

## Conventions

- **Paths stored anywhere are library-root-relative** (posix). `studio/library.py` resolves them.
- **Assets are files.** A transcript exists when `<stem>.transcript.json` exists — there is no
  registry. Derived artifacts go next to the media (v1 sidecar layout). Clips + review status are
  `<stem>.clips.json`; app-level state is `<library>/.ytstudio/`.
- Montage segments may carry their own `transition` (into the next shot) and `shake_markers`;
  `render.sequence_layout` returns one bounds entry per boundary (kind + clamped overlap) and the
  graph mixes `concat` (cut) with `xfade`. Every shot chain ends in `setsar=1` — concat needs it.
- Crop window: `crop_x` / `crop_y` (0..1) + `crop_zoom` (1..3) on the render payload place the crop
  (Fill) or a zoomed window (Fit) — `render._window()`; `Player.cropWindow()` mirrors the same maths
  for the draggable box, so change both together.
- Jobs: `queued → running → done | error | cancelled`; cancel = `cancel_requested`, the handler's
  `should_cancel()` notices. Jobs die with the process — that is the design.
- `studio/core/` functions take `report(percent, note)` + `should_cancel()` and never touch the
  store. Only `studio/jobs/`, `studio/pipeline.py` and `studio/routes/` do.
- Encoder from `studio/core/encoders.py`, keyed by `Settings.encoder` — never hardcode libx264.
  Profiles: `final`, `fast`, `edit`, and `proxy` (720p max, lowest quality; only the style-clone
  copy sent to Gemini uses it).
- Captions (`core/captions.py`): every style stays inside the safe area, left 5 % / right 15 % /
  top 10 % / bottom 20 % of the frame (portrait margins 54 / 162 / 192 / 384 px, landscape
  96 / 288 / 108 / 216). Hook (frame 1) and Payoff (on the peak) are sized by `fit_font_size`
  between a ceiling (1.6× / 1.3× the preset's Cap size) and a floor (0.9× / 0.8×), never with
  `\k`; regular captions are suppressed while one is on screen. `web/src/lib/captions.ts` mirrors it.
- Clips carry `peak_s`, `hook_text`, `payoff_text`; they ride on the render payload and are never
  in a recipe. The music drop (`.music/<name>.beats.json`, manual override first) is aligned to the
  peak by `render.music_plan`; a peak outside every montage shot keeps the old looping bed.
- Audio (`core/render.py`): each montage shot (and a plain range) has `source_audio` keep | mute and
  `source_gain_db` (−30..+6), applied as `volume` windows in output time on the assembled source
  stream; a reversed shot or a speed outside 0.25–4× is muted automatically (`audio_notes` in the job
  result). Music ducks under that post-gain source with `duck` = off | light | medium | heavy
  (`DUCK_PRESETS`, sidechaincompress threshold / ratio / attack / release: light 0.05 / 4 / 20 / 400,
  medium 0.02 / 8 / 15 / 350, heavy 0.01 / 16 / 10 / 300; the old boolean maps true → medium). Per-shot
  audio never enters a recipe; `duck` and `music_gain` do.
- Motion per montage shot (`core/render.shot_retime`): `speed` 0.1–4×, `reverse` (the `reverse`
  filter on the trimmed segment before `setpts`, ≤ 6 s of source, same output length as forward,
  audio muted), `smooth` (minterpolate mci/aobmc/bidir at the output fps for speed < 1 on final
  renders only; previews always duplicate frames, `motion_notes` says so). `source_to_output` runs
  backwards inside a reversed shot, so the peak / drop and caption timing follow it; snap.ts mirrors it.
- Previews (`studio/preview.py`, `jobs/preview.py`): the render payload at 540 px, fps ≤ 30, `proxy`
  profile, no loudnorm, on its own queue lane, cached under `work/preview/<video_id>/<hash>.mp4`
  (LRU of 30). Never an asset, never on a clip row.
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
