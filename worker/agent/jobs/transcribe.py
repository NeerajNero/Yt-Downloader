"""transcribe job: pull the audio extract from the brain, run faster-whisper,
upload `<stem>.transcript.json` as the video's `transcript` asset.

payload (all optional): {"model": "small", "language": "en"} — overrides worker.toml.
result: {"asset_path", "language", "segments", "words", "has_speech"}
"""

from __future__ import annotations

from dataclasses import replace

from worker.core import transcribe as core

from . import JobContext


def _mb(n: int) -> str:
    return f"{n / 1e6:.0f} MB"


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    if not video.get("storage_path"):
        raise ValueError("video has no source file yet (storage_path is null)")

    cfg = ctx.cfg.whisper
    if ctx.payload.get("model"):
        cfg = replace(cfg, model=str(ctx.payload["model"]))
    if ctx.payload.get("language"):
        cfg = replace(cfg, language=str(ctx.payload["language"]))

    scratch = ctx.storage.job_dir(ctx.id)
    try:
        ctx.report(None, "fetching audio")

        def dl_progress(done: int, total: int | None) -> None:
            if ctx.should_cancel():
                raise core.Cancelled()
            note = f"fetching audio {_mb(done)}" + (f" / {_mb(total)}" if total else "")
            ctx.report(None, note)

        audio = ctx.storage.fetch_audio(str(video["id"]), scratch, dl_progress)

        transcript = core.transcribe_file(
            str(audio), cfg, ctx.report, ctx.should_cancel,
            duration=video.get("duration"),
        )
        transcript["src"] = video["storage_path"]

        ctx.report(99.0, "uploading transcript")
        uploaded = ctx.storage.upload_asset(str(video["id"]), "transcript", transcript, job_id=ctx.id)
    finally:
        ctx.storage.cleanup(ctx.id)

    return {
        "asset_path": uploaded.get("path"),
        "language": transcript["language"],
        "segments": len(transcript["segments"]),
        "words": core.word_count(transcript),
        "has_speech": core.has_speech(transcript),
        "model": cfg.model,
        "device": cfg.device,
    }
