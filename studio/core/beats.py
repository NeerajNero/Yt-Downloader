"""Beat grid for a music track (docs/PLAYBOOK.md): bpm, beat times, a
downbeat suggestion, and where the drop is. Written to
`<library>/.music/<name>.beats.json` by the `beats` job.

    {"version": 1, "name": "track.mp3", "duration_s": 93.2, "sr": 22050,
     "bpm": 140.0, "beats": [...], "downbeats": [...],
     "downbeats_method": "onset_phase_4_4", "drop_s": 12.4,
     "drop_s_manual": null}

Decoding goes through ffmpeg (mono 22.05 kHz wav) so mp3/m4a/opus never
depend on librosa's own codecs; librosa is imported lazily inside
`load_features` and only there. Everything else is pure so the tests need
neither librosa nor ffmpeg. Silence, ambient tracks and files under 4 s give
an empty grid (beats: [], downbeats: [], drop_s: None) instead of raising.
"""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path
from typing import Callable, Sequence

from .errors import Cancelled
from .ffmpeg import Report, ShouldCancel, Tools

BEATS_VERSION = 1
SR = 22050
MIN_DURATION = 4.0            # shorter tracks get an empty grid
MIN_BEATS = 4
BEAT_CONFIDENCE = 1.2         # onset strength on beats vs. everywhere: below this = ambient / no pulse
SILENCE_RMS = 1e-4
DROP_AHEAD = 2.0              # seconds of energy after a beat ...
DROP_BEHIND = 8.0             # ... compared with the seconds before it
DROP_RATIO = 1.5
DROP_FALLBACK_RATIO = 1.2     # the fallback (biggest step on a downbeat) still needs a real step
DOWNBEATS_METHOD = "onset_phase_4_4"


def empty_grid(name: str | None = None, duration_s: float | None = None, sr: int = SR) -> dict:
    return {"version": BEATS_VERSION, "name": name, "duration_s": duration_s, "sr": sr, "bpm": None,
            "beats": [], "downbeats": [], "downbeats_method": DOWNBEATS_METHOD, "drop_s": None,
            "drop_s_manual": None}


def effective_drop(grid: dict | None) -> float | None:
    """drop_s_manual wins over the detected drop_s."""
    if not grid:
        return None
    m = grid.get("drop_s_manual")
    if m is not None:
        return float(m)
    d = grid.get("drop_s")
    return float(d) if d is not None else None


def is_current(grid: dict | None) -> bool:
    return bool(grid) and grid.get("version") == BEATS_VERSION


# ---- pure helpers ---------------------------------------------------------------

def _mean_between(ts: Sequence[float], vs: Sequence[float], a: float, b: float) -> float | None:
    """Mean of vs where a <= t < b; None when the window holds no samples."""
    acc, n = 0.0, 0
    for t, v in zip(ts, vs):
        if a <= t < b:
            acc += float(v)
            n += 1
    return acc / n if n else None


def _value_at(ts: Sequence[float], vs: Sequence[float], t: float) -> float:
    """vs at the sample nearest to t (0 when empty)."""
    if not ts:
        return 0.0
    best, bi = None, 0
    for i, x in enumerate(ts):
        d = abs(x - t)
        if best is None or d < best:
            best, bi = d, i
    return float(vs[bi])


def beat_confidence(beats: Sequence[float], onset_t: Sequence[float], onset_v: Sequence[float]) -> float:
    """How much stronger onsets are on the beats than on average. ~1 = no pulse."""
    if not beats or not onset_t:
        return 0.0
    overall = sum(float(v) for v in onset_v) / len(onset_v)
    if overall <= 0:
        return 0.0
    on_beats = sum(_value_at(onset_t, onset_v, b) for b in beats) / len(beats)
    return on_beats / overall


