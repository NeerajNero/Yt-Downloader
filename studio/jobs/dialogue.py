"""dialogue: transcript word timing (or silence detection) -> `<stem>.dialogue.json`."""

from studio.core import dialogue as core, media

from . import JobContext


def handle(ctx: JobContext) -> dict:
    video = ctx.video()
    p = ctx.payload
    transcript = ctx.asset_json(video, "transcript")
    if transcript:
        ctx.report(None, "grouping words into lines")
        data = core.from_transcript(transcript, gap=p["gap"], min_len=p["min_len"])
    else:
        src = ctx.source_file(video)
        ctx.report(None, "no transcript — listening for sound")
        duration = video.get("duration") or ctx.tools.probe_duration(src) or 0
        data = core.from_silences(media.detect_silences(src, ctx.tools, min_silence=max(0.3, p["gap"])), duration, p["min_len"])
    data["src"] = video["storage_path"]
    rel = ctx.put_json(ctx.sidecar_rel(video, "dialogue"), data)
    ctx.register_asset(video, "dialogue", rel)
    return {"asset_path": rel, "lines": len(data["lines"]), "source": data["source"]}
