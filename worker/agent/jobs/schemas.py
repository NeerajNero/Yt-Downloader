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


class RenderPayload(BaseModel):
    """v1 ExportBody minus `path` (the job's video_id / clip_id say what to render),
    plus the Phase 3 recipe extras."""
    model_config = ConfigDict(extra="forbid")

    start: float = Field(ge=0)
    end: float
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
    recipe_id: str | None = None    # recorded on the clips row when set

    @model_validator(mode="after")
    def _range(self):
        if self.end <= self.start:
            raise ValueError("End time must be after start time.")
        return self


class RecipeSettings(RenderPayload):
    """A recipe = a render payload without start/end (they come from the clip).
    `auto_trim` / `captions_if_speech` are auto-apply hints, not ffmpeg settings."""
    model_config = ConfigDict(extra="forbid")

    start: float = 0.0
    end: float = 1.0
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


class PostkitPayload(BaseModel):
    pass


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
}

# Job types that need a video_id.
NEEDS_VIDEO = {"transcribe", "scenes", "borders", "convert", "render", "clippack",
               "tighten", "suggest", "postkit"}


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
        return RecipeSettings.model_validate(settings or {}).model_dump(exclude={"start", "end", "recipe_id"})
    except ValidationError as e:
        raise ValueError(_explain(e)) from e