def downbeats_from(beats: Sequence[float], onset_t: Sequence[float], onset_v: Sequence[float]) -> list[float]:
    """4/4 assumption: of the four possible phases, the one whose beats carry
    the most onset energy. A suggestion, not a guarantee (downbeats_method)."""
    beats = [float(b) for b in beats]
    if len(beats) < MIN_BEATS:
        return []
    best_phase, best_score = 0, None
    for phase in range(4):
        picks = beats[phase::4]
        score = sum(_value_at(onset_t, onset_v, b) for b in picks) / max(len(picks), 1)
        if best_score is None or score > best_score:
            best_phase, best_score = phase, score
    return beats[best_phase::4]


def find_drop(beats: Sequence[float], rms_t: Sequence[float], rms_v: Sequence[float],
              downbeats: Sequence[float] | None = None) -> float | None:
    """The beat where the next DROP_AHEAD seconds are DROP_RATIO louder (RMS)
    than the DROP_BEHIND seconds before it: the first beat over the threshold
    starts a window, and the beat inside that window with the highest ratio
    wins (the look-ahead starts rising a little before the real step).
    Fallback: the downbeat with the biggest energy step up. None when nothing
    stands out."""
    beats = [float(b) for b in beats]
    if not beats or not rms_t:
        return None
    ratios: list[tuple[float, float]] = []
    for b in beats:
        if b < DROP_AHEAD:          # need some run-up to compare against
            continue
        behind = _mean_between(rms_t, rms_v, max(0.0, b - DROP_BEHIND), b)
        ahead = _mean_between(rms_t, rms_v, b, b + DROP_AHEAD)
        if behind is None or ahead is None or behind <= 0:
            continue
        ratios.append((b, ahead / behind))
    for i, (b, r) in enumerate(ratios):
        if r >= DROP_RATIO:
            window = [x for x in ratios[i:] if x[0] <= b + DROP_AHEAD]
            return round(max(window, key=lambda x: x[1])[0], 3)
    best, best_step = None, 0.0
    for b in (downbeats if downbeats else beats):
        b = float(b)
        behind = _mean_between(rms_t, rms_v, max(0.0, b - DROP_AHEAD), b)
        ahead = _mean_between(rms_t, rms_v, b, b + DROP_AHEAD)
        if behind is None or ahead is None:
            continue
        step = ahead - behind
        if behind > 0 and ahead >= DROP_FALLBACK_RATIO * behind and step > best_step:
            best, best_step = b, step
    return round(best, 3) if best is not None else None


def nearest_beat(t: float, beats: Sequence[float]) -> float:
    """The beat closest to t; t itself when there are no beats."""
    if not beats:
        return float(t)
    return float(min(beats, key=lambda b: abs(float(b) - t)))


def default_range(peak_s: float, beats: Sequence[float] | None, duration: float | None,
                  before: float = 2.0, after: float = 3.0, min_len: float = 8.0, max_len: float = 20.0) -> tuple[float, float]:
    """Playbook default around the peak: peak-2 .. peak+3, each snapped to the
    nearest beat when a grid is given, then widened to min_len / clamped to
    max_len and to the source."""
    peak_s = float(peak_s)
    start, end = max(0.0, peak_s - before), peak_s + after
    if beats:
        start, end = nearest_beat(start, beats), nearest_beat(end, beats)
    if end <= start:
        end = start + after
    if end - start < min_len:
        extra = min_len - (end - start)
        start, end = max(0.0, start - extra / 2), end + extra / 2
        if end - start < min_len:
            end = start + min_len
    if end - start > max_len:
        end = start + max_len
    if duration:
        end = min(end, float(duration))
        start = max(0.0, min(start, end - min(min_len, float(duration))))
    return round(start, 3), round(end, 3)


# ---- decode + analyse ------------------------------------------------------------

def decode_wav(src: Path, out: Path, tools: Tools, sr: int = SR) -> Path:
    """ffmpeg → mono `sr` Hz 16-bit wav; raises RuntimeError on failure."""
    r = subprocess.run([tools.ffmpeg, "-y", "-v", "error", "-i", str(src), "-vn", "-ac", "1", "-ar", str(sr),
                        "-c:a", "pcm_s16le", "-f", "wav", str(out)], capture_output=True, text=True)
    if r.returncode != 0 or not out.is_file():
        raise RuntimeError((r.stderr or "").strip()[-400:] or "ffmpeg could not decode the track")
    return out


