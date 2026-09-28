"""The automatic part: what happens after a job finishes, per the video's
`pipeline` (none | prepare | shorts).

video becomes ready (download done / file uploaded)
    prepare|shorts : transcribe + scenes (+ borders for shorts)
job done
    transcribe            : postkit
    transcribe|scenes     : suggest + plan once both exist
    suggest (shorts only) : render every proposed AI clip with each auto-apply
                            recipe (or the Auto Shorts defaults)
Every enqueue is deduped against active jobs so re-runs are harmless.
"""

from __future__ import annotations

import logging

from studio import context

log = logging.getLogger("pipeline")

MIN_WORDS_FOR_CAPTIONS = 20  # v1 _has_speech
DEFAULT_SHORTS = {"style": "blur", "orientation": "portrait", "resolution": "1080",
                  "captions": True, "auto_trim": True, "captions_if_speech": True}


def enqueue(jtype: str, video_id: str | None, payload: dict | None = None, clip_id: str | None = None,
            parent_job_id: str | None = None, priority: int = 100) -> dict | None:
    """Queue unless an identical-type job for the video is already active
    (renders are per clip: dedupe on clip_id instead)."""
    dup = context.app.queue.active(jtype, video_id=video_id, clip_id=clip_id) if jtype == "render" \
        else context.app.queue.active(jtype, video_id=video_id)
    if dup:
        return None
    return context.app.queue.enqueue(jtype, video_id=video_id, clip_id=clip_id, payload=payload or {},
                             priority=priority, parent_job_id=parent_job_id)


def _have(video: dict) -> dict[str, dict]:
    return {a["kind"]: a for a in context.app.store.assets(video)}


def on_video_ready(video: dict) -> list[dict]:
    made: list[dict | None] = []
    pipeline = video.get("pipeline") or "none"
    if pipeline == "none":
        return []
    have = _have(video)
    vid = video["id"]
    if "transcript" not in have:
        made.append(enqueue("transcribe", vid))
    if "scenes" not in have:
        made.append(enqueue("scenes", vid))
    if pipeline == "shorts" and "borders" not in have:
        made.append(enqueue("borders", vid))
    if "transcript" in have and "scenes" in have:
        made.append(enqueue("suggest", vid))
        made.append(enqueue("postkit", vid))
        made.append(enqueue("plan", vid))
    return [m for m in made if m]


def recipe_payload(recipe: dict, clip: dict, have: dict) -> dict:
    """A recipe's settings as a render payload for one clip, applying the
    auto-apply hints (bars from the borders asset, captions only with speech)."""
    settings = dict(recipe.get("settings") or {})
    auto_trim = settings.pop("auto_trim", False)
    if_speech = settings.pop("captions_if_speech", False)
    if auto_trim and not settings.get("trim_x") and not settings.get("trim_y"):
        borders = (have.get("borders") or {}).get("data") or {}
        settings["trim_x"] = borders.get("trim_x", 0.0)
        settings["trim_y"] = borders.get("trim_y", 0.0)
    if settings.get("captions") and settings.get("caption_source", "auto") == "auto":
        words = ((have.get("transcript") or {}).get("data") or {}).get("words") or 0
        if "transcript" not in have or (if_speech and words < MIN_WORDS_FOR_CAPTIONS):
            settings["captions"] = False
    settings.pop("start", None)
    settings.pop("end", None)
    payload = {**settings, "start": clip["start_s"], "end": clip["end_s"]}
    if recipe.get("id"):
        payload["recipe_id"] = recipe["id"]
    return payload


def auto_render(video: dict, have: dict, parent_job_id: str | None = None) -> list[dict]:
    """Render every proposed AI clip once per auto-apply recipe (or with the
    Auto Shorts defaults when none is flagged). Extra recipes get their own clips."""
    recipes = [r for r in context.app.store.list_recipes() if r.get("auto_apply")] or \
        [{"id": None, "name": "default", "settings": DEFAULT_SHORTS}]
    vid = video["id"]
    proposed = [c for c in context.app.store.clips_for(vid) if c["origin"] == "ai_suggest" and c["status"] == "proposed"]
    made = []
    for clip in proposed:
        for i, recipe in enumerate(recipes):
            target = clip
            if i > 0:
                target = context.app.store.add_clip(vid, clip["start_s"], clip["end_s"], title=clip["title"], hook=clip["hook"],
                                            reason=clip["reason"], origin="ai_suggest", status="proposed",
                                            recipe_id=recipe["id"])
            elif recipe["id"]:
                context.app.store.update_clip(clip["id"], recipe_id=recipe["id"])
            j = enqueue("render", vid, recipe_payload(recipe, target, have), clip_id=target["id"],
                        parent_job_id=parent_job_id)
            if j:
                made.append(j)
    return made


def on_job_done(job: dict) -> list[dict]:
    vid = job.get("video_id")
    if not vid:
        return []
    video = context.app.store.get_video(vid)
    if video is None:
        return []
    if job["type"] == "download":
        return on_video_ready(video)
    if (video.get("pipeline") or "none") == "none":
        return []
    have = _have(video)
    made: list[dict | None] = []
    if job["type"] == "transcribe" and "postkit" not in have:
        made.append(enqueue("postkit", vid, parent_job_id=job["id"]))
    if job["type"] in ("transcribe", "scenes") and "transcript" in have and "scenes" in have:
        newest = max(have["transcript"]["created_at"], have["scenes"]["created_at"])
        already = any(j["type"] == "suggest" and j["created_at"] >= newest for j in context.app.queue.for_video(vid))
        if not already:
            made.append(enqueue("suggest", vid, parent_job_id=job["id"]))
            made.append(enqueue("plan", vid, parent_job_id=job["id"]))
    if job["type"] == "suggest" and video.get("pipeline") == "shorts":
        made.extend(auto_render(video, have, parent_job_id=job["id"]))
    out = [m for m in made if m]
    if out:
        log.info("%s done → %s", job["type"], ", ".join(j["type"] for j in out))
    return out
