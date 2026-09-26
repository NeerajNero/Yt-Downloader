#!/usr/bin/env python3
"""One-time (idempotent) import of a v1 `downloads/` library into Postgres.

Walks LIBRARY_DIR for `*/*.info.json` (v1's scan, server/main.py:api_library),
inserts/updates `videos` rows with library-relative paths, and registers the
sidecars it finds as `assets` rows. Safe to re-run: videos match on
youtube_id (or storage_path for local imports), assets on (video_id, kind).

Run on the brain inside the api container (it has DATABASE_URL + /library):

    docker compose exec api python scripts/import_v1_library.py [--dry-run]

or anywhere with DATABASE_URL and LIBRARY_DIR set (needs psycopg).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import psycopg

MEDIA_EXTS = {".mkv", ".mp4", ".webm", ".m4a", ".mov", ".mp3", ".opus"}
IMAGE_EXTS = {".webp", ".jpg", ".jpeg", ".png"}
SIDECARS = {  # kind -> suffix after the media stem
    "transcript": ".transcript.json",
    "scenes": ".scenes.json",
    "captions": ".captions.json",
    "suggestions": ".suggestions.json",
    "postkit": ".postkit.json",
}
META_KEYS = ("upload_date", "fps", "ext", "thumbnail", "description", "tags", "categories",
             "view_count", "like_count", "channel_id", "channel_url", "format_id", "dynamic_range")


def rel(root: Path, p: Path) -> str:
    return p.relative_to(root).as_posix()


def summarize(kind: str, path: Path) -> dict | None:
    try:
        obj = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if kind == "transcript":
        segs = obj.get("segments") or []
        return {"language": obj.get("language"), "segments": len(segs),
                "words": sum(len(s.get("words") or []) for s in segs), "model": obj.get("model")}
    if kind == "scenes":
        return {"scenes": len(obj.get("scenes") or []), "threshold": obj.get("threshold")}
    if kind == "captions":
        return {"items": len(obj.get("items") or [])}
    return None


def scan(root: Path):
    for info_path in sorted(root.glob("*/*.info.json")):
        folder = info_path.parent
        try:
            info = json.loads(info_path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as e:
            print(f"  skip {folder.name}: bad info.json ({e})", file=sys.stderr)
            continue
        media = [f for f in folder.iterdir()
                 if f.suffix.lower() in MEDIA_EXTS and not f.stem.endswith("_edit")]
        if not media:
            print(f"  skip {folder.name}: no media file", file=sys.stderr)
            continue
        main = max(media, key=lambda f: f.stat().st_size)
        thumb = next((f for f in sorted(folder.iterdir()) if f.suffix.lower() in IMAGE_EXTS), None)

        youtube_id = info.get("id") if info.get("extractor_key", "Youtube").lower().startswith("youtube") else None
        video = {
            "source": "youtube" if youtube_id else "import",
            "youtube_id": youtube_id,
            "url": info.get("webpage_url") or info.get("original_url"),
            "title": info.get("title") or main.stem,
            "channel": info.get("uploader") or info.get("channel"),
            "duration": info.get("duration"),
            "width": info.get("width"),
            "height": info.get("height"),
            "vcodec": info.get("vcodec"),
            "size_bytes": main.stat().st_size,
            "storage_path": rel(root, main),
            "thumb_path": rel(root, thumb) if thumb else None,
            "meta": {k: info[k] for k in META_KEYS if k in info},
        }
        if isinstance(video["meta"].get("description"), str):
            video["meta"]["description"] = video["meta"]["description"][:2000]

        assets = []
        for kind, suffix in SIDECARS.items():
            p = folder / f"{main.stem}{suffix}"
            if p.is_file():
                assets.append((kind, rel(root, p), summarize(kind, p)))
        edits = sorted(folder.glob("*_edit.mp4"))
        if edits:
            assets.append(("edit_copy", rel(root, edits[0]), None))
        if (folder / "clips" / "clippack.json").is_file():
            assets.append(("clip_pack", rel(root, folder / "clips" / "clippack.json"), None))
        yield video, assets, folder


UPSERT_YT = """
insert into videos (source, youtube_id, url, title, channel, duration, width, height, vcodec,
                    size_bytes, storage_path, thumb_path, status, meta)
values (%(source)s, %(youtube_id)s, %(url)s, %(title)s, %(channel)s, %(duration)s, %(width)s,
        %(height)s, %(vcodec)s, %(size_bytes)s, %(storage_path)s, %(thumb_path)s, 'ready', %(meta)s::jsonb)
on conflict (youtube_id) do update
   set title = excluded.title, channel = excluded.channel, duration = excluded.duration,
       width = excluded.width, height = excluded.height, vcodec = excluded.vcodec,
       size_bytes = excluded.size_bytes, storage_path = excluded.storage_path,
       thumb_path = excluded.thumb_path, status = 'ready', meta = excluded.meta
returning id, (xmax = 0) as inserted
"""

UPSERT_ASSET = """
insert into assets (video_id, kind, path, data)
values (%s, %s, %s, %s::jsonb)
on conflict (video_id, kind) do update set path = excluded.path, data = excluded.data
"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--library", default=os.environ.get("LIBRARY_DIR", "/library"))
    ap.add_argument("--database-url", default=os.environ.get("DATABASE_URL"))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    root = Path(args.library).resolve()
    if not root.is_dir():
        print(f"library dir not found: {root}", file=sys.stderr)
        return 2
    if not args.dry_run and not args.database_url:
        print("DATABASE_URL required (or --dry-run)", file=sys.stderr)
        return 2

    print(f"scanning {root}")
    conn = None if args.dry_run else psycopg.connect(args.database_url, autocommit=True)
    n_new = n_upd = n_assets = 0
    for video, assets, folder in scan(root):
        kinds = ",".join(k for k, _, _ in assets) or "-"
        print(f"  {video['title'][:60]!s:60}  {video['storage_path'].split('/')[-1][-20:]:>20}  assets: {kinds}")
        if conn is None:
            continue
        with conn.cursor() as cur:
            v = dict(video, meta=json.dumps(video["meta"]))
            if video["youtube_id"]:
                cur.execute(UPSERT_YT, v)
                vid, inserted = cur.fetchone()
            else:
                cur.execute("select id from videos where storage_path = %s", (video["storage_path"],))
                row = cur.fetchone()
                if row:
                    vid, inserted = row[0], False
                    cur.execute("update videos set title=%(title)s, size_bytes=%(size_bytes)s, "
                                "thumb_path=%(thumb_path)s, meta=%(meta)s::jsonb, status='ready' where id=%(id)s",
                                dict(v, id=vid))
                else:
                    cur.execute(UPSERT_YT.split("on conflict")[0] + " returning id, true", v)
                    vid, inserted = cur.fetchone()
            n_new += int(inserted)
            n_upd += int(not inserted)
            for kind, path, data in assets:
                cur.execute(UPSERT_ASSET, (vid, kind, path, json.dumps(data) if data is not None else None))
                n_assets += 1
    if conn is not None:
        conn.close()
        print(f"done: {n_new} new, {n_upd} updated, {n_assets} assets registered")
    return 0


if __name__ == "__main__":
    sys.exit(main())
