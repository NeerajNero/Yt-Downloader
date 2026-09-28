"""Job payload schemas (pydantic). The api validates `enqueue_job` Action input
against these; adapters parse the row's payload with them. Unknown keys on a
render payload are rejected so a typo can't silently drop a setting."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator


class NoopPayload(BaseModel):
    seconds: float = 10
    fail: bool = False


class TranscribePayload(BaseModel):
    model: str | None = None
    language: str | None = None


class DownloadPayload(BaseModel):
    url: str
    quality: str = "best"           # best | audio | hdr | <height>


class ScenesPayload(BaseModel):
    threshold: float = Field(0.30, ge=0.05, le=0.95)


class BordersPayload(BaseModel):
    pass


class ConvertPayload(BaseModel):
    pass


class Watermark(BaseModel):
    file: str                       # image in <library>/.overlays/
    position: Literal["top_left", "top_right", "bottom_left", "bottom_right", "top_center", "bottom_center"] = "top_right"
    scale: float = Field(0.15, ge=0.03, le=0.6)     # fraction of frame width
    opacity: float = Field(0.85, ge=0.05, le=1.0)
    margin: float = Field(0.03, ge=0, le=0.3)       # fraction of the short side


class SfxLayer(BaseModel):
    file: str                       # audio in <library>/.music/
    at: float = Field(0.0, ge=0)    # seconds from clip start
    gain: int = Field(80, ge=0, le=100)


class ZoomMarker(BaseModel):
    at: float = Field(ge=0)         # seconds from clip start
    duration: float = Field(0.5, ge=0.1, le=10)
    zoom: float = Field(1.15, ge=1.0, le=3.0)


class ShakeMarker(BaseModel):
    """Camera shake: the frame jitters for `duration` seconds from `at`, easing
    out. `intensity` 1-100 = how far it moves (100 ≈ 6 % of the frame)."""
    at: float = Field(ge=0)
    duration: float = Field(0.4, ge=0.1, le=5)
    intensity: int = Field(50, ge=1, le=100)


TRANSITION_TYPES = Literal["cut", "fade", "fadeblack", "fadewhite", "dissolve", "wipeleft", "wiperight",
                           "wipeup", "wipedown", "slideleft", "slideright", "slideup", "slidedown",
                           "smoothleft", "smoothright", "zoomin", "circleopen", "circleclose", "radial",
                           "pixelize", "hblur", "squeezeh", "squeezev"]


class Transition(BaseModel):
    type: TRANSITION_TYPES = "cut"
    duration: float = Field(0.35, ge=0.1, le=2.0)


class Segment(BaseModel):
    """One shot of a sequence render. Times in source seconds; zoom / shake
    markers are relative to the shot's own (retimed) start. `transition` is
    the transition INTO THE NEXT shot; None = the montage's default."""
    start: float = Field(ge=0)
    end: float
    speed: float = Field(1.0, ge=0.25, le=4.0)
    zoom_markers: list[ZoomMarker] = Field(default_factory=list, max_length=20)
    shake_markers: list[ShakeMarker] = Field(default_factory=list, max_length=20)
    transition: Transition | None = None

    @model_validator(mode="after")
    def _range(self):
        if self.end <= self.start:
            raise ValueError("End time must be after start time.")
        return self


class RenderPayload(BaseModel):
    """v1 ExportBody minus `path` (the job's video_id / clip_id say what to render),
    plus the Phase 3 recipe extras. Either start/end (one range) or `segments`
    (a sequence with transitions, per-shot speed and punch-ins)."""
    model_config = ConfigDict(extra="forbid")

    start: float | None = Field(None, ge=0)
    end: float | None = None
    segments: list[Segment] = Field(default_factory=list, max_length=60)
    transition: Transition = Field(default_factory=Transition)
    style: Literal["crop", "blur"] = "blur"
    vivid_amount: int = Field(0, ge=0, le=100)
    trim_x: float = Field(0.0, ge=0, le=40)
    trim_y: float = Field(0.0, ge=0, le=40)
    fg_crop: float = Field(0.0, ge=0, le=40)
    captions: bool = False
    caption_source: Literal["auto", "manual"] = "auto"
    caption_pos: Literal["bottom", "middle", "top"] = "bottom"
    caption_style: Literal["karaoke", "typewriter", "pop", "minimal"] = "karaoke"
    resolution: Literal["1080", "4k"] = "1080"
    orientation: Literal["portrait", "landscape"] = "portrait"
    rotate: Literal["none", "right", "left", "180"] = "none"
    rotate_captions: bool = False
    loudness: bool = False
    zoom: Literal["none", "in"] = "none"
    look: Literal["none", "hdr"] = "none"
    look_sharp: int = Field(50, ge=0, le=100)
    grade: Literal["none", "teal_orange", "moody", "warm", "cool", "bw"] = "none"
    music: str = ""
    music_gain: int = Field(60, ge=0, le=100)
    duck: bool = True
    watermark: Watermark | None = None
    sfx: list[SfxLayer] = Field(default_factory=list, max_length=20)
    zoom_markers: list[ZoomMarker] = Field(default_factory=list, max_length=50)
    shake_markers: list[ShakeMarker] = Field(default_factory=list, max_length=50)
    recipe_id: str | None = None    # recorded on the clips row when set

    @model_validator(mode="after")
    def _range(self):
        if self.segments:
            return self
        if self.start is None or self.end is None:
            raise ValueError("Give a start and end, or a list of segments.")
        if self.end <= self.start:
            raise ValueError("End time must be after start time.")
        return self


