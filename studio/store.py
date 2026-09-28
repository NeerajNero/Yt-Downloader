"""App state as JSON files — no database.

    <library>/.ytstudio/videos.json    the library index (+ hidden entries)
    <library>/.ytstudio/recipes.json   saved looks
    <library>/.ytstudio/styles.json    analysed Shorts
    <folder>/<stem>.clips.json         a video's clips + review status

Everything is held in memory behind one lock and written through atomically
on change. Records keep the v2 column names so the UI and job adapters read
the same shapes as before. Jobs are not here — they live in the queue and die
with the process, by design.
"""

from __future__ import annotations

import json
import logging
import threading
import time
import uuid
from pathlib import Path

from studio.library import Library, now_iso, write_json_atomic
from studio.schemas import validate_recipe

log = logging.getLogger("store")

META_KEYS = ("upload_date", "fps", "ext", "thumbnail", "description", "tags", "categories",
             "view_count", "like_count", "channel_id", "channel_url", "format_id", "dynamic_range")

DEFAULT_RECIPES = [
    {
        "name": "auto-shorts-default",
        "description": "What Auto Shorts renders: blurred pad 9:16, karaoke captions when there is speech, bars trimmed",
        "settings": {"style": "blur", "orientation": "portrait", "resolution": "1080", "captions": True,
                     "caption_source": "auto", "caption_style": "karaoke", "caption_pos": "bottom",
                     "trim_x": 0, "trim_y": 0, "auto_trim": True, "captions_if_speech": True},
        "auto_apply": True,
    },
]

# v1 presets.json used camelCase keys.
_V1_KEYS = {"rotateCaptions": "rotate_captions", "vividAmount": "vivid_amount", "trimY": "trim_y",
            "trimX": "trim_x", "fgCrop": "fg_crop", "captionSource": "caption_source",
            "captionStyle": "caption_style", "captionPos": "caption_pos", "musicGain": "music_gain"}


def _new_id() -> str:
    return str(uuid.uuid4())


