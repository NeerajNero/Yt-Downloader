"""transcribe: audio (extract over HTTP, or the source itself when the library
is mounted) -> faster-whisper -> `<stem>.transcript.json` + `transcript` asset."""

from __future__ import annotations

from dataclasses import replace

from worker.core import transcribe as core

from . import JobContext


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    ctx.source_rel(video)
    p = ctx.payload
    cfg = ctx.cfg.whisper
    if p.get("model"):
        cfg = replace(cfg, model=p["model"])
    if p.get("language"):
        cfg = replace(cfg, language=p["language"])

    scratch = ctx.storage.job_dir(ctx.id)
    try:
        if ctx.storage.local:
            audio = ctx.source_file(video)
        else:
            def dl(done: int, total: int | None) -> None:
                if ctx.should_cancel():
                    raise core.Cancelled()
                ctx.report(None, f"fetching audio {done / 1e6:.1f} MB" + (f" / {total / 1e6:.1f} MB" if total else ""))
            ctx.report(None, "fetching audio")
            audio = ctx.storage.fetch_audio(str(video["id"]), scratch, dl)

        transcript = core.transcribe_file(str(audio), cfg, ctx.report, ctx.should_cancel,
                                          duration=video.get("duration"))
        transcript["src"] = video["storage_path"]

        ctx.report(99.0, "saving transcript")
        rel = ctx.storage.put_json(ctx.sidecar_rel(video, "transcript"), transcript)
        words = core.word_count(transcript)
        ctx.upsert_asset(str(video["id"]), "transcript", rel, {
            "language": transcript["language"], "segments": len(transcript["segments"]),
            "words": words, "model": cfg.model,
        })
    finally:
        ctx.storage.cleanup(ctx.id)

    return {"asset_path": rel, "language": transcript["language"],
            "segments": len(transcript["segments"]), "words": words,
            "has_speech": core.has_speech(transcript), "model": cfg.model, "device": cfg.device}
