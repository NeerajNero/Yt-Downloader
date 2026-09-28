"""transcribe: source -> faster-whisper (CPU by default) -> `<stem>.transcript.json`."""

from __future__ import annotations

from dataclasses import replace

from studio.core import transcribe as core

from . import JobContext


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    p = ctx.payload
    cfg = ctx.settings.whisper
    if p.get("model"):
        cfg = replace(cfg, model=p["model"])
    if p.get("language"):
        cfg = replace(cfg, language=p["language"])
    audio = ctx.source_file(video)
    transcript = core.transcribe_file(str(audio), cfg, ctx.report, ctx.should_cancel, duration=video.get("duration"))
    transcript["src"] = video["storage_path"]
    ctx.report(99.0, "saving transcript")
    rel = ctx.put_json(ctx.sidecar_rel(video, "transcript"), transcript)
    ctx.register_asset(video, "transcript", rel)
    words = core.word_count(transcript)
    return {"asset_path": rel, "language": transcript["language"], "segments": len(transcript["segments"]),
            "words": words, "has_speech": core.has_speech(transcript), "model": cfg.model, "device": cfg.device}