class Store:
    def __init__(self, lib: Library, presets_file: Path | None = None):
        self.lib = lib
        self.presets_file = presets_file
        self.dir = lib.state_dir()
        self.lock = threading.RLock()
        self.videos: dict[str, dict] = {}
        self.hidden: set[str] = set()          # storage_paths removed from the library
        self.clips: dict[str, dict] = {}
        self.recipes: dict[str, dict] = {}
        self.styles: dict[str, dict] = {}
        self._asset_cache: dict[str, tuple[float, list[dict]]] = {}

    # ---- persistence --------------------------------------------------------

    def _read(self, name: str, default):
        p = self.dir / name
        if not p.is_file():
            return default
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except (OSError, ValueError) as e:
            log.error("could not read %s (%s) — starting empty", p, e)
            return default

    def load(self) -> None:
        with self.lock:
            v = self._read("videos.json", {})
            self.videos = {x["id"]: x for x in v.get("videos", [])}
            self.hidden = set(v.get("hidden", []))
            self.recipes = {x["id"]: x for x in self._read("recipes.json", {}).get("recipes", [])}
            self.styles = {x["id"]: x for x in self._read("styles.json", {}).get("styles", [])}
            self.clips = {}
            for video in self.videos.values():
                for c in self._read_clips(video):
                    self.clips[c["id"]] = c
            if not (self.dir / "recipes.json").is_file():
                self._seed_recipes()

    def _read_clips(self, video: dict) -> list[dict]:
        if not video.get("storage_path"):
            return []
        p = self.lib.root / self.lib.sidecar_rel(video, "clips")
        if not p.is_file():
            return []
        try:
            return json.loads(p.read_text(encoding="utf-8")).get("clips", [])
        except (OSError, ValueError):
            return []

    def save_videos(self) -> None:
        with self.lock:
            write_json_atomic(self.dir / "videos.json", {
                "videos": sorted(self.videos.values(), key=lambda x: x["created_at"]),
                "hidden": sorted(self.hidden),
            })

    def save_clips(self, video_id: str) -> None:
        with self.lock:
            video = self.videos.get(video_id)
            if not video or not video.get("storage_path"):
                return
            clips = self.clips_for(video_id)
            write_json_atomic(self.lib.resolve(self.lib.sidecar_rel(video, "clips")), {"clips": clips})

    def save_recipes(self) -> None:
        with self.lock:
            write_json_atomic(self.dir / "recipes.json", {"recipes": list(self.recipes.values())})

    def save_styles(self) -> None:
        with self.lock:
            write_json_atomic(self.dir / "styles.json", {"styles": list(self.styles.values())})

    def _seed_recipes(self) -> None:
        for r in DEFAULT_RECIPES:
            self.add_recipe(r["name"], r["description"], r["settings"], r["auto_apply"])
        # carry v1 presets over (project root, next to the default library)
        for cand in (self.presets_file,) if self.presets_file else ():
            if cand.is_file():
                try:
                    data = json.loads(cand.read_text(encoding="utf-8"))
                except (OSError, ValueError):
                    continue
                for name, raw in data.items():
                    if any(r["name"] == name for r in self.recipes.values()):
                        continue
                    settings = {}
                    for k, v in raw.items():
                        k = _V1_KEYS.get(k, k)
                        if k == "hdr":
                            settings["look"] = "hdr" if v else "none"
                            continue
                        if k in ("trim_x", "trim_y", "fg_crop"):
                            v = float(v or 0)
                        settings[k] = v
                    try:
                        settings = validate_recipe(settings)
                    except ValueError as e:
                        log.warning("skipping v1 preset %s: %s", name, e)
                        continue
                    self.add_recipe(name, "v1 preset", settings, False)
                    log.info("imported v1 preset %r as a recipe", name)
                break

    # ---- videos ---------------------------------------------------------------

    def list_videos(self) -> list[dict]:
        with self.lock:
            return sorted(self.videos.values(), key=lambda x: x["created_at"], reverse=True)

    def get_video(self, video_id: str) -> dict | None:
        with self.lock:
            return self.videos.get(video_id)

    def find_video(self, youtube_id: str | None = None, storage_path: str | None = None) -> dict | None:
        with self.lock:
            for v in self.videos.values():
                if youtube_id and v.get("youtube_id") == youtube_id:
                    return v
                if storage_path and v.get("storage_path") == storage_path:
                    return v
        return None

    def add_video(self, **fields) -> dict:
        video = {
            "id": _new_id(), "source": "youtube", "youtube_id": None, "url": None, "title": "",
            "channel": None, "duration": None, "width": None, "height": None, "vcodec": None,
            "size_bytes": None, "storage_path": None, "thumb_path": None, "status": "new",
            "meta": {}, "note": None, "pipeline": "none",
            "created_at": now_iso(), "updated_at": now_iso(),
        }
        video.update(fields)
        with self.lock:
            self.videos[video["id"]] = video
            self.hidden.discard(video.get("storage_path") or "")
            self.save_videos()
        return video

    def update_video(self, video_id: str, **fields) -> dict:
        with self.lock:
            video = self.videos[video_id]
            video.update(fields)
            video["updated_at"] = now_iso()
            self.save_videos()
            return video

    def delete_video(self, video_id: str) -> None:
        """Forget a video (files stay on disk; its folder is not re-indexed)."""
        with self.lock:
            video = self.videos.pop(video_id, None)
            if video is None:
                return
            if video.get("storage_path"):
                self.hidden.add(video["storage_path"])
            for cid in [c["id"] for c in self.clips.values() if c["video_id"] == video_id]:
                self.clips.pop(cid, None)
            self.save_videos()

    # ---- assets (derived from disk, short cache) -------------------------------

    def assets(self, video: dict) -> list[dict]:
        key = video["id"]
        now = time.monotonic()
        with self.lock:
            hit = self._asset_cache.get(key)
            if hit and now - hit[0] < 2.0:
                return hit[1]
        out = self.lib.assets(video)
        with self.lock:
            self._asset_cache[key] = (now, out)
        return out

    def asset(self, video: dict, kind: str) -> dict | None:
        return next((a for a in self.assets(video) if a["kind"] == kind), None)

    def invalidate_assets(self, video_id: str) -> None:
        with self.lock:
            self._asset_cache.pop(video_id, None)

    # ---- clips ------------------------------------------------------------------

    def clips_for(self, video_id: str) -> list[dict]:
        with self.lock:
            return sorted((c for c in self.clips.values() if c["video_id"] == video_id),
                          key=lambda c: c["created_at"])

    def all_clips(self) -> list[dict]:
        with self.lock:
            return list(self.clips.values())

    def get_clip(self, clip_id: str) -> dict | None:
        with self.lock:
            return self.clips.get(clip_id)

    def add_clip(self, video_id: str, start_s: float, end_s: float, **fields) -> dict:
        clip = {
            "id": _new_id(), "video_id": video_id, "recipe_id": None, "start_s": float(start_s),
            "end_s": float(end_s), "title": None, "hook": None, "reason": None, "origin": "manual",
            "status": "proposed", "output_path": None, "render_settings": None, "job_id": None,
            "created_at": now_iso(), "updated_at": now_iso(),
        }
        clip.update(fields)
        with self.lock:
            self.clips[clip["id"]] = clip
            self.save_clips(video_id)
        return clip

    def update_clip(self, clip_id: str, **fields) -> dict | None:
        with self.lock:
            clip = self.clips.get(clip_id)
            if clip is None:
                return None
            clip.update(fields)
            clip["updated_at"] = now_iso()
            self.save_clips(clip["video_id"])
            return clip

    def delete_clip(self, clip_id: str) -> None:
        with self.lock:
            clip = self.clips.pop(clip_id, None)
            if clip:
                self.save_clips(clip["video_id"])

    def delete_clips_where(self, video_id: str, origin: str, status: str) -> int:
        with self.lock:
            gone = [c["id"] for c in self.clips.values()
                    if c["video_id"] == video_id and c["origin"] == origin and c["status"] == status]
            for cid in gone:
                self.clips.pop(cid, None)
            if gone:
                self.save_clips(video_id)
            return len(gone)

    # ---- recipes ------------------------------------------------------------------

    def list_recipes(self) -> list[dict]:
        with self.lock:
            return sorted(self.recipes.values(), key=lambda r: r["name"].lower())

    def get_recipe(self, recipe_id: str) -> dict | None:
        with self.lock:
            return self.recipes.get(recipe_id)

    def find_recipe(self, name: str) -> dict | None:
        with self.lock:
            return next((r for r in self.recipes.values() if r["name"] == name), None)

    def add_recipe(self, name: str, description: str | None, settings: dict, auto_apply: bool) -> dict:
        recipe = {"id": _new_id(), "name": name, "description": description, "settings": settings,
                  "auto_apply": bool(auto_apply), "created_at": now_iso(), "updated_at": now_iso()}
        with self.lock:
            if self.find_recipe(name):
                raise ValueError(f"A recipe called {name!r} already exists.")
            self.recipes[recipe["id"]] = recipe
            self.save_recipes()
        return recipe

    def update_recipe(self, recipe_id: str, **fields) -> dict | None:
        with self.lock:
            recipe = self.recipes.get(recipe_id)
            if recipe is None:
                return None
            if "name" in fields:
                other = self.find_recipe(fields["name"])
                if other and other["id"] != recipe_id:
                    raise ValueError(f"A recipe called {fields['name']!r} already exists.")
            recipe.update({k: v for k, v in fields.items() if v is not None or k == "description"})
            recipe["updated_at"] = now_iso()
            self.save_recipes()
            return recipe

    def delete_recipe(self, recipe_id: str) -> None:
        with self.lock:
            if self.recipes.pop(recipe_id, None) is not None:
                self.save_recipes()

    # ---- styles ---------------------------------------------------------------------

    def list_styles(self) -> list[dict]:
        with self.lock:
            return sorted(self.styles.values(), key=lambda s: s["created_at"], reverse=True)

    def get_style(self, style_id: str) -> dict | None:
        with self.lock:
            return self.styles.get(style_id)

    def find_style(self, youtube_id: str) -> dict | None:
        with self.lock:
            return next((s for s in self.styles.values() if s.get("youtube_id") == youtube_id), None)

    def add_style(self, url: str, youtube_id: str | None, title: str | None) -> dict:
        style = {"id": _new_id(), "url": url, "youtube_id": youtube_id, "title": title, "channel": None,
                 "duration": None, "width": None, "height": None, "ref_path": None, "thumb_path": None,
                 "status": "new", "error": None, "measured": None, "report": None, "recipe": None,
                 "resolve_notes": None, "job_id": None, "created_at": now_iso()}
        with self.lock:
            self.styles[style["id"]] = style
            self.save_styles()
        return style

    def update_style(self, style_id: str, **fields) -> dict | None:
        with self.lock:
            style = self.styles.get(style_id)
            if style is None:
                return None
            style.update(fields)
            self.save_styles()
            return style

    def delete_style(self, style_id: str) -> None:
        with self.lock:
            if self.styles.pop(style_id, None) is not None:
                self.save_styles()

    # ---- disk reconcile -------------------------------------------------------------

    def reconcile(self) -> dict:
        """Index folders that appeared on disk (v1 library, hand-copied videos),
        refresh sizes, and flag videos whose file went away."""
        added = missing = 0
        with self.lock:
            seen: set[str] = set()
            for info, main, thumb, folder in self.lib.scan_folders():
                rel = self.lib.relative(main)
                seen.add(rel)
                if rel in self.hidden:
                    continue
                yt_id = info.get("id") if (info.get("extractor_key") or "").lower().startswith("youtube") else None
                video = self.find_video(youtube_id=yt_id) if yt_id else None
                if video is None:
                    video = self.find_video(storage_path=rel)
                size = main.stat().st_size
                thumb_rel = self.lib.relative(thumb) if thumb else None
                if video is None:
                    meta = {k: info[k] for k in META_KEYS if k in info}
                    if isinstance(meta.get("description"), str):
                        meta["description"] = meta["description"][:2000]
                    self.add_video(
                        source="youtube" if yt_id else "import", youtube_id=yt_id,
                        url=info.get("webpage_url") or info.get("original_url"),
                        title=info.get("title") or main.stem, channel=info.get("uploader") or info.get("channel"),
                        duration=info.get("duration"), width=info.get("width"), height=info.get("height"),
                        vcodec=info.get("vcodec"), size_bytes=size, storage_path=rel, thumb_path=thumb_rel,
                        status="ready", meta=meta,
                    )
                    added += 1
                else:
                    changed = {}
                    if video.get("storage_path") != rel:
                        changed["storage_path"] = rel
                    if video.get("size_bytes") != size:
                        changed["size_bytes"] = size
                    if thumb_rel and video.get("thumb_path") != thumb_rel:
                        changed["thumb_path"] = thumb_rel
                    if video.get("status") == "missing":
                        changed["status"] = "ready"
                    if changed:
                        video.update(changed)
            for video in self.videos.values():
                rel = video.get("storage_path")
                if rel and video.get("status") == "ready" and not (self.lib.root / rel).is_file():
                    video["status"] = "missing"
                    missing += 1
            self.save_videos()
            # clips for videos that were just added
            for video in self.videos.values():
                for c in self._read_clips(video):
                    self.clips.setdefault(c["id"], c)
        return {"added": added, "missing": missing, "videos": len(self.videos)}