class RecipeSettings(RenderPayload):
    """A recipe = a render payload without start/end (they come from the clip).
    `auto_trim` / `captions_if_speech` are auto-apply hints, not ffmpeg settings."""
    model_config = ConfigDict(extra="forbid")

    start: float | None = None
    end: float | None = None
    auto_trim: bool = False              # fill trim_x/trim_y from the borders asset
    captions_if_speech: bool = False     # only burn captions when the transcript has ≥20 words

    @model_validator(mode="after")
    def _range(self):  # start/end are placeholders here
        return self


class ClipPackPayload(BaseModel):
    start: float = Field(0.0, ge=0)
    end: float = Field(0.0, ge=0)     # 0 = to the end of the video
    max_len: float = Field(3.0, ge=1.0, le=5.0)
    min_len: float = Field(0.6, ge=0.2, le=3.0)

    @model_validator(mode="after")
    def _range(self):
        if self.end and self.end <= self.start:
            raise ValueError("End time must be after start time.")
        return self


class TightenPayload(BaseModel):
    threshold_db: float = -30.0
    min_silence: float = Field(0.5, ge=0.1, le=5.0)
    pad: float = Field(0.06, ge=0, le=1)


class SuggestPayload(BaseModel):
    count: int = Field(5, ge=1, le=12)


class DialoguePayload(BaseModel):
    """Speech runs from the transcript's word timing (or silence detection
    when there is no transcript)."""
    gap: float = Field(0.8, ge=0.2, le=5.0)        # a pause longer than this ends a line
    min_len: float = Field(0.6, ge=0.1, le=10.0)   # drop lines shorter than this


class TagsPayload(BaseModel):
    """Gemini labels every scene interval (closeup / gameplay / cutscene ...)."""
    pass


class PostkitPayload(BaseModel):
    pass


class StylePayload(BaseModel):
    style_id: str
    url: str | None = None


class PlanPayload(BaseModel):
    target_length: float = Field(30.0, ge=8, le=180)
    max_shots: int = Field(8, ge=2, le=12)
    style_id: str | None = None      # plan "in the style of" an analysed Short


PAYLOADS: dict[str, type[BaseModel]] = {
    "noop": NoopPayload,
    "transcribe": TranscribePayload,
    "download": DownloadPayload,
    "scenes": ScenesPayload,
    "borders": BordersPayload,
    "convert": ConvertPayload,
    "render": RenderPayload,
    "clippack": ClipPackPayload,
    "tighten": TightenPayload,
    "suggest": SuggestPayload,
    "postkit": PostkitPayload,
    "style": StylePayload,
    "plan": PlanPayload,
    "dialogue": DialoguePayload,
    "tags": TagsPayload,
}

# Job types that need a video_id.
NEEDS_VIDEO = {"transcribe", "scenes", "borders", "convert", "render", "clippack",
               "tighten", "suggest", "postkit", "plan", "dialogue", "tags"}


def _explain(e: ValidationError) -> str:
    """One plain-words line: 'vivid: Extra inputs are not permitted'."""
    errs = e.errors()
    if not errs:
        return "invalid payload"
    first = errs[0]
    loc = ".".join(str(x) for x in first.get("loc", ()) if x != "__root__")
    msg = str(first.get("msg", "invalid")).replace("Value error, ", "")
    return f"{loc}: {msg}" if loc else msg


def validate_payload(job_type: str, payload: dict | None) -> dict:
    """Parse + normalise a payload for `job_type`; raises ValueError."""
    model = PAYLOADS.get(job_type)
    if model is None:
        raise ValueError(f"unknown job type {job_type!r}")
    try:
        return model.model_validate(payload or {}).model_dump()
    except ValidationError as e:
        raise ValueError(_explain(e)) from e


def validate_recipe(settings: dict | None) -> dict:
    """Recipe settings as stored in `recipes.settings`; raises ValueError."""
    try:
        return RecipeSettings.model_validate(settings or {}).model_dump(exclude={"start", "end", "recipe_id", "segments"})
    except ValidationError as e:
        raise ValueError(_explain(e)) from e
