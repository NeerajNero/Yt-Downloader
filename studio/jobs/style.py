"""style: download a reference Short into <library>/.refs/<id>/, measure it,
have Gemini break the edit down, store report + recipe + Resolve notes on
the style record."""

from __future__ import annotations

import shutil
from pathlib import Path

from studio.core import style as core
from studio.core import ytdlp_ops

from . import JobContext


def handle(ctx: JobContext) -> dict:
    p = ctx.payload
    style_id = p["style_id"]
    row = ctx.store.get_style(style_id)
    if row is None:
        raise ValueError("style not found")
    url = p.get("url") or row["url"]
    ctx.store.update_style(style_id, status="analyzing", error=None, job_id=ctx.id)
    scratch = ctx.job_dir()
    try:
        ctx.report(None, "fetching reference")
        out = ytdlp_ops.download(url, "480", scratch, ctx.report, ctx.should_cancel,
                                 cookiefile=ctx.cookies, ffmpeg_dir=ctx.tools.ffmpeg_dir, mp4=True)
        info, src = out["info"], Path(out["filepath"])
        yt_id = info.get("id") or row.get("youtube_id") or style_id
        rel_dir = f".refs/{yt_id}"
        ref_rel = ctx.lib.join(rel_dir, "ref" + src.suffix.lower())
        ref_local = ctx.lib.output_path(ref_rel)
        shutil.move(str(src), str(ref_local))
        thumb_rel = None
        if out["thumb"]:
            thumb_rel = ctx.lib.join(rel_dir, "thumb" + out["thumb"].suffix.lower())
            shutil.move(str(out["thumb"]), str(ctx.lib.output_path(thumb_rel)))

        measured = core.measure(ref_local, ctx.tools, ctx.report, ctx.should_cancel)
        ctx.report(None, "asking gemini to watch it")
        report = core.analyze(ref_local, info.get("title") or row.get("title") or url, measured,
                              ctx.tools, scratch, ctx.should_cancel, on_retry=lambda n: ctx.report(None, n))
        recipe = core.to_recipe(report, measured)
        notes = core.resolve_markdown(report, measured)
        report["chips"] = core.chips(report, measured)
        ctx.store.update_style(
            style_id, status="ready", title=info.get("title") or row.get("title"),
            channel=info.get("uploader") or info.get("channel"),
            youtube_id=(info.get("id") if (info.get("extractor_key") or "").lower().startswith("youtube") else None) or row.get("youtube_id"),
            duration=measured["duration"], width=measured["width"], height=measured["height"],
            ref_path=ref_rel, thumb_path=thumb_rel, measured=measured, report=report, recipe=recipe,
            resolve_notes=notes,
        )
    except BaseException as e:
        ctx.store.update_style(style_id, status="failed", error=f"{type(e).__name__}: {e}"[:400])
        raise
    finally:
        ctx.cleanup()
    return {"style_id": style_id, "chips": report["chips"], "cuts": measured["cuts"], "model": report.get("model")}
