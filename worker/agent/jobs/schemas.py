"""Job payload schemas (pydantic). The api validates `enqueue_job` Action input
against these; adapters parse the row's payload with them."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator


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


class RenderPayload(BaseModel):
    """v1 ExportBody minus `path` (the job's video_id / clip_id say what to render)."""
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

    @model_validator(mode="after")
    def _range(self):
        if self.end <= self.start:
            raise ValueError("End time must be after start time.")
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


def validate_payload(job_type: str, payload: dict | None) -> dict:
    """Parse + normalise a payload for `job_type`; raises ValueError."""
    model = PAYLOADS.get(job_type)
    if model is None:
        raise ValueError(f"unknown job type {job_type!r}")
    try:
        return model.model_validate(payload or {}).model_dump()
    except Exception as e:  # pydantic.ValidationError
        msg = str(e)
        # pydantic's message is multi-line; keep the human part ("Value error, End time ...")
        lines = [ln.strip() for ln in msg.splitlines() if ln.strip()]
        detail = next((ln for ln in lines if ln.startswith(("Value error", "Input should", "Field required"))), lines[0] if lines else "invalid payload")
        raise ValueError(detail.replace("Value error, ", "").split(" [type=")[0]) from e
