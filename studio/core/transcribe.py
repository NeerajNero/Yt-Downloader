"""faster-whisper transcription — ported from v1 `run_transcribe` (server/downloader.py).

Output JSON shape is identical to v1 so existing `.transcript.json` sidecars
stay compatible:

    {"src": <library-relative path>, "language": "en", "duration": 19.02,
     "model": "small", "segments": [{"start", "end", "text",
                                     "words": [{"w", "s", "e"}, ...]}, ...]}
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from .errors import Cancelled

Report = Callable[[float | None, str | None], None]
ShouldCancel = Callable[[], bool]


@dataclass(frozen=True)
class WhisperConfig:
    model: str = "small"
    device: str = "cpu"            # "cpu" | "cuda"
    compute_type: str = "int8"     # cpu: int8; GTX 1650: int8_float16
    language: str | None = None    # None = auto-detect
    beam_size: int = 5


def transcribe_file(
    audio_path: str,
    cfg: WhisperConfig,
    report: Report,
    should_cancel: ShouldCancel,
    duration: float | None = None,
) -> dict:
    """Transcribe one media file with word timestamps.

    `duration` (seconds) drives the progress percentage; when None the value
    reported by faster-whisper is used. Raises Cancelled between segments.
    """
    from faster_whisper import WhisperModel  # heavy import, keep it lazy

    if should_cancel():
        raise Cancelled()

    report(None, f"loading whisper {cfg.model} ({cfg.device}/{cfg.compute_type})")
    model = WhisperModel(cfg.model, device=cfg.device, compute_type=cfg.compute_type)

    report(0.0, "transcribing")
    segments, info = model.transcribe(
        audio_path,
        word_timestamps=True,
        language=cfg.language,
        beam_size=cfg.beam_size,
    )
    total = duration or getattr(info, "duration", None) or None

    seg_list = []
    for seg in segments:  # generator: decoding happens as we iterate
        if should_cancel():
            raise Cancelled()
        seg_list.append({
            "start": round(seg.start, 2),
            "end": round(seg.end, 2),
            "text": seg.text.strip(),
            "words": [
                {"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2)}
                for w in (seg.words or [])
            ],
        })
        if total:
            report(min(seg.end / total * 100.0, 99.0), f"{len(seg_list)} segments")

    return {
        "src": None,  # the adapter fills in the library-relative source path
        "language": info.language,
        "duration": total,
        "model": cfg.model,
        "segments": seg_list,
    }


def word_count(transcript: dict) -> int:
    return sum(len(seg.get("words") or []) for seg in transcript.get("segments", []))


def has_speech(transcript: dict, min_words: int = 20) -> bool:
    """v1's `_has_speech`: Whisper hallucinates a few stray words on music/CG
    footage, so only a substantial transcript counts as speech."""
    return word_count(transcript) >= min_words
