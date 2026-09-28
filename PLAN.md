# YT Studio — plan

## Where things stand (2026-09-28)

**v1** (single-machine FastAPI + React, filesystem state) worked but had a 979-line player monolith
and no recipes/montage/AI plan. **v2** (Phases 0–3.6) rebuilt everything as a three-machine job
system: Postgres + Hasura + FastAPI brain on an always-on Ubuntu laptop, worker agents on the
Windows machines, Wake-on-LAN, a phone PWA on GraphQL subscriptions. It worked locally but the
always-on brain was the wrong trade: the laptop was slow for encodes, and a tool used a few hours
a week doesn't need a queue that survives restarts or machines that wake each other.

**v3** (this tree) keeps everything valuable from v2 — the ported and extended media code in
`studio/core` (sequence renders with transitions, recipes with watermark/SFX/punch-ins, AI edit
plan, style clone, review flow, the redesigned video page) — and throws away the infrastructure:

| v2 | v3 |
|---|---|
| Postgres + Hasura, migrations, metadata | JSON files under `<library>/.ytstudio/` + `<stem>.clips.json` sidecars |
| `assets` table | a file exists ⇒ the asset exists |
| worker agents, claim loop, heartbeats, watchdog, machines page | one in-memory queue with a heavy lane (1 ffmpeg/whisper job) and a light lane (downloads, Gemini) |
| Hasura event triggers | `studio/pipeline.py` called when a job finishes |
| Actions + `/api` split across Hasura and FastAPI | one JSON API (`studio/routes`) |
| GraphQL subscriptions, codegen | `usePoll()` every second + `invalidate()` after writes |
| Docker Compose, Caddy, tailscale serve, WoL | `run.bat` → `python -m studio`; `HOST=0.0.0.0` for the phone |
| HTTP file transfer between machines | the library is local |

The old code is at git tag `v2-multimachine` (and `v1-last` for the original app).

## How it is used

1. `run.bat` on the gaming PC. Browser opens at `http://127.0.0.1:8765`.
2. Add a link (or upload / drop a folder into the library + Rescan). Pick *Just download*,
   *Prepare* (transcript, scenes, AI clip picks, edit plan, post kit) or *Auto Shorts* (also render
   every pick with each auto-apply recipe).
3. Open the video: **Prepare** checklist → **Clips** (AI picks, plan, your own ranges) → **Edit**
   (recipe, format, look, captions, sound, brand; one range or a montage) → Render.
4. **Review**: approve / reject / tweak / mark posted; post kit ready to paste.
5. Resolve hand-off: FCPXML timeline of the clips from **Tools**.

Manual by choice: judging clips, real editing in Resolve, posting.
Automatic: everything the pipelines do. Nothing runs while the app is closed.

## Next

- **Phone outbox** — when the PC is off, the PWA keeps pasted links + notes in the browser and
  submits them when the app is reachable again (Background Sync or on open).
- **OBS watch folder** — new recordings in a configured folder become library videos automatically.
- **Laptop transcribe helper** (only if CPU whisper becomes the bottleneck): a tiny HTTP service on
  the NVIDIA laptop; the app posts the audio to it when reachable, else transcribes locally.
- **Idea engine** (was Phase 4) as buttons, not cron: YouTube Data API trending / channel RSS →
  Gemini ranking → "use this" creates a download.
- **Feedback loop** (was Phase 5): link posted Shorts to clips, fetch analytics on demand, feed
  performance into the ranking prompt.
- Cleanup job: purge sources, keep renders + sidecars, when the disk fills.

## Risks

- yt-dlp breakage is chronic — nightly channel (`pip install -U --pre yt-dlp`), keep `cookies.txt`.
- AMF quality < libx264 at equal bitrate; `ENCODER=libx264` for a final pass if it matters.
- The single `videos.json` is rewritten on every change (atomic replace). Fine at hundreds of
  videos; if it ever isn't, split per folder like clips.
- The PWA only installs over HTTPS. Over plain http on the LAN it works as a web page; for an
  installable phone app use `tailscale serve` on the PC (see docs/PHONE.md).
