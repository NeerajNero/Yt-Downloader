"""style: download a reference Short into <library>/.refs/<id>/, measure it,
have Gemini break the edit down, store report + recipe + Resolve notes on
the `styles` row."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from worker.core import style as core
from worker.core import ytdlp_ops

from . import JobContext


def handle(ctx: JobContext) -> dict:
    p = ctx.payload
    style_id = p["style_id"]
    row = ctx.db.fetch_one("select * from styles where id = %s", (style_id,))
    if row is None:
        raise ValueError("style row not found")
    url = p.get("url") or row["url"]
    ctx.db.execute("update styles set status = 'analyzing', error = null, job_id = %s where id = %s", (ctx.id, style_id))
    scratch = ctx.storage.job_dir(ctx.id)
    try:
        # 1. reference download, small (≤480p mp4) so Gemini can take it inline
        ctx.report(None, "fetching reference")
        out = ytdlp_ops.download(url, "480", scratch, ctx.report, ctx.should_cancel,
                                 cookiefile=str(ctx.cfg.cookies_file) if ctx.cfg.cookies_file else None,
                                 ffmpeg_dir=ctx.tools.ffmpeg_dir, mp4=True)
        info, src = out["info"], Path(out["filepath"])
        yt_id = info.get("id") or row.get("youtube_id") or style_id
        rel_dir = f".refs/{yt_id}"
        ref_rel = ctx.storage.join(rel_dir, "ref" + src.suffix.lower())
        ref_local = ctx.storage.output_path(ref_rel, ctx.id)
        if ref_local.resolve() != src.resolve():
            shutil.move(str(src), str(ref_local))
        thumb_rel = None
        if out["thumb"]:
            thumb_rel = ctx.storage.join(rel_dir, "thumb" + out["thumb"].suffix.lower())
            ctx.storage.put_file(thumb_rel, out["thumb"], move=True)

        # 2. measure
        measured = core.measure(ref_local, ctx.tools, ctx.report, ctx.should_cancel)

        # 3. Gemini
        ctx.report(None, "asking gemini to watch it")
        report = core.analyze(ref_local, info.get("title") or row.get("title") or url, measured,
                              ctx.tools, scratch, ctx.should_cancel, on_retry=lambda n: ctx.report(None, n))
        recipe = core.to_recipe(report, measured)
        notes = core.resolve_markdown(report, measured)
        report["chips"] = core.chips(report, measured)

        ctx.storage.put_file(ref_rel, ref_local, move=True)
        ctx.db.execute(
            """update styles set status = 'ready', title = %s, channel = %s, youtube_id = coalesce(%s, youtube_id),
                      duration = %s, width = %s, height = %s, ref_path = %s, thumb_path = %s,
                      measured = %s::jsonb, report = %s::jsonb, recipe = %s::jsonb, resolve_notes = %s
                where id = %s""",
            (info.get("title") or row.get("title"), info.get("uploader") or info.get("channel"),
             info.get("id") if (info.get("extractor_key") or "").lower().startswith("youtube") else None,
             measured["duration"], measured["width"], measured["height"], ref_rel, thumb_rel,
             json.dumps(measured), json.dumps(report), json.dumps(recipe), notes, style_id),
        )
    except BaseException as e:
        ctx.db.execute("update styles set status = 'failed', error = %s where id = %s",
                       (f"{type(e).__name__}: {e}"[:400], style_id))
        raise
    finally:
        ctx.storage.cleanup(ctx.id)
    return {"style_id": style_id, "chips": report["chips"], "cuts": measured["cuts"], "model": report.get("model")}