def load_features(wav: Path, sr: int = SR) -> dict:
    """The only librosa call site. Returns plain lists:
    {duration, sr, bpm, beats, onset_t, onset_v, rms_t, rms_v}."""
    import numpy as np  # noqa: F401  (librosa needs it; keep the import explicit)
    import librosa

    y, sr = librosa.load(str(wav), sr=sr, mono=True)
    duration = float(len(y)) / float(sr) if sr else 0.0
    hop = 512
    onset_v = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
    onset_t = librosa.frames_to_time(range(len(onset_v)), sr=sr, hop_length=hop)
    rms_v = librosa.feature.rms(y=y, frame_length=2048, hop_length=hop)[0]
    rms_t = librosa.frames_to_time(range(len(rms_v)), sr=sr, hop_length=hop)
    bpm, beats = 0.0, []
    if float(max(rms_v, default=0.0)) > SILENCE_RMS:
        try:
            tempo, beat_times = librosa.beat.beat_track(y=y, sr=sr, onset_envelope=onset_v, hop_length=hop, units="time")
            bpm = float(tempo[0] if hasattr(tempo, "__len__") else tempo)
            beats = [float(b) for b in beat_times]
        except Exception:  # noqa: BLE001 — no pulse at all; treated as empty below
            bpm, beats = 0.0, []
    return {"duration": duration, "sr": int(sr), "bpm": bpm, "beats": beats,
            "onset_t": [float(t) for t in onset_t], "onset_v": [float(v) for v in onset_v],
            "rms_t": [float(t) for t in rms_t], "rms_v": [float(v) for v in rms_v]}


def grid_from_features(f: dict, name: str | None = None) -> dict:
    """Pure: features → beats.json dict (drop_s_manual left None)."""
    duration = float(f.get("duration") or 0.0)
    out = empty_grid(name, round(duration, 3), int(f.get("sr") or SR))
    beats = [round(float(b), 3) for b in (f.get("beats") or [])]
    rms_v = f.get("rms_v") or []
    if duration < MIN_DURATION or len(beats) < MIN_BEATS or not (f.get("bpm") or 0) > 0:
        return out
    if float(max(rms_v, default=0.0)) <= SILENCE_RMS:
        return out
    if beat_confidence(beats, f.get("onset_t") or [], f.get("onset_v") or []) < BEAT_CONFIDENCE:
        return out
    downbeats = downbeats_from(beats, f.get("onset_t") or [], f.get("onset_v") or [])
    out.update({"bpm": round(float(f["bpm"]), 2), "beats": beats, "downbeats": [round(b, 3) for b in downbeats],
                "drop_s": find_drop(beats, f.get("rms_t") or [], rms_v, downbeats)})
    return out


def analyze_track(path: Path, tools: Tools, should_cancel: ShouldCancel, report: Report | None = None,
                  name: str | None = None, load: Callable[[Path], dict] = load_features) -> dict:
    """Decode (ffmpeg), check for cancel, analyse (librosa) → beats.json dict.
    Never raises on silence / ambient / short tracks; raises Cancelled,
    RuntimeError (decode) or whatever librosa raises on a broken file."""
    path = Path(path)
    name = name or path.name
    duration = tools.probe_duration(path)
    if duration is not None and duration < MIN_DURATION:
        return empty_grid(name, round(duration, 3))
    with tempfile.TemporaryDirectory() as tmp:
        if report:
            report(None, "decoding")
        wav = decode_wav(path, Path(tmp) / "track.wav", tools)
        if should_cancel():
            raise Cancelled()
        if report:
            report(None, "finding beats")
        features = load(wav)
    if should_cancel():
        raise Cancelled()
    return grid_from_features(features, name)
